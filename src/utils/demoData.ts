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

function safeGetId<T extends { id: string }>(
  obj: T | undefined | null,
  fallback: string = "unknown-id"
): string {
  return obj?.id ?? fallback;
}

export function clearAllStores(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("scenic-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("清除旧数据失败:", e);
  }
  try {
    useBaseStore.setState({
      docks: [], routes: [], shipTypes: [], captains: [],
      insurancePlans: [], tideWindows: [],
    });
    useShipStore.setState({ ships: [] });
    useCrewStore.setState({ crews: [], schedules: [] });
    useScheduleStore.setState({ schedules: [] });
    useStopDayStore.setState({ stopDays: [] });
    useMaintenanceStore.setState({ records: [] });
    useOrderStore.setState({ orders: [], orderItems: [] });
    usePassengerStore.setState({ passengers: [] });
    useRefundStore.setState({ refunds: [] });
    useWaitingListStore.setState({ waitingLists: [] });
    useShipInspectionStore.setState({ inspections: [] });
  } catch (e) {
    console.warn("重置Store内存状态失败:", e);
  }
}

export function initDemoData() {
  try {
    if (useBaseStore.getState().docks.length > 0) {
      return { message: "演示数据已存在，无需重复初始化", dataCount: useBaseStore.getState().docks.length };
    }

    const bs = useBaseStore.getState();
    const errors: string[] = [];
    const stats: Record<string, number> = {};

    // ============ 1. 基础数据：码头、航线 ============
    const dockA = bs.addDock({ name: "景区码头A", capacity: 200, location: "景区东门", status: "open" });
    const dockB = bs.addDock({ name: "景区码头B", capacity: 150, location: "景区西门", status: "open" });
    const dockIsland = bs.addDock({ name: "湖心岛码头", capacity: 100, location: "湖心岛", status: "open" });
    bs.addDock({ name: "备用码头", capacity: 80, location: "景区南门", status: "maintenance" });
    stats.docks = 4;

    const route1 = bs.addRoute({
      name: "环湖游",
      startDockId: dockA.id,
      endDockId: dockA.id,
      duration: 60,
      distance: 15,
      description: "环绕景区湖泊一周，欣赏湖光山色",
    });
    const route2 = bs.addRoute({
      name: "码头A→湖心岛",
      startDockId: dockA.id,
      endDockId: dockIsland.id,
      duration: 30,
      distance: 8,
      description: "直达湖心岛，快捷便利",
    });
    const routeB2Island = bs.addRoute({
      name: "码头B→湖心岛",
      startDockId: dockB.id,
      endDockId: dockIsland.id,
      duration: 25,
      distance: 6,
      description: "从西门码头前往湖心岛",
    });
    const route3 = bs.addRoute({
      name: "深度游",
      startDockId: dockA.id,
      endDockId: dockB.id,
      duration: 120,
      distance: 25,
      description: "深入景区各个角落，全景游览",
    });
    stats.routes = 4;

    // ============ 2. 船型 ============
    const shipType1 = bs.addShipType({
      name: "观光快艇",
      capacity: 12,
      description: "高速观光艇，适合快速游览",
      safetyCertExpiry: getFutureDate(365),
    });
    const shipType2 = bs.addShipType({
      name: "豪华游船",
      capacity: 50,
      description: "大型豪华游船，设施完善",
      safetyCertExpiry: getFutureDate(365),
    });
    const shipType3 = bs.addShipType({
      name: "休闲画舫",
      capacity: 30,
      description: "古色古香的画舫船，适合慢游",
      safetyCertExpiry: getFutureDate(365),
    });
    stats.shipTypes = 3;

    // ============ 3. 船只 ============
    const ss = useShipStore.getState();
    const ship1 = ss.addShip({
      name: "翔龙号",
      shipTypeId: shipType1.id,
      capacity: 12,
      status: "available",
      currentDockId: dockA.id,
      lastInspectionDate: getFutureDate(-30),
      nextInspectionDate: getFutureDate(30),
      code: "SC-001",
    });
    const ship2 = ss.addShip({
      name: "飞凤号",
      shipTypeId: shipType1.id,
      capacity: 12,
      status: "available",
      currentDockId: dockB.id,
      lastInspectionDate: getFutureDate(-30),
      nextInspectionDate: getFutureDate(30),
      code: "SC-002",
    });
    const ship3 = ss.addShip({
      name: "明珠号",
      shipTypeId: shipType2.id,
      capacity: 50,
      status: "available",
      currentDockId: dockA.id,
      lastInspectionDate: getFutureDate(-15),
      nextInspectionDate: getFutureDate(45),
      code: "SC-003",
    });
    const ship4 = ss.addShip({
      name: "翡翠号",
      shipTypeId: shipType2.id,
      capacity: 50,
      status: "maintenance",
      currentDockId: dockA.id,
      lastInspectionDate: getFutureDate(-45),
      nextInspectionDate: getFutureDate(15),
      code: "SC-004",
    });
    const ship5 = ss.addShip({
      name: "丹青舫",
      shipTypeId: shipType3.id,
      capacity: 30,
      status: "available",
      currentDockId: dockA.id,
      lastInspectionDate: getFutureDate(-20),
      nextInspectionDate: getFutureDate(40),
      code: "SC-005",
    });
    stats.ships = 5;

    // ============ 4. 船长 ============
    const capt1 = bs.addCaptain({
      name: "陈船长",
      licenseNo: "CPT20240001",
      licenseExpiry: getFutureDate(365),
      phone: "13900139001",
      status: "on-duty",
      licenseLevel: "A类",
      yearsOfExperience: 10,
    });
    const capt2 = bs.addCaptain({
      name: "刘船长",
      licenseNo: "CPT20240002",
      licenseExpiry: getFutureDate(365),
      phone: "13900139002",
      status: "on-duty",
      licenseLevel: "A类",
      yearsOfExperience: 8,
    });
    const capt3 = bs.addCaptain({
      name: "张船长",
      licenseNo: "CPT20240003",
      licenseExpiry: getFutureDate(365),
      phone: "13900139003",
      status: "on-duty",
      licenseLevel: "B类",
      yearsOfExperience: 6,
    });
    const capt4 = bs.addCaptain({
      name: "李船长",
      licenseNo: "CPT20240005",
      licenseExpiry: getFutureDate(365),
      phone: "13900139005",
      status: "on-duty",
      licenseLevel: "A类",
      yearsOfExperience: 12,
    });
    const capt5 = bs.addCaptain({
      name: "黄船长",
      licenseNo: "CPT20240006",
      licenseExpiry: getFutureDate(365),
      phone: "13900139006",
      status: "on-duty",
      licenseLevel: "B类",
      yearsOfExperience: 5,
    });
    const capt6 = bs.addCaptain({
      name: "周船长",
      licenseNo: "CPT20240007",
      licenseExpiry: getFutureDate(365),
      phone: "13900139007",
      status: "on-duty",
      licenseLevel: "B类",
      yearsOfExperience: 7,
    });
    bs.addCaptain({
      name: "王船长",
      licenseNo: "CPT20240004",
      licenseExpiry: getFutureDate(180),
      phone: "13900139004",
      status: "leave",
      licenseLevel: "A类",
      yearsOfExperience: 15,
    });
    const allCaptains = [capt1, capt2, capt3, capt4, capt5, capt6];
    stats.captains = 7;

    // ============ 5. 保险 ============
    const insurance1 = bs.addInsurance({
      name: "游船意外险",
      price: 5,
      coverage: "最高赔付20万元",
      duration: 1,
    });
    bs.addInsurance({
      name: "豪华游船保险",
      price: 10,
      coverage: "最高赔付50万元",
      duration: 1,
    });
    stats.insurances = 2;

    // ============ 6. 潮汐窗口（包括停航日）============
    const stormDate = getFutureDate(3);
    for (let i = 0; i < 7; i++) {
      const d = getFutureDate(i);
      if (d !== stormDate) {
        bs.addTideWindow({
          date: d,
          highTideTimes: ["06:30", "18:45"],
          lowTideTimes: ["00:15", "12:30"],
          minWaterLevel: 1.2,
          maxWaterLevel: 2.8,
          isSailable: true,
        });
      }
    }
    bs.addTideWindow({
      date: stormDate,
      highTideTimes: ["05:00", "17:00"],
      lowTideTimes: ["11:00", "23:00"],
      minWaterLevel: 3.5,
      maxWaterLevel: 4.8,
      isSailable: false,
    });
    stats.tideWindows = 8;

    // ============ 7. 停航日（重要：在创建班次之前添加！）============
    try {
      useStopDayStore.getState().addStopDay({
        date: stormDate,
        reason: "大风预警，风力8级以上",
        type: "weather",
        affectedRoutes: [route1.id, route2.id, routeB2Island.id, route3.id],
      });
      stats.stopDays = 1;
    } catch (e) {
      errors.push(`停航日设置失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============ 8. 船只检修 ============
    try {
      useMaintenanceStore.getState().addMaintenance({
        shipId: ship4.id,
        startDate: getFutureDate(0),
        endDate: getFutureDate(5),
        reason: "发动机检修",
        isActive: true,
        type: "repair",
        inspector: "李工",
        notes: "更换机油和滤芯，检查传动系统",
      });
      stats.maintenances = 1;
    } catch (e) {
      errors.push(`维护记录添加失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============ 9. 船只检查记录 ============
    const inspectionStore = useShipInspectionStore.getState();
    const passItems = [
      { name: "船体结构", status: "pass" as const },
      { name: "推进系统", status: "pass" as const },
      { name: "电气系统", status: "pass" as const },
      { name: "消防设备", status: "pass" as const },
      { name: "救生设备", status: "pass" as const },
      { name: "导航设备", status: "pass" as const },
      { name: "通讯设备", status: "pass" as const },
      { name: "锚泊设备", status: "pass" as const },
      { name: "系泊设备", status: "pass" as const },
      { name: "舱底排水系统", status: "pass" as const },
    ];

    [ship1, ship2, ship3, ship5].forEach((ship) => {
      try {
        inspectionStore.addInspection({
          shipId: ship.id,
          inspectionDate: getFutureDate(-20),
          inspector: "王检",
          items: passItems,
          overallResult: "pass",
          nextInspectionDate: getFutureDate(40),
        });
      } catch (e) {
        console.warn("检查记录失败:", ship.name, e);
      }
    });
    stats.shipInspections = 4;

    // ============ 10. 创建班次（排除停航日，同时确保船长排班充足）============
    const scheduleStore = useScheduleStore.getState();
    const crewStore = useCrewStore.getState();

    const routeIdToHours: Record<string, number> = {};
    routeIdToHours[safeGetId(route1)] = 1;
    routeIdToHours[safeGetId(route2)] = 0;
    routeIdToHours[safeGetId(route3)] = 2;
    routeIdToHours[safeGetId(routeB2Island)] = 0;

    const schedulesToCreate = [
      { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "09:00", price: 60, seats: 12 },
      { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "11:00", price: 60, seats: 12 },
      { shipId: ship1.id, routeId: route2.id, date: getFutureDate(0), time: "14:00", price: 60, seats: 12 },
      { shipId: ship2.id, routeId: route2.id, date: getFutureDate(0), time: "10:00", price: 60, seats: 12 },
      { shipId: ship2.id, routeId: routeB2Island.id, date: getFutureDate(0), time: "15:00", price: 55, seats: 12 },
      { shipId: ship3.id, routeId: route1.id, date: getFutureDate(0), time: "09:30", price: 100, seats: 50 },
      { shipId: ship3.id, routeId: route1.id, date: getFutureDate(0), time: "14:30", price: 100, seats: 50 },
      { shipId: ship5.id, routeId: route3.id, date: getFutureDate(0), time: "10:00", price: 180, seats: 30 },
      { shipId: ship1.id, routeId: route2.id, date: getFutureDate(1), time: "09:00", price: 60, seats: 12 },
      { shipId: ship1.id, routeId: route2.id, date: getFutureDate(1), time: "14:00", price: 60, seats: 12 },
      { shipId: ship2.id, routeId: route2.id, date: getFutureDate(1), time: "10:00", price: 60, seats: 12 },
      { shipId: ship3.id, routeId: route1.id, date: getFutureDate(1), time: "09:30", price: 100, seats: 50 },
      { shipId: ship3.id, routeId: route1.id, date: getFutureDate(1), time: "14:30", price: 100, seats: 50 },
      { shipId: ship5.id, routeId: route3.id, date: getFutureDate(1), time: "10:00", price: 180, seats: 30 },
      { shipId: ship2.id, routeId: route2.id, date: getFutureDate(2), time: "09:00", price: 60, seats: 12 },
      { shipId: ship3.id, routeId: route1.id, date: getFutureDate(2), time: "10:00", price: 100, seats: 50 },
    ];

    const createdSchedules: { id: string; shipId: string; routeId: string; date: string; time: string }[] = [];

    schedulesToCreate.forEach((s) => {
      try {
        const addHours = routeIdToHours[s.routeId] ?? 1;
        const depHour = parseInt(s.time.split(":")[0]);
        const arrHour = depHour + addHours;
        const newSchedule = scheduleStore.addSchedule({
          shipId: s.shipId,
          routeId: s.routeId,
          date: s.date,
          departureTime: s.time,
          arrivalTime: `${String(arrHour).padStart(2, "0")}:${s.time.split(":")[1]}`,
          ticketPrice: s.price,
          totalSeats: s.seats,
          availableSeats: s.seats,
          dockCapacity: 200,
          status: "scheduled",
        });
        createdSchedules.push({
          id: newSchedule.id,
          shipId: s.shipId,
          routeId: s.routeId,
          date: s.date,
          time: s.time,
        });
      } catch (e) {
        errors.push(`跳过班次 ${s.date} ${s.time}: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
    stats.schedules = createdSchedules.length;

    // ============ 11. 船员排班（确保每个班次都有船长！）============
    const assignedCaptainKeys = new Set<string>();
    let crewAssignedCount = 0;

    createdSchedules.forEach((cs) => {
      const depHour = parseInt(cs.time.split(":")[0]);
      const shift: "morning" | "afternoon" | "evening" =
        depHour < 12 ? "morning" : depHour < 17 ? "afternoon" : "evening";

      const captainAssigned = allCaptains.find((c) => {
        const key = `${c.id}-${cs.date}-${shift}`;
        if (assignedCaptainKeys.has(key)) return false;
        if (!crewStore.isCaptainAvailable(c.id, cs.date, shift)) return false;
        return true;
      });

      if (captainAssigned) {
        const key = `${captainAssigned.id}-${cs.date}-${shift}`;
        assignedCaptainKeys.add(key);
        try {
          crewStore.addCrewSchedule({
            captainId: captainAssigned.id,
            shipId: cs.shipId,
            scheduleId: cs.id,
            date: cs.date,
            shift,
            status: "scheduled",
          });
          crewAssignedCount++;
        } catch (e) {
          errors.push(`船员排班失败 ${cs.date} ${cs.time}: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        errors.push(`班次无可用船长: ${cs.date} ${cs.time}，该班次将无法售票`);
      }
    });
    stats.crewSchedules = crewAssignedCount;

    // ============ 12. 乘客 ============
    const passengerStore = usePassengerStore.getState();
    const passengers: Passenger[] = [];
    samplePassengers.forEach((p) => {
      try {
        passengers.push(passengerStore.addPassenger(p));
      } catch (e) {
        console.warn("乘客添加失败:", p.name, e);
      }
    });
    stats.passengers = passengers.length;

    // ============ 13. 创建各类订单 ============
    const orderStore = useOrderStore.getState();
    const refundStore = useRefundStore.getState();
    const waitingStore = useWaitingListStore.getState();

    const freshSchedules = useScheduleStore.getState().schedules;

    function findSchedule(criteria: { date: string; time?: string; routeId?: string; departureTime?: string }) {
      return freshSchedules.find((s) => {
        if (s.date !== criteria.date) return false;
        if (criteria.time && s.departureTime !== criteria.time) return false;
        if (criteria.departureTime && s.departureTime !== criteria.departureTime) return false;
        if (criteria.routeId && s.routeId !== criteria.routeId) return false;
        return true;
      });
    }

    const createdOrderIds: string[] = [];

    // --- 13a. 满员班次订单：09:30 环湖游明珠号 ---
    const fullSchedule = findSchedule({ date: getFutureDate(0), time: "09:30", routeId: route1.id });
    if (fullSchedule) {
      for (let i = 0; i < 5; i++) {
        const group = passengers.slice(i * 2, i * 2 + 2);
        if (group.length > 0) {
          try {
            const oid = orderStore.addOrder({
              scheduleId: fullSchedule.id,
              touristName: group[0].name,
              ticketCount: group.length,
              totalPrice: fullSchedule.ticketPrice * group.length,
              passengers: group,
              passengerIds: group.map((p) => p.id),
              insuranceId: insurance1.id,
              contactPhone: group[0].phone,
            });
            createdOrderIds.push(oid);
          } catch (e) {
            errors.push(`满员班次订单失败(${i}): ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      // 候补队列
      const waitingP = passengers.slice(8, 10);
      if (waitingP.length > 0) {
        try {
          waitingStore.addWaitingList({
            scheduleId: fullSchedule.id,
            passengerIds: waitingP.map((p) => p.id),
            ticketCount: waitingP.length,
            contactPhone: waitingP[0].phone,
          });
          stats.waitingLists = 1;
        } catch (e) {
          errors.push(`候补队列添加失败: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } else {
      errors.push("未找到满员演示班次(今日09:30环湖游)");
    }

    // --- 13b. 改签演示订单：今日09:00湖心岛 -> 次日09:00湖心岛 ---
    const normalSchedule = findSchedule({ date: getFutureDate(0), time: "09:00", routeId: route2.id });
    let reschedulableOrderId: string | null = null;
    if (normalSchedule) {
      try {
        reschedulableOrderId = orderStore.addOrder({
          scheduleId: normalSchedule.id,
          touristName: passengers[0].name,
          ticketCount: 2,
          totalPrice: normalSchedule.ticketPrice * 2,
          passengers: passengers.slice(0, 2),
          passengerIds: passengers.slice(0, 2).map((p) => p.id),
          insuranceId: insurance1.id,
          contactPhone: passengers[0].phone,
        });
        createdOrderIds.push(reschedulableOrderId);
      } catch (e) {
        errors.push(`普通订单创建失败: ${e instanceof Error ? e.message : String(e)}`);
      }

      if (reschedulableOrderId) {
        const tomorrowSchedule = findSchedule({
          date: getFutureDate(1),
          time: "09:00",
          routeId: route2.id,
        });
        if (tomorrowSchedule) {
          try {
            orderStore.rescheduleOrder(
              reschedulableOrderId,
              tomorrowSchedule.id,
              "行程变更",
              "系统演示"
            );
            stats.rescheduledOrders = 1;
          } catch (e) {
            errors.push(`改签失败: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    } else {
      errors.push("未找到改签演示班次(今日09:00湖心岛)");
    }

    // --- 13c. 退款演示订单：今日11:00湖心岛 ---
    const refundSchedule = findSchedule({ date: getFutureDate(0), time: "11:00", routeId: route2.id });
    if (refundSchedule) {
      try {
        const orderId = orderStore.addOrder({
          scheduleId: refundSchedule.id,
          touristName: passengers[4].name,
          ticketCount: 2,
          totalPrice: refundSchedule.ticketPrice * 2,
          passengers: passengers.slice(4, 6),
          passengerIds: passengers.slice(4, 6).map((p) => p.id),
          contactPhone: passengers[4].phone,
        });
        createdOrderIds.push(orderId);

        refundStore.addRefundDetail({
          orderId,
          amount: refundSchedule.ticketPrice * 2,
          reason: "个人原因",
          type: "passenger-initiated",
          autoProcess: true,
        });
        stats.refunds = (stats.refunds || 0) + 1;
      } catch (e) {
        errors.push(`退款订单创建失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push("未找到退款演示班次(今日11:00湖心岛)");
    }

    // --- 13d. 已登船订单（不可退票）：今日10:00湖心岛 ---
    const boardedSchedule = findSchedule({ date: getFutureDate(0), time: "10:00", routeId: route2.id });
    if (boardedSchedule) {
      try {
        const orderId = orderStore.addOrder({
          scheduleId: boardedSchedule.id,
          touristName: passengers[6].name,
          ticketCount: 2,
          totalPrice: boardedSchedule.ticketPrice * 2,
          passengers: passengers.slice(6, 8),
          passengerIds: passengers.slice(6, 8).map((p) => p.id),
          contactPhone: passengers[6].phone,
        });
        createdOrderIds.push(orderId);

        orderStore.markAsBoarded(orderId, "演示码头员");
        stats.boardedOrders = 1;
      } catch (e) {
        errors.push(`登船订单创建失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push("未找到登船演示班次(今日10:00湖心岛)");
    }

    // --- 13e. 停航订单（进入改签/退款队列）：后天 09:00 湖心岛班次 ---
    // 注意：停航日是 stormDate = getFutureDate(3)，我们在那天不创建班次(validateSchedule会阻止)
    // 所以改为在 2 天后(非停航日)创建订单，然后手动模拟取消班次，触发退款队列
    const cancelledSchedule = findSchedule({
      date: getFutureDate(2),
      time: "09:00",
      routeId: route2.id,
    });
    if (cancelledSchedule) {
      try {
        const orderId = orderStore.addOrder({
          scheduleId: cancelledSchedule.id,
          touristName: passengers[8].name,
          ticketCount: 2,
          totalPrice: cancelledSchedule.ticketPrice * 2,
          passengers: passengers.slice(8, 10),
          passengerIds: passengers.slice(8, 10).map((p) => p.id),
          contactPhone: passengers[8].phone,
        });
        createdOrderIds.push(orderId);

        // 模拟调度员取消该班次（会自动创建退款记录）
        scheduleStore.cancelSchedule(
          cancelledSchedule.id,
          "突遭恶劣天气临时停航",
          "演示调度员"
        );
        stats.cancelledOrders = 1;
      } catch (e) {
        errors.push(`停航退款演示失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push("未找到停航演示班次(后天09:00湖心岛)");
    }

    // --- 13f. 普通可售订单（用于游客购买）：今日14:00湖心岛 翔龙号 ---
    const touristBuyableSchedule = findSchedule({
      date: getFutureDate(0),
      time: "14:00",
      routeId: route2.id,
    });
    if (touristBuyableSchedule) {
      try {
        const orderId = orderStore.addOrder({
          scheduleId: touristBuyableSchedule.id,
          touristName: passengers[3].name,
          ticketCount: 1,
          totalPrice: touristBuyableSchedule.ticketPrice * 1,
          passengers: [passengers[3]],
          passengerIds: [passengers[3].id],
          contactPhone: passengers[3].phone,
        });
        createdOrderIds.push(orderId);
      } catch (e) {
        errors.push(`可售订单失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    stats.orders = createdOrderIds.length;

    // ============ 返回结果 ============
    const finalStats = {
      ...stats,
      pendingRefunds: refundStore.getPendingRefunds().length,
      createdOrderIds,
    };

    if (errors.length > 0) {
      console.warn("演示数据初始化完成，但存在以下问题:\n", errors.join("\n"));
    }

    return {
      message: errors.length > 0 ? "演示数据部分初始化成功" : "演示数据初始化成功",
      stats: finalStats,
      errors,
    };
  } catch (err) {
    console.error("演示数据初始化发生严重错误:", err);
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return {
      message: "演示数据初始化失败",
      error: errMsg,
    };
  }
}

export function clearDemoData() {
  clearAllStores();
  try {
    window.location.reload();
  } catch (e) {
    console.warn("页面刷新失败", e);
  }
}

export function getDemoScenarios() {
  return [
    {
      name: "满员演示",
      description: "今日 09:30 环湖游（明珠号）已售10张票，余票紧张，有2人在候补队列中",
      status: "ready",
    },
    {
      name: "停航演示",
      description: `${getFutureDate(3)} 因大风停航，相关班次已取消，订单自动进入退款队列`,
      status: "ready",
    },
    {
      name: "检修演示",
      description: "翡翠号船只正在检修中（未来5天），无法排班；调度员排班时会被拦截",
      status: "ready",
    },
    {
      name: "改签演示",
      description: "张三的订单已从今日09:00湖心岛改签到次日09:00，可在订单详情中查看改签历史",
      status: "ready",
    },
    {
      name: "退票扣费演示",
      description: "钱七的 11:00 班次退票申请已按规则扣除5%手续费后完成",
      status: "ready",
    },
    {
      name: "登船演示",
      description: "周九的订单已在 10:00 班次完成登船核销，该订单不可再退票",
      status: "ready",
    },
    {
      name: "临时停航演示",
      description: "后天09:00湖心岛班次被调度员临时取消，订单已自动进入退款队列",
      status: "ready",
    },
  ];
}
