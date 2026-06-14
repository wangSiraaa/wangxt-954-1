import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WaitingList } from "../types";
import { useScheduleStore } from "./useScheduleStore";
import { useOrderStore } from "./useOrderStore";
import { usePassengerStore } from "./usePassengerStore";

type WaitingListCreate = Omit<WaitingList, "id" | "position" | "status" | "createdAt" | "expiresAt">;

interface WaitingListState {
  waitingLists: WaitingList[];

  addWaitingList: (data: WaitingListCreate) => string;
  cancelWaitingList: (id: string) => void;
  cancelWaitingListBySchedule: (scheduleId: string, reason?: string) => void;
  convertToOrder: (id: string, operator?: string) => string | null;
  getByScheduleId: (scheduleId: string) => WaitingList[];
  getByContactPhone: (phone: string) => WaitingList[];
  processWaitingListForSchedule: (scheduleId: string, operator?: string) => string[];
  checkAndConvertWaitingList: (scheduleId: string, availableSeats: number, operator?: string) => { converted: string[]; remainingSeats: number };
}

function addHours(dateStr: string, hours: number): string {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export const useWaitingListStore = create<WaitingListState>()(
  persist(
    (set, get) => ({
      waitingLists: [],

      addWaitingList: (data) => {
        const schedule = useScheduleStore.getState().schedules.find((s) => s.id === data.scheduleId);
        if (!schedule) {
          throw new Error("班次不存在");
        }
        if (schedule.status !== "scheduled") {
          throw new Error("该班次不可候补");
        }

        const currentList = get().getByScheduleId(data.scheduleId).filter((w) => w.status === "waiting");
        const newPosition = currentList.length + 1;

        const newItem: WaitingList = {
          ...data,
          id: crypto.randomUUID(),
          position: newPosition,
          status: "waiting",
          createdAt: new Date().toISOString(),
          expiresAt: addHours(new Date().toISOString(), 24),
        };

        set((state) => ({ waitingLists: [...state.waitingLists, newItem] }));
        return newItem.id;
      },

      cancelWaitingList: (id) => {
        set((state) => ({
          waitingLists: state.waitingLists.map((w) =>
            w.id === id ? { ...w, status: "cancelled" } : w
          ),
        }));
      },

      cancelWaitingListBySchedule: (scheduleId, _reason) => {
        set((state) => ({
          waitingLists: state.waitingLists.map((w) =>
            w.scheduleId === scheduleId && w.status === "waiting"
              ? { ...w, status: "cancelled" }
              : w
          ),
        }));
      },

      convertToOrder: (id, _operator) => {
        const waiting = get().waitingLists.find((w) => w.id === id);
        if (!waiting || waiting.status !== "waiting") {
          return null;
        }

        const schedule = useScheduleStore.getState().schedules.find((s) => s.id === waiting.scheduleId);
        if (!schedule || schedule.status !== "scheduled") {
          return null;
        }

        if (schedule.availableSeats < waiting.ticketCount) {
          return null;
        }

        const passengers = usePassengerStore.getState().getByIds(waiting.passengerIds);
        const orderStore = useOrderStore.getState();

        const orderId = orderStore.addOrder({
          scheduleId: waiting.scheduleId,
          touristName: passengers[0]?.name || "候补乘客",
          ticketCount: waiting.ticketCount,
          totalPrice: schedule.ticketPrice * waiting.ticketCount,
          passengerIds: waiting.passengerIds,
          passengers: passengers,
          contactPhone: waiting.contactPhone,
        });

        set((state) => ({
          waitingLists: state.waitingLists.map((w) =>
            w.id === id ? { ...w, status: "converted" } : w
          ),
        }));

        return orderId;
      },

      getByScheduleId: (scheduleId) => {
        return get().waitingLists.filter((w) => w.scheduleId === scheduleId).sort((a, b) => a.position - b.position);
      },

      getByContactPhone: (phone) => {
        return get().waitingLists.filter((w) => w.contactPhone === phone);
      },

      processWaitingListForSchedule: (scheduleId, operator) => {
        const schedule = useScheduleStore.getState().schedules.find((s) => s.id === scheduleId);
        if (!schedule) return [];

        const { converted } = get().checkAndConvertWaitingList(scheduleId, schedule.availableSeats, operator);
        return converted;
      },

      checkAndConvertWaitingList: (scheduleId, availableSeats, operator) => {
        const waitingList = get().getByScheduleId(scheduleId).filter((w) => w.status === "waiting");
        let remainingSeats = availableSeats;
        const converted: string[] = [];

        for (const waiting of waitingList) {
          if (remainingSeats >= waiting.ticketCount) {
            const orderId = get().convertToOrder(waiting.id, operator);
            if (orderId) {
              converted.push(orderId);
              remainingSeats -= waiting.ticketCount;
            }
          } else {
            break;
          }
        }

        return { converted, remainingSeats };
      },
    }),
    { name: "scenic-waiting" }
  )
);
