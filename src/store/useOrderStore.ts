import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, Passenger, RescheduleRecord, GroupTicket, TicketValidationResult, BlockReason, BoardingValidationResult, ShipSafetyConfig, TerminalCapacityConfig } from "../types";
import { useStopDayStore } from "./useStopDayStore";
import { useScheduleStore } from "./useScheduleStore";
import { useShipStore } from "./useShipStore";
import { useCrewStore } from "./useCrewStore";
import { useBaseStore } from "./useBaseStore";
import { usePassengerStore } from "./usePassengerStore";
import { useWaitingListStore } from "./useWaitingListStore";
import { useRefundStore } from "./useRefundStore";
import { useBoardingStore } from "./useBoardingStore";
import { useShipInspectionStore } from "./useShipInspectionStore";
import { useMaintenanceStore } from "./useMaintenanceStore";

type OrderCreate = Omit<Order, "id" | "createdAt" | "orderNo" | "qrCode" | "rescheduleHistory" | "insuranceAmount"> & {
    passengers: Passenger[];
    insuranceId?: string;
    groupTicket?: Omit<GroupTicket, "id" | "orderId">;
    contactPhone?: string;
  };

interface OrderState {
  orders: Order[];

  addOrder: (order: OrderCreate) => string;

  validateTicketPurchase: (scheduleId: string, ticketCount: number, passengerIds?: string[], passengerDetails?: Passenger[]) => TicketValidationResult;

  validateBoarding: (scheduleId: string, orderId: string, passengerIds?: string[]) => BoardingValidationResult;

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

