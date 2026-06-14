import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShipType, Captain, Dock, Route, TideWindow, Insurance } from "../types";

type ShipTypeWithoutId = Omit<ShipType, "id">;
type CaptainWithoutId = Omit<Captain, "id">;
type DockWithoutId = Omit<Dock, "id">;
type RouteWithoutId = Omit<Route, "id">;
type TideWindowWithoutId = Omit<TideWindow, "id">;
type InsuranceWithoutId = Omit<Insurance, "id">;

interface BaseState {
  shipTypes: ShipType[];
  captains: Captain[];
  docks: Dock[];
  routes: Route[];
  tideWindows: TideWindow[];
  insurances: Insurance[];

  addShipType: (data: ShipTypeWithoutId) => void;
  updateShipType: (id: string, data: Partial<ShipTypeWithoutId>) => void;
  deleteShipType: (id: string) => void;

  addCaptain: (data: CaptainWithoutId) => void;
  updateCaptain: (id: string, data: Partial<CaptainWithoutId>) => void;
  deleteCaptain: (id: string) => void;

  addDock: (data: DockWithoutId) => void;
  updateDock: (id: string, data: Partial<DockWithoutId>) => void;
  deleteDock: (id: string) => void;

  addRoute: (data: RouteWithoutId) => void;
  updateRoute: (id: string, data: Partial<RouteWithoutId>) => void;
  deleteRoute: (id: string) => void;

  addTideWindow: (data: TideWindowWithoutId) => void;
  updateTideWindow: (id: string, data: Partial<TideWindowWithoutId>) => void;
  getTideByDate: (date: string) => TideWindow | undefined;

  addInsurance: (data: InsuranceWithoutId) => void;
  updateInsurance: (id: string, data: Partial<InsuranceWithoutId>) => void;
  deleteInsurance: (id: string) => void;
}

export const useBaseStore = create<BaseState>()(
  persist(
    (set, get) => ({
      shipTypes: [],
      captains: [],
      docks: [],
      routes: [],
      tideWindows: [],
      insurances: [],

      addShipType: (data) => {
        const newItem: ShipType = { ...data, id: crypto.randomUUID() };
        set((state) => ({ shipTypes: [...state.shipTypes, newItem] }));
      },
      updateShipType: (id, data) => {
        set((state) => ({
          shipTypes: state.shipTypes.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },
      deleteShipType: (id) => {
        set((state) => ({
          shipTypes: state.shipTypes.filter((s) => s.id !== id),
        }));
      },

      addCaptain: (data) => {
        const newItem: Captain = { ...data, id: crypto.randomUUID() };
        set((state) => ({ captains: [...state.captains, newItem] }));
      },
      updateCaptain: (id, data) => {
        set((state) => ({
          captains: state.captains.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },
      deleteCaptain: (id) => {
        set((state) => ({
          captains: state.captains.filter((c) => c.id !== id),
        }));
      },

      addDock: (data) => {
        const newItem: Dock = { ...data, id: crypto.randomUUID() };
        set((state) => ({ docks: [...state.docks, newItem] }));
      },
      updateDock: (id, data) => {
        set((state) => ({
          docks: state.docks.map((d) => (d.id === id ? { ...d, ...data } : d)),
        }));
      },
      deleteDock: (id) => {
        set((state) => ({
          docks: state.docks.filter((d) => d.id !== id),
        }));
      },

      addRoute: (data) => {
        const newItem: Route = { ...data, id: crypto.randomUUID() };
        set((state) => ({ routes: [...state.routes, newItem] }));
      },
      updateRoute: (id, data) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        }));
      },
      deleteRoute: (id) => {
        set((state) => ({
          routes: state.routes.filter((r) => r.id !== id),
        }));
      },

      addTideWindow: (data) => {
        const newItem: TideWindow = { ...data, id: crypto.randomUUID() };
        set((state) => ({ tideWindows: [...state.tideWindows, newItem] }));
      },
      updateTideWindow: (id, data) => {
        set((state) => ({
          tideWindows: state.tideWindows.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },
      getTideByDate: (date) => {
        return get().tideWindows.find((t) => t.date === date);
      },

      addInsurance: (data) => {
        const newItem: Insurance = { ...data, id: crypto.randomUUID() };
        set((state) => ({ insurances: [...state.insurances, newItem] }));
      },
      updateInsurance: (id, data) => {
        set((state) => ({
          insurances: state.insurances.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        }));
      },
      deleteInsurance: (id) => {
        set((state) => ({
          insurances: state.insurances.filter((i) => i.id !== id),
        }));
      },
    }),
    { name: "scenic-base" }
  )
);
