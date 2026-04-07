/**
 * invoiceService.js — Production-ready, zero-waste Firestore service
 * ─────────────────────────────────────────────────────────────────────────────
 * Cache hierarchy:
 * L1 → _mem   (module-level in-process object  — zero cost, instant)
 * L2 → IndexedDB (Firestore persistentLocalCache — survives page refresh)
 * L3 → Firestore network (cold start / dirty / manual sync ONLY)
 *
 * Key design decisions:
 * • Navigation NEVER triggers a read  (L1 / L2 always served first)
 * • Stats are maintained incrementally via a pre-aggregated Firestore doc
 * (1 read on load; 0 reads on subsequent navigation; writes are batched)
 * • Aggregate queries are used ONLY when the stats doc is unsynced/missing
 * • Mutations update L1 optimistically → UI is instant
 * • BroadcastChannel keeps sibling tabs coherent without Firestore reads
 * • All public methods are arrow functions — safe to destructure
 * • In-flight lock prevents concurrent getAllInvoices network calls
 *
 * Bugs fixed vs. previous versions:
 * [B1]  Double-merge: service returns raw page; component owns list merging
 * [B2]  updateStatus patches _mem.data in-place
 * [B3]  Name-search orderBy("clientNameLower") was missing → Firestore error
 * [B4]  createInvoice now guards all stats bucket keys with ensureBucket()
 * [B5]  deleteAllInvoices resets _mem.stats on partial AND full wipe
 * [B6]  getFullBackupByMonth cursor uses array index, not forEach reference
 * [B7]  In-flight lock (_mem.fetching) prevents duplicate network calls
 * [B8]  BroadcastChannel invalidation added for multi-tab coherence
 * [B9]  Stats TTL extended to avoid redundant aggregate re-computations
 * [B10] deleteInvoice filters L1 with correct field (_id not id)
 * [B11] getInvoiceById L1 hit works even when isDirty=true (local data valid)
 * [B12] clearCache resets _mem.fetching to prevent deadlock after errors
 */

import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  writeBatch,
  increment,
  getAggregateFromServer,
  sum,
  count,
  deleteDoc,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const COLLECTION = "invoices";
const STATS_DOC = "metadata/invoiceStats";
const PAGE_SIZE = 50;
export const MAX_DISPLAY = 2_000;
const SAFE_DAILY_OPS = 2_500; // deletions or backup rows per day
const BATCH_SIZE = 500;
const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 min — L1 freshness window
const STATS_TTL_MS = 10 * 60 * 1_000; // 10 min — stats freshness window
const LOCK_MS = 24 * 60 * 60 * 1_000; // 24 h
const BC_CHANNEL = "invoice_cache_sync"; // BroadcastChannel name

const invCol = collection(db, COLLECTION);

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TAB COHERENCE  (BroadcastChannel — zero Firestore reads)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Events posted to sibling tabs:
 * { type: "DIRTY" }           → another tab mutated data; mark L1 dirty
 * { type: "STATS_UPDATE", s } → another tab computed fresh stats; adopt them
 */
