import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Schedule } from "../types";
import { useStopDayStore } from "./useStopDayStore";
import { useMaintenanceStore } from "./useMaintenanceStore";

interface ScheduleState {
  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, "id">) => void;
  updateSchedule: (id: string, data: Partial<Omit<Schedule, "id">>) => void;
  deleteSchedule: (id: string) => void;
  getByDate: (date: string) => Schedule[];
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedules: [],
      addSchedule: (schedule) => {
        const { isStopDay } = useStopDayStore.getState();
        if (isStopDay(schedule.date)) {
          throw new Error("该日期为停航日，无法添加班次");
        }
        const { getActiveByShipId } = useMaintenanceStore.getState();
        const activeMaintenances = getActiveByShipId(schedule.shipId);
        if (activeMaintenances.length > 0) {
          throw new Error("该游船正在维护中，无法添加班次");
        }
        const newSchedule: Schedule = {
          ...schedule,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));
      },
      updateSchedule: (id, data) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },
      deleteSchedule: (id) => {
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));
      },
      getByDate: (date) => {
        return get().schedules.filter((s) => s.date === date);
      },
    }),
    { name: "scenic-schedules" }
  )
);
