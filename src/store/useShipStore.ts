import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ship } from "../types";
import { useBaseStore } from "./useBaseStore";

interface ShipState {
  ships: Ship[];
  addShip: (ship: Omit<Ship, "id">) => void;
  updateShip: (id: string, data: Partial<Omit<Ship, "id">) => void;
  deleteShip: (id: string) => void;
  setMaintenanceStatus: (id: string, status: Ship["status"]) => void;
  getAvailableShips: () => Ship[];
  getShipCapacity: (shipId: string) => number;
  isShipOperational: (shipId: string) => boolean;
  getShipTypeInfo: (shipId: string) => {
    name: string;
    capacity: number;
  } | null;
}

export const useShipStore = create<ShipState>()(
  persist(
    (set, get) => ({
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
      getAvailableShips: () => {
        return get().ships.filter((s) => s.status === "available");
      },
      getShipCapacity: (shipId) => {
        const ship = get().ships.find((s) => s.id === shipId);
        return ship?.capacity ?? 0;
      },
      isShipOperational: (shipId) => {
        const ship = get().ships.find((s) => s.id === shipId);
        if (!ship) return false;
        if (ship.status === "maintenance") return false;

        const nextInspection = new Date(ship.nextInspectionDate);
        const now = new Date();
        if (nextInspection < now) return false;

        return true;
      },
      getShipTypeInfo: (shipId) => {
        const ship = get().ships.find((s) => s.id === shipId);
        if (!ship) return null;

        const shipType = useBaseStore
          .getState()
          .shipTypes.find((t) => t.id === ship.shipTypeId);
        return shipType
          ? { name: shipType.name, capacity: shipType.capacity }
          : null;
      },
    }),
    { name: "scenic-ships" }
  )
);
