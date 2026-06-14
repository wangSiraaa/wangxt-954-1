import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StopDay } from "../types";
import { useScheduleStore } from "./useScheduleStore";

interface AddStopDayResult {
  affectedSchedules: number;
  affectedOrders: number;
}

type StopDayWithoutId = Omit<StopDay, "id">;
type StopDayUpdate = Omit<StopDay, "date" | "id">;

interface StopDayState {
  stopDays: StopDay[];
  addStopDay: (stopDay: StopDayWithoutId) => AddStopDayResult;
  updateStopDay: (date: string, data: Partial<StopDayUpdate>) => void;
  removeStopDay: (date: string) => void;
  isStopDay: (date: string) => boolean;
  isRouteAffected: (date: string, routeId: string) => boolean;
  getByDateRange: (startDate: string, endDate: string) => StopDay[];
  getByType: (type: StopDay["type"]) => StopDay[];
  getByDate: (date: string) => StopDay | undefined;
}

export const useStopDayStore = create<StopDayState>()(
  persist(
    (set, get) => ({
      stopDays: [],

      addStopDay: (stopDay) => {
        const exists = get().stopDays.some(
          (s) => s.date === stopDay.date && s.routeId === stopDay.routeId
        );
        if (exists) {
          throw new Error("该日期已设置为停航日");
        }

        const newStopDay: StopDay = {
          ...stopDay,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          stopDays: [...state.stopDays, newStopDay],
        }));

        const scheduleStore = useScheduleStore.getState();
        const daySchedules = scheduleStore.getByDate(stopDay.date);

        let affectedOrders = 0;
        daySchedules.forEach((schedule) => {
          if (
            !stopDay.affectedRoutes ||
            stopDay.affectedRoutes.length === 0 ||
            stopDay.affectedRoutes.includes(schedule.routeId)
          ) {
            if (schedule.status !== "cancelled") {
              try {
                const result = scheduleStore.cancelSchedule(
                  schedule.id,
                  `${stopDay.type === "weather" ? "天气原因" : stopDay.type === "emergency" ? "紧急情况" : "计划"}停航: ${stopDay.reason}`
                );
                affectedOrders += result.affectedOrders;
              } catch (e) {
                console.error("取消班次失败:", e);
              }
            }
          }
        });

        return {
          affectedSchedules: daySchedules.length,
          affectedOrders,
        };
      },

      updateStopDay: (date, data) => {
        set((state) => ({
          stopDays: state.stopDays.map((s) =>
            s.date === date ? { ...s, ...data } : s
          ),
        }));
      },

      removeStopDay: (date) => {
        set((state) => ({
          stopDays: state.stopDays.filter((s) => s.date !== date),
        }));
      },

      isStopDay: (date) => {
        return get().stopDays.some((s) => s.date === date);
      },

      isRouteAffected: (date, routeId) => {
        const stopDay = get().stopDays.find((s) => s.date === date);
        if (!stopDay) return false;
        if (!stopDay.affectedRoutes || stopDay.affectedRoutes.length === 0) return true;
        return stopDay.affectedRoutes.includes(routeId);
      },

      getByDateRange: (startDate, endDate) => {
        return get().stopDays.filter(
          (s) => s.date >= startDate && s.date <= endDate
        );
      },

      getByType: (type) => {
        return get().stopDays.filter((s) => s.type === type);
      },

      getByDate: (date) => {
        return get().stopDays.find((s) => s.date === date);
      },
    }),
    { name: "scenic-stopdays" }
  )
);
