import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, Passenger, RescheduleRecord, GroupTicket } from "../types";
import { useStopDayStore } from "./useStopDayStore";
import { useScheduleStore } from "./useScheduleStore";
import { useShipStore } from "./useShipStore";
import { useCrewStore } from "./useCrewStore";
import { useBaseStore } from "./useBaseStore";
import { usePassengerStore } from "./usePassengerStore";
import { useWaitingListStore } from "./useWaitingListStore";
import { useRefundStore } from "./useRefundStore";
import { useBoardingStore } from "./useBoardingStore";

interface TicketValidationResult {
  valid: boolean;
  errors: string[];
  availableSeats: number;
}

interface OrderState {
  orders: Order[];

  addOrder: (order: Omit<Order, "id" | "createdAt" | "orderNo" | "qrCode" | "rescheduleHistory" | "insuranceAmount"> & {
    passengers: Passenger[];
    insuranceId?: string;
    groupTicket?: Omit<GroupTicket, "id" | "orderId">;
    contactPhone?: string;
  }) => string;

  validateTicketPurchase: (scheduleId: string, ticketCount: number, passengerIds?: string[]) => TicketValidationResult;

  rescheduleOrder: (orderId: string, toScheduleId: string, reason: string, operator?: string) => string;

  refundOrder: (orderId: string, fee?: number, reason?: string) => void;

  markAsBoarded: (orderId: string, verifiedBy?: string, passengerIds?: string[]) => void;

  verifyQRCode: (qrCode: string) => { valid: boolean; order?: Order; message?: string };

  getByScheduleId: (scheduleId: string) => Order[];
  getByOrderNo: (orderNo: string) => Order | undefined;
  getByPhone: (phone: string) => Order[];
  getByPassenger: (passengerId: string) => Order[];
  getPendingOrders: () => Order[];
  getRescheduleableOrders: () => Order[];

  generateOrderNo: () => string;
  generateQRCode: (orderId: string) => string;
}

