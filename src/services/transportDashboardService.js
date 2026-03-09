import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";

const transportDashboardService = {
  getStats: async () => {
    try {
      // 1. Fetch Transport Data
      const tripsSnap = await getDocs(collection(db, "trips"));
      const fuelSnap = await getDocs(collection(db, "fuels"));
      const maintSnap = await getDocs(collection(db, "maintenances"));
      const jcbSnap = await getDocs(collection(db, "jcb_logs"));

      let totalDistance = 0,
        totalTrips = tripsSnap.size;
      let totalFuelCost = 0,
        totalMaintenanceCost = 0;
      let activities = [];

      // 2. Process Trips
      tripsSnap.forEach((doc) => {
        const d = doc.data();
        totalDistance += Number(d.distanceTravelled) || 0;
        activities.push({ ...d, activityType: "Trip", id: doc.id });
      });

      // 3. Process Fuel
      fuelSnap.forEach((doc) => {
        const d = doc.data();
        totalFuelCost += Number(d.totalCost) || 0;
        activities.push({ ...d, activityType: "Fuel", id: doc.id });
      });

      // 4. Process Maintenance
      maintSnap.forEach((doc) => {
        const d = doc.data();
        totalMaintenanceCost += Number(d.cost) || 0;
        activities.push({ ...d, activityType: "Maintenance", id: doc.id });
      });

      // 5. Process JCB
      jcbSnap.forEach((doc) => {
        const d = doc.data();
        activities.push({ ...d, activityType: "JCB", id: doc.id });
      });

      // 6. 🚀 Sort all activities by EXACT creation time (Newest first)
      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });

      // 7. Slice to exactly Top 10
      const recentActivity = activities.slice(0, 10);

      // 8. Return format matched to UI
      return {
        data: {
          cards: {
            totalDistance,
            totalTrips,
            totalFuelCost,
            totalMaintenanceCost,
          },
          chartData: { fuels: [], maintenances: [] },
          recentActivity,
        },
      };
    } catch (error) {
      console.error("Transport Dashboard Error:", error);
      throw error;
    }
  },
};

export default transportDashboardService;