  getShipSafetyConfig: (shipId: string) => ShipSafetyConfig;
  getTerminalCapacity: (dockId: string, hourSlot: string) => TerminalCapacityConfig;

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
  persist<OrderState>(
    (set, get) => ({
      orders: [],

      generateOrderNo: () => generateOrderNo(),

      generateQRCode: (orderId) => {
        return btoa(`order:${orderId}:${new Date().getTime()}`);
      },

      getShipSafetyConfig: (shipId) => {
        const shipStore = useShipStore.getState();
        const ship = shipStore.ships.find((s) => s.id === shipId);
        const shipType = ship?.shipTypeId
          ? useBaseStore.getState().shipTypes.find((st) => st.id === ship.shipTypeId)
          : null;

        const baseCapacity = ship?.capacity || shipType?.capacity || 30;
        const adultCapacity = Math.floor(baseCapacity * 0.8);
        const childCapacity = Math.floor(baseCapacity * 0.3);

        return {
          shipId,
          adultLifeJackets: adultCapacity,
          childLifeJackets: childCapacity,
          requiredCrewLicenses: ["船长适任证书", "船员服务簿", "安全培训合格证"],
          lastSafetyCheckDate: ship?.lastInspectionDate || new Date().toISOString().split("T")[0],
        };
      },

      getTerminalCapacity: (dockId, hourSlot) => {
        const baseStore = useBaseStore.getState();
        const dock = baseStore.docks.find((d) => d.id === dockId);
        const maxPerHour = dock?.capacity ? Math.floor(dock.capacity * 2) : 200;

        const orderStore = useOrderStore.getState();
        const boardingStore = useBoardingStore.getState();
        const date = hourSlot.split("T")[0];
        const hour = parseInt(hourSlot.split("T")[1]?.split(":")[0] || "0");

        const todaysBoardings = boardingStore.getByDate(date);
        const currentHourBoardings = todaysBoardings.filter((b) => {
          const boardingHour = new Date(b.boardedAt).getHours();
          return boardingHour === hour;
        });
        const currentPassengers = currentHourBoardings.reduce((sum, b) => {
          const order = orderStore.orders.find((o) => o.id === b.orderId);
          return sum + (order?.ticketCount || 0);
        }, 0);

        return {
          dockId,
          maxPassengersPerHour: maxPerHour,
          currentPassengersThisHour: currentPassengers,
          nextAvailableSlot: currentPassengers >= maxPerHour
            ? new Date(new Date(hourSlot).getTime() + 3600000).toISOString().replace(":00.000Z", ":00:00")
            : hourSlot,
        };
      },

      validateTicketPurchase: (scheduleId, ticketCount, passengerIds = [], passengerDetails = []) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        let blockedReason: BlockReason | undefined;
        const scheduleStore = useScheduleStore.getState();
        const stopDayStore = useStopDayStore.getState();
        const shipStore = useShipStore.getState();
        const crewStore = useCrewStore.getState();
        const baseStore = useBaseStore.getState();
        const shipInspectionStore = useShipInspectionStore.getState();
        const maintenanceStore = useMaintenanceStore.getState();
        const passengerStore = usePassengerStore.getState();
        const orderStore = useOrderStore.getState();

        const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
        if (!schedule) {
          errors.push("班次不存在");
          return { valid: false, errors, warnings, availableSeats: 0, blockedReason: "schedule-cancelled" };
        }

        if (schedule.status !== "scheduled") {
          blockedReason = "schedule-cancelled";
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
          if (stopDay?.type === "weather") {
            blockedReason = "weather-condition";
            errors.push("该日期因大风天气停航，无法购票");
          } else if (stopDay?.type === "tide") {
            blockedReason = "tide-abnormal";
            errors.push("该日期因潮汐异常停航，无法购票");
          } else if (stopDay?.type === "terminal-limit") {
            blockedReason = "terminal-capacity-exceeded";
            errors.push("该码头因限流管控，无法购票");
          } else if (stopDay?.type === "emergency") {
            errors.push("该日期为紧急停航日，无法购票");
          }
          if (stopDay?.affectedRoutes && stopDay.affectedRoutes.length > 0) {
            if (stopDay.affectedRoutes.includes(schedule.routeId)) {
              errors.push("该航线在当日停航，无法购票");
            }
          }
        }

        const tideWindow = baseStore.getTideByDate(schedule.date);
        if (tideWindow && !tideWindow.isSailable) {
          blockedReason = "tide-abnormal";
          errors.push(`当日潮汐异常，最低水位${tideWindow.minWaterLevel}米低于安全航行标准`);
        }

        const ship = shipStore.ships.find((s) => s.id === schedule.shipId);
        if (!ship) {
          errors.push("关联船只不存在");
        } else {
          if (ship.status === "maintenance") {
            blockedReason = "maintenance-delay";
            const activeMaintenance = maintenanceStore.getActiveByShipId(ship.id);
            const maintenance = activeMaintenance[0];
            if (maintenance?.status === "delayed") {
              errors.push(`船只检修延迟，预计${maintenance.plannedEndDate || "待定"}完成`);
            } else {
              errors.push("该船只正在检修中，无法购票");
            }
          } else if (ship.status !== "available") {
            errors.push("该船只当前不可用");
          }

          const isInspectionValid = shipInspectionStore.isShipSafe(ship.id);
          if (!isInspectionValid) {
            blockedReason = "inspection-expired";
            const latestInspection = shipInspectionStore.getLatestByShipId(ship.id);
            if (latestInspection) {
              errors.push(`船只安全检查已过期，下次检查日期为${latestInspection.nextInspectionDate}`);
            } else {
              errors.push("船只未完成安全检查，无法运营");
            }
          }
        }

        const crewSchedule = crewStore.getByScheduleId(scheduleId);
        if (!crewSchedule) {
          errors.push("该班次尚未安排船员，暂不可售票");
        } else if (ship) {
          const captain = baseStore.captains.find((c) => c.id === crewSchedule.captainId);
          if (captain) {
            const licenseExpiry = new Date(captain.licenseExpiry);
            const now = new Date();
            if (licenseExpiry < now) {
              blockedReason = "crew-qualification-mismatch";
              errors.push(`船长${captain.name}的船员适任证书已过期，有效期至${captain.licenseExpiry}`);
            } else if (captain.status !== "on-duty") {
              blockedReason = "crew-qualification-mismatch";
              errors.push(`船长${captain.name}当前${captain.status === "leave" ? "休假" : "未值班"}，无法执行航行任务`);
            }
            const shipSafetyConfig = orderStore.getShipSafetyConfig(ship.id);
            if (captain.licenseLevel && shipSafetyConfig.requiredCrewLicenses.length > 0) {
              const hasRequiredLicense = captain.certifications?.some(
                (cert) => shipSafetyConfig.requiredCrewLicenses.includes(cert)
              );
              if (!hasRequiredLicense && ship.capacity > 50) {
                blockedReason = "crew-qualification-mismatch";
                warnings.push(`该船型需要高级别资质船长，建议确认${captain.name}的资质等级`);
              }
            }
          }
        }

        const passengers = passengerDetails.length > 0
          ? passengerDetails
          : passengerIds.map((pid) => passengerStore.getById(pid)).filter(Boolean) as Passenger[];

        if (passengers.length > 0 && passengers.length !== ticketCount) {
          errors.push("乘客数量与购票数量不一致");
        }

        if (ship && passengers.length > 0) {
          const shipSafetyConfig = orderStore.getShipSafetyConfig(ship.id);
          const childPassengers = passengers.filter((p) => {
            if (p.birthDate) {
              const birthDate = new Date(p.birthDate);
              const age = new Date().getFullYear() - birthDate.getFullYear();
              return age < 14;
            }
            return false;
          });

          if (childPassengers.length > shipSafetyConfig.childLifeJackets) {
            blockedReason = "insufficient-life-jackets";
            errors.push(`儿童救生衣不足，当前仅配置${shipSafetyConfig.childLifeJackets}件，本次有${childPassengers.length}名儿童`);
          }

          const existingOrdersForSchedule = orderStore.getByScheduleId(scheduleId);
          const existingChildren = existingOrdersForSchedule.reduce((sum, o) => {
            const children = o.passengers.filter((p) => {
              if (p.birthDate) {
                const birthDate = new Date(p.birthDate);
                const age = new Date().getFullYear() - birthDate.getFullYear();
                return age < 14;
              }
              return false;
            }).length;
            return sum + children;
          }, 0);

          if (existingChildren + childPassengers.length > shipSafetyConfig.childLifeJackets) {
            blockedReason = "insufficient-life-jackets";
            errors.push(`儿童救生衣总量不足，本班次已登记${existingChildren}名儿童，加上本次${childPassengers.length}名，超出配置${shipSafetyConfig.childLifeJackets}件的限制`);
          }
        }

        const route = baseStore.routes.find((r) => r.id === schedule.routeId);
        if (route) {
          const startDock = baseStore.docks.find((d) => d.id === route.startDockId);
          if (startDock) {
            if (startDock.status !== "open") {
              errors.push("出发码头当前关闭，无法购票");
            } else {
              const hourSlot = `${schedule.date}T${schedule.departureTime}`;
              const terminalCapacity = orderStore.getTerminalCapacity(startDock.id, hourSlot);
              const availableCapacity = terminalCapacity.maxPassengersPerHour - terminalCapacity.currentPassengersThisHour;

              if (availableCapacity < ticketCount) {
                blockedReason = "terminal-capacity-exceeded";
                errors.push(`码头吞吐管控：该时段（${schedule.departureTime}）仅剩${availableCapacity}个名额，建议选择${terminalCapacity.nextAvailableSlot.split("T")[1]}后的时段`);
              }
            }
          }
        }

        const availableSeats = scheduleStore.calculateAvailableSeats(scheduleId);
        if (availableSeats < ticketCount) {
          errors.push(`余座不足，当前可售${availableSeats}张`);
        }

        if (ticketCount > 10) {
          blockedReason = "group-split-not-allowed";
          errors.push("单次购票超过10人需按团体票处理，团体票不可拆分，请联系旅行社或团体窗口办理");
          warnings.push("团体票需提供单位介绍信或旅行社合同，登船时需整团核验");
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          availableSeats,
          blockedReason,
        };
      },

      validateBoarding: (scheduleId, orderId, passengerIds) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        let blockReason: BlockReason | undefined;
        const requiredChecks: BoardingValidationResult["requiredChecks"] = [];

        const orderStore = useOrderStore.getState();
        const scheduleStore = useScheduleStore.getState();
        const shipStore = useShipStore.getState();
        const crewStore = useCrewStore.getState();
        const baseStore = useBaseStore.getState();
        const shipInspectionStore = useShipInspectionStore.getState();
        const maintenanceStore = useMaintenanceStore.getState();
        const stopDayStore = useStopDayStore.getState();
        const boardingStore = useBoardingStore.getState();

        const order = orderStore.orders.find((o) => o.id === orderId);
        const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);

        if (!order) {
          errors.push("订单不存在");
          return { valid: false, errors, warnings, canBoard: false, requiredChecks };
        }
        if (!schedule) {
          errors.push("班次不存在");
          return { valid: false, errors, warnings, canBoard: false, requiredChecks };
        }

        const checkOrderStatus = () => {
          if (order.status === "refunded") {
            errors.push("订单已退票");
            return { name: "订单状态", passed: false, message: "该订单已办理退票" };
          }
          if (order.status === "cancelled") {
            errors.push("订单已取消");
            return { name: "订单状态", passed: false, message: "该订单已取消" };
          }
          if (boardingStore.hasBoarded(order.id)) {
            errors.push("该订单已登船");
            return { name: "订单状态", passed: false, message: "该订单乘客已登船" };
          }
          return { name: "订单状态", passed: true, message: "订单有效" };
        };

        const checkScheduleStatus = () => {
          if (schedule.status === "cancelled") {
            blockReason = "schedule-cancelled";
            errors.push("该班次已取消");
            return { name: "班次状态", passed: false, message: "班次已取消，请办理改签或退票" };
          }
          if (schedule.status === "completed") {
            errors.push("该班次已完成");
            return { name: "班次状态", passed: false, message: "班次已完成航行" };
          }
          return { name: "班次状态", passed: true, message: "班次正常" };
        };

        const checkWeather = () => {
          const stopDay = stopDayStore.getByDate(schedule.date);
          if (stopDay) {
            if (stopDay.type === "weather") {
              blockReason = "weather-condition";
              errors.push("天气原因停航");
              return { name: "天气条件", passed: false, message: `大风预警：${stopDay.reason}` };
            }
            if (stopDay.type === "tide") {
              blockReason = "tide-abnormal";
              errors.push("潮汐异常停航");
              return { name: "潮汐条件", passed: false, message: `潮汐异常：${stopDay.reason}` };
            }
            if (stopDay.type === "terminal-limit") {
              blockReason = "terminal-capacity-exceeded";
              errors.push("码头限流");
              return { name: "码头限流", passed: false, message: `码头管控：${stopDay.reason}` };
            }
          }
          return { name: "天气潮汐", passed: true, message: "航行条件正常" };
        };

        const checkShipCondition = () => {
          const ship = shipStore.ships.find((s) => s.id === schedule.shipId);
          if (!ship) {
            errors.push("船只不存在");
            return { name: "船只状态", passed: false, message: "船只信息缺失" };
          }

          const activeMaintenance = maintenanceStore.getActiveByShipId(ship.id);
          if (activeMaintenance.length > 0) {
            blockReason = "maintenance-delay";
            const maintenance = activeMaintenance[0];
            if (maintenance.status === "delayed") {
              errors.push("检修延迟");
              return { name: "船只检修", passed: false, message: `船只检修延迟，预计${maintenance.plannedEndDate || "待定"}完成` };
            }
            errors.push("船只检修中");
            return { name: "船只检修", passed: false, message: "船只正在检修，无法运营" };
          }

          const isInspectionValid = shipInspectionStore.isShipSafe(ship.id);
          if (!isInspectionValid) {
            blockReason = "inspection-expired";
            errors.push("安全检查过期");
            return { name: "安全检查", passed: false, message: "船只安全检查已过期" };
          }

          return { name: "船只状态", passed: true, message: "船只状态正常" };
        };

        const checkCrewQualification = () => {
          const crewSchedule = crewStore.getByScheduleId(scheduleId);
          if (!crewSchedule) {
            errors.push("未安排船员");
            return { name: "船员资质", passed: false, message: "该班次未安排船员" };
          }

          const captain = baseStore.captains.find((c) => c.id === crewSchedule.captainId);
          if (captain) {
            const licenseExpiry = new Date(captain.licenseExpiry);
            const now = new Date();
            if (licenseExpiry < now) {
              blockReason = "crew-qualification-mismatch";
              errors.push("船长资质过期");
              return { name: "船员资质", passed: false, message: `船长${captain.name}证书已过期` };
            }
            if (captain.status !== "on-duty") {
              blockReason = "crew-qualification-mismatch";
              errors.push("船长未值班");
              return { name: "船员资质", passed: false, message: `船长${captain.name}当前未值班` };
            }
          }

          return { name: "船员资质", passed: true, message: "船员资质有效" };
        };

        const checkLifeJackets = () => {
          const ship = shipStore.ships.find((s) => s.id === schedule.shipId);
          if (!ship) return { name: "救生设备", passed: true, message: "跳过检查" };

          const shipSafetyConfig = orderStore.getShipSafetyConfig(ship.id);
          const boardingPassengers = passengerIds || order.passengerIds;
          const children = boardingPassengers.filter((pid) => {
            const p = order.passengers.find((ps) => ps.id === pid);
            if (p?.birthDate) {
              const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
              return age < 14;
            }
            return false;
          }).length;

          const stats = boardingStore.getBoardingStats(scheduleId);
          const totalBoarders = stats.boarded + boardingPassengers.length;
          const totalChildren = children + orderStore.getByScheduleId(scheduleId)
            .filter((o) => boardingStore.hasBoarded(o.id))
            .reduce((sum, o) => sum + o.passengers.filter((p) => {
              if (p.birthDate) {
                const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                return age < 14;
              }
              return false;
            }).length, 0);

          if (totalChildren > shipSafetyConfig.childLifeJackets) {
            blockReason = "insufficient-life-jackets";
            errors.push("儿童救生衣不足");
            return { name: "救生设备", passed: false, message: `儿童救生衣仅${shipSafetyConfig.childLifeJackets}件，已登船+本次共${totalChildren}名儿童` };
          }

          return { name: "救生设备", passed: true, message: "救生设备充足" };
        };

        const checkGroupTicket = () => {
          if (order.groupTicket && passengerIds && passengerIds.length !== order.passengerIds.length) {
            blockReason = "group-split-not-allowed";
            errors.push("团体票不可拆分");
            return { name: "团体票校验", passed: false, message: `团体票(${order.groupTicket.groupName})需整团登船，不可拆分` };
          }
          return { name: "票种校验", passed: true, message: "票种校验通过" };
        };

        requiredChecks.push(checkOrderStatus());
        requiredChecks.push(checkScheduleStatus());
        requiredChecks.push(checkWeather());
        requiredChecks.push(checkShipCondition());
        requiredChecks.push(checkCrewQualification());
        requiredChecks.push(checkLifeJackets());
        requiredChecks.push(checkGroupTicket());

        const allPassed = requiredChecks.every((c) => c.passed);

        return {
          valid: allPassed,
          errors,
          warnings,
          canBoard: allPassed,
          blockReason,
          requiredChecks,
        };
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
