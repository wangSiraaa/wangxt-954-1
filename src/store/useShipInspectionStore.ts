import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShipInspection } from "../types";
import { useShipStore } from "./useShipStore";

interface ShipInspectionState {
  inspections: ShipInspection[];

  addInspection: (data: Omit<ShipInspection, "id">) => void;
  updateInspection: (id: string, data: Partial<Omit<ShipInspection, "id">>) => void;
  getByShipId: (shipId: string) => ShipInspection[];
  getLatestByShipId: (shipId: string) => ShipInspection | undefined;
  isShipSafe: (shipId: string) => boolean;
  getInspectionItems: () => { name: string; required: boolean }[];
}

export const useShipInspectionStore = create<ShipInspectionState>()(
  persist(
    (set, get) => ({
      inspections: [],

      getInspectionItems: () => [
        { name: "船体结构", required: true },
        { name: "推进系统", required: true },
        { name: "电气系统", required: true },
        { name: "消防设备", required: true },
        { name: "救生设备", required: true },
        { name: "导航设备", required: true },
        { name: "通讯设备", required: true },
        { name: "锚泊设备", required: false },
        { name: "系泊设备", required: false },
        { name: "舱底排水系统", required: true },
      ],

      addInspection: (data) => {
        const newItem: ShipInspection = { ...data, id: crypto.randomUUID() };
        set((state) => ({ inspections: [...state.inspections, newItem] }));

        if (data.overallResult === "pass") {
          useShipStore.getState().updateShip(data.shipId, {
            lastInspectionDate: data.inspectionDate,
            nextInspectionDate: data.nextInspectionDate,
          });
        }
      },

      updateInspection: (id, data) => {
        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        }));
      },

      getByShipId: (shipId) => {
        return get()
          .inspections.filter((i) => i.shipId === shipId)
          .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
      },

      getLatestByShipId: (shipId) => {
        const inspections = get().getByShipId(shipId);
        return inspections[0];
      },

      isShipSafe: (shipId) => {
        const latest = get().getLatestByShipId(shipId);
        if (!latest) return false;

        const nextDate = new Date(latest.nextInspectionDate);
        const now = new Date();
        return latest.overallResult === "pass" && nextDate > now;
      },
    }),
    { name: "scenic-ship-inspection" }
  )
);
