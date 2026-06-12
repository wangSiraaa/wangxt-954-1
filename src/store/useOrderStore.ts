import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "../types";
import { useStopDayStore } from "./useStopDayStore";
import { useScheduleStore } from "./useScheduleStore";

interface OrderState {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt">) => void;
  refundOrder: (orderId: string) => void;
  markAsBoarded: (orderId: string) => void;
  getByScheduleId: (scheduleId: string) => Order[];
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) => {
        const { isStopDay } = useStopDayStore.getState();
        const schedule = useScheduleStore
          .getState()
          .schedules.find((s) => s.id === order.scheduleId);
        if (!schedule) {
          throw new Error("班次不存在");
        }
        if (isStopDay(schedule.date)) {
          throw new Error("该班次日期为停航日，无法下单");
        }
        if (schedule.availableSeats < order.ticketCount) {
          throw new Error("余座不足，无法下单");
        }
        const newOrder: Order = {
          ...order,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        useScheduleStore
          .getState()
          .updateSchedule(schedule.id, {
            availableSeats: schedule.availableSeats - order.ticketCount,
          });
        set((state) => ({
          orders: [...state.orders, newOrder],
        }));
      },
      refundOrder: (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) {
          throw new Error("订单不存在");
        }
        if (order.status === "boarded") {
          throw new Error("已登船的订单无法退票");
        }
        if (order.status === "refunded") {
          throw new Error("订单已退票，无法重复退票");
        }
        const schedule = useScheduleStore
          .getState()
          .schedules.find((s) => s.id === order.scheduleId);
        if (schedule) {
          useScheduleStore
            .getState()
            .updateSchedule(schedule.id, {
              availableSeats: schedule.availableSeats + order.ticketCount,
            });
        }
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "refunded" as const } : o
          ),
        }));
      },
      markAsBoarded: (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) {
          throw new Error("订单不存在");
        }
        if (order.status !== "pending") {
          throw new Error("只有待登船状态的订单可以标记为已登船");
        }
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "boarded" as const } : o
          ),
        }));
      },
      getByScheduleId: (scheduleId) => {
        return get().orders.filter((o) => o.scheduleId === scheduleId);
      },
    }),
    { name: "scenic-orders" }
  )
);
