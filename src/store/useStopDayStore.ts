import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StopDay } from "../types";

interface StopDayState {
  stopDays: StopDay[];
  addStopDay: (stopDay: StopDay) => void;
  removeStopDay: (date: string) => void;
  isStopDay: (date: string) => boolean;
}

export const useStopDayStore = create<StopDayState>()(
  persist(
    (set, get) => ({
      stopDays: [],
      addStopDay: (stopDay) => {
        const exists = get().stopDays.some((s) => s.date === stopDay.date);
        if (exists) {
          throw new Error("该日期已设置为停航日");
        }
        set((state) => ({
          stopDays: [...state.stopDays, stopDay],
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
    }),
    { name: "scenic-stopdays" }
  )
);
