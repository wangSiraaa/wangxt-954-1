import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CrewSchedule } from "../types";

interface CrewState {
  crewSchedules: CrewSchedule[];

  addCrewSchedule: (data: Omit<CrewSchedule, "id">) => void;
  updateCrewSchedule: (id: string, data: Partial<Omit<CrewSchedule, "id">>) => void;
  deleteCrewSchedule: (id: string) => void;
  getByScheduleId: (scheduleId: string) => CrewSchedule | undefined;
  getByCaptainId: (captainId: string) => CrewSchedule[];
  getByDate: (date: string) => CrewSchedule[];
  getByShipId: (shipId: string) => CrewSchedule[];
  isCaptainAvailable: (captainId: string, date: string, shift: CrewSchedule["shift"]) => boolean;
}

export const useCrewStore = create<CrewState>()(
  persist(
    (set, get) => ({
      crewSchedules: [],

      addCrewSchedule: (data) => {
        if (!get().isCaptainAvailable(data.captainId, data.date, data.shift)) {
          throw new Error("该船长在该时段已有排班");
        }
        const newItem: CrewSchedule = { ...data, id: crypto.randomUUID() };
        set((state) => ({ crewSchedules: [...state.crewSchedules, newItem] }));
      },
      updateCrewSchedule: (id, data) => {
        set((state) => ({
          crewSchedules: state.crewSchedules.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },
      deleteCrewSchedule: (id) => {
        set((state) => ({
          crewSchedules: state.crewSchedules.filter((c) => c.id !== id),
        }));
      },
      getByScheduleId: (scheduleId) => {
        return get().crewSchedules.find((c) => c.scheduleId === scheduleId);
      },
      getByCaptainId: (captainId) => {
        return get().crewSchedules.filter((c) => c.captainId === captainId);
      },
      getByDate: (date) => {
        return get().crewSchedules.filter((c) => c.date === date);
      },
      getByShipId: (shipId) => {
        return get().crewSchedules.filter((c) => c.shipId === shipId);
      },
      isCaptainAvailable: (captainId, date, shift) => {
        const existing = get().crewSchedules.find(
          (c) => c.captainId === captainId && c.date === date && c.shift === shift && c.status !== "cancelled"
        );
        return !existing;
      },
    }),
    { name: "scenic-crew" }
  )
);
