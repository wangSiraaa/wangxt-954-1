import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Passenger } from "../types";

interface PassengerState {
  passengers: Passenger[];

  addPassenger: (data: Omit<Passenger, "id">) => Passenger;
  addOrUpdatePassenger: (data: Omit<Passenger, "id">) => Passenger;
  updatePassenger: (id: string, data: Partial<Omit<Passenger, "id">>) => void;
  deletePassenger: (id: string) => void;
  getById: (id: string) => Passenger | undefined;
  getByIds: (ids: string[]) => Passenger[];
  getByIdCard: (idCard: string) => Passenger | undefined;
  search: (keyword: string) => Passenger[];
}

export const usePassengerStore = create<PassengerState>()(
  persist(
    (set, get) => ({
      passengers: [],

      addPassenger: (data) => {
        const existing = get().getByIdCard(data.idCard);
        if (existing) {
          return existing;
        }
        const newItem: Passenger = { ...data, id: crypto.randomUUID() };
        set((state) => ({ passengers: [...state.passengers, newItem] }));
        return newItem;
      },

      addOrUpdatePassenger: (data) => {
        const existing = get().getByIdCard(data.idCard);
        if (existing) {
          get().updatePassenger(existing.id, data);
          return { ...existing, ...data };
        }
        return get().addPassenger(data);
      },

      updatePassenger: (id, data) => {
        set((state) => ({
          passengers: state.passengers.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deletePassenger: (id) => {
        set((state) => ({
          passengers: state.passengers.filter((p) => p.id !== id),
        }));
      },

      getById: (id) => {
        return get().passengers.find((p) => p.id === id);
      },

      getByIds: (ids) => {
        return ids.map((id) => get().getById(id)).filter(Boolean) as Passenger[];
      },

      getByIdCard: (idCard) => {
        return get().passengers.find((p) => p.idCard === idCard);
      },

      search: (keyword) => {
        const kw = keyword.toLowerCase();
        return get().passengers.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.idCard.includes(kw) ||
            p.phone.includes(kw)
        );
      },
    }),
    { name: "scenic-passengers" }
  )
);
