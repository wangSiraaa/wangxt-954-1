import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ship } from "../types";

interface ShipState {
  ships: Ship[];
  addShip: (ship: Omit<Ship, "id">) => void;
  updateShip: (id: string, data: Partial<Omit<Ship, "id">>) => void;
  deleteShip: (id: string) => void;
  setMaintenanceStatus: (id: string, status: Ship["status"]) => void;
}

export const useShipStore = create<ShipState>()(
  persist(
    (set) => ({
      ships: [],
      addShip: (ship) => {
        const newShip: Ship = { ...ship, id: crypto.randomUUID() };
        set((state) => ({ ships: [...state.ships, newShip] }));
      },
      updateShip: (id, data) => {
        set((state) => ({
          ships: state.ships.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },
      deleteShip: (id) => {
        set((state) => ({
          ships: state.ships.filter((s) => s.id !== id),
        }));
      },
      setMaintenanceStatus: (id, status) => {
        set((state) => ({
          ships: state.ships.map((s) =>
            s.id === id ? { ...s, status } : s
          ),
        }));
      },
    }),
    { name: "scenic-ships" }
  )
);
