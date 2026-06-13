import { useBaseStore } from "@/store/useBaseStore";
import { useShipStore } from "@/store/useShipStore";
import { useCrewStore } from "@/store/useCrewStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { useOrderStore } from "@/store/useOrderStore";
import { usePassengerStore } from "@/store/usePassengerStore";
import { useRefundStore } from "@/store/useRefundStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import { useShipInspectionStore } from "@/store/useShipInspectionStore";
import type { Passenger } from "@/types";

function formatDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function _addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d.getTime() - new Date().getTime() > 0 ? days : days);
}

function getFutureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const samplePassengers: Omit<Passenger, "id">[] = [
  { name: "张三", idCard: "110101199001011234", phone: "13800138001", gender: "male", birthDate: "1990-01-01" },
  { name: "李四", idCard: "110101199002022345", phone: "13800138002", gender: "female", birthDate: "1990-02-02" },
  { name: "王五", idCard: "110101199003033456", phone: "13800138003", gender: "male", birthDate: "1990-03-03" },
  { name: "赵六", idCard: "110101199004044567", phone: "13800138004", gender: "female", birthDate: "1990-04-04" },
  { name: "钱七", idCard: "110101199005055678", phone: "13800138005", gender: "male", birthDate: "1990-05-05" },
  { name: "孙八", idCard: "110101199006066789", phone: "13800138006", gender: "female", birthDate: "1990-06-06" },
  { name: "周九", idCard: "110101199007077890", phone: "13800138007", gender: "male", birthDate: "1990-07-07" },
  { name: "吴十", idCard: "110101199008088901", phone: "13800138008", gender: "female", birthDate: "1990-08-08" },
  { name: "郑十一", idCard: "110101199009099012", phone: "13800138009", gender: "male", birthDate: "1990-09-09" },
  { name: "王十二", idCard: "110101199010100123", phone: "13800138010", gender: "female", birthDate: "1990-10-10" },
];

