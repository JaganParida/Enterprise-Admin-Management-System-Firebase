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

// 🚀 GLOBAL ZERO-READ CACHE FOR DASHBOARD
let localCache = {
  data: null,
  isDirty: true,
  lastFetchTime: 0,
};

export const markDashboardDirty = () => {
  localCache.isDirty = true;
};

const transportDashboardService = {
  // 🚀 Added to allow the UI to track sync status
  getLastFetchTime: () => localCache.lastFetchTime,

  getStats: async (force = false) => {
    // 🚀 CACHE CHECK: 0 Reads if data hasn't changed
    if (!force && !localCache.isDirty && localCache.data) {
      return { data: localCache.data };
    }

    try {
      let totalDistance = 0,
        totalTrips = 0,
        totalFuelCost = 0,
        totalMaintenanceCost = 0;

      // 1. 🚀 SERVER-SIDE AGGREGATION (Atomic)
      try {
        const [tripAgg, fuelAgg, maintAgg] = await Promise.all([
          getAggregateFromServer(query(collection(db, "trips")), {
            totalDistance: sum("distanceTravelled"),
            totalTrips: count(),
          }),
          getAggregateFromServer(query(collection(db, "fuels")), {
            totalCost: sum("totalCost"),
          }),
          getAggregateFromServer(query(collection(db, "maintenances")), {
            totalCost: sum("cost"),
          }),
        ]);

        totalDistance = tripAgg.data().totalDistance || 0;
        totalTrips = tripAgg.data().totalTrips || 0;
        totalFuelCost = fuelAgg.data().totalCost || 0;
        totalMaintenanceCost = maintAgg.data().totalCost || 0;
      } catch (aggError) {
        console.warn(
          "Aggregation failed. Falling back to client calculation. WARNING: High Read Cost.",
          aggError,
        );
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

      // 2. 🚀 OPTIMIZED RECENT ACTIVITY FETCH
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

      activities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });

      const recentActivity = activities.slice(0, 10);

      const finalData = {
        cards: {
          totalDistance,
          totalTrips,
          totalFuelCost,
          totalMaintenanceCost,
        },
        chartData: { fuels: [], maintenances: [] },
        recentActivity,
      };

      // Update Cache
      localCache.data = finalData;
      localCache.isDirty = false;
      localCache.lastFetchTime = Date.now();

      return { data: finalData };
    } catch (error) {
      console.error("Transport Dashboard Error:", error);
      throw error;
    }
  },
};

export default transportDashboardService;
