import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";

// 🚀 CONCEPT 1: GLOBAL RAM CACHE
export const dashboardCache = {
  data: null,
  isDirty: true,
  lastFetch: 0,
  markDirty: () => {
    dashboardCache.isDirty = true;
    console.log(
      "⚠️ Dashboard Cache marked as dirty. Will fetch fresh data next time.",
    );
  },
};

const dashboardService = {
  getStats: async (forceRefresh = false) => {
    // 🔥 ZERO-READ INTERCEPTOR
    // Agar cache fresh hai aur user forceRefresh kar raha hai, toh read mat kar
    if (!dashboardCache.isDirty && dashboardCache.data) {
      console.log("⚡ Loaded from RAM Cache (0 Reads consumed)");
      return { data: dashboardCache.data, cached: true };
    }

    console.log("📡 Fetching fresh data from Firebase (Max 15-20 Reads)...");

    let activeEmployees = 0;
    let revenue = 0;
    let pendingInvoices = 0;
    let stockValue = 0;
    let lowStock = 0;
    let totalSalesRevenue = 0;

    try {
      // 1. BULLETPROOF SERVER-SIDE AGGREGATIONS
      const empQ = query(
        collection(db, "employees"),
        where("status", "==", "Active"),
      );
      const paidInvQ = query(
        collection(db, "invoices"),
        where("status", "==", "Paid"),
      );
      const pendingInvQ = query(
        collection(db, "invoices"),
        where("status", "==", "Pending"),
      );
      const salesQ = collection(db, "sales");

      const [empSnap, paidInvSnap, pendingInvSnap, totalSalesSnap] =
        await Promise.all([
          getAggregateFromServer(empQ, { activeCount: count() }),
          getAggregateFromServer(paidInvQ, { totalRevenue: sum("grandTotal") }),
          getAggregateFromServer(pendingInvQ, { pendingCount: count() }),
          getAggregateFromServer(salesQ, { totalSales: sum("amount") }),
        ]).catch((error) => {
          console.error("Firebase Aggregation Error:", error);
          return [null, null, null, null];
        });

      activeEmployees = empSnap?.data().activeCount || 0;
      revenue = paidInvSnap?.data().totalRevenue || 0;
      pendingInvoices = pendingInvSnap?.data().pendingCount || 0;
      totalSalesRevenue = totalSalesSnap?.data().totalSales || 0;

      // 2. STOCK METADATA FETCH (1 Read)
      try {
        const stockMetadataRef = doc(db, "metadata", "stockStats");
        const stockMetadataSnap = await getDoc(stockMetadataRef);

        if (stockMetadataSnap.exists()) {
          const stockData = stockMetadataSnap.data();
          stockValue = Number(stockData.totalStockValue) || 0;
          lowStock = Number(stockData.lowStockCount) || 0;
        }
      } catch (metadataError) {
        console.error("Failed to read stock metadata:", metadataError);
      }

      // 3. STRICTLY LIMITED RECENT ACTIVITY (Max 15 Reads Total - OPTIMIZED FOR FREE PLAN)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const prodQuery = query(
        collection(db, "production"),
        orderBy("date", "desc"),
        limit(5),
      );
      const salesQuery = query(
        collection(db, "sales"),
        orderBy("date", "desc"),
        limit(5),
      );
      const invQuery = query(
        collection(db, "invoices"),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const [prodSnap, salesSnap, recentInvSnap] = await Promise.all([
        getDocs(prodQuery),
        getDocs(salesQuery),
        getDocs(invQuery),
      ]);

      let activities = [];
      const productionData = [];
      const salesData = [];

      prodSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({ ...d, activityType: "Production", _id: doc.id });
        if (new Date(d.date) >= sevenDaysAgo) {
          productionData.push({
            date: new Date(d.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            quantity: Number(d.quantity) || 0,
            productName: d.productName || "Unknown",
          });
        }
      });

      salesSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({ ...d, activityType: "Sale", _id: doc.id });
        if (new Date(d.date) >= sevenDaysAgo) {
          salesData.push({
            date: new Date(d.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            amount: Number(d.amount) || 0,
            productName: d.productName || "Various Items",
          });
        }
      });

      recentInvSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({
          ...d,
          activityType: "Invoice",
          _id: doc.id,
          date: d.date || d.createdAt,
        });
      });

      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });

      const finalData = {
        cards: {
          balance: totalSalesRevenue,
          revenue: revenue,
          activeEmployees: activeEmployees,
          stockValue: stockValue,
          lowStock: lowStock,
          pendingInvoices: pendingInvoices,
        },
        charts: {
          production: productionData.reverse(),
          sales: salesData.reverse(),
        },
        recentActivity: activities.slice(0, 10),
      };

      // 🔥 SAVE TO RAM CACHE FOR NEXT TIME
      dashboardCache.data = finalData;
      dashboardCache.isDirty = false;
      dashboardCache.lastFetch = Date.now();

      return { data: finalData, cached: false };
    } catch (error) {
      console.error("Dashboard Service Critical Error:", error);
      throw error;
    }
  },
};

export default dashboardService;
