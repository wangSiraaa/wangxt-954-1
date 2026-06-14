import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoardingRecord, Passenger } from "../types";
import { useOrderStore } from "./useOrderStore";
import { usePassengerStore } from "./usePassengerStore";

interface BoardingState {
  boardingRecords: BoardingRecord[];

  addBoardingRecord: (record: Omit<BoardingRecord, "id" | "boardedAt">) => void;

  verifyAndBoard: (
    qrCode: string,
    verifiedBy: string
  ) => {
    success: boolean;
    orderId?: string;
    passengers?: Passenger[];
    message?: string;
  };

  manualBoard: (
    orderId: string,
    verifiedBy: string,
    passengerIds?: string[]
  ) => { success: boolean; message?: string };

  getByScheduleId: (scheduleId: string) => BoardingRecord[];
  getByOrderId: (orderId: string) => BoardingRecord[];
  getByDate: (date: string) => BoardingRecord[];
  getBoardingStats: (scheduleId: string) => {
    total: number;
    boarded: number;
    remaining: number;
    passengers: Passenger[];
  };
  hasBoarded: (orderId: string) => boolean;
}

export const useBoardingStore = create<BoardingState>()(
  persist<BoardingState>(
    (set, get) => ({
      boardingRecords: [],

      addBoardingRecord: (record) => {
        const newRecord: BoardingRecord = {
          ...record,
          id: crypto.randomUUID(),
          boardedAt: new Date().toISOString(),
        };
        set((state) => ({
          boardingRecords: [...state.boardingRecords, newRecord],
        }));
      },

      verifyAndBoard: (qrCode, verifiedBy) => {
        const orderStore = useOrderStore.getState();
        const verification = orderStore.verifyQRCode(qrCode);

        if (!verification.valid || !verification.order) {
          return { success: false, message: verification.message || "验证失败" };
        }

        const order = verification.order;

        if (get().hasBoarded(order.id)) {
          return { success: false, message: "该订单已登船" };
        }

        const boardingValidation = orderStore.validateBoarding(order.scheduleId, order.id);
        if (!boardingValidation.canBoard) {
          const failedChecks = boardingValidation.requiredChecks.filter((c) => !c.passed);
          const errorMessages = failedChecks.map((c) => c.message).join("；");
          return {
            success: false,
            message: `登船校验未通过：${errorMessages}`,
          };
        }

        try {
          orderStore.markAsBoarded(order.id, verifiedBy);
          return {
            success: true,
            orderId: order.id,
            passengers: order.passengers,
            message: "登船成功",
          };
        } catch (e) {
          return {
            success: false,
            message: e instanceof Error ? e.message : "登船失败",
          };
        }
      },

      manualBoard: (orderId, verifiedBy, passengerIds) => {
        const orderStore = useOrderStore.getState();
        const order = orderStore.orders.find((o) => o.id === orderId);

        if (!order) {
          return { success: false, message: "订单不存在" };
        }

        const boardingValidation = orderStore.validateBoarding(order.scheduleId, orderId, passengerIds);
        if (!boardingValidation.canBoard) {
          const failedChecks = boardingValidation.requiredChecks.filter((c) => !c.passed);
          const errorMessages = failedChecks.map((c) => c.message).join("；");
          return {
            success: false,
            message: `登船校验未通过：${errorMessages}`,
          };
        }

        const boardingPassengers = passengerIds || order.passengerIds;
        const passengerStore = usePassengerStore.getState();
        const passengers = passengerStore.getByIds(boardingPassengers);

        if (passengers.length === 0) {
          return { success: false, message: "未找到乘客信息" };
        }

        try {
          orderStore.markAsBoarded(orderId, verifiedBy, boardingPassengers);
          return { success: true, message: "登船成功" };
        } catch (e) {
          return {
            success: false,
            message: e instanceof Error ? e.message : "登船失败",
          };
        }
      },

      getByScheduleId: (scheduleId) => {
        return get().boardingRecords.filter((r) => r.scheduleId === scheduleId);
      },

      getByOrderId: (orderId) => {
        return get().boardingRecords.filter((r) => r.orderId === orderId);
      },

      getByDate: (date) => {
        return get().boardingRecords.filter((r) => r.boardedAt.startsWith(date));
      },

      getBoardingStats: (scheduleId) => {
        const orderStore = useOrderStore.getState();
        const passengerStore = usePassengerStore.getState();

        const orders = orderStore.getByScheduleId(scheduleId);
        const validOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");

        const totalPassengers = validOrders.reduce(
          (sum, o) => sum + o.ticketCount,
          0
        );

        const boardingRecords = get().getByScheduleId(scheduleId);
        const boardedOrders = boardingRecords.map((r) => r.orderId);

        const boardedPassengers = validOrders
          .filter((o) => boardedOrders.includes(o.id) || o.status === "boarded")
          .reduce((sum, o) => sum + o.ticketCount, 0);

        const allPassengerIds = validOrders.flatMap((o) => o.passengerIds);
        const allPassengers = passengerStore.getByIds(allPassengerIds);

        return {
          total: totalPassengers,
          boarded: boardedPassengers,
          remaining: totalPassengers - boardedPassengers,
          passengers: allPassengers,
        };
      },

      hasBoarded: (orderId) => {
        return !!get().boardingRecords.find((r) => r.orderId === orderId);
      },
    }),
    { name: "scenic-boardings" }
  )
);
