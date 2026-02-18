import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";

const transportDashboardService = {
  getStats: async () => {
    try {
      // 1. Fetch Transport Data
      const tripsSnap = await getDocs(collection(db, "trips"));
      const fuelSnap = await getDocs(collection(db, "fuels"));
      const maintSnap = await getDocs(collection(db, "maintenances"));

      let totalDistance = 0,
        totalTrips = tripsSnap.size;
      let totalFuelCost = 0,
        totalMaintenanceCost = 0;
      let activities = [];

      // 2. Process Trips
      tripsSnap.forEach((doc) => {
        const d = doc.data();
        totalDistance += Number(d.distance) || 0;
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

      // 5. Sort all activities by date (Newest first) and take top 10
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentActivity = activities.slice(0, 10);

      // 6. Return format matched to UI
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
