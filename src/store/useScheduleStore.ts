import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Schedule } from "../types";
import { useStopDayStore } from "./useStopDayStore";
import { useMaintenanceStore } from "./useMaintenanceStore";
import { useShipStore } from "./useShipStore";
import { useBaseStore } from "./useBaseStore";
import { useCrewStore } from "./useCrewStore";
import { useOrderStore } from "./useOrderStore";
import { useRefundStore } from "./useRefundStore";
import { useWaitingListStore } from "./useWaitingListStore";

interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface CancelScheduleResult {
  affectedOrders: number;
  refundsCreated: number;
}

interface ScheduleState {
  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, "id">) => Schedule;
  updateSchedule: (id: string, data: Partial<Omit<Schedule, "id">>) => void;
  deleteSchedule: (id: string, operator?: string) => void;
  cancelSchedule: (id: string, reason: string, operator?: string) => CancelScheduleResult;
  getByDate: (date: string) => Schedule[];
  getByRoute: (routeId: string) => Schedule[];
  getByShip: (shipId: string) => Schedule[];
  getByDateAndRoute: (date: string, routeId: string) => Schedule[];
  getByDateRange: (startDate: string, endDate: string) => Schedule[];
  validateSchedule: (schedule: Omit<Schedule, "id">) => ScheduleValidationResult;
  calculateAvailableSeats: (scheduleId: string) => number;
  getDockCapacityForTime: (dockId: string, date: string, time: string) => number;
  isWithinTideWindow: (date: string, time: string, routeId?: string) => boolean;
  hasCrewAssigned: (scheduleId: string) => boolean;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedules: [],

      validateSchedule: (schedule) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const baseStore = useBaseStore.getState();
        const stopDayStore = useStopDayStore.getState();
        const maintenanceStore = useMaintenanceStore.getState();
        const shipStore = useShipStore.getState();
        const crewStore = useCrewStore.getState();

        if (stopDayStore.isStopDay(schedule.date)) {
          const stopDay = stopDayStore.stopDays.find((s) => s.date === schedule.date);
          if (stopDay?.type === "weather" || stopDay?.type === "emergency") {
            errors.push("该日期为紧急停航日，无法添加班次");
          } else {
            warnings.push("该日期为计划停航日，请确认是否需要添加班次");
          }
        }

        const activeMaintenances = maintenanceStore.getActiveByShipId(schedule.shipId);
        const maintenanceOverlap = activeMaintenances.some(
          (m) => schedule.date >= m.startDate && schedule.date <= m.endDate
        );
        if (maintenanceOverlap) {
          errors.push("该游船在该日期处于维护中，无法排班");
        }

        const ship = shipStore.ships.find((s) => s.id === schedule.shipId);
        if (!ship) {
          errors.push("船只不存在");
        } else if (ship.status === "maintenance") {
          errors.push("该游船正在维护中，无法添加班次");
        } else if (ship.status !== "available") {
          errors.push("该游船当前不可用");
        }

        if (ship && schedule.totalSeats > ship.capacity) {
          errors.push(`座位数不能超过船只容量(${ship.capacity})`);
        }

        const route = baseStore.routes.find((r) => r.id === schedule.routeId);
        if (!route) {
          errors.push("航线不存在");
        }

        if (!get().isWithinTideWindow(schedule.date, schedule.departureTime, schedule.routeId)) {
          warnings.push("该时间可能不在潮汐窗口内，请确认是否可以通航");
        }

        const dockCapacity = get().getDockCapacityForTime(
          route?.startDockId || "",
          schedule.date,
          schedule.departureTime
        );
        if (dockCapacity === 0) {
          warnings.push("出发码头在该时段可能已满负荷");
        }

        return { valid: errors.length === 0, errors, warnings };
      },

      addSchedule: (schedule) => {
        const validation = get().validateSchedule(schedule);
        if (!validation.valid) {
          throw new Error(validation.errors.join("；"));
        }

        const newSchedule: Schedule = {
          ...schedule,
          id: crypto.randomUUID(),
          status: "scheduled",
        };
        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));

        return newSchedule;
      },

      updateSchedule: (id, data) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },

      deleteSchedule: (id, operator) => {
        const schedule = get().schedules.find((s) => s.id === id);
        if (schedule) {
          const orders = useOrderStore.getState().getByScheduleId(id);
          if (orders.length > 0 && schedule.status !== "cancelled") {
            get().cancelSchedule(id, "删除班次", operator);
          }
        }
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));
      },

      cancelSchedule: (id, reason, _operator) => {
        const schedule = get().schedules.find((s) => s.id === id);
        if (!schedule) {
          throw new Error("班次不存在");
        }

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id
              ? { ...s, status: "cancelled", cancellationReason: reason }
              : s
          ),
        }));

        const orderStore = useOrderStore.getState();
        const refundStore = useRefundStore.getState();
        const waitingStore = useWaitingListStore.getState();

        const affectedOrders = orderStore.getByScheduleId(id).filter(
          (o) => o.status !== "refunded" && o.status !== "boarded"
        );

        const refundsCreated: string[] = [];
        affectedOrders.forEach((order) => {
          if (order.status === "pending") {
            try {
              const refundId = refundStore.addRefundDetail({
                orderId: order.id,
                amount: order.totalPrice,
                reason: `班次取消: ${reason}`,
                type: "flight-cancelled",
              });
              refundsCreated.push(refundId);

              const waitingLists = waitingStore.getByScheduleId(id);
              waitingLists.forEach((w) => {
                if (w.status === "waiting") {
                  waitingStore.cancelWaitingList(w.id);
                }
              });
            } catch (e) {
              console.error("创建退款失败:", e);
            }
          }
        });

        return {
          affectedOrders: affectedOrders.length,
          refundsCreated: refundsCreated.length,
        };
      },

      getByDate: (date) => {
        return get().schedules.filter((s) => s.date === date);
      },

      getByRoute: (routeId) => {
        return get().schedules.filter((s) => s.routeId === routeId);
      },

      getByShip: (shipId) => {
        return get().schedules.filter((s) => s.shipId === shipId);
      },

      getByDateAndRoute: (date, routeId) => {
        return get().schedules.filter((s) => s.date === date && s.routeId === routeId);
      },

      getByDateRange: (startDate, endDate) => {
        return get().schedules.filter(
          (s) => s.date >= startDate && s.date <= endDate
        );
      },

      calculateAvailableSeats: (scheduleId) => {
        const schedule = get().schedules.find((s) => s.id === scheduleId);
        if (!schedule) return 0;

        const orderStore = useOrderStore.getState();
        const orders = orderStore.getByScheduleId(scheduleId);
        const soldSeats = orders
          .filter((o) => o.status !== "refunded" && o.status !== "cancelled")
          .reduce((sum, o) => sum + o.ticketCount, 0);

        const waitingStore = useWaitingListStore.getState();
        const waitingSeats = waitingStore
          .getByScheduleId(scheduleId)
          .filter((w) => w.status === "waiting")
          .reduce((sum, w) => sum + w.ticketCount, 0);

        return Math.max(0, schedule.totalSeats - soldSeats - waitingSeats);
      },

      getDockCapacityForTime: (dockId, date, time) => {
        const baseStore = useBaseStore.getState();
        const dock = baseStore.docks.find((d) => d.id === dockId);
        if (!dock || dock.status !== "open") return 0;

        const daySchedules = get()
          .getByDate(date)
          .filter((s) => {
            const route = baseStore.routes.find((r) => r.id === s.routeId);
            return route?.startDockId === dockId && s.departureTime === time;
          });

        const occupied = daySchedules.reduce((sum, s) => sum + s.totalSeats, 0);
        return Math.max(0, dock.capacity - occupied);
      },

      isWithinTideWindow: (date, time, _routeId) => {
        const baseStore = useBaseStore.getState();
        const tide = baseStore.getTideByDate(date);
        if (!tide) return true;
        if (!tide.isSailable) return false;

        const timeNum = parseInt(time.replace(":", ""));
        for (const highTide of tide.highTideTimes) {
          const highTideNum = parseInt(highTide.replace(":", ""));
          const diff = Math.abs(timeNum - highTideNum);
          if (diff <= 200) return true;
        }
        return true;
      },

      hasCrewAssigned: (scheduleId) => {
        const crewStore = useCrewStore.getState();
        return !!crewStore.getByScheduleId(scheduleId);
      },
    }),
    { name: "scenic-schedules" }
  )
);