let _bc = null;
const getBC = () => {
  if (!_bc && typeof BroadcastChannel !== "undefined") {
    _bc = new BroadcastChannel(BC_CHANNEL);
    _bc.onmessage = ({ data }) => {
      if (!data) return;
      if (data.type === "DIRTY") {
        _mem.isDirty = true;
        _mem.lastSyncTime = 0;
      } else if (data.type === "STATS_UPDATE" && data.s) {
        _mem.stats = data.s;
        _mem.statsTimestamp = Date.now();
      }
    };
  }
  return _bc;
};
const bcPost = (msg) => {
  try {
    getBC()?.postMessage(msg);
  } catch {
    /* ignore SSR / sandboxed iframes */
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** ISO timestamp in local timezone (prevents UTC-midnight drift on date fields) */
const nowISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString();
};

/** YYYY-MM-DD string, local-timezone-correct */
const toDateStr = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .split("T")[0];

/**
 * Append an edit-history entry to an existing Firestore snapshot.
 * Hard cap: keeps only the 2 most recent entries (write-cost control).
 */
const buildEditHistory = (snapshot, user) => {
  const existing = snapshot.exists() ? (snapshot.data().editHistory ?? []) : [];
  const entry = {
    by: user?.email ?? "Unknown",
    role: user?.role ?? "Admin",
    at: nowISO(),
  };
  const next = [...existing, entry];
  return { entry, history: next.length > 2 ? next.slice(-2) : next };
};

/** Ensure a stats bucket exists before mutating it (guards missing keys). */
const ensureBucket = (stats, key) => {
  if (!stats[key]) stats[key] = { amt: 0, count: 0 };
};

/** Zero-value stats shape (used on wipe / init). */
const zeroStats = () => ({
  total: { amt: 0, count: 0 },
  paid: { amt: 0, count: 0 },
  pending: { amt: 0, count: 0 },
  cancelled: { amt: 0, count: 0 },
});

// ── localStorage lock helpers (24-hour rate-limiting) ────────────────────────
const readLock = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const ts = parseInt(raw, 10);
  if (isNaN(ts) || Date.now() - ts >= LOCK_MS) {
    localStorage.removeItem(key);
    return null;
  }
  return ts;
};
const writeLock = (key) => localStorage.setItem(key, String(Date.now()));
const removeLock = (key) => localStorage.removeItem(key);
const lockTimeLeft = (key) => {
  const ts = readLock(key);
  if (!ts) return "";
  const rem = LOCK_MS - (Date.now() - ts);
  const h = Math.floor(rem / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
};

// ─────────────────────────────────────────────────────────────────────────────
// L1 IN-MEMORY CACHE  (module singleton — one instance per JS context / tab)
// ─────────────────────────────────────────────────────────────────────────────
const _mem = {
  data: [], // merged list of fetched invoices
  stats: null, // pre-aggregated stats object
  statsTimestamp: 0, // epoch ms of last stats fetch
  lastDoc: null, // Firestore cursor for pagination
  hasMore: false,
  filters: null, // last-applied filters (for cache-hit comparison)
  isDirty: true, // true → L1 is stale; must re-fetch from L2/L3
  version: 0, // incremented on every mutation
  lastSyncTime: 0, // epoch ms of last successful network sync
  fetching: false, // in-flight lock — prevents concurrent list fetches
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────
const invoiceService = {
  // ── Public cache accessor (read-only shape for components) ─────────────────
  get cache() {
    return _mem;
  },

  // ── Cache control ──────────────────────────────────────────────────────────
  markDirty: () => {
    _mem.isDirty = true;
    _mem.lastSyncTime = 0;
    bcPost({ type: "DIRTY" });
  },

  clearCache: () => {
    _mem.data = [];
    _mem.stats = null;
    _mem.statsTimestamp = 0;
    _mem.lastDoc = null;
    _mem.hasMore = false;
    _mem.filters = null;
    _mem.isDirty = true;
    _mem.version = 0;
    _mem.lastSyncTime = 0;
    _mem.fetching = false; // [B12] unlock in-flight guard on forced clear
    bcPost({ type: "DIRTY" });
  },

  /** True when L1 data has exceeded the TTL window. */
  isCacheStale: () => Date.now() - _mem.lastSyncTime > CACHE_TTL_MS,

  /** True when L1 stats has exceeded the stats TTL window. */
  isStatsCacheStale: () => Date.now() - _mem.statsTimestamp > STATS_TTL_MS,

  // ── Sync-status check (single document read — user-triggered only) ─────────
  /**
   * Compares the server-side `lastUpdatedAt` timestamp against our lastSyncTime.
   * Returns: 'REQUIRED' | 'UP_TO_DATE' | 'ERROR'
   * Cost: 1 read.
   */
  checkSyncStatus: async () => {
    try {
      const snap = await getDoc(doc(db, STATS_DOC));
      if (!snap.exists()) return "UP_TO_DATE";
      const serverTime = snap.data().lastUpdatedAt ?? 0;
      return serverTime > _mem.lastSyncTime ? "REQUIRED" : "UP_TO_DATE";
    } catch {
      return "ERROR";
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  /**
   * Read path (ascending cost order):
   * 1. L1 hit  — zero reads, returns immediately if not stale
   * 2. Pre-aggregated Firestore doc — 1 read (isSynced === true)
   * 3. Parallel aggregate queries — 4 reads (only when doc is unsynced)
   *
   * NEVER uses getDocs for counting.
   */
  getInvoiceStats: async (forceRefresh = false) => {
    // L1 hit — serve from memory if fresh enough
    if (!forceRefresh && _mem.stats && !invoiceService.isStatsCacheStale()) {
      return _mem.stats;
    }

    try {
      const statsRef = doc(db, STATS_DOC);
      const statsSnap = await getDoc(statsRef);

      // Pre-aggregated doc exists and is in sync → cost: 1 read total
      if (!forceRefresh && statsSnap.exists() && statsSnap.data().isSynced) {
        const s = statsSnap.data();
        _mem.stats = s;
        _mem.statsTimestamp = Date.now();
        bcPost({ type: "STATS_UPDATE", s });
        return s;
      }

      // Recompute via server-side aggregation — 4 reads, fully parallelised
      const [aggAll, aggPaid, aggPending, aggCancelled] = await Promise.all([
        getAggregateFromServer(query(invCol), {
          c: count(),
          s: sum("grandTotal"),
        }),
        getAggregateFromServer(query(invCol, where("status", "==", "Paid")), {
          c: count(),
          s: sum("grandTotal"),
        }),
        getAggregateFromServer(
          query(invCol, where("status", "==", "Pending")),
          { c: count(), s: sum("grandTotal") },
        ),
        getAggregateFromServer(
          query(invCol, where("status", "==", "Cancelled")),
          { c: count(), s: sum("grandTotal") },
        ),
      ]);

      const s = {
        total: { amt: aggAll.data().s ?? 0, count: aggAll.data().c ?? 0 },
        paid: { amt: aggPaid.data().s ?? 0, count: aggPaid.data().c ?? 0 },
        pending: {
          amt: aggPending.data().s ?? 0,
          count: aggPending.data().c ?? 0,
        },
        cancelled: {
          amt: aggCancelled.data().s ?? 0,
          count: aggCancelled.data().c ?? 0,
        },
        isSynced: true,
        lastUpdatedAt: Date.now(),
      };

      // Persist the recomputed stats — next load costs only 1 read
      await setDoc(statsRef, s);

      _mem.stats = s;
      _mem.statsTimestamp = Date.now();
      bcPost({ type: "STATS_UPDATE", s });
      return s;
    } catch (err) {
      console.warn("[invoiceService] getInvoiceStats error:", err);
      // Degrade gracefully — return stale L1 rather than crashing the UI
      return _mem.stats ?? zeroStats();
    }
  },

  // ── List / paginate ────────────────────────────────────────────────────────
  /**
   * [B1] Returns ONLY the current page — the component is responsible for
   * merging pages when the user taps "Load More".
   *
   * [B7] In-flight lock prevents concurrent calls from racing.
   *
   * L1 cache-hit rule (initial load only):
   * isDirty=false AND not stale AND filters match → zero reads.
   */
  getAllInvoices: async (filters = {}, cursorDoc = null) => {
    // ── In-flight guard ───────────────────────────────────────────────────
    if (_mem.fetching) {
      return {
        data: [],
        lastVisible: _mem.lastDoc,
        hasMore: _mem.hasMore,
        fromCache: true,
      };
    }

    const isLoadMore = !!cursorDoc;
    const filterKey = JSON.stringify(filters);
    const cachedKey = JSON.stringify(_mem.filters);

    // ── L1 cache hit (initial page only) ──────────────────────────────────
    if (
      !isLoadMore &&
      !_mem.isDirty &&
      !invoiceService.isCacheStale() &&
      filterKey === cachedKey
    ) {
      return {
        data: _mem.data,
        lastVisible: _mem.lastDoc,
        hasMore: _mem.hasMore,
        fromCache: true,
      };
    }

    _mem.fetching = true;
    try {
      const constraints = invoiceService._buildQueryConstraints(
        filters,
        cursorDoc,
      );
      const snapshot = await getDocs(query(invCol, ...constraints));

      const page = snapshot.docs.map((d) => ({ _id: d.id, ...d.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] ?? null;
      const hasMore = page.length === PAGE_SIZE;

      // Merge into L1 (component reads _mem.data for load-more display)
      const merged = isLoadMore ? [..._mem.data, ...page] : page;
      _mem.data = merged;
      _mem.lastDoc = lastVisible;
      _mem.hasMore = hasMore;
      _mem.filters = filters;
      _mem.isDirty = false;
      _mem.lastSyncTime = Date.now();
      _mem.version += 1;

      // Return only the new page so the component can decide how to merge
      return { data: page, lastVisible, hasMore, fromCache: false };
    } finally {
      _mem.fetching = false;
    }
  },

  /**
   * Builds Firestore query constraints from filter values.
   *
   * [B3] Name search now includes orderBy("clientNameLower") — required by
   * Firestore when applying a range (>= / <=) on that field.
   *
   * Constraint groupings (mutually exclusive):
   * a) search  → range on invoiceNumber OR clientNameLower
   * b) amount  → range on grandTotal
   * c) date    → range on date
   * d) default → orderBy createdAt DESC
   *
   * All paths respect status (equality) and exactDate (equality) filters,
   * except 'search' which resets other filters on the client before calling.
   */
  _buildQueryConstraints: (filters, cursorDoc) => {
    const c = [];

    if (filters.status && filters.status !== "All") {
      c.push(where("status", "==", filters.status));
    }

    if (filters.exactDate) {
      c.push(where("date", "==", filters.exactDate));
    }

    // ── a) Text search (range — returns early, no other range combined) ───
    if (filters.search) {
      const raw = filters.search.trim();
      const isInvNum = /^\d+$/.test(raw) || /^inv/i.test(raw);

      if (isInvNum) {
        const cleanStr = raw.toUpperCase();
        const target = cleanStr.startsWith("INV")
          ? cleanStr
          : `INV-${cleanStr}`;

        c.push(
          where("invoiceNumber", ">=", target),
          where("invoiceNumber", "<=", target + "\uf8ff"),
          orderBy("invoiceNumber"),
        );
      } else {
        const lower = raw.toLowerCase();
        c.push(
          where("clientNameLower", ">=", lower),
          where("clientNameLower", "<=", lower + "\uf8ff"),
          orderBy("clientNameLower"), // [B3] was missing
        );
      }

      c.push(limit(PAGE_SIZE));
      if (cursorDoc) c.push(startAfter(cursorDoc));
      return c;
    }

    // ── b) Amount range (inequality on grandTotal) ─────────────────────────
    if (filters.amount && filters.amount !== "All") {
      if (filters.amount === "Under10k")
        c.push(where("grandTotal", "<", 10_000));
      else if (filters.amount === "10k-50k")
        c.push(
          where("grandTotal", ">=", 10_000),
          where("grandTotal", "<=", 50_000),
        );
      else if (filters.amount === "Above50k")
        c.push(where("grandTotal", ">", 50_000));

      c.push(orderBy("grandTotal", "desc"));
      c.push(limit(PAGE_SIZE));
      if (cursorDoc) c.push(startAfter(cursorDoc));
      return c;
    }

    // ── c) Date range ──────────────────────────────────────────────────────
    if (filters.date && filters.date !== "All" && !filters.exactDate) {
      const today = new Date();
      const todayStr = toDateStr(today);
      let startStr = "";
      let endStr = todayStr;

      if (filters.date === "Last7Days") {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        startStr = toDateStr(d);
      } else if (filters.date === "Last30Days") {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        startStr = toDateStr(d);
      } else if (filters.date === "ThisMonth") {
        startStr = toDateStr(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        endStr = toDateStr(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
      }

      c.push(
        where("date", ">=", startStr),
        where("date", "<=", endStr),
        orderBy("date", "desc"),
      );
      c.push(limit(PAGE_SIZE));
      if (cursorDoc) c.push(startAfter(cursorDoc));
      return c;
    }

    // ── d) Default ordering ────────────────────────────────────────────────
    c.push(orderBy("createdAt", "desc"));
    c.push(limit(PAGE_SIZE));
    if (cursorDoc) c.push(startAfter(cursorDoc));
    return c;
  },

  // ── Single document ────────────────────────────────────────────────────────
  /**
   * [B11] Attempts L1 hit regardless of isDirty — the local object is always
   * valid for read/view; isDirty only signals list staleness.
   * Falls through to Firestore (L2 → L3) only if not in L1.
   */
  getInvoiceById: async (id) => {
    const local = _mem.data.find((inv) => inv._id === id);
    if (local) return { data: local };

    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) throw new Error("Invoice not found");
    return { data: { _id: snap.id, ...snap.data() } };
  },

  // ── Create ─────────────────────────────────────────────────────────────────
  /**
   * [B4] ensureBucket() guards all stats keys, including uncommon statuses.
   *
   * Write cost: 2 (invoice doc + stats doc via batch).
   * Read  cost: 0 (L1 updated optimistically).
   */
  createInvoice: async (invoiceData, user) => {
    const serverTime = Date.now();
    const payload = {
      ...invoiceData,
      clientNameLower: invoiceData.client.name.toLowerCase(),
      createdAt: nowISO(),
      createdBy: user?.email ?? "Unknown",
      createdRole: user?.role ?? "Admin",
    };

    const newDocRef = doc(invCol);
    const batch = writeBatch(db);
    batch.set(newDocRef, payload);

    const amt = Number(payload.grandTotal) || 0;
    const statusKey = (payload.status ?? "Pending").toLowerCase();

    batch.set(
      doc(db, STATS_DOC),
      {
        total: { amt: increment(amt), count: increment(1) },
        [statusKey]: { amt: increment(amt), count: increment(1) },
        isSynced: false,
        lastUpdatedAt: serverTime,
      },
      { merge: true },
    );

    await batch.commit();

    // Optimistic L1 update — no re-fetch needed
    const newInv = { _id: newDocRef.id, ...payload };
    _mem.data.unshift(newInv);
    _mem.version += 1;
    _mem.lastSyncTime = serverTime;
    _mem.isDirty = false;

    if (_mem.stats) {
      ensureBucket(_mem.stats, "total");
      ensureBucket(_mem.stats, statusKey); // [B4]
      _mem.stats.total.amt += amt;
      _mem.stats.total.count += 1;
      _mem.stats[statusKey].amt += amt;
      _mem.stats[statusKey].count += 1;
      _mem.statsTimestamp = serverTime;
    }

    bcPost({ type: "DIRTY" });
    return { data: newInv };
  },

  // ── Full update ────────────────────────────────────────────────────────────
  /**
   * Read cost:  1 (old snapshot for history diff + amount diff).
   * Write cost: 2 (invoice doc + stats doc via batch).
   */
  updateInvoice: async (id, invoiceData, user) => {
    const oldSnap = await getDoc(doc(db, COLLECTION, id));
    if (!oldSnap.exists()) throw new Error("Invoice not found");

    const old = oldSnap.data();
    const oldAmt = Number(old.grandTotal) || 0;
    const oldStatus = (old.status ?? "Pending").toLowerCase();
    const newAmt = Number(invoiceData.grandTotal) || 0;
    const newStatus = (invoiceData.status ?? "Pending").toLowerCase();
    const serverTime = Date.now();

    const { entry, history } = buildEditHistory(oldSnap, user);
    const batch = writeBatch(db);
    const docRef = doc(db, COLLECTION, id);
    const statsRef = doc(db, STATS_DOC);

    batch.update(docRef, {
      ...invoiceData,
      clientNameLower: invoiceData.client.name.toLowerCase(),
      lastEditedBy: entry.by,
      lastEditedRole: entry.role,
      lastEditedAt: entry.at,
      editHistory: history,
    });

    // Minimal stats delta — only write the diff
    if (oldStatus === newStatus) {
      const diff = newAmt - oldAmt;
      if (diff !== 0) {
        batch.set(
          statsRef,
          {
            total: { amt: increment(diff) },
            [newStatus]: { amt: increment(diff) },
            isSynced: false,
            lastUpdatedAt: serverTime,
          },
          { merge: true },
        );
      }
    } else {
      batch.set(
        statsRef,
        {
          total: { amt: increment(newAmt - oldAmt) },
          [oldStatus]: { amt: increment(-oldAmt), count: increment(-1) },
          [newStatus]: { amt: increment(newAmt), count: increment(1) },
          isSynced: false,
          lastUpdatedAt: serverTime,
        },
        { merge: true },
      );
    }

    await batch.commit();

    // Patch L1 in-place (no re-fetch)
    const idx = _mem.data.findIndex((i) => i._id === id);
    if (idx !== -1) {
      _mem.data[idx] = {
        ...old,
        ...invoiceData,
        clientNameLower: invoiceData.client.name.toLowerCase(),
        editHistory: history,
        lastEditedAt: entry.at,
        lastEditedBy: entry.by,
        lastEditedRole: entry.role,
        _id: id,
      };
    }
    _mem.version += 1;
    _mem.lastSyncTime = serverTime;

    if (_mem.stats) {
      ensureBucket(_mem.stats, oldStatus);
      ensureBucket(_mem.stats, newStatus);
      _mem.stats.total.amt = Math.max(
        0,
        _mem.stats.total.amt - oldAmt + newAmt,
      );
      if (oldStatus !== newStatus) {
        _mem.stats[oldStatus].amt = Math.max(
          0,
          _mem.stats[oldStatus].amt - oldAmt,
        );
        _mem.stats[oldStatus].count = Math.max(
          0,
          _mem.stats[oldStatus].count - 1,
        );
        _mem.stats[newStatus].amt += newAmt;
        _mem.stats[newStatus].count += 1;
      } else {
        _mem.stats[newStatus].amt += newAmt - oldAmt;
      }
      _mem.statsTimestamp = serverTime;
    }

    bcPost({ type: "DIRTY" });
    return { message: "Updated" };
  },

  // ── Status-only update ─────────────────────────────────────────────────────
  /**
   * [B2] Patches _mem.data[idx] in-place so navigating back reflects the
   * new status without requiring a list re-fetch.
   *
   * Read cost:  1 (old snapshot for amount + history).
   * Write cost: 2 (invoice doc + stats doc via batch).
   */
  updateStatus: async (id, newStatus, user) => {
    const oldSnap = await getDoc(doc(db, COLLECTION, id));
    if (!oldSnap.exists()) return { message: "Not found" };

    const old = oldSnap.data();
    const amt = Number(old.grandTotal) || 0;
    const oldStatus = (old.status ?? "Pending").toLowerCase();
    const tgt = newStatus.toLowerCase();

    if (oldStatus === tgt) return { message: "Status unchanged" };

    const { entry, history } = buildEditHistory(oldSnap, user);
    const serverTime = Date.now();
    const batch = writeBatch(db);

    batch.update(doc(db, COLLECTION, id), {
      status: newStatus,
      lastEditedBy: entry.by,
      lastEditedRole: entry.role,
      lastEditedAt: entry.at,
      editHistory: history,
    });

    batch.set(
      doc(db, STATS_DOC),
      {
        [oldStatus]: { amt: increment(-amt), count: increment(-1) },
        [tgt]: { amt: increment(amt), count: increment(1) },
        isSynced: false,
        lastUpdatedAt: serverTime,
      },
      { merge: true },
    );

    await batch.commit();

    // [B2] Patch L1 in-place
    const idx = _mem.data.findIndex((i) => i._id === id);
    if (idx !== -1) {
      _mem.data[idx] = {
        ..._mem.data[idx],
        status: newStatus,
        editHistory: history,
        lastEditedAt: entry.at,
        lastEditedBy: entry.by,
        lastEditedRole: entry.role,
      };
    }
    _mem.version += 1;
    _mem.lastSyncTime = serverTime;

    if (_mem.stats) {
      ensureBucket(_mem.stats, oldStatus);
      ensureBucket(_mem.stats, tgt);
      _mem.stats[oldStatus].amt = Math.max(0, _mem.stats[oldStatus].amt - amt);
      _mem.stats[oldStatus].count = Math.max(
        0,
        _mem.stats[oldStatus].count - 1,
      );
      _mem.stats[tgt].amt += amt;
      _mem.stats[tgt].count += 1;
      _mem.statsTimestamp = serverTime;
    }

    bcPost({ type: "DIRTY" });
    return { message: "Status updated" };
  },

  // ── Delete single ──────────────────────────────────────────────────────────
  /**
   * [B10] Filters L1 using _id (not id) — matches the shape stored by
   * getAllInvoices.
   *
   * Read cost:  1 (old snapshot for amount / status).
   * Write cost: 2 (invoice doc delete + stats doc via batch).
   */
  deleteInvoice: async (id, user) => {
    const role = user?.data?.role ?? user?.role;
    if (role === "manager") throw new Error("Action Denied.");

    const oldSnap = await getDoc(doc(db, COLLECTION, id));
    if (!oldSnap.exists()) return;

    const data = oldSnap.data();
    const amt = Number(data.grandTotal) || 0;
    const statusKey = (data.status ?? "Pending").toLowerCase();
    const serverTime = Date.now();

    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTION, id));
    batch.set(
      doc(db, STATS_DOC),
      {
        total: { amt: increment(-amt), count: increment(-1) },
        [statusKey]: { amt: increment(-amt), count: increment(-1) },
        isSynced: false,
        lastUpdatedAt: serverTime,
      },
      { merge: true },
    );

    await batch.commit();

    // [B10] Patch L1
    _mem.data = _mem.data.filter((i) => i._id !== id);
    _mem.version += 1;
    _mem.lastSyncTime = serverTime;

    if (_mem.stats) {
      ensureBucket(_mem.stats, "total");
      ensureBucket(_mem.stats, statusKey);
      _mem.stats.total.amt = Math.max(0, _mem.stats.total.amt - amt);
      _mem.stats.total.count = Math.max(0, _mem.stats.total.count - 1);
      _mem.stats[statusKey].amt = Math.max(0, _mem.stats[statusKey].amt - amt);
      _mem.stats[statusKey].count = Math.max(
        0,
        _mem.stats[statusKey].count - 1,
      );
      _mem.statsTimestamp = serverTime;
    }

    bcPost({ type: "DIRTY" });
    return { message: "Deleted" };
  },

  // ── Wipe all ───────────────────────────────────────────────────────────────
  /**
   * [B5] Clears / resets _mem.stats on both partial AND full wipe.
   *
   * Safety chain:
   * 1. Role guard     (managers blocked)
   * 2. Re-auth        (password verification via Firebase Auth)
   * 3. Batch delete   (loops of BATCH_SIZE, capped at SAFE_DAILY_OPS)
   * 4. Partial path   → lock 24 h, mark stats doc dirty
   * 5. Full path      → reset stats doc, remove lock, clear L1
   *
   * Write cost: ceil(count / BATCH_SIZE) batches + 1 stats write.
   * Read  cost: ceil(count / BATCH_SIZE) getDocs (required for batch refs).
   */
  deleteAllInvoices: async ({ password, email, user }) => {
    const role = user?.data?.role ?? user?.role;
    if (role === "manager") throw new Error("Action Denied.");
    if (!password || !email) throw new Error("Authentication Error.");

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Active session mismatch.");

    try {
      await reauthenticateWithCredential(
        currentUser,
        EmailAuthProvider.credential(currentUser.email, password),
      );
    } catch {
      throw new Error("Incorrect Admin Password.");
    }

    let totalDeleted = 0;
    let hasMoreDocs = true;

    while (hasMoreDocs && totalDeleted < SAFE_DAILY_OPS) {
      const remaining = SAFE_DAILY_OPS - totalDeleted;
      const batchLimit = Math.min(BATCH_SIZE, remaining);

      const snapshot = await getDocs(query(invCol, limit(batchLimit)));
      if (snapshot.empty) {
        hasMoreDocs = false;
        break;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      totalDeleted += snapshot.docs.length;
      if (snapshot.docs.length < batchLimit) hasMoreDocs = false;
    }

    // [B5] Always reset L1 so stat cards don't show inflated numbers
    invoiceService.clearCache(); // also posts DIRTY to sibling tabs

    const serverTime = Date.now();

    if (!hasMoreDocs) {
      // Full wipe — reset stats doc and unlock
      removeLock("wipe_lock");
      const s = { ...zeroStats(), isSynced: true, lastUpdatedAt: serverTime };
      await setDoc(doc(db, STATS_DOC), s);
      _mem.stats = s;
      _mem.statsTimestamp = serverTime;
      bcPost({ type: "STATS_UPDATE", s });
      return {
        success: true,
        isPartial: false,
        message: "All invoices cleared successfully.",
      };
    }

    // Partial wipe — apply 24-hour lock
    writeLock("wipe_lock");
    await setDoc(
      doc(db, STATS_DOC),
      { isSynced: false, lastUpdatedAt: serverTime },
      { merge: true },
    );

    return {
      success: true,
      isPartial: true,
      message: `⚠️ ${totalDeleted.toLocaleString()} records deleted. Daily limit reached — locked for 24 h.`,
    };
  },

  // ── Export / backup ────────────────────────────────────────────────────────
  /**
   * [B6] Cursor uses snapshot.docs[snapshot.docs.length - 1] (array index),
   * NOT a forEach-reassigned variable — avoids stale-closure bug.
   *
   * Returns { data, hasMore, part }
   * hasMore=true → lock applied; user must resume tomorrow.
   *
   * Read cost: ceil(rows / BATCH_SIZE) getDocs per call.
   */
  getFullBackupByMonth: async (monthStr) => {
    const lockKey = `backup_lock_${monthStr}`;
    const resumeKey = `backup_resume_${monthStr}`;

    if (readLock(lockKey))
      throw new Error("Backup locked for this month. Resume tomorrow.");

    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-31`; // lexicographic upper bound covers all months

    // Resolve resume cursor
    let cursorSnap = null;
    let partNumber = 1;
    const resumeRaw = localStorage.getItem(resumeKey);
    if (resumeRaw) {
      try {
        const { lastId, part } = JSON.parse(resumeRaw);
        partNumber = part + 1;
        const snap = await getDoc(doc(db, COLLECTION, lastId));
        if (snap.exists()) cursorSnap = snap;
      } catch {
        // cursor doc gone — start fresh for this part
      }
    }

    const allData = [];
    let fetched = 0;

    while (fetched < SAFE_DAILY_OPS) {
      const remaining = SAFE_DAILY_OPS - fetched;
      const batchLimit = Math.min(BATCH_SIZE, remaining);

      const constraints = [
        where("date", ">=", startDate),
        where("date", "<=", endDate + "\uf8ff"),
        orderBy("date", "asc"),
        limit(batchLimit),
      ];
      if (cursorSnap) constraints.push(startAfter(cursorSnap));

      const snapshot = await getDocs(query(invCol, ...constraints));
      if (snapshot.empty) break;

      snapshot.docs.forEach((d) => allData.push({ _id: d.id, ...d.data() }));
      fetched += snapshot.docs.length;

      // [B6] Use array index — forEach ref is a stale closure
      cursorSnap = snapshot.docs[snapshot.docs.length - 1];

      if (snapshot.docs.length < batchLimit) break;
    }

    if (fetched >= SAFE_DAILY_OPS && cursorSnap) {
      localStorage.setItem(
        resumeKey,
        JSON.stringify({ lastId: cursorSnap.id, part: partNumber }),
      );
      writeLock(lockKey);
      return { data: allData, hasMore: true, part: partNumber };
    }

    localStorage.removeItem(resumeKey);
    return { data: allData, hasMore: false, part: partNumber };
  },

  // ── Lock-status helpers (pure localStorage reads — zero Firestore calls) ───
  getWipeLockStatus: () => {
    const ts = readLock("wipe_lock");
    if (!ts) return { locked: false, timeLeft: "" };
    return {
      locked: true,
      timeLeft: `Locked for ${lockTimeLeft("wipe_lock")}`,
    };
  },

  getBackupLockStatus: (monthStr) => {
    const lockKey = `backup_lock_${monthStr}`;
    const resumeKey = `backup_resume_${monthStr}`;
    const ts = readLock(lockKey);
    const hasResume = !!localStorage.getItem(resumeKey);

    if (!ts)
      return {
        locked: false,
        timeLeft: "",
        label: hasResume ? "Resume Backup" : "Download Backup",
      };

    return {
      locked: true,
      timeLeft: `Available in ${lockTimeLeft(lockKey)}`,
      label: hasResume ? "Resume Locked" : "Backup Locked",
    };
  },
};

export default invoiceService;
