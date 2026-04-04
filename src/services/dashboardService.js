import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";

const CACHE_KEY = "dashboard_data_cache";
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 Minutes (Adjust as needed)

const dashboardService = {
  markDirty: () => {
    localStorage.removeItem(CACHE_KEY);
  },

  getStats: async (forceSync = false) => {
    const now = Date.now();
    const localData = localStorage.getItem(CACHE_KEY);

    // 🛡️ SHIELD 1: Check Local Storage Cache first
    if (!forceSync && localData) {
      const parsed = JSON.parse(localData);
      if (now - parsed.timestamp < CACHE_EXPIRATION) {
        console.log("🚀 Serving from Disk Cache (Zero Firebase Reads)");
        return { data: parsed.data, status: "synced" };
      }
    }

    console.log("📡 Fetching fresh data from Firebase...");

    let activeEmployees = 0,
      revenue = 0,
      pendingInvoices = 0,
      lowStock = 0,
      stockValue = 0;

    try {
      // 🚀 SERVER-SIDE AGGREGATIONS (Cheapest Reads)
      const [
        empSnap,
        paidInvSnap,
        pendingInvSnap,
        lowStockSnap,
        totalStockSnap,
      ] = await Promise.all([
        getAggregateFromServer(
          query(collection(db, "employees"), where("status", "==", "Active")),
          { activeCount: count() },
        ),
        getAggregateFromServer(
          query(collection(db, "invoices"), where("status", "==", "Paid")),
          { totalRevenue: sum("grandTotal") },
        ),
        getAggregateFromServer(
          query(collection(db, "invoices"), where("status", "==", "Pending")),
          { pendingCount: count() },
        ),
        getAggregateFromServer(
          query(collection(db, "stocks"), where("quantity", "<", 10)),
          { lowCount: count() },
        ),
        getAggregateFromServer(collection(db, "stocks"), {
          stockValueSum: sum("totalValue"),
        }),
      ]);

      activeEmployees = empSnap.data().activeCount || 0;
      revenue = paidInvSnap.data().totalRevenue || 0;
      pendingInvoices = pendingInvoices =
        pendingInvSnap.data().pendingCount || 0;
      lowStock = lowStockSnap.data().lowCount || 0;
      stockValue = totalStockSnap.data().stockValueSum || 0;

      // 📊 FETCH RECENT (Strict Limits to save reads)
      const prodQuery = query(
        collection(db, "production"),
        orderBy("date", "desc"),
        limit(15),
      );
      const salesQuery = query(
        collection(db, "sales"),
        orderBy("date", "desc"),
        limit(15),
      );
      const invQuery = query(
        collection(db, "invoices"),
        orderBy("createdAt", "desc"),
        limit(10),
      );

      const [prodSnap, salesSnap, recentInvSnap] = await Promise.all([
        getDocs(prodQuery),
        getDocs(salesQuery),
        getDocs(invQuery),
      ]);

      let activities = [];
      const productionData = [];
      const salesData = [];
      let totalSalesRevenue = 0;

      prodSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({ ...d, activityType: "Production", _id: doc.id });
        productionData.push({
          date: d.date,
          quantity: Number(d.quantity) || 0,
          productName: d.productName,
        });
      });

      salesSnap.forEach((doc) => {
        const d = doc.data();
        totalSalesRevenue += Number(d.amount) || 0;
        activities.push({ ...d, activityType: "Sale", _id: doc.id });
        salesData.push({
          date: d.date,
          amount: Number(d.amount) || 0,
          productName: d.productName,
        });
      });

      recentInvSnap.forEach((doc) => {
        activities.push({
          ...doc.data(),
          activityType: "Invoice",
          _id: doc.id,
        });
      });

      const finalData = {
        cards: {
          balance: totalSalesRevenue,
          revenue,
          activeEmployees,
          stockValue,
          lowStock,
          pendingInvoices,
        },
        charts: {
          production: productionData.reverse(),
          sales: salesData.reverse(),
        },
        recentActivity: activities
          .sort(
            (a, b) =>
              new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
          )
          .slice(0, 10),
      };

      // 💾 SAVE TO DISK CACHE
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: now, data: finalData }),
      );

      return { data: finalData, status: "synced" };
    } catch (error) {
      console.error("Critical Sync Error:", error);
      // If error, try to return stale data from cache as emergency backup
      if (localData)
        return { data: JSON.parse(localData).data, status: "fallback" };
      throw error;
    }
  },
};

export default dashboardService;
