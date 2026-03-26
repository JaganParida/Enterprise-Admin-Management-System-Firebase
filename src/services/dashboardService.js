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

const dashboardService = {
  getStats: async () => {
    let activeEmployees = 0;
    let revenue = 0;
    let pendingInvoices = 0;

    try {
      // 1. 🚀 FAST SERVER-SIDE AGGREGATIONS (Try this first)
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

      const [empSnap, paidInvSnap, pendingInvSnap] = await Promise.all([
        getAggregateFromServer(empQ, { activeCount: count() }),
        getAggregateFromServer(paidInvQ, { totalRevenue: sum("grandTotal") }),
        getAggregateFromServer(pendingInvQ, { pendingCount: count() }),
      ]);

      activeEmployees = empSnap.data().activeCount || 0;
      revenue = paidInvSnap.data().totalRevenue || 0;
      pendingInvoices = pendingInvSnap.data().pendingCount || 0;
    } catch (aggError) {
      console.warn(
        "Aggregation missing index, falling back to client fetch:",
        aggError,
      );

      // 🚀 ENTERPRISE FALLBACK: Agar Index missing hai, toh UI crash nahi hoga!
      // Firebase fallback to fetch and calculate in browser until index is built.
      const [empDocs, invDocs] = await Promise.all([
        getDocs(collection(db, "employees")),
        getDocs(collection(db, "invoices")),
      ]);

      empDocs.forEach((doc) => {
        if (doc.data().status === "Active") activeEmployees++;
      });

      invDocs.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Paid") revenue += Number(d.grandTotal) || 0;
        if (d.status === "Pending") pendingInvoices++;
      });
    }

    try {
      // 2. 🚀 OPTIMIZED STOCK CALCULATION
      const stockSnap = await getDocs(collection(db, "stocks"));
      let stockValue = 0;
      let lowStock = 0;
      stockSnap.forEach((doc) => {
        const d = doc.data();
        stockValue += (Number(d.quantity) || 0) * (Number(d.price) || 0);
        if (Number(d.quantity) < 10) lowStock++;
      });

      // 3. 🚀 OPTIMIZED RECENT ACTIVITY & CHARTS (Fetch ONLY what is needed)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // We limit to 20/10 to avoid huge document reads on every dashboard load
      const prodQuery = query(
        collection(db, "production"),
        orderBy("date", "desc"),
        limit(20),
      );
      const salesQuery = query(
        collection(db, "sales"),
        orderBy("date", "desc"),
        limit(20),
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

      // Process Production
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

      // Process Sales
      salesSnap.forEach((doc) => {
        const d = doc.data();
        totalSalesRevenue += Number(d.amount) || 0;
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

      // Process Recent Invoices for Activity Feed
      recentInvSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({
          ...d,
          activityType: "Invoice",
          _id: doc.id,
          date: d.date || d.createdAt,
        });
      });

      // 4. 🚀 SORT & SLICE RECENT ACTIVITY (Merge & Sort the 3 collections)
      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });

      const recentActivity = activities.slice(0, 10);

      return {
        data: {
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
          recentActivity,
        },
      };
    } catch (error) {
      console.error("Dashboard Service Critical Error:", error);
      throw error;
    }
  },
};

export default dashboardService;
