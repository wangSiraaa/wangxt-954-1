import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OperationStats } from "../types";
import { useScheduleStore } from "./useScheduleStore";
import { useOrderStore } from "./useOrderStore";
import { useRefundStore } from "./useRefundStore";

interface StatsState {
  stats: OperationStats[];

  calculateDailyStats: (date: string) => OperationStats[];
  calculateRangeStats: (startDate: string, endDate: string) => {
    totalRevenue: number;
    totalPassengers: number;
    totalSchedules: number;
    cancelledSchedules: number;
    refundAmount: number;
    averageOccupancyRate: number;
    refundRate: number;
    byRoute: Record<string, {
      revenue: number;
      passengers: number;
      schedules: number;
      occupancyRate: number;
    }>;
  };
  getDashboardStats: () => {
    today: OperationStats | null;
    yesterday: OperationStats | null;
    weekTrend: OperationStats[];
    monthTrend: OperationStats[];
  };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      stats: [],

      calculateDailyStats: (date) => {
        const scheduleStore = useScheduleStore.getState();
        const orderStore = useOrderStore.getState();
        const refundStore = useRefundStore.getState();

        const daySchedules = scheduleStore.schedules.filter((s) => s.date === date);
        const routes = [...new Set(daySchedules.map((s) => s.routeId))];

        const routeStats: OperationStats[] = routes.map((routeId) => {
          const routeSchedules = daySchedules.filter((s) => s.routeId === routeId);
          const scheduleIds = routeSchedules.map((s) => s.id);

          const orders = orderStore.orders.filter(
            (o) => scheduleIds.includes(o.scheduleId) && o.status !== "cancelled"
          );
          const totalPassengers = orders.reduce((sum, o) => sum + o.ticketCount, 0);
          const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

          const refunds = refundStore.refundDetails.filter(
            (r) => {
              const order = orderStore.orders.find((o) => o.id === r.orderId);
              return order && scheduleIds.includes(order.scheduleId) && r.status === "completed";
            }
          );
          const refundAmount = refunds.reduce((sum, r) => sum + r.netAmount, 0);

          const totalSeats = routeSchedules.reduce((sum, s) => sum + s.totalSeats, 0);
          const occupiedSeats = routeSchedules.reduce(
            (sum, s) => sum + (s.totalSeats - s.availableSeats),
            0
          );
          const occupancyRate = totalSeats > 0 ? occupiedSeats / totalSeats : 0;

          const cancelledSchedules = routeSchedules.filter((s) => s.status === "cancelled").length;
          const refundRate = orders.length > 0 ? refunds.length / orders.length : 0;

          return {
            date,
            routeId,
            totalSchedules: routeSchedules.length,
            cancelledSchedules,
            totalPassengers,
            totalRevenue,
            refundAmount,
            occupancyRate,
            refundRate,
          };
        });

        return routeStats;
      },

      calculateRangeStats: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates: string[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(formatDate(d));
        }

        let totalRevenue = 0;
        let totalPassengers = 0;
        let totalSchedules = 0;
        let cancelledSchedules = 0;
        let refundAmount = 0;
        let totalOccupancyRate = 0;
        let occupancyCount = 0;
        let totalOrders = 0;
        let totalRefunds = 0;

        const byRoute: Record<string, {
          revenue: number;
          passengers: number;
          schedules: number;
          occupancyRate: number;
          occupancyCount: number;
        }> = {};

        dates.forEach((date) => {
          const dayStats = get().calculateDailyStats(date);
          dayStats.forEach((stat) => {
            totalRevenue += stat.totalRevenue;
            totalPassengers += stat.totalPassengers;
            totalSchedules += stat.totalSchedules;
            cancelledSchedules += stat.cancelledSchedules;
            refundAmount += stat.refundAmount;
            totalOccupancyRate += stat.occupancyRate;
            occupancyCount++;

            const scheduleStore = useScheduleStore.getState();
            const scheduleIds = scheduleStore.schedules
              .filter((s) => s.date === date && s.routeId === stat.routeId)
              .map((s) => s.id);

            const orderStore = useOrderStore.getState();
            totalOrders += orderStore.orders.filter(
              (o) => scheduleIds.includes(o.scheduleId) && o.status !== "cancelled"
            ).length;

            const refundStore = useRefundStore.getState();
            totalRefunds += refundStore.refundDetails.filter(
              (r) => {
                const order = orderStore.orders.find((o) => o.id === r.orderId);
                return order && scheduleIds.includes(order.scheduleId) && r.status === "completed";
              }
            ).length;

            if (!byRoute[stat.routeId]) {
              byRoute[stat.routeId] = {
                revenue: 0,
                passengers: 0,
                schedules: 0,
                occupancyRate: 0,
                occupancyCount: 0,
              };
            }
            byRoute[stat.routeId].revenue += stat.totalRevenue;
            byRoute[stat.routeId].passengers += stat.totalPassengers;
            byRoute[stat.routeId].schedules += stat.totalSchedules;
            byRoute[stat.routeId].occupancyRate += stat.occupancyRate;
            byRoute[stat.routeId].occupancyCount++;
          });
        });

        const averageOccupancyRate = occupancyCount > 0 ? totalOccupancyRate / occupancyCount : 0;
        const refundRate = totalOrders > 0 ? totalRefunds / totalOrders : 0;

        Object.keys(byRoute).forEach((routeId) => {
          const r = byRoute[routeId];
          r.occupancyRate = r.occupancyCount > 0 ? r.occupancyRate / r.occupancyCount : 0;
          delete (r as { occupancyCount?: number }).occupancyCount;
        });

        return {
          totalRevenue,
          totalPassengers,
          totalSchedules,
          cancelledSchedules,
          refundAmount,
          averageOccupancyRate,
          refundRate,
          byRoute,
        };
      },

      getDashboardStats: () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);

        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 29);

        const todayStr = formatDate(today);
        const yesterdayStr = formatDate(yesterday);

        const todayStats = get().calculateDailyStats(todayStr);
        const yesterdayStats = get().calculateDailyStats(yesterdayStr);

        const aggregateStats = (stats: OperationStats[]) => {
          if (stats.length === 0) return null;
          return stats.reduce(
            (acc, s) => ({
              ...acc,
              totalSchedules: acc.totalSchedules + s.totalSchedules,
              cancelledSchedules: acc.cancelledSchedules + s.cancelledSchedules,
              totalPassengers: acc.totalPassengers + s.totalPassengers,
              totalRevenue: acc.totalRevenue + s.totalRevenue,
              refundAmount: acc.refundAmount + s.refundAmount,
            }),
            {
              date: todayStr,
              routeId: "all",
              totalSchedules: 0,
              cancelledSchedules: 0,
              totalPassengers: 0,
              totalRevenue: 0,
              refundAmount: 0,
              occupancyRate: 0,
              refundRate: 0,
            } as OperationStats
          );
        };

        const weekTrend: OperationStats[] = [];
        for (let d = new Date(weekAgo); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = formatDate(d);
          const dayStats = get().calculateDailyStats(dateStr);
          const agg = aggregateStats(dayStats);
          if (agg) weekTrend.push(agg);
        }

        const monthTrend: OperationStats[] = [];
        for (let d = new Date(monthAgo); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = formatDate(d);
          const dayStats = get().calculateDailyStats(dateStr);
          const agg = aggregateStats(dayStats);
          if (agg) monthTrend.push(agg);
        }

        return {
          today: aggregateStats(todayStats),
          yesterday: aggregateStats(yesterdayStats),
          weekTrend,
          monthTrend,
        };
      },
    }),
    { name: "scenic-stats" }
  )
);