export function initDemoData() {
  const baseStore = useBaseStore.getState();
  const shipStore = useShipStore.getState();
  const crewStore = useCrewStore.getState();
  const scheduleStore = useScheduleStore.getState();
  const stopDayStore = useStopDayStore.getState();
  const maintenanceStore = useMaintenanceStore.getState();
  const orderStore = useOrderStore.getState();
  const passengerStore = usePassengerStore.getState();
  const refundStore = useRefundStore.getState();
  const waitingStore = useWaitingListStore.getState();
  const inspectionStore = useShipInspectionStore.getState();

  if (baseStore.docks.length > 0) {
    return { message: "演示数据已存在，无需重复初始化" };
  }

  baseStore.addDock({ name: "景区码头A", capacity: 200, location: "景区东门", status: "open" });
  baseStore.addDock({ name: "景区码头B", capacity: 150, location: "景区西门", status: "open" });
  baseStore.addDock({ name: "湖心岛码头", capacity: 100, location: "湖心岛", status: "open" });
  baseStore.addDock({ name: "备用码头", capacity: 80, location: "景区南门", status: "maintenance" });

  const dockA = baseStore.docks.find((d) => d.name === "景区码头A")!;
  const dockB = baseStore.docks.find((d) => d.name === "景区码头B")!;
  const dockIsland = baseStore.docks.find((d) => d.name === "湖心岛码头")!;

  baseStore.addRoute({
    name: "环湖游",
    startDockId: dockA.id,
    endDockId: dockA.id,
    duration: 60,
    distance: 15,
    description: "环绕景区湖泊一周，欣赏湖光山色",
  });
  baseStore.addRoute({
    name: "码头A→湖心岛",
    startDockId: dockA.id,
    endDockId: dockIsland.id,
    duration: 30,
    distance: 8,
    description: "直达湖心岛，快捷便利",
  });
  baseStore.addRoute({
    name: "码头B→湖心岛",
    startDockId: dockB.id,
    endDockId: dockIsland.id,
    duration: 25,
    distance: 6,
    description: "从西门码头前往湖心岛",
  });
  baseStore.addRoute({
    name: "深度游",
    startDockId: dockA.id,
    endDockId: dockB.id,
    duration: 120,
    distance: 25,
    description: "深入景区各个角落，全景游览",
  });

  const route1 = baseStore.routes.find((r) => r.name === "环湖游")!;
  const route2 = baseStore.routes.find((r) => r.name === "码头A→湖心岛")!;
  const route3 = baseStore.routes.find((r) => r.name === "深度游")!;

  baseStore.addShipType({
    name: "观光快艇",
    capacity: 12,
    description: "高速观光艇，适合快速游览",
    safetyCertExpiry: getFutureDate(365),
  });
  baseStore.addShipType({
    name: "豪华游船",
    capacity: 50,
    description: "大型豪华游船，设施完善",
    safetyCertExpiry: getFutureDate(365),
  });
  baseStore.addShipType({
    name: "休闲画舫",
    capacity: 30,
    description: "古色古香的画舫船，适合慢游",
    safetyCertExpiry: getFutureDate(365),
  });

  const shipType1 = baseStore.shipTypes.find((t) => t.name === "观光快艇")!;
  const shipType2 = baseStore.shipTypes.find((t) => t.name === "豪华游船")!;
  const shipType3 = baseStore.shipTypes.find((t) => t.name === "休闲画舫")!;

  shipStore.addShip({
    name: "翔龙号",
    shipTypeId: shipType1.id,
    capacity: 12,
    status: "available",
    currentDockId: dockA.id,
    lastInspectionDate: getFutureDate(-30),
    nextInspectionDate: getFutureDate(30),
  });
  shipStore.addShip({
    name: "飞凤号",
    shipTypeId: shipType1.id,
    capacity: 12,
    status: "available",
    currentDockId: dockB.id,
    lastInspectionDate: getFutureDate(-30),
    nextInspectionDate: getFutureDate(30),
  });
  shipStore.addShip({
    name: "明珠号",
    shipTypeId: shipType2.id,
    capacity: 50,
    status: "available",
    currentDockId: dockA.id,
    lastInspectionDate: getFutureDate(-15),
    nextInspectionDate: getFutureDate(45),
  });
  shipStore.addShip({
    name: "翡翠号",
    shipTypeId: shipType2.id,
    capacity: 50,
    status: "maintenance",
    currentDockId: dockA.id,
    lastInspectionDate: getFutureDate(-45),
    nextInspectionDate: getFutureDate(15),
  });
  shipStore.addShip({
    name: "丹青舫",
    shipTypeId: shipType3.id,
    capacity: 30,
    status: "available",
    currentDockId: dockA.id,
    lastInspectionDate: getFutureDate(-20),
    nextInspectionDate: getFutureDate(40),
  });
  shipStore.addShip({
    name: "水墨舫",
    shipTypeId: shipType3.id,
    capacity: 30,
    status: "available",
    currentDockId: dockB.id,
    lastInspectionDate: getFutureDate(-20),
    nextInspectionDate: getFutureDate(40),
  });

  const ship1 = shipStore.ships.find((s) => s.name === "翔龙号")!;
  const ship2 = shipStore.ships.find((s) => s.name === "飞凤号")!;
  const ship3 = shipStore.ships.find((s) => s.name === "明珠号")!;
  const ship4 = shipStore.ships.find((s) => s.name === "翡翠号")!;
  const ship5 = shipStore.ships.find((s) => s.name === "丹青舫")!;

  baseStore.addCaptain({
    name: "陈船长",
    licenseNo: "CPT20240001",
    licenseExpiry: getFutureDate(365),
    phone: "13900139001",
    status: "on-duty",
  });
  baseStore.addCaptain({
    name: "刘船长",
    licenseNo: "CPT20240002",
    licenseExpiry: getFutureDate(365),
    phone: "13900139002",
    status: "on-duty",
  });
  baseStore.addCaptain({
    name: "张船长",
    licenseNo: "CPT20240003",
    licenseExpiry: getFutureDate(365),
    phone: "13900139003",
    status: "on-duty",
  });
  baseStore.addCaptain({
    name: "王船长",
    licenseNo: "CPT20240004",
    licenseExpiry: getFutureDate(180),
    phone: "13900139004",
    status: "leave",
  });

  const capt1 = baseStore.captains.find((c) => c.name === "陈船长")!;
  const capt2 = baseStore.captains.find((c) => c.name === "刘船长")!;
  const capt3 = baseStore.captains.find((c) => c.name === "张船长")!;

  baseStore.addInsurance({
    name: "游船意外险",
    price: 5,
    coverage: "最高赔付20万元",
    duration: 1,
  });
  baseStore.addInsurance({
    name: "豪华游船保险",
    price: 10,
    coverage: "最高赔付50万元",
    duration: 1,
  });
  const insurance1 = baseStore.insurances.find((i) => i.name === "游船意外险")!;

  for (let i = 0; i < 7; i++) {
    const date = getFutureDate(i);
    baseStore.addTideWindow({
      date,
      highTideTimes: ["06:30", "18:45"],
      lowTideTimes: ["00:15", "12:30"],
      minWaterLevel: 1.2,
      maxWaterLevel: 2.8,
      isSailable: true,
    });
  }

  const stormDate = getFutureDate(3);
  baseStore.addTideWindow({
    date: stormDate,
    highTideTimes: ["05:00", "17:00"],
    lowTideTimes: ["11:00", "23:00"],
    minWaterLevel: 3.5,
    maxWaterLevel: 4.8,
    isSailable: false,
  });

  maintenanceStore.addMaintenance({
    shipId: ship4.id,
    startDate: getFutureDate(0),
    endDate: getFutureDate(5),
    reason: "发动机检修",
    isActive: true,
    type: "repair",
    inspector: "李工",
    notes: "更换机油和滤芯，检查传动系统",
  });

  inspectionStore.addInspection({
    shipId: ship1.id,
    inspectionDate: getFutureDate(-30),
    inspector: "王检",
    items: [
      { name: "船体结构", status: "pass" },
      { name: "推进系统", status: "pass" },
      { name: "电气系统", status: "pass" },
      { name: "消防设备", status: "pass" },
      { name: "救生设备", status: "pass" },
      { name: "导航设备", status: "pass" },
      { name: "通讯设备", status: "pass" },
      { name: "锚泊设备", status: "pass" },
      { name: "系泊设备", status: "pass" },
      { name: "舱底排水系统", status: "pass" },
    ],
    overallResult: "pass",
    nextInspectionDate: getFutureDate(30),
  });

  const schedulesToCreate = [
    { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "09:00", price: 60, seats: 12 },
    { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "11:00", price: 60, seats: 12 },
    { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "14:00", price: 60, seats: 12 },
    { shipId: ship2.id, routeId: route2.id, date: getFutureDate(0), time: "10:00", price: 60, seats: 12 },
    { shipId: ship2.id, routeId: route2.id, date: getFutureDate(0), time: "15:00", price: 60, seats: 12 },
    { shipId: ship3.id, routeId: route1.id, date: getFutureDate(0), time: "09:30", price: 100, seats: 50 },
    { shipId: ship3.id, routeId: route1.id, date: getFutureDate(0), time: "14:30", price: 100, seats: 50 },
    { shipId: ship5.id, routeId: route3.id, date: getFutureDate(0), time: "10:00", price: 180, seats: 30 },
    { shipId: ship1.id, routeId: route2.id, date: getFutureDate(1), time: "09:00", price: 60, seats: 12 },
    { shipId: ship1.id, routeId: route2.id, date: getFutureDate(1), time: "14:00", price: 60, seats: 12 },
    { shipId: ship2.id, routeId: route2.id, date: getFutureDate(1), time: "10:00", price: 60, seats: 12 },
    { shipId: ship3.id, routeId: route1.id, date: getFutureDate(1), time: "09:30", price: 100, seats: 50 },
    { shipId: ship3.id, routeId: route1.id, date: getFutureDate(1), time: "14:30", price: 100, seats: 50 },
    { shipId: ship5.id, routeId: route3.id, date: getFutureDate(1), time: "10:00", price: 180, seats: 30 },
    { shipId: ship1.id, routeId: route2.id, date: stormDate, time: "09:00", price: 60, seats: 12 },
    { shipId: ship3.id, routeId: route1.id, date: stormDate, time: "09:30", price: 100, seats: 50 },
  ];

  const scheduleIds: string[] = [];
  schedulesToCreate.forEach((s, idx) => {
    try {
      const arrTime = parseInt(s.time.split(":")[0]) + (s.routeId === route3.id ? 2 : s.routeId === route2.id ? 0 : 1);
      const newSchedule = scheduleStore.addSchedule({
        shipId: s.shipId,
        routeId: s.routeId,
        date: s.date,
        departureTime: s.time,
        arrivalTime: `${String(arrTime).padStart(2, "0")}:${s.time.split(":")[1]}`,
        ticketPrice: s.price,
        totalSeats: s.seats,
        availableSeats: s.seats,
        dockCapacity: 200,
        status: "scheduled",
      });
      scheduleIds.push(newSchedule.id);

      const shift = parseInt(s.time) < 12 ? "morning" : parseInt(s.time) < 17 ? "afternoon" : "evening";
      const capt = idx % 3 === 0 ? capt1 : idx % 3 === 1 ? capt2 : capt3;
      try {
        crewStore.addCrewSchedule({
          captainId: capt.id,
          shipId: s.shipId,
          scheduleId: newSchedule.id,
          date: s.date,
          shift: shift as "morning" | "afternoon" | "evening",
          status: "scheduled",
        });
      } catch {
        try {
          const captFallback = idx % 2 === 0 ? capt2 : capt3;
          crewStore.addCrewSchedule({
            captainId: captFallback.id,
            shipId: s.shipId,
            scheduleId: newSchedule.id,
            date: s.date,
            shift: shift as "morning" | "afternoon" | "evening",
            status: "scheduled",
          });
        } catch {
          // 忽略冲突
        }
      }
    } catch {
      console.log("跳过冲突班次:", s.date, s.time);
    }
  });

  samplePassengers.forEach((p) => {
    passengerStore.addPassenger(p);
  });

  const passengers = passengerStore.passengers;

  const fullSchedule = scheduleStore.schedules.find(
    (s) => s.date === getFutureDate(0) && s.departureTime === "09:30" && s.routeId === route1.id
  );
  if (fullSchedule) {
    for (let i = 0; i < 5; i++) {
      const passengerGroup = passengers.slice(i * 2, i * 2 + 2);
      if (passengerGroup.length > 0) {
        try {
          orderStore.addOrder({
            scheduleId: fullSchedule.id,
            touristName: passengerGroup[0].name,
            ticketCount: passengerGroup.length,
            totalPrice: fullSchedule.ticketPrice * passengerGroup.length,
            passengers: passengerGroup,
            passengerIds: passengerGroup.map((p) => p.id),
            insuranceId: insurance1.id,
          });
        } catch (e) {
          console.log("订单创建失败:", e);
        }
      }
    }

    const waitingPassengers = passengers.slice(8, 10);
    if (waitingPassengers.length > 0) {
      try {
        waitingStore.addWaitingList({
          scheduleId: fullSchedule.id,
          passengerIds: waitingPassengers.map((p) => p.id),
          ticketCount: waitingPassengers.length,
          contactPhone: waitingPassengers[0].phone,
        });
      } catch {
        // 忽略候补添加错误
      }
    }
  }

  const normalSchedule = scheduleStore.schedules.find(
    (s) => s.date === getFutureDate(0) && s.departureTime === "09:00" && s.routeId === route2.id
  );
  if (normalSchedule) {
    try {
      orderStore.addOrder({
        scheduleId: normalSchedule.id,
        touristName: passengers[0].name,
        ticketCount: 2,
        totalPrice: normalSchedule.ticketPrice * 2,
        passengers: passengers.slice(0, 2),
        passengerIds: passengers.slice(0, 2).map((p) => p.id),
        insuranceId: insurance1.id,
      });
    } catch {
      // 忽略订单添加错误
    }
  }

  const reschedulableOrder = normalSchedule
    ? orderStore.orders.find((o) => o.scheduleId === normalSchedule.id)
    : null;

  if (reschedulableOrder) {
    const tomorrowSchedule = scheduleStore.schedules.find(
      (s) => s.date === getFutureDate(1) && s.departureTime === "09:00" && s.routeId === route2.id
    );
    if (tomorrowSchedule) {
      try {
        orderStore.rescheduleOrder(
          reschedulableOrder.id,
          tomorrowSchedule.id,
          "行程变更",
          "系统演示"
        );
      } catch (e) {
        console.log("改签失败:", e);
      }
    }
  }

  const refundSchedule = scheduleStore.schedules.find(
    (s) => s.date === getFutureDate(0) && s.departureTime === "11:00" && s.routeId === route2.id
  );
  if (refundSchedule) {
    try {
      const orderId = orderStore.addOrder({
        scheduleId: refundSchedule.id,
        touristName: passengers[4].name,
        ticketCount: 2,
        totalPrice: refundSchedule.ticketPrice * 2,
        passengers: passengers.slice(4, 6),
        passengerIds: passengers.slice(4, 6).map((p) => p.id),
      });

      refundStore.addRefundDetail({
        orderId,
        amount: refundSchedule.ticketPrice * 2,
        reason: "个人原因",
        type: "passenger-initiated",
      });
    } catch (e) {}
  }

  try {
    stopDayStore.addStopDay({
      date: stormDate,
      reason: "大风预警，风力8级以上",
      type: "weather",
      affectedRoutes: [route1.id, route2.id],
    });
  } catch (e) {
    console.log("停航日设置失败:", e);
  }

  const boardedSchedule = scheduleStore.schedules.find(
    (s) => s.date === getFutureDate(0) && s.departureTime === "10:00" && s.routeId === route2.id
  );
  if (boardedSchedule) {
    try {
      const orderId = orderStore.addOrder({
        scheduleId: boardedSchedule.id,
        touristName: passengers[6].name,
        ticketCount: 2,
        totalPrice: boardedSchedule.ticketPrice * 2,
        passengers: passengers.slice(6, 8),
        passengerIds: passengers.slice(6, 8).map((p) => p.id),
      });

      orderStore.markAsBoarded(orderId, "演示码头员");
    } catch (e) {}
  }

  return {
    message: "演示数据初始化成功",
    stats: {
      docks: baseStore.docks.length,
      routes: baseStore.routes.length,
      ships: shipStore.ships.length,
      captains: baseStore.captains.length,
      schedules: scheduleStore.schedules.length,
      orders: orderStore.orders.length,
      passengers: passengerStore.passengers.length,
      refunds: refundStore.refundDetails.length,
      waitingLists: waitingStore.waitingLists.length,
      maintenance: maintenanceStore.maintenances.length,
      stopDays: stopDayStore.stopDays.length,
      crewSchedules: crewStore.crewSchedules.length,
    },
  };
}

export function clearDemoData() {
  localStorage.clear();
  window.location.reload();
}

export function getDemoScenarios() {
  return [
    {
      name: "满员演示",
      description: "09:30 环湖游班次已售罄，有2人在候补队列中",
      status: "ready",
    },
    {
      name: "停航演示",
      description: `${getFutureDate(3)} 因大风停航，已自动取消相关班次并生成退款`,
      status: "ready",
    },
    {
      name: "检修演示",
      description: "翡翠号船只正在检修中，5天内无法排班",
      status: "ready",
    },
    {
      name: "改签演示",
      description: "09:00 湖心岛班次已有1个订单改签到次日",
      status: "ready",
    },
    {
      name: "退票扣费演示",
      description: "11:00 班次有1个退票申请，按规则扣除5%手续费",
      status: "ready",
    },
    {
      name: "登船演示",
      description: "10:00 班次已有2人完成登船核销",
      status: "ready",
    },
  ];
}