function generateOrderNo(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YC${datePart}${randomPart}`;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],

      generateOrderNo: () => generateOrderNo(),

      generateQRCode: (orderId) => {
        return btoa(`order:${orderId}:${new Date().getTime()}`);
      },

      validateTicketPurchase: (scheduleId, ticketCount, passengerIds = []) => {
        const errors: string[] = [];
        const scheduleStore = useScheduleStore.getState();
        const stopDayStore = useStopDayStore.getState();
        const shipStore = useShipStore.getState();
        const crewStore = useCrewStore.getState();
        const baseStore = useBaseStore.getState();

        const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
        if (!schedule) {
          errors.push("班次不存在");
          return { valid: false, errors, availableSeats: 0 };
        }

        if (schedule.status !== "scheduled") {
          if (schedule.status === "cancelled") {
            errors.push("该班次已取消，无法购票");
          } else if (schedule.status === "completed") {
            errors.push("该班次已完成，无法购票");
          } else if (schedule.status === "in-progress") {
            errors.push("该班次正在进行中，无法购票");
          }
        }

        if (stopDayStore.isStopDay(schedule.date)) {
          const stopDay = stopDayStore.stopDays.find((s) => s.date === schedule.date);
          if (stopDay?.type === "weather" || stopDay?.type === "emergency") {
            errors.push("该日期为停航日，无法购票");
          }
          if (stopDay?.affectedRoutes && stopDay.affectedRoutes.length > 0) {
            if (stopDay.affectedRoutes.includes(schedule.routeId)) {
              errors.push("该航线在当日停航，无法购票");
            }
          }
        }

        const ship = shipStore.ships.find((s) => s.id === schedule.shipId);
        if (!ship) {
          errors.push("关联船只不存在");
        } else if (ship.status === "maintenance") {
          errors.push("该船只正在检修中，无法购票");
        } else if (ship.status !== "available") {
          errors.push("该船只当前不可用");
        }

        if (!crewStore.getByScheduleId(scheduleId)) {
          errors.push("该班次尚未安排船员，暂不可售票");
        }

        const availableSeats = scheduleStore.calculateAvailableSeats(scheduleId);
        if (availableSeats < ticketCount) {
          errors.push(`余座不足，当前可售${availableSeats}张`);
        }

        if (passengerIds.length > 0 && passengerIds.length !== ticketCount) {
          errors.push("乘客数量与购票数量不一致");
        }

        const route = baseStore.routes.find((r) => r.id === schedule.routeId);
        if (route) {
          const startDock = baseStore.docks.find((d) => d.id === route.startDockId);
          if (startDock && startDock.status !== "open") {
            errors.push("出发码头当前关闭，无法购票");
          }
        }

        return { valid: errors.length === 0, errors, availableSeats };
      },

      addOrder: (order) => {
        const validation = get().validateTicketPurchase(
          order.scheduleId,
          order.ticketCount,
          order.passengerIds
        );
        if (!validation.valid) {
          throw new Error(validation.errors.join("；"));
        }

        const passengerStore = usePassengerStore.getState();
        const savedPassengers: Passenger[] = order.passengers.map((p) =>
          passengerStore.addOrUpdatePassenger(p)
        );

        const scheduleStore = useScheduleStore.getState();
        const schedule = scheduleStore.schedules.find((s) => s.id === order.scheduleId)!;

        let insuranceAmount = 0;
        if (order.insuranceId) {
          const insurance = useBaseStore.getState().insurances.find((i) => i.id === order.insuranceId);
          if (insurance) {
            insuranceAmount = insurance.price * order.ticketCount;
          }
        }

        const orderNo = get().generateOrderNo();
        const newOrderId = crypto.randomUUID();
        const qrCode = get().generateQRCode(newOrderId);

        let groupTicket: GroupTicket | undefined;
        if (order.groupTicket) {
          groupTicket = {
            ...order.groupTicket,
            id: crypto.randomUUID(),
            orderId: newOrderId,
          };
        }

        const newOrder: Order = {
          ...order,
          id: newOrderId,
          orderNo,
          qrCode,
          passengers: savedPassengers,
          passengerIds: savedPassengers.map((p) => p.id),
          insuranceAmount,
          totalPrice: schedule.ticketPrice * order.ticketCount + insuranceAmount,
          rescheduleHistory: [],
          status: "pending",
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          groupTicket,
        };

        scheduleStore.updateSchedule(schedule.id, {
          availableSeats: schedule.availableSeats - order.ticketCount,
        });

        set((state) => ({
          orders: [...state.orders, newOrder],
        }));

        return newOrderId;
      },

      rescheduleOrder: (orderId, toScheduleId, reason, operator) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) {
          throw new Error("订单不存在");
        }
        if (order.status !== "pending") {
          throw new Error("只有待登船状态的订单可以改签");
        }
        if (order.rescheduleHistory.length >= 2) {
          throw new Error("订单最多只能改签2次");
        }

        const validation = get().validateTicketPurchase(toScheduleId, order.ticketCount, order.passengerIds);
        if (!validation.valid) {
          throw new Error(validation.errors.join("；"));
        }

        const scheduleStore = useScheduleStore.getState();
        const oldSchedule = scheduleStore.schedules.find((s) => s.id === order.scheduleId);
        const newSchedule = scheduleStore.schedules.find((s) => s.id === toScheduleId);
        if (!newSchedule) {
          throw new Error("新班次不存在");
        }

        const refundStore = useRefundStore.getState();
        const rescheduleFee = refundStore.getRefundFee(orderId, "reschedule-fee");

        const rescheduleRecord: RescheduleRecord = {
          id: crypto.randomUUID(),
          orderId: order.id,
          fromScheduleId: order.scheduleId,
          toScheduleId,
          reason,
          fee: rescheduleFee,
          createdAt: new Date().toISOString(),
          operator,
        };

        const priceDiff = newSchedule.ticketPrice * order.ticketCount - order.totalPrice + order.insuranceAmount;

        if (oldSchedule) {
          scheduleStore.updateSchedule(oldSchedule.id, {
            availableSeats: oldSchedule.availableSeats + order.ticketCount,
          });
        }

        scheduleStore.updateSchedule(newSchedule.id, {
          availableSeats: newSchedule.availableSeats - order.ticketCount,
        });

        const newQrCode = get().generateQRCode(orderId);

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  scheduleId: toScheduleId,
                  totalPrice: o.totalPrice + priceDiff + rescheduleFee,
                  status: "rescheduled" as const,
                  qrCode: newQrCode,
                  rescheduleHistory: [...o.rescheduleHistory, rescheduleRecord],
                }
              : o
          ),
        }));

        const waitingListStore = useWaitingListStore.getState();
        if (oldSchedule) {
          waitingListStore.processWaitingListForSchedule(oldSchedule.id, operator);
        }

        return orderId;
      },

      refundOrder: (orderId, _fee = 0, reason = "用户主动退票") => {
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
        if (order.status === "cancelled") {
          throw new Error("订单已取消，无法重复操作");
        }

        const scheduleStore = useScheduleStore.getState();
        const schedule = scheduleStore.schedules.find((s) => s.id === order.scheduleId);

        if (schedule) {
          scheduleStore.updateSchedule(schedule.id, {
            availableSeats: schedule.availableSeats + order.ticketCount,
          });
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "refunded" as const, cancellationReason: reason }
              : o
          ),
        }));

        const waitingListStore = useWaitingListStore.getState();
        if (schedule) {
          waitingListStore.processWaitingListForSchedule(schedule.id);
        }
      },

      markAsBoarded: (orderId, verifiedBy = "系统", passengerIds) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) {
          throw new Error("订单不存在");
        }
        if (order.status !== "pending" && order.status !== "rescheduled") {
          throw new Error("只有待登船或已改签状态的订单可以登船");
        }

        const boardingPassengers = passengerIds || order.passengerIds;

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "boarded" as const } : o
          ),
        }));

        useBoardingStore.getState().addBoardingRecord({
          orderId,
          scheduleId: order.scheduleId,
          passengerIds: boardingPassengers,
          verifiedBy,
          qrCodeScanned: true,
        });
      },

      verifyQRCode: (qrCode) => {
        const order = get().orders.find((o) => o.qrCode === qrCode);
        if (!order) {
          return { valid: false, message: "二维码无效" };
        }
        if (order.status === "refunded") {
          return { valid: false, order, message: "该订单已退票" };
        }
        if (order.status === "cancelled") {
          return { valid: false, order, message: "该订单已取消" };
        }
        if (order.status === "boarded") {
          return { valid: false, order, message: "该订单已登船" };
        }

        const schedule = useScheduleStore.getState().schedules.find((s) => s.id === order.scheduleId);
        if (schedule?.status === "cancelled") {
          return { valid: false, order, message: "该班次已取消，请办理改签或退票" };
        }

        return { valid: true, order, message: "验证通过" };
      },

      getByScheduleId: (scheduleId) => {
        return get().orders.filter((o) => o.scheduleId === scheduleId);
      },

      getByOrderNo: (orderNo) => {
        return get().orders.find((o) => o.orderNo === orderNo);
      },

      getByPhone: (phone) => {
        return get().orders.filter((o) => {
          const primaryPassenger = o.passengers[0];
          return primaryPassenger?.phone === phone;
        });
      },

      getByPassenger: (passengerId) => {
        return get().orders.filter((o) => o.passengerIds.includes(passengerId));
      },

      getPendingOrders: () => {
        return get().orders.filter((o) => o.status === "pending" || o.status === "rescheduled");
      },

      getRescheduleableOrders: () => {
        return get().orders.filter(
          (o) => (o.status === "pending" || o.status === "rescheduled") && o.rescheduleHistory.length < 2
        );
      },
    }),
    { name: "scenic-orders" }
  )
);
