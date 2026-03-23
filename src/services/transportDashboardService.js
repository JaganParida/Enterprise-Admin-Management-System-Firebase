import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";

const transportDashboardService = {
  getStats: async () => {
    try {
      let totalDistance = 0,
        totalTrips = 0,
        totalFuelCost = 0,
        totalMaintenanceCost = 0;

      // 1. 🚀 SERVER-SIDE AGGREGATION (Golden Rule #1)
      // This prevents downloading 1 lakh records to the frontend just to count them!
      try {
        const [tripAgg, fuelAgg, maintAgg] = await Promise.all([
          getAggregateFromServer(query(collection(db, "trips")), {
            dist: sum("distanceTravelled"),
            trips: count(),
          }),
          getAggregateFromServer(query(collection(db, "fuels")), {
            cost: sum("totalCost"),
          }),
          getAggregateFromServer(query(collection(db, "maintenances")), {
            cost: sum("cost"),
          }),
        ]);

        totalDistance = tripAgg.data().dist || 0;
        totalTrips = tripAgg.data().trips || 0;
        totalFuelCost = fuelAgg.data().cost || 0;
        totalMaintenanceCost = maintAgg.data().cost || 0;
      } catch (aggError) {
        console.warn(
          "Aggregation failed (Missing Index or older Firebase). Using fallback.",
          aggError,
        );
        // Fallback execution if Indexes are not fully deployed yet
        const [tripsSnap, fuelSnap, maintSnap] = await Promise.all([
          getDocs(collection(db, "trips")),
          getDocs(collection(db, "fuels")),
          getDocs(collection(db, "maintenances")),
        ]);
        totalTrips = tripsSnap.size;
        tripsSnap.forEach(
          (doc) => (totalDistance += Number(doc.data().distanceTravelled) || 0),
        );
        fuelSnap.forEach(
          (doc) => (totalFuelCost += Number(doc.data().totalCost) || 0),
        );
        maintSnap.forEach(
          (doc) => (totalMaintenanceCost += Number(doc.data().cost) || 0),
        );
      }

      // 2. 🚀 OPTIMIZED RECENT ACTIVITY FETCH (Golden Rule #2)
      // Instead of downloading the whole DB, we only ask for the TOP 10 latest records from each!
      const [tripsRecent, fuelRecent, maintRecent, jcbRecent] =
        await Promise.all([
          getDocs(
            query(collection(db, "trips"), orderBy("date", "desc"), limit(10)),
          ),
          getDocs(
            query(collection(db, "fuels"), orderBy("date", "desc"), limit(10)),
          ),
          getDocs(
            query(
              collection(db, "maintenances"),
              orderBy("date", "desc"),
              limit(10),
            ),
          ),
          getDocs(
            query(
              collection(db, "jcb_logs"),
              orderBy("date", "desc"),
              limit(10),
            ),
          ),
        ]);

      let activities = [];

      tripsRecent.forEach((doc) =>
        activities.push({ ...doc.data(), activityType: "Trip", _id: doc.id }),
      );
      fuelRecent.forEach((doc) =>
        activities.push({ ...doc.data(), activityType: "Fuel", _id: doc.id }),
      );
      maintRecent.forEach((doc) =>
        activities.push({
          ...doc.data(),
          activityType: "Maintenance",
          _id: doc.id,
        }),
      );
      jcbRecent.forEach((doc) =>
        activities.push({ ...doc.data(), activityType: "JCB", _id: doc.id }),
      );

      // 3. Sort the combined top 40 records by EXACT creation time or date (Newest first)
      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });

      // 4. Slice to exactly Top 10 for the UI
      const recentActivity = activities.slice(0, 10);

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
