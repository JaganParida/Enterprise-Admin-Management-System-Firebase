import { db } from "../config/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const dashboardService = {
  getStats: async () => {
    try {
      const stockSnap = await getDocs(collection(db, "stocks"));
      const empSnap = await getDocs(collection(db, "employees"));
      const invSnap = await getDocs(collection(db, "invoices"));

      // Fetch ample records to safely cover the last 7 days and activities
      const prodQuery = query(
        collection(db, "production"),
        orderBy("date", "desc"),
        limit(100),
      );
      const prodSnap = await getDocs(prodQuery);

      const salesQuery = query(
        collection(db, "sales"),
        orderBy("date", "desc"),
        limit(100),
      );
      const salesSnap = await getDocs(salesQuery);

      let activities = [];

      // 1. Calculate Stock Status
      let stockValue = 0,
        lowStock = 0;
      stockSnap.forEach((doc) => {
        const d = doc.data();
        stockValue += (Number(d.quantity) || 0) * (Number(d.price) || 0);
        if (Number(d.quantity) < 10) lowStock++;
      });

      // 2. Calculate Invoice Revenue & Collect Invoice Activities
      let revenue = 0,
        pendingInvoices = 0;
      invSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Paid") revenue += Number(d.grandTotal) || 0;
        if (d.status === "Pending") pendingInvoices++;
        activities.push({
          ...d,
          activityType: "Invoice",
          id: doc.id,
          date: d.invoiceDate || d.date,
        });
      });

      // 🚀 DATE LOGIC FOR "LAST 7 DAYS"
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 3. 🚀 Format Sales Data for Line Chart & Collect Sales Activities
      let totalSalesRevenue = 0;
      const salesData = [];
      salesSnap.forEach((doc) => {
        const d = doc.data();
        totalSalesRevenue += Number(d.amount) || 0;
        activities.push({ ...d, activityType: "Sale", id: doc.id });

        const saleDate = new Date(d.date);
        if (saleDate >= sevenDaysAgo) {
          salesData.push({
            date: saleDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            amount: Number(d.amount) || 0,
            productName: d.productName || "Various Items",
          });
        }
      });
      const formattedSalesData = salesData.reverse();

      // 4. 🚀 Format Production Data for Bar Chart & Collect Production Activities
      const productionData = [];
      prodSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({ ...d, activityType: "Production", id: doc.id });

        const prodDate = new Date(d.date);
        if (prodDate >= sevenDaysAgo) {
          productionData.push({
            date: prodDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            quantity: Number(d.quantity) || Number(d.output) || 0,
            productName: d.productName || "Unknown Product",
          });
        }
      });
      const formattedProductionData = productionData.reverse();

      // 5. 🚀 Sort all activities by EXACT creation time or date (Newest first)
      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });

      const recentActivity = activities.slice(0, 10); // Take Top 10 Latest

      return {
        data: {
          cards: {
            balance: totalSalesRevenue,
            revenue: revenue,
            activeEmployees: empSnap.size,
            stockValue: stockValue,
            lowStock: lowStock,
            pendingInvoices: pendingInvoices,
          },
          charts: {
            production: formattedProductionData,
            sales: formattedSalesData,
          },
          recentActivity,
        },
      };
    } catch (error) {
      console.error("Dashboard Service Error:", error);
      throw error;
    }
  },
};

export default dashboardService;
