import { useShipStore } from "@/store/useShipStore";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useBoardingStore } from "@/store/useBoardingStore";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function initDemoData() {
  const shipState = useShipStore.getState();
  if (shipState.ships.length > 0) return;

  const today = new Date();

  const shipData = [
    { name: "明珠一号", capacity: 50 },
    { name: "海景号", capacity: 80 },
    { name: "清风号", capacity: 30 },
    { name: "朝阳号", capacity: 60 },
  ];

  shipData.forEach((s) => {
    shipState.addShip({ name: s.name, capacity: s.capacity, status: "available" });
  });

  const ships = useShipStore.getState().ships;
  const shipQingfeng = ships.find((s) => s.name === "清风号")!;

  const maintState = useMaintenanceStore.getState();
  maintState.addMaintenance({
    shipId: shipQingfeng.id,
    startDate: formatDate(addDays(today, -1)),
    endDate: formatDate(addDays(today, 3)),
    reason: "年度检修保养",
    isActive: true,
  });

  const stopDayState = useStopDayStore.getState();
  try {
    stopDayState.addStopDay({
      date: formatDate(addDays(today, 5)),
      reason: "大风蓝色预警",
    });
  } catch {
    // 忽略已存在
  }

  const schedState = useScheduleStore.getState();
  const times = ["09:00", "10:30", "13:30", "15:00"];
  const prices = [80, 100, 80, 90];

  const availableShips = useShipStore
    .getState()
    .ships.filter((s) => s.status === "available");

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = formatDate(addDays(today, dayOffset));
    if (stopDayState.isStopDay(date)) continue;

    times.forEach((time, idx) => {
      const ship = availableShips[idx % availableShips.length];
      if (!ship) return;
      try {
        schedState.addSchedule({
          shipId: ship.id,
          date,
          departureTime: time,
          ticketPrice: prices[idx % prices.length],
          totalSeats: ship.capacity,
          availableSeats: ship.capacity,
        });
      } catch {
        // 忽略失败
      }
    });
  }

  const schedules = useScheduleStore.getState().schedules;
  if (schedules.length === 0) return;

  const orderState = useOrderStore.getState();
  const firstSched = schedules[0];
  const secondSched = schedules[1] || schedules[0];

  const demoOrders = [
    { scheduleId: firstSched.id, touristName: "张三", ticketCount: 2 },
    { scheduleId: firstSched.id, touristName: "李四", ticketCount: 3 },
    { scheduleId: secondSched.id, touristName: "王五", ticketCount: 1 },
    { scheduleId: secondSched.id, touristName: "赵六", ticketCount: 2 },
  ];

  demoOrders.forEach((o) => {
    const sched = schedules.find((s) => s.id === o.scheduleId);
    if (!sched) return;
    try {
      orderState.addOrder({
        scheduleId: o.scheduleId,
        touristName: o.touristName,
        ticketCount: o.ticketCount,
        totalPrice: sched.ticketPrice * o.ticketCount,
        status: "pending",
      });
    } catch {
      // 忽略
    }
  });

  const orders = useOrderStore.getState().orders;
  const boardingState = useBoardingStore.getState();
  if (orders.length > 0 && boardingState.boardingRecords.length === 0) {
    try {
      const firstPending = orders.find((o) => o.status === "pending");
      if (firstPending) {
        orderState.markAsBoarded(firstPending.id);
        boardingState.addBoardingRecord({
          orderId: firstPending.id,
          scheduleId: firstPending.scheduleId,
        });
      }
    } catch {
      // 忽略
    }
  }
}
