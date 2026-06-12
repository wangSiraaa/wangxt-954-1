import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoardingRecord } from "../types";

interface BoardingState {
  boardingRecords: BoardingRecord[];
  addBoardingRecord: (record: Omit<BoardingRecord, "id" | "boardedAt">) => void;
  getByScheduleId: (scheduleId: string) => BoardingRecord[];
}

export const useBoardingStore = create<BoardingState>()(
  persist(
    (set, get) => ({
      boardingRecords: [],
      addBoardingRecord: (record) => {
        const newRecord: BoardingRecord = {
          ...record,
          id: crypto.randomUUID(),
          boardedAt: new Date().toISOString(),
        };
        set((state) => ({
          boardingRecords: [...state.boardingRecords, newRecord],
        }));
      },
      getByScheduleId: (scheduleId) => {
        return get().boardingRecords.filter(
          (r) => r.scheduleId === scheduleId
        );
      },
    }),
    { name: "scenic-boardings" }
  )
);
