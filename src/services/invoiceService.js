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
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const COLLECTION = "invoices";
const STATS_DOC = "metadata/invoiceStats";
const PAGE_SIZE = 50;
export const MAX_DISPLAY = 2_000;
const SAFE_DAILY_OPS = 2_500;
const BATCH_SIZE = 500;
const CACHE_TTL_MS = 5 * 60 * 1_000;
const STATS_TTL_MS = 10 * 60 * 1_000;
const LOCK_MS = 24 * 60 * 60 * 1_000;
const BC_CHANNEL = "invoice_cache_sync";

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
  } catch {}
};

const nowISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString();
};

const toDateStr = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .split("T")[0];

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

const ensureBucket = (stats, key) => {
  if (!stats[key]) stats[key] = { amt: 0, count: 0 };
};

const zeroStats = () => ({
  total: { amt: 0, count: 0 },
  paid: { amt: 0, count: 0 },
  pending: { amt: 0, count: 0 },
  cancelled: { amt: 0, count: 0 },
});

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

const _mem = {
  data: [],
  stats: null,
  statsTimestamp: 0,
  lastDoc: null,
  hasMore: false,
  filters: null,
  isDirty: true,
  version: 0,
  lastSyncTime: 0,
  fetching: false,
};

const invCol = collection(db, COLLECTION);

const invoiceService = {
  get cache() {
    return _mem;
  },
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
    _mem.fetching = false;
    bcPost({ type: "DIRTY" });
  },
  isCacheStale: () => Date.now() - _mem.lastSyncTime > CACHE_TTL_MS,
  isStatsCacheStale: () => Date.now() - _mem.statsTimestamp > STATS_TTL_MS,

  checkSyncStatus: async () => {
    try {
      const snap = await getDoc(doc(db, STATS_DOC));
      if (!snap.exists()) return "UP_TO_DATE";
      return (snap.data().lastUpdatedAt ?? 0) > _mem.lastSyncTime
        ? "REQUIRED"
        : "UP_TO_DATE";
    } catch {
      return "ERROR";
    }
  },

  getInvoiceStats: async (forceRefresh = false) => {
    if (!forceRefresh && _mem.stats && !invoiceService.isStatsCacheStale())
      return _mem.stats;
    try {
      const statsRef = doc(db, STATS_DOC);
      const statsSnap = await getDoc(statsRef);
      if (!forceRefresh && statsSnap.exists() && statsSnap.data().isSynced) {
        const s = statsSnap.data();
        _mem.stats = s;
        _mem.statsTimestamp = Date.now();
        bcPost({ type: "STATS_UPDATE", s });
        return s;
      }
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
      await setDoc(statsRef, s);
      _mem.stats = s;
      _mem.statsTimestamp = Date.now();
      bcPost({ type: "STATS_UPDATE", s });
      return s;
    } catch (err) {
      console.warn("[invoiceService] getInvoiceStats error:", err);
      return _mem.stats ?? zeroStats();
    }
  },

  getAllInvoices: async (filters = {}, cursorDoc = null) => {
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

      const merged = isLoadMore ? [..._mem.data, ...page] : page;
      _mem.data = merged;
      _mem.lastDoc = lastVisible;
      _mem.hasMore = hasMore;
      _mem.filters = filters;
      _mem.isDirty = false;
      _mem.lastSyncTime = Date.now();
      _mem.version += 1;
      return { data: page, lastVisible, hasMore, fromCache: false };
    } finally {
      _mem.fetching = false;
    }
  },

  _buildQueryConstraints: (filters, cursorDoc) => {
    const c = [];
    if (filters.status && filters.status !== "All")
      c.push(where("status", "==", filters.status));
    if (filters.exactDate) c.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      const raw = filters.search.trim();
      if (/^\d+$/.test(raw) || /^inv/i.test(raw)) {
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
          orderBy("clientNameLower"),
        );
      }
      c.push(limit(PAGE_SIZE));
      if (cursorDoc) c.push(startAfter(cursorDoc));
      return c;
    }

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

    if (filters.date && filters.date !== "All" && !filters.exactDate) {
      const today = new Date();
      let startStr = "",
        endStr = toDateStr(today);
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

    c.push(orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    if (cursorDoc) c.push(startAfter(cursorDoc));
    return c;
  },

  getInvoiceById: async (id) => {
    const local = _mem.data.find((inv) => inv._id === id);
    if (local) return { data: local };
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) throw new Error("Invoice not found");
    return { data: { _id: snap.id, ...snap.data() } };
  },

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

    const newInv = { _id: newDocRef.id, ...payload };
    _mem.data.unshift(newInv);
    _mem.version += 1;
    _mem.lastSyncTime = serverTime;
    _mem.isDirty = false;
    if (_mem.stats) {
      ensureBucket(_mem.stats, "total");
      ensureBucket(_mem.stats, statusKey);
      _mem.stats.total.amt += amt;
      _mem.stats.total.count += 1;
      _mem.stats[statusKey].amt += amt;
      _mem.stats[statusKey].count += 1;
      _mem.statsTimestamp = serverTime;
    }
    bcPost({ type: "DIRTY" });
    return { data: newInv };
  },

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

    invoiceService.clearCache();
    const serverTime = Date.now();

    if (!hasMoreDocs) {
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

  getFullBackupByMonth: async (monthStr) => {
    const lockKey = `backup_lock_${monthStr}`;
    const resumeKey = `backup_resume_${monthStr}`;

    if (readLock(lockKey))
      throw new Error("Backup locked for this month. Resume tomorrow.");

    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-31`;
    let cursorSnap = null;
    let partNumber = 1;
    const resumeRaw = localStorage.getItem(resumeKey);
    if (resumeRaw) {
      try {
        const { lastId, part } = JSON.parse(resumeRaw);
        partNumber = part + 1;
        const snap = await getDoc(doc(db, COLLECTION, lastId));
        if (snap.exists()) cursorSnap = snap;
      } catch {}
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
