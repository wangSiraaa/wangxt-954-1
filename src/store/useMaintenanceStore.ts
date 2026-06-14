import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Maintenance } from "../types";
import { useShipStore } from "./useShipStore";

type MaintenanceWithoutId = Omit<Maintenance, "id">;

interface MaintenanceState {
  maintenances: Maintenance[];
  addMaintenance: (maintenance: MaintenanceWithoutId) => void;
  updateMaintenance: (id: string, data: Partial<MaintenanceWithoutId>) => void;
  deleteMaintenance: (id: string) => void;
  getActiveByShipId: (shipId: string) => Maintenance[];
  refreshShipStatus: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      maintenances: [],
      addMaintenance: (maintenance) => {
        const newMaintenance: Maintenance = {
          ...maintenance,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          maintenances: [...state.maintenances, newMaintenance],
        }));
        get().refreshShipStatus();
      },
      updateMaintenance: (id, data) => {
        set((state) => ({
          maintenances: state.maintenances.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        }));
        get().refreshShipStatus();
      },
      deleteMaintenance: (id) => {
        set((state) => ({
          maintenances: state.maintenances.filter((m) => m.id !== id),
        }));
        get().refreshShipStatus();
      },
      getActiveByShipId: (shipId) => {
        return get().maintenances.filter(
          (m) => m.shipId === shipId && m.isActive
        );
      },
      refreshShipStatus: () => {
        const { maintenances } = get();
        const { ships, setMaintenanceStatus } = useShipStore.getState();
        for (const ship of ships) {
          const hasActive = maintenances.some(
            (m) => m.shipId === ship.id && m.isActive
          );
          const newStatus = hasActive ? "maintenance" : "available";
          if (ship.status !== newStatus) {
            setMaintenanceStatus(ship.id, newStatus);
          }
        }
      },
    }),
    { name: "scenic-maintenances" }
  )
);
