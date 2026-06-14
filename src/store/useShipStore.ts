import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ship, ShipInspection, Maintenance } from "../types";
import { useBaseStore } from "./useBaseStore";

interface ShipTypeInfo {
  name: string;
  capacity: number;
  shipTypeId?: string;
}

type ShipWithoutId = Omit<Ship, "id">;

interface ShipState {
  ships: Ship[];
  inspections: ShipInspection[];
  maintenances: Maintenance[];
  addShip: (ship: ShipWithoutId) => Ship;
  updateShip: (id: string, data: Partial<ShipWithoutId>) => void;
  deleteShip: (id: string) => void;
  addInspection: (shipId: string, inspection: Omit<ShipInspection, "id" | "shipId">) => void;
  setMaintenanceStatus: (id: string, status: Ship["status"]) => void;
  getAvailableShips: () => Ship[];
  getShipCapacity: (shipId: string) => number;
  isShipOperational: (shipId: string) => boolean;
  getShipTypeInfo: (shipId: string) => ShipTypeInfo | null;
}

export const useShipStore = create<ShipState>()(
  persist(
    (set, get) => ({
      ships: [],
      inspections: [],
      maintenances: [],
      addShip: (ship) => {
        const newShip: Ship = { ...ship, id: crypto.randomUUID() };
        set((state) => ({ ships: [...state.ships, newShip] }));
        return newShip;
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
      addInspection: (shipId, inspection) => {
        const newInspection: ShipInspection = {
          ...inspection,
          id: crypto.randomUUID(),
          shipId,
        };
        set((state) => ({
          inspections: [...state.inspections, newInspection],
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
          ? { name: shipType.name, capacity: shipType.capacity, shipTypeId: shipType.id }
          : null;
      },
    }),
    { name: "scenic-ships" }
  )
);
