import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  Filter,
  Search,
  X,
  Users,
  IndianRupee,
  Layers,
  Edit,
  Trash2,
  AlertCircle,
  History,
  Calendar,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCcw,
  ChevronRight,
  CheckCircle,
  Database,
  Download,
  FileText,
  ChevronDown,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  documentId,
} from "firebase/firestore";
import { db } from "../../config/firebase";

// --- HELPER FUNCTIONS ---
const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const dateOnly =
      typeof dateStr === "string" && dateStr.includes("T")
        ? dateStr.split("T")[0]
        : dateStr;
    const parts = typeof dateOnly === "string" ? dateOnly.split("-") : [];
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(dateStr);
  } catch (e) {
    return "-";
  }
};

const parseProduct = (fullName) => {
  if (!fullName) return { name: "-", size: "-" };
  if (typeof fullName === "string" && fullName.includes("(")) {
    const parts = fullName.split("(");
    return {
      name: parts[0]?.trim() || "-",
      size: parts[1]?.replace(")", "").trim() || "-",
    };
  }
  return { name: fullName || "-", size: "-" };
};

const formatLogDateFull = (isoString) => {
  if (!isoString) return "N/A";
  try {
    return new Date(isoString).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "-";
  }
};

// --- GLOBAL CACHE (Memory persists across Tab & Page navigation) ---
let globalProdReportCache = {
  productionLogs: [],
  labourLogs: [],
  duesLogs: [],
  stats: { output: 0, paid: 0, due: 0 },
  lastDocs: { production: null, labour: null, dues: null },
  hasMore: { production: false, labour: false, dues: false },
  loadedCounts: { production: 0, labour: 0, dues: 0 },
  fetchedTabs: { production: false, labour: false, dues: false },
  filters: {
    search: "",
    product: "All",
    quantity: "All",
    date: "All",
    exactDate: "",
  },
  isStatsSynced: true,
};

const validateCache = () => {
  if (!globalProdReportCache || !globalProdReportCache.fetchedTabs) {
    globalProdReportCache = {
      productionLogs: [],
      labourLogs: [],
      duesLogs: [],
      stats: { output: 0, paid: 0, due: 0 },
      lastDocs: { production: null, labour: null, dues: null },
      hasMore: { production: false, labour: false, dues: false },
      loadedCounts: { production: 0, labour: 0, dues: 0 },
      fetchedTabs: { production: false, labour: false, dues: false },
      filters: {
        search: "",
        product: "All",
        quantity: "All",
        date: "All",
        exactDate: "",
      },
      isStatsSynced: true,
    };
  }
};
validateCache();

const ProductionReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [activeTab, setActiveTab] = useState("production");
  const [productionLogs, setProductionLogs] = useState(
    globalProdReportCache?.productionLogs || [],
  );
  const [labourLogs, setLabourLogs] = useState(
    globalProdReportCache?.labourLogs || [],
  );
  const [duesLogs, setDuesLogs] = useState(
    globalProdReportCache?.duesLogs || [],
  );
  const [stats, setStats] = useState(
    globalProdReportCache?.stats || { output: 0, paid: 0, due: 0 },
  );
  const [hasMore, setHasMore] = useState(
    globalProdReportCache?.hasMore || {
      production: false,
      labour: false,
      dues: false,
    },
  );
  const [loadedCounts, setLoadedCounts] = useState(
    globalProdReportCache?.loadedCounts || {
      production: 0,
      labour: 0,
      dues: 0,
    },
  );
  const [lastDocs, setLastDocs] = useState(
    globalProdReportCache?.lastDocs || {
      production: null,
      labour: null,
      dues: null,
    },
  );
  const [loading, setLoading] = useState(
    !globalProdReportCache?.fetchedTabs?.production,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [isStatsSynced, setIsStatsSynced] = useState(
    globalProdReportCache?.isStatsSynced ?? true,
  );

  const searchParams = new URLSearchParams(location?.search || "");
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const processedHighlight = useRef(null);

  const currentPath =
    typeof window !== "undefined" && location?.pathname === "/"
      ? window.location.pathname
      : location?.pathname || "";
  const isTransport = currentPath.includes("/transportation");

  const defaultFilters = {
    search: "",
    product: "All",
    quantity: "All",
    date: "All",
    exactDate: "",
  };

  const [localFilters, setLocalFilters] = useState(
    globalProdReportCache?.filters || defaultFilters,
  );

  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [logModalInfo, setLogModalInfo] = useState({
    isOpen: false,
    data: null,
    tabType: "production",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";
  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [serverLockTime, setServerLockTime] = useState(null);
  const [backupResumePart, setBackupResumePart] = useState(null);
  const [isBackupLocked, setIsBackupLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const hasActiveFilters =
    (localFilters?.search || "") !== "" ||
    (localFilters?.product || "All") !== "All" ||
    (localFilters?.quantity || "All") !== "All" ||
    (localFilters?.date || "All") !== "All" ||
    (localFilters?.exactDate || "") !== "";

  const RECORDS_PER_PAGE = 50;
  const SCROLL_LIMIT = 5000;

  useEffect(() => {
    if (isDeleteAllOpen) {
      const getLock = async () => {
        const collectionName =
          activeTab === "production" ? "production" : "labour_payouts";
        const state = await productionService.getBackupState(
          `${collectionName}_${backupMonth}`,
        );
        if (state) {
          setBackupResumePart((state.part || 0) + 1);
          setServerLockTime(state.lockedUntil || null);
        } else {
          setBackupResumePart(null);
          setServerLockTime(null);
        }
      };
      getLock();
    }
  }, [isDeleteAllOpen, backupMonth, activeTab]);

  useEffect(() => {
    if (!serverLockTime) {
      setIsBackupLocked(false);
      return;
    }
    const updateCountdown = () => {
      const diff = serverLockTime - Date.now();
      if (diff > 0) {
        setIsBackupLocked(true);
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setLockTimeRemaining(`${hrs}h ${mins}m`);
      } else {
        setIsBackupLocked(false);
        setServerLockTime(null);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [serverLockTime]);

  const groupedDuesUI = useMemo(() => {
    if (activeTab !== "dues") return [];
    const map = {};
    const searchLower = localFilters?.search?.trim().toLowerCase() || "";
    (duesLogs || []).forEach((log) => {
      const party = log?.labourName || "Unknown Party";
      if (searchLower && !party.toLowerCase().includes(searchLower)) return;
      if (!map[party])
        map[party] = {
          partyName: party,
          category: log?.payoutCategory || "Labour",
          totalDue: 0,
          records: [],
        };
      map[party].totalDue += Number(log?.amountDue || 0);
      map[party].records.push(log);
    });
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [duesLogs, localFilters?.search, activeTab]);

  const fetchLogs = async (isLoadMore = false, overrideFilters = null) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      let currentStats = stats;
      if (!isLoadMore) {
        const s = await productionService.getStats();
        currentStats = s || { output: 0, paid: 0, due: 0 };
        setStats(currentStats);
        globalProdReportCache.stats = currentStats;
      }

      let response;
      const currentLastDoc = lastDocs?.[activeTab] || null;
      const safeFilters =
        overrideFilters || globalProdReportCache?.filters || defaultFilters;

      if (activeTab === "production") {
        response = await productionService.getAllProduction(
          safeFilters,
          isLoadMore ? currentLastDoc : null,
          RECORDS_PER_PAGE,
        );
      } else if (activeTab === "labour") {
        response = await productionService.getAllLabourPayouts(
          safeFilters,
          isLoadMore ? currentLastDoc : null,
          RECORDS_PER_PAGE,
          false,
        );
      } else if (activeTab === "dues") {
        response = await productionService.getAllLabourPayouts(
          safeFilters,
          isLoadMore ? currentLastDoc : null,
          RECORDS_PER_PAGE,
          true,
        );
      }

      const fetchedDataLength = response?.data?.length || 0;
      const newDoc = response?.lastVisible || null;
      const newHasMore = fetchedDataLength === RECORDS_PER_PAGE;

      const noFiltersApplied =
        !safeFilters.search &&
        safeFilters.product === "All" &&
        safeFilters.quantity === "All" &&
        safeFilters.date === "All" &&
        !safeFilters.exactDate;

      if (!isLoadMore) {
        let isSynced = true;
        const hasData = response?.data && response.data.length > 0;

        if (noFiltersApplied) {
          if (
            activeTab === "production" &&
            hasData &&
            currentStats.output === 0
          )
            isSynced = false;
          else if (
            activeTab === "production" &&
            !hasData &&
            currentStats.output > 0
          )
            isSynced = false;
          else if (activeTab === "labour" && hasData && currentStats.paid === 0)
            isSynced = false;
          else if (activeTab === "labour" && !hasData && currentStats.paid > 0)
            isSynced = false;
          else if (activeTab === "dues" && hasData && currentStats.due === 0)
            isSynced = false;
          else if (activeTab === "dues" && !hasData && currentStats.due > 0)
            isSynced = false;
        } else {
          isSynced = isStatsSynced;
        }

        setIsStatsSynced(isSynced);
        globalProdReportCache.isStatsSynced = isSynced;
      }

      if (activeTab === "production") {
        const newData = isLoadMore
          ? [...(productionLogs || []), ...(response?.data || [])]
          : response?.data || [];
        setProductionLogs(newData);
        globalProdReportCache.productionLogs = newData;
      } else if (activeTab === "labour") {
        const newData = isLoadMore
          ? [...(labourLogs || []), ...(response?.data || [])]
          : response?.data || [];
        setLabourLogs(newData);
        globalProdReportCache.labourLogs = newData;
      } else {
        const newData = isLoadMore
          ? [...(duesLogs || []), ...(response?.data || [])]
          : response?.data || [];
        setDuesLogs(newData);
        globalProdReportCache.duesLogs = newData;
      }

      setLoadedCounts((prev) => {
        const currentCount = prev?.[activeTab] || 0;
        const updated = {
          ...(prev || {}),
          [activeTab]: isLoadMore
            ? currentCount + fetchedDataLength
            : fetchedDataLength,
        };
        globalProdReportCache.loadedCounts = updated;
        return updated;
      });

      setLastDocs((prev) => {
        const updated = { ...(prev || {}), [activeTab]: newDoc };
        globalProdReportCache.lastDocs = updated;
        return updated;
      });

      setHasMore((prev) => {
        const updated = { ...(prev || {}), [activeTab]: newHasMore };
        globalProdReportCache.hasMore = updated;
        return updated;
      });

      if (globalProdReportCache.fetchedTabs) {
        globalProdReportCache.fetchedTabs[activeTab] = true;
      }
    } catch (error) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const needsRefresh =
      sessionStorage.getItem("prod_report_needs_refresh") === "true";

    if (needsRefresh) {
      sessionStorage.removeItem("prod_report_needs_refresh");
      globalProdReportCache.fetchedTabs = {
        production: false,
        labour: false,
        dues: false,
      };
      fetchLogs(false);
    } else if (!globalProdReportCache?.fetchedTabs?.[activeTab]) {
      fetchLogs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    globalProdReportCache.filters = localFilters;
    globalProdReportCache.fetchedTabs = {
      production: false,
      labour: false,
      dues: false,
    };
    fetchLogs(false, localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters(defaultFilters);
    globalProdReportCache.filters = defaultFilters;
    globalProdReportCache.fetchedTabs = {
      production: false,
      labour: false,
      dues: false,
    };
    fetchLogs(false, defaultFilters);
  };

  useEffect(() => {
    if (
      urlHighlightId &&
      !loading &&
      processedHighlight.current !== urlHighlightId
    ) {
      processedHighlight.current = urlHighlightId;
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      setTimeout(() => setActiveHighlight(null), 3500);
      const params = new URLSearchParams(location?.search || "");
      params.delete("highlight");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [urlHighlightId, loading, location?.search, navigate]);

  const forceRefresh = () => {
    if (globalProdReportCache) {
      globalProdReportCache.fetchedTabs = {
        production: false,
        labour: false,
        dues: false,
      };
    }
    fetchLogs(false);
  };

  const handleSyncStats = async () => {
    if (isStatsSynced) return;
    setSyncingStats(true);
    toast.info("Recalculating all records...");
    try {
      const newStats = await productionService.syncAllStats();
      setStats(newStats);
      globalProdReportCache.stats = newStats;
      setIsStatsSynced(true);
      globalProdReportCache.isStatsSynced = true;
      toast.success("Database synchronized successfully!");
    } catch (e) {
      toast.error(e.message || "Sync failed.");
    } finally {
      setSyncingStats(false);
    }
  };

  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      const currentUser = admin?.data || admin || {};
      if (activeTab === "production") {
        await productionService.deleteProduction(
          entryToDelete._id,
          currentUser,
        );
        const newLogs = (productionLogs || []).filter(
          (l) => l._id !== entryToDelete._id,
        );
        setProductionLogs(newLogs);
        globalProdReportCache.productionLogs = newLogs;
        setStats((prev) => {
          const n = {
            ...prev,
            output: (prev?.output || 0) - Number(entryToDelete?.quantity || 0),
          };
          globalProdReportCache.stats = n;
          return n;
        });
        toast.success("Production log deleted.");
      } else {
        await productionService.deleteLabourPayout(
          entryToDelete._id,
          currentUser,
        );
        const newLabLogs = (labourLogs || []).filter(
          (l) => l._id !== entryToDelete._id,
        );
        const newDuesLogs = (duesLogs || []).filter(
          (l) => l._id !== entryToDelete._id,
        );
        setLabourLogs(newLabLogs);
        globalProdReportCache.labourLogs = newLabLogs;
        setDuesLogs(newDuesLogs);
        globalProdReportCache.duesLogs = newDuesLogs;
        setStats((prev) => {
          const n = {
            ...prev,
            paid: (prev?.paid || 0) - Number(entryToDelete?.amountPaid || 0),
            due: (prev?.due || 0) - Number(entryToDelete?.amountDue || 0),
          };
          globalProdReportCache.stats = n;
          return n;
        });
        toast.success("Record deleted.");
      }
      setLoadedCounts((prev) => {
        const n = (prev?.[activeTab] || 0) > 0 ? prev[activeTab] - 1 : 0;
        const updated = { ...(prev || {}), [activeTab]: n };
        globalProdReportCache.loadedCounts = updated;
        return updated;
      });
      sessionStorage.setItem("prod_entry_needs_refresh", "true");
    } catch (error) {
      toast.error(error.message || "Failed to delete log.");
    } finally {
      setIsDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    if (isBackupLocked)
      return toast.error(
        `Daily Limit Reached. Locked for ${lockTimeRemaining}.`,
      );
    try {
      if (!monthToFetch) return toast.error("Please select a month.");
      setIsExporting(true);
      const QUOTA_LIMIT = 2000; // REDUCED FROM 10k TO PROTECT QUOTA
      const BATCH_SIZE = 500; // Smoother chunks
      const collectionName =
        activeTab === "production" ? "production" : "labour_payouts";
      const savedState = await productionService.getBackupState(
        `${collectionName}_${monthToFetch}`,
      );
      let partNumber = savedState ? savedState.part + 1 : 1;
      let lastDocDate = savedState ? savedState.lastDate : null;
      let lastDocId = savedState ? savedState.lastId : null;

      toast.info(
        savedState
          ? `Resuming Backup Part ${partNumber}...`
          : `Starting Secure Backup...`,
      );
      let allData = [];
      let hasMoreToFetch = true;
      let currentLastDoc = null;

      while (hasMoreToFetch && allData.length < QUOTA_LIMIT) {
        let constraints = [
          where("date", ">=", monthToFetch),
          where("date", "<=", monthToFetch + "\uf8ff"),
          orderBy("date", "asc"),
          orderBy(documentId(), "asc"),
          limit(BATCH_SIZE),
        ];
        if (currentLastDoc) constraints.push(startAfter(currentLastDoc));
        else if (lastDocDate && lastDocId)
          constraints.push(startAfter(lastDocDate, lastDocId));

        const q = query(collection(db, collectionName), ...constraints);
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMoreToFetch = false;
          break;
        }
        allData.push(...snap.docs.map((d) => d.data()));
        currentLastDoc = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < BATCH_SIZE) hasMoreToFetch = false;
      }

      if (allData.length === 0) {
        await productionService.setBackupState(
          `${collectionName}_${monthToFetch}`,
          null,
        );
        setBackupResumePart(null);
        setServerLockTime(null);
        setIsExporting(false);
        return toast.success(`All records downloaded!`);
      }

      let csvContent = "\uFEFF";
      if (activeTab === "production") {
        const headers = ["Date", "Item Name", "Size", "Quantity (Output)"];
        const rows = allData.map((log) => {
          const dateStr = log?.date ? `\t${formatDate(log.date)}` : "-";
          const { name, size } = parseProduct(log?.productName);
          return `${dateStr},"${name}","${size}",${log?.quantity || 0}`;
        });
        csvContent += [headers.join(","), ...rows].join("\n");
      } else {
        const headers = [
          "Date",
          "Party Name",
          "Category",
          "Cost",
          "Paid",
          "Due",
        ];
        const rows = allData.map((log) => {
          const dateStr = log?.date ? `\t${formatDate(log.date)}` : "-";
          return `${dateStr},"${log?.labourName || ""}","${log?.payoutCategory || ""}",${log?.cost || 0},${log?.amountPaid || 0},${log?.amountDue || 0}`;
        });
        csvContent += [headers.join(","), ...rows].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Backup_${activeTab}_${monthToFetch}_Part_${partNumber}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (hasMoreToFetch) {
        const lockTime = Date.now() + 24 * 60 * 60 * 1000;
        await productionService.setBackupState(
          `${collectionName}_${monthToFetch}`,
          {
            lastDate: currentLastDoc.data().date,
            lastId: currentLastDoc.id,
            part: partNumber,
            lockedUntil: lockTime,
          },
        );
        setBackupResumePart(partNumber + 1);
        setServerLockTime(lockTime);
        toast.warning(
          `Daily safe limit (2,000) reached. Download next part tomorrow.`,
          { autoClose: 8000 },
        );
      } else {
        await productionService.setBackupState(
          `${collectionName}_${monthToFetch}`,
          null,
        );
        setBackupResumePart(null);
        setServerLockTime(null);
        toast.success(`Backup Complete for ${monthToFetch}!`);
      }
    } catch (e) {
      toast.error("Backup failed. Please check console.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const res = await productionService.deleteAllProduction({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      toast.success(res.message || "Database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      setProductionLogs([]);
      setLabourLogs([]);
      setDuesLogs([]);
      setStats({ output: 0, paid: 0, due: 0 });
      setLoadedCounts({ production: 0, labour: 0, dues: 0 });
      setHasMore({ production: false, labour: false, dues: false });
      globalProdReportCache = {
        productionLogs: [],
        labourLogs: [],
        duesLogs: [],
        stats: { output: 0, paid: 0, due: 0 },
        lastDocs: { production: null, labour: null, dues: null },
        hasMore: { production: false, labour: false, dues: false },
        loadedCounts: { production: 0, labour: 0, dues: 0 },
        fetchedTabs: { production: true, labour: true, dues: true },
        filters: defaultFilters,
        isStatsSynced: true,
      };
      sessionStorage.setItem("prod_entry_needs_refresh", "true");
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const currentLogs =
    (activeTab === "production"
      ? productionLogs
      : activeTab === "labour"
        ? labourLogs
        : duesLogs) || [];
  const currentHasMore = hasMore?.[activeTab] || false;
  const currentLoadedCount = loadedCounts?.[activeTab] || 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10 text-zinc-200 overflow-x-hidden font-sans">
      {/* 🚀 TOP HEADER - PIXEL PERFECT SIZING */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Title Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#09090b] border border-indigo-500/20 text-indigo-400 shadow-sm shrink-0">
            <FileText size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-none">
              Production Ledger
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">
              Advanced Report
            </p>
          </div>
        </div>

        {/* Tab & Actions Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* TABS - SLEEK UI */}
          <div className="bg-[#09090b] border border-zinc-800/80 rounded-full p-1 flex items-center h-10 w-full sm:w-auto overflow-x-auto shadow-sm shrink-0 hide-scrollbar">
            {["production", "labour", "dues"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedCustomer(null);
                  setLocalFilters(defaultFilters);
                  globalProdReportCache.filters = defaultFilters;
                }}
                className={`relative px-5 h-full text-xs font-bold rounded-full transition-all tracking-wide whitespace-nowrap shrink-0 flex-1 sm:flex-none ${activeTab === tab ? "text-white" : "text-zinc-400 hover:text-white"}`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="pillIndicator"
                    className="absolute inset-0 rounded-full bg-indigo-600 shadow-sm z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 capitalize">
                  {tab === "production"
                    ? "All Output"
                    : tab === "labour"
                      ? "Payouts"
                      : "Dues"}
                </span>
              </button>
            ))}
            <div className="w-[1px] h-4 bg-zinc-800 mx-1 shrink-0"></div>
            <button
              onClick={forceRefresh}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors shrink-0 outline-none"
            >
              <RefreshCcw
                size={14}
                className={
                  loading && !loadingMore ? "animate-spin text-indigo-400" : ""
                }
              />
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto hide-scrollbar">
            {!isManager && (
              <button
                type="button"
                onClick={handleSyncStats}
                disabled={syncingStats || isStatsSynced}
                className={`h-10 px-4 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all border shrink-0 ${isStatsSynced ? "bg-transparent text-indigo-400 border-indigo-500/30 cursor-default opacity-40" : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 opacity-100"}`}
              >
                {isStatsSynced ? (
                  <CheckCircle size={14} />
                ) : (
                  <Database
                    size={14}
                    className={
                      syncingStats ? "animate-pulse text-indigo-400" : ""
                    }
                  />
                )}
                <span className="inline-block whitespace-nowrap">
                  {syncingStats
                    ? "Syncing..."
                    : isStatsSynced
                      ? "Up to date"
                      : "Sync Stats"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => !isManager && setIsDeleteAllOpen(true)}
              className={`h-10 px-4 border border-rose-900/50 text-white bg-[#0f0709] hover:bg-rose-950/60 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors shrink-0 ${isManager ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={14} className="text-rose-500" />
              <span className="inline-block whitespace-nowrap">Database</span>
            </button>
            <Link
              to={
                isTransport
                  ? "/transportation/production"
                  : "/enterprise/production"
              }
              className="shrink-0"
            >
              <button
                type="button"
                className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex justify-center items-center transition-colors whitespace-nowrap shadow-sm"
              >
                + Record Log
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 🚀 STATS CARDS */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div
          variants={itemVariants}
          className="p-5 md:p-6 rounded-xl bg-[#09090b] border border-zinc-800/80 relative overflow-hidden flex flex-col justify-center min-h-[100px] shadow-sm"
        >
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em] z-10 mb-1.5">
            Total Output
          </p>
          <div className="flex items-end gap-2 z-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
              {(stats?.output || 0).toLocaleString()}
            </h3>
            <span className="text-[10px] md:text-xs text-zinc-600 font-bold mb-0.5">
              Pcs
            </span>
          </div>
          <Factory
            size={80}
            strokeWidth={1}
            className="absolute -right-4 -bottom-4 text-zinc-800 opacity-20 pointer-events-none"
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="p-5 md:p-6 rounded-xl bg-[#09090b] border border-zinc-800/80 relative overflow-hidden flex flex-col justify-center min-h-[100px] shadow-sm"
        >
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em] z-10 mb-1.5">
            Total Paid Out
          </p>
          <div className="flex items-center z-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-indigo-400 font-mono tracking-tight leading-none">
              ₹ {(stats?.paid || 0).toLocaleString()}
            </h3>
          </div>
          <IndianRupee
            size={80}
            strokeWidth={1}
            className="absolute -right-4 -bottom-4 text-zinc-800 opacity-20 pointer-events-none"
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="p-5 md:p-6 rounded-xl bg-[#09090b] border border-zinc-800/80 relative overflow-hidden flex flex-col justify-center min-h-[100px] shadow-sm"
        >
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em] z-10 mb-1.5">
            Total Pending Dues
          </p>
          <div className="flex items-center z-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-rose-500 font-mono tracking-tight leading-none">
              ₹ {(stats?.due || 0).toLocaleString()}
            </h3>
          </div>
          <AlertCircle
            size={80}
            strokeWidth={1}
            className="absolute -right-4 -bottom-4 text-rose-950 opacity-20 pointer-events-none"
          />
        </motion.div>
      </motion.div>

      {/* 🚀 COMBINED FILTER & TABLE CONTAINER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-[#0a0a0c] rounded-xl border border-zinc-800/60 overflow-hidden relative shadow-lg"
      >
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-[#0a0a0c]/80 z-[100] flex items-center justify-center backdrop-blur-sm rounded-xl">
            <Loader />
          </div>
        )}

        {/* ✅ FIX: FORM BASED SEARCH & FILTER TOOLBAR */}
        <form
          onSubmit={handleApplyFilters}
          className="p-4 border-b border-zinc-800/60 flex flex-col xl:flex-row items-center justify-between gap-4"
        >
          {/* SEARCH INPUT */}
          <div className="relative w-full xl:w-[320px] group shrink-0">
            <Search
              size={14}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${localFilters?.search ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab === "production" ? "product" : "buyer"}...`}
              className="w-full bg-[#111116] border border-zinc-800/80 rounded-full pl-10 pr-4 py-2 text-xs text-white outline-none transition-all focus:border-indigo-500/50 hover:border-zinc-700/80 placeholder:text-zinc-600 shadow-sm"
              value={localFilters?.search || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  search: e.target.value,
                  quantity: "All",
                  date: "All",
                  exactDate: "",
                })
              }
            />
          </div>

          {/* FILTERS - PILL SHAPES */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto overflow-x-auto hide-scrollbar pb-1 xl:pb-0 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1 shrink-0">
              <Filter size={12} /> Filters
            </div>

            {activeTab === "production" && (
              <>
                <div className="relative shrink-0">
                  <select
                    value={localFilters?.product || "All"}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        product: e.target.value,
                      })
                    }
                    className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-full pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-sm"
                  >
                    <option value="All">All Products</option>
                    <option value="Bricks (10 inch)">Bricks 10"</option>
                    <option value="Bricks (9 inch)">Bricks 9"</option>
                    <option value="Zig Zag (60mm)">Zig Zag</option>
                    <option value="Hexagon">Hexagon</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                  />
                </div>
                <div className="relative shrink-0">
                  <select
                    value={localFilters?.quantity || "All"}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        quantity: e.target.value,
                        search: "",
                        date: "All",
                        exactDate: "",
                      })
                    }
                    className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-full pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-sm"
                  >
                    <option value="All">Any Quantity</option>
                    <option value="Under5k">&lt; 5k pcs</option>
                    <option value="5k-15k">5k - 15k pcs</option>
                    <option value="Above15k">&gt; 15k pcs</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                  />
                </div>
              </>
            )}

            <div className="relative shrink-0">
              <select
                value={localFilters?.date || "All"}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    date: e.target.value,
                    exactDate: "",
                    search: "",
                    quantity: "All",
                  })
                }
                className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-full pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-sm"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Last7Days">Last 7 Days</option>
                <option value="ThisMonth">This Month</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
              />
            </div>

            <div className="relative shrink-0">
              <Calendar
                size={12}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${localFilters?.exactDate ? "text-indigo-400" : "text-zinc-500"}`}
              />
              <input
                type="date"
                value={localFilters?.exactDate || ""}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setLocalFilters((prev) => ({
                    ...prev,
                    exactDate: newDate,
                    ...(newDate
                      ? { date: "All", search: "", quantity: "All" }
                      : {}),
                  }));
                }}
                style={{ colorScheme: "dark" }}
                className={`appearance-none bg-[#111116] rounded-full pl-9 pr-3 py-2 text-[11px] md:text-xs font-semibold outline-none cursor-pointer transition-all shadow-sm ${localFilters?.exactDate ? "border border-indigo-500/50 text-indigo-400" : "border border-zinc-800/80 text-zinc-300 hover:bg-[#18181f]"}`}
              />
            </div>

            {/* ✅ MANUAL APPLY BUTTON */}
            <button
              type="submit"
              className="shrink-0 px-4 py-2 text-[11px] md:text-xs rounded-full flex items-center gap-1 text-white bg-indigo-600 hover:bg-indigo-500 transition-colors font-bold shadow-sm ml-auto xl:ml-0"
            >
              Apply
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="shrink-0 px-3 py-2 text-[11px] md:text-xs rounded-full flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors font-bold shadow-sm"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </form>

        {/* 🚀 DATA TABLES */}
        <div className="overflow-x-auto hide-scrollbar min-h-[400px]">
          {activeTab === "production" && (
            <table className="w-full text-left min-w-[700px] animate-in fade-in duration-300">
              <thead className="bg-transparent border-b border-zinc-800/40">
                <tr>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Date & Info
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Item Name
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Size
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                    Output
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right md:pr-8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-sm">
                {(productionLogs || []).map((log) => {
                  const { name, size } = parseProduct(log?.productName);
                  const hasEdits =
                    log?.editHistory && log?.editHistory?.length > 0;
                  return (
                    <tr
                      key={log?._id}
                      className={`transition-colors duration-300 group ${activeHighlight === log?._id ? "bg-amber-500/[0.05]" : "hover:bg-[#111116]"}`}
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="text-zinc-400 font-mono text-xs mb-1.5">
                          {log?.date ? formatDate(log.date) : "N/A"}
                        </div>
                        {hasEdits && (
                          <button
                            type="button"
                            onClick={() =>
                              setLogModalInfo({
                                isOpen: true,
                                data: log,
                                tabType: "production",
                              })
                            }
                            className="flex items-center gap-1 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 rounded px-2 py-0.5 transition-colors w-max"
                          >
                            <History size={10} className="text-zinc-400" />
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                              Edited
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-1.5 w-max">
                          <Layers size={12} /> {name}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle text-zinc-300 font-medium text-xs">
                        {size}
                      </td>
                      <td className="py-4 px-5 text-right align-middle font-bold text-white font-mono text-sm">
                        {Number(log?.quantity || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-right align-middle md:pr-8">
                        <div className="flex justify-end gap-2 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`${isTransport ? "/transportation" : "/enterprise"}/production/edit/${log?._id}`}
                            className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              isManager ? null : handleDeleteClick(log)
                            }
                            className={`p-1.5 rounded-md transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!productionLogs || productionLogs.length === 0) &&
                  !loading && (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-16 text-center text-zinc-500 text-xs italic"
                      >
                        No production logs found.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          )}

          {activeTab === "labour" && (
            <table className="w-full text-left min-w-[750px] animate-in fade-in duration-300">
              <thead className="bg-transparent border-b border-zinc-800/40">
                <tr>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Buyer Details
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                    Cost
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                    Paid
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                    Due
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right md:pr-8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-sm">
                {(labourLogs || []).map((log) => {
                  const hasEdits =
                    log?.editHistory && log?.editHistory?.length > 0;
                  return (
                    <tr
                      key={log?._id}
                      className={`transition-colors duration-300 group ${activeHighlight === log?._id ? "bg-amber-500/[0.05]" : "hover:bg-[#111116]"}`}
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="font-bold text-white flex items-center gap-2 whitespace-nowrap text-sm mb-1.5 tracking-wide uppercase">
                          <Users size={14} className="text-zinc-500" />{" "}
                          {log?.labourName}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-[#1a1a24] border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest">
                            {log?.payoutCategory || "Labour"}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest">
                            {log?.date ? formatDate(log.date) : "N/A"}
                          </span>
                        </div>
                        {hasEdits && (
                          <button
                            type="button"
                            onClick={() =>
                              setLogModalInfo({
                                isOpen: true,
                                data: log,
                                tabType: "labour",
                              })
                            }
                            className="mt-2 flex items-center gap-1 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 rounded px-2 py-0.5 transition-colors w-max"
                          >
                            <History size={10} className="text-zinc-400" />
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                              Edited
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-5 align-middle text-right font-mono text-xs md:text-sm text-zinc-400">
                        ₹ {Number(log?.cost || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 align-middle text-right font-mono font-bold text-xs md:text-sm text-indigo-400">
                        ₹ {Number(log?.amountPaid || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 align-middle text-right font-mono font-bold text-xs md:text-sm text-rose-500">
                        ₹ {Number(log?.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 align-middle text-right md:pr-8">
                        <div className="flex justify-end gap-2 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`${isTransport ? `/transportation/labour/edit/${log?._id}` : `/enterprise/labour/edit/${log?._id}`}`}
                            className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              isManager ? null : handleDeleteClick(log)
                            }
                            className={`p-1.5 rounded-md transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!labourLogs || labourLogs.length === 0) && !loading && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-16 text-center text-zinc-500 text-xs italic"
                    >
                      No payout records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "dues" && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300">
              {(!groupedDuesUI || groupedDuesUI.length === 0) && !loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CheckCircle
                    size={36}
                    className="text-emerald-500 mb-3 opacity-80"
                  />
                  <h3 className="text-zinc-300 font-bold text-sm">
                    Zero Pending Dues!
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  {(groupedDuesUI || []).map((cust, idx) => {
                    const isExpanded = expandedCustomer === cust?.partyName;
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-sm ${isExpanded ? "bg-[#111116] border-rose-900/50" : "bg-[#0d0d12] border-zinc-800/80 hover:border-zinc-700/80"}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCustomer(
                              isExpanded ? null : cust?.partyName,
                            )
                          }
                          className="w-full flex flex-col sm:flex-row sm:justify-between p-4 items-start sm:items-center gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-lg transition-colors ${isExpanded ? "bg-rose-500/10 text-rose-500" : "bg-[#1a1a24] text-zinc-400 border border-zinc-800/50"}`}
                            >
                              <AlertCircle size={18} />
                            </div>
                            <div className="text-left">
                              <h3
                                className={`text-sm md:text-base font-bold uppercase tracking-wide transition-colors ${isExpanded ? "text-white" : "text-zinc-200"}`}
                              >
                                {cust?.partyName}
                              </h3>
                              <p className="text-zinc-500 text-[10px] mt-1 font-medium">
                                Pending in {cust?.records?.length || 0}{" "}
                                record(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:gap-8 border-t border-zinc-800/50 sm:border-0 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <p className="text-zinc-500 text-[9px] font-bold mb-1 uppercase tracking-widest">
                                Category
                              </p>
                              <p className="text-zinc-300 font-bold text-[10px] md:text-xs uppercase tracking-wider">
                                {cust?.category || "Labour"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-rose-500/70 text-[9px] font-bold mb-1 uppercase tracking-widest">
                                Total Due
                              </p>
                              <p className="text-rose-500 font-mono font-black text-lg md:text-xl">
                                ₹ {Number(cust?.totalDue || 0).toLocaleString()}
                              </p>
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-zinc-600 transition-transform duration-300 hidden sm:block ${isExpanded ? "rotate-90 text-rose-500" : ""}`}
                            />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-rose-900/20 overflow-hidden bg-[#0c0c0e]"
                            >
                              <div className="p-2 sm:p-4 overflow-x-auto">
                                <table className="w-full text-left min-w-[550px]">
                                  <thead className="text-zinc-500 text-[9px] uppercase tracking-widest border-b border-zinc-800/60 bg-transparent">
                                    <tr>
                                      <th className="py-2.5 px-4">Date</th>
                                      <th className="py-2.5 px-4 text-right">
                                        Cost
                                      </th>
                                      <th className="py-2.5 px-4 text-right">
                                        Paid
                                      </th>
                                      <th className="py-2.5 px-4 text-right text-rose-500">
                                        Due
                                      </th>
                                      <th className="py-2.5 px-4 text-center">
                                        Action
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800/40 text-xs">
                                    {(cust?.records || []).map((record) => (
                                      <tr
                                        key={record?._id}
                                        className="hover:bg-rose-500/[0.05] transition-colors"
                                      >
                                        <td className="py-3 px-4 font-mono text-zinc-400">
                                          {record?.date
                                            ? formatDate(record.date)
                                            : "N/A"}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-zinc-400">
                                          ₹
                                          {Number(
                                            record?.cost || 0,
                                          ).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-indigo-400 font-bold">
                                          ₹
                                          {Number(
                                            record?.amountPaid || 0,
                                          ).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-500">
                                          ₹
                                          {Number(
                                            record?.amountDue || 0,
                                          ).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <Link
                                            to={`${isTransport ? "/transportation" : "/enterprise"}/labour/edit/${record?._id}`}
                                            className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-colors inline-block"
                                          >
                                            Settle
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🚀 LOAD NEXT 50 BUTTON (TRUE SERVER PAGINATION) */}
        {currentHasMore && currentLogs.length > 0 && (
          <div className="flex justify-center p-5 border-t border-zinc-800/60 relative z-20 bg-[#0a0a0c]">
            {currentLoadedCount >= SCROLL_LIMIT ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-lg flex items-center gap-2 text-[11px] font-bold">
                <AlertCircle size={14} /> View limit reached (5,000). Please use
                Search or Filters.
              </div>
            ) : (
              <button
                onClick={() => fetchLogs(true)}
                disabled={loadingMore}
                className="bg-[#16161a] text-zinc-300 border border-zinc-800 hover:bg-[#1a1a24] hover:text-white px-6 py-2.5 text-xs rounded-xl transition-all flex items-center justify-center min-w-[160px] font-bold shadow-sm"
              >
                {loadingMore ? (
                  <RefreshCcw size={14} className="animate-spin mr-2" />
                ) : null}
                {loadingMore
                  ? "Loading..."
                  : `Load Next 50 (Showing ${currentLoadedCount})`}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* 🚀 HISTORY MODAL */}
      <AnimatePresence>
        {logModalInfo.isOpen && logModalInfo.data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() =>
                setLogModalInfo({
                  isOpen: false,
                  data: null,
                  tabType: "production",
                })
              }
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0e0e12] border border-zinc-800/60 rounded-3xl w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-[#161212] shrink-0">
                <div className="flex items-center gap-2.5 text-white font-bold text-xs tracking-wide">
                  <History size={16} className="text-amber-400" /> Edit History
                </div>
                <button
                  onClick={() =>
                    setLogModalInfo({
                      isOpen: false,
                      data: null,
                      tabType: "production",
                    })
                  }
                  className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {(logModalInfo.data?.editHistory
                  ? [...logModalInfo.data.editHistory].reverse()
                  : []
                ).map((editEntry, index) => (
                  <div
                    key={index}
                    className={`bg-[#121214] border ${index === 0 ? "border-amber-500/40 shadow-sm" : "border-zinc-800/80"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                  >
                    {index === 0 && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-amber-500"></div>
                    )}
                    <div className="flex items-center gap-3 pl-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800/50 text-zinc-400"}`}
                      >
                        {(editEntry?.role || "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <h4
                          className={`font-bold tracking-widest uppercase text-[11px] ${index === 0 ? "text-white" : "text-zinc-400"}`}
                        >
                          {editEntry?.role || "ADMIN"}
                        </h4>
                        <p className="text-zinc-500 text-[9px] mt-0.5 font-mono">
                          {editEntry?.email ||
                            editEntry?.by ||
                            "admin@system.com"}
                        </p>
                        <p
                          className={`text-[9px] font-mono mt-1 ${index === 0 ? "text-amber-400" : "text-zinc-500"}`}
                        >
                          {formatLogDateFull(editEntry?.at)}
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="bg-amber-500/10 text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">
                        LATEST
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message={`Are you sure you want to permanently delete this ${activeTab === "production" ? "production log" : "payout record"}?`}
        confirmText="Delete"
        isDestructive={true}
      />

      {/* 🚀 PIXEL PERFECT DB WIPE & BACKUP MODAL */}
      <AnimatePresence>
        {isDeleteAllOpen && !isManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() =>
                !wiping && !isExporting && setIsDeleteAllOpen(false)
              }
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0e0e12] border border-rose-900/30 rounded-2xl w-full max-w-[500px] shadow-[0_0_60px_rgba(225,29,72,0.06)] flex flex-col relative z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-[#161212] border-b border-rose-900/20">
                <div className="flex items-start gap-3">
                  <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 text-rose-500 shadow-sm">
                    <AlertOctagon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-wide text-rose-500 mb-1">
                      Database Management
                    </h2>
                    <p className="text-zinc-400 text-[11px] font-medium">
                      Export data or permanently erase records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* STEP 1: SECURE DATA EXPORT */}
                <div className="bg-[#151210] border border-amber-900/30 rounded-xl p-5 relative overflow-hidden shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                  <div className="pl-2">
                    <h3 className="text-amber-500 font-bold text-sm flex items-center gap-2 mb-1.5">
                      <ShieldAlert size={16} /> Step 1: Secure Data Export
                    </h3>
                    <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed">
                      Download a complete CSV backup of your records. Max 2,000
                      records daily limit.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <div className="relative w-full sm:w-[180px]">
                        <Calendar
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                          type="month"
                          value={backupMonth}
                          onChange={(e) => setBackupMonth(e.target.value)}
                          style={{ colorScheme: "dark" }}
                          disabled={isBackupLocked || isExporting}
                          className="bg-[#0a0a0a] border border-zinc-800 focus:border-amber-500/50 rounded-lg pl-10 pr-3 py-2.5 text-xs font-bold text-zinc-200 w-full outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFullBackup(backupMonth)}
                        disabled={isBackupLocked || isExporting}
                        className={`w-full sm:flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${isBackupLocked ? "bg-[#0a0a0a] border-zinc-800 text-zinc-500 cursor-not-allowed opacity-60" : "bg-[#0a0a0c] border-indigo-900/50 hover:bg-[#111116] hover:border-indigo-500/50 text-indigo-400 shadow-sm"}`}
                      >
                        {!isBackupLocked && !isExporting && (
                          <Download size={14} className="mr-1.5" />
                        )}
                        {isExporting
                          ? "Processing Chunk..."
                          : isBackupLocked
                            ? `Locked: ${lockTimeRemaining}`
                            : backupResumePart
                              ? `Resume (Part ${backupResumePart})`
                              : "Download Backup"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* STEP 2: CONFIRM DELETION */}
                <div className="bg-[#160d0d] border border-rose-900/30 rounded-xl p-5 relative overflow-hidden shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                  <div className="pl-2">
                    <h3 className="text-rose-500 font-bold text-sm mb-1.5">
                      Step 2: Confirm Deletion
                    </h3>
                    <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed">
                      This action{" "}
                      <strong className="font-bold text-rose-500">
                        CANNOT
                      </strong>{" "}
                      be undone. All data will be wiped.
                    </p>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter admin password..."
                        className="bg-[#0a0a0c] border border-zinc-800 focus:border-rose-500/50 rounded-lg px-4 py-2.5 w-full text-xs text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Footer) */}
              <div className="bg-[#0e0e12] px-6 pb-6 pt-1 flex flex-col sm:flex-row justify-center sm:justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteAllOpen(false);
                    setDeletePassword("");
                  }}
                  disabled={wiping || isExporting}
                  className="bg-[#161618] text-zinc-400 hover:text-white px-6 py-2.5 rounded-lg text-xs font-bold w-full sm:w-auto transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWipeAll}
                  disabled={wiping || !deletePassword || isExporting}
                  className="bg-[#2a1014] text-rose-500 hover:bg-rose-950 px-6 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto transition-colors disabled:opacity-50"
                >
                  {wiping && <RefreshCcw size={14} className="animate-spin" />}
                  {wiping ? "Wiping..." : "Permanently Wipe"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductionReport;
