import { db } from "../config/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const dashboardService = {
  getStats: async () => {
    try {
      // 1. Fetch data from all relevant collections
      const cashSnap = await getDocs(collection(db, "cashTransactions"));
      const stockSnap = await getDocs(collection(db, "stocks"));
      const empSnap = await getDocs(collection(db, "employees"));
      const invSnap = await getDocs(collection(db, "invoices"));

      // Fetch only last 7 days of production for the chart
      const prodQuery = query(
        collection(db, "production"),
        orderBy("date", "desc"),
        limit(7),
      );
      const prodSnap = await getDocs(prodQuery);

      // 2. Calculate Cash Flow
      let income = 0,
        expense = 0;
      cashSnap.forEach((doc) => {
        const d = doc.data();
        if (d.type === "Income") income += Number(d.amount) || 0;
        if (d.type === "Expense") expense += Number(d.amount) || 0;
      });

      // 3. Calculate Stock Status
      let stockValue = 0,
        lowStock = 0;
      stockSnap.forEach((doc) => {
        const d = doc.data();
        stockValue += (Number(d.quantity) || 0) * (Number(d.price) || 0);
        if (Number(d.quantity) < 10) lowStock++; // Assuming < 10 is low stock
      });

      // 4. Calculate Invoice Revenue
      let revenue = 0,
        pendingInvoices = 0;
      invSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Paid") revenue += Number(d.grandTotal) || 0;
        if (d.status === "Pending") pendingInvoices++;
      });

      // 5. Format Production Data for Chart
      const productionData = prodSnap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            date: d.date,
            quantity: Number(d.quantity) || Number(d.output) || 0,
          };
        })
        .reverse(); // Reverse to show oldest to newest left-to-right

      // 6. Return exact format the UI expects
      return {
        data: {
          cards: {
            balance: income - expense,
            revenue: revenue,
            activeEmployees: empSnap.size, // Total number of employees
            stockValue: stockValue,
            lowStock: lowStock,
            pendingInvoices: pendingInvoices,
          },
          charts: {
            production: productionData,
            finance: [
              { name: "Income", value: income },
              { name: "Expense", value: expense },
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
