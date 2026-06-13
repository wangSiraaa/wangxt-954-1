import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RefundDetail } from "../types";
import { useOrderStore } from "./useOrderStore";
import { useScheduleStore } from "./useScheduleStore";

interface RefundState {
  refundDetails: RefundDetail[];

  addRefundDetail: (data: Omit<RefundDetail, "id" | "createdAt" | "status"> & { autoProcess?: boolean }) => string;
  processRefund: (id: string, operator?: string) => void;
  rejectRefund: (id: string, reason: string) => void;
  getByOrderId: (orderId: string) => RefundDetail[];
  getPendingRefunds: () => RefundDetail[];
  getRefundFee: (orderId: string, type: RefundDetail["type"]) => number;
  calculateRefundStats: (startDate: string, endDate: string) => {
    totalAmount: number;
    totalFee: number;
    totalNetAmount: number;
    count: number;
    byType: Record<string, { count: number; amount: number }>;
  };
}

function calculateRefundFeePercent(hoursBeforeDeparture: number): number {
  if (hoursBeforeDeparture >= 24) return 0.05;
  if (hoursBeforeDeparture >= 12) return 0.1;
  if (hoursBeforeDeparture >= 4) return 0.2;
  return 0.5;
}

export const useRefundStore = create<RefundState>()(
  persist(
    (set, get) => ({
      refundDetails: [],

      getRefundFee: (orderId, type) => {
        if (type === "flight-cancelled") return 0;
        if (type === "reschedule-fee") return 20;

        const order = useOrderStore.getState().orders.find((o) => o.id === orderId);
        const schedule = order
          ? useScheduleStore.getState().schedules.find((s) => s.id === order.scheduleId)
          : null;

        if (!order || !schedule) return 0;

        const departureDateTime = new Date(`${schedule.date}T${schedule.departureTime}`);
        const now = new Date();
        const hoursBeforeDeparture = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        const feePercent = calculateRefundFeePercent(Math.max(0, hoursBeforeDeparture));
        return Math.round(order.totalPrice * feePercent);
      },

      addRefundDetail: (data) => {
        const order = useOrderStore.getState().orders.find((o) => o.id === data.orderId);
        if (!order) {
          throw new Error("订单不存在");
        }

        const fee = data.fee ?? get().getRefundFee(data.orderId, data.type);
        const netAmount = data.amount - fee;

        const newItem: RefundDetail = {
          ...data,
          fee,
          netAmount,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: "pending",
        };

        set((state) => ({ refundDetails: [...state.refundDetails, newItem] }));

        if (data.autoProcess !== false) {
          get().processRefund(newItem.id);
        }

        return newItem.id;
      },

      processRefund: (id, _operator) => {
        const refund = get().refundDetails.find((r) => r.id === id);
        if (!refund || refund.status !== "pending") return;

        const orderStore = useOrderStore.getState();
        const order = orderStore.orders.find((o) => o.id === refund.orderId);

        if (order && order.status !== "boarded") {
          try {
            orderStore.refundOrder(refund.orderId, refund.fee);
            set((state) => ({
              refundDetails: state.refundDetails.map((r) =>
                r.id === id ? { ...r, status: "completed", processedAt: new Date().toISOString() } : r
              ),
            }));
          } catch {
            set((state) => ({
              refundDetails: state.refundDetails.map((r) =>
                r.id === id ? { ...r, status: "rejected" } : r
              ),
            }));
          }
        }
      },

      rejectRefund: (id, reason) => {
        set((state) => ({
          refundDetails: state.refundDetails.map((r) =>
            r.id === id ? { ...r, status: "rejected", reason } : r
          ),
        }));
      },

      getByOrderId: (orderId) => {
        return get().refundDetails.filter((r) => r.orderId === orderId);
      },

      getPendingRefunds: () => {
        return get().refundDetails.filter((r) => r.status === "pending");
      },

      calculateRefundStats: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filtered = get().refundDetails.filter((r) => {
          const createdAt = new Date(r.createdAt);
          return createdAt >= start && createdAt <= end && r.status === "completed";
        });

        const stats = {
          totalAmount: 0,
          totalFee: 0,
          totalNetAmount: 0,
          count: filtered.length,
          byType: {} as Record<string, { count: number; amount: number }>,
        };

        filtered.forEach((r) => {
          stats.totalAmount += r.amount;
          stats.totalFee += r.fee;
          stats.totalNetAmount += r.netAmount;
          if (!stats.byType[r.type]) {
            stats.byType[r.type] = { count: 0, amount: 0 };
          }
          stats.byType[r.type].count++;
          stats.byType[r.type].amount += r.netAmount;
        });

        return stats;
      },
    }),
    { name: "scenic-refund" }
  )
);
