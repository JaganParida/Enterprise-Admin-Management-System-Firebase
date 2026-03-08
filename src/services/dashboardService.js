import { db } from "../config/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const dashboardService = {
  getStats: async () => {
    try {
      const stockSnap = await getDocs(collection(db, "stocks"));
      const empSnap = await getDocs(collection(db, "employees"));
      const invSnap = await getDocs(collection(db, "invoices"));
      const electricSnap = await getDocs(collection(db, "electricity_bills"));

      // Fetch ample records to safely cover the last 7 days
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

      // 1. Calculate Stock Status
      let stockValue = 0,
        lowStock = 0;
      stockSnap.forEach((doc) => {
        const d = doc.data();
        stockValue += (Number(d.quantity) || 0) * (Number(d.price) || 0);
        if (Number(d.quantity) < 10) lowStock++;
      });

      // 2. Calculate Invoice Revenue
      let revenue = 0,
        pendingInvoices = 0;
      invSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Paid") revenue += Number(d.grandTotal) || 0;
        if (d.status === "Pending") pendingInvoices++;
      });

      // 3. 🚀 ELECTRICITY LOGIC: Overdue decreases when Paid
      let totalElectricPaid = 0,
        totalElectricOverdue = 0;
      electricSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Paid") totalElectricPaid += Number(d.amount) || 0;
        // Map both Pending and Overdue into the Overdue chart calculation
        if (d.status === "Pending" || d.status === "Overdue")
          totalElectricOverdue += Number(d.amount) || 0;
      });

      // 🚀 DATE LOGIC FOR "LAST 7 DAYS" (Not just 7 records)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 4. 🚀 Format Sales Data for Line Chart (Only within last 7 Days)
      let totalSalesRevenue = 0;
      const salesData = [];
      salesSnap.forEach((doc) => {
        const d = doc.data();
        totalSalesRevenue += Number(d.amount) || 0; // Total of fetched records

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
      // Reverse to plot chronologically (Oldest to Newest left-to-right)
      const formattedSalesData = salesData.reverse();

      // 5. 🚀 Format Production Data for Bar Chart (Only within last 7 Days)
      const productionData = prodSnap.docs
        .map((doc) => doc.data())
        .filter((d) => new Date(d.date) >= sevenDaysAgo)
        .map((d) => ({
          date: new Date(d.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
          quantity: Number(d.quantity) || Number(d.output) || 0,
          productName: d.productName || "Unknown Product",
        }))
        .reverse();

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
            production: productionData,
            sales: formattedSalesData,
            electricity: [
              { name: "Paid", value: totalElectricPaid },
              { name: "Overdue", value: totalElectricOverdue },
            ],
          },
          recentActivity: [],
        },
      };
    } catch (error) {
      console.error("Dashboard Service Error:", error);
      throw error;
    }
  },
};

export default dashboardService;
