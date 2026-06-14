import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StopDay, OrderDisposalInfo, OrderDisposalCategory, Order, Schedule, WaitingList } from "../types";
import { useScheduleStore } from "./useScheduleStore";
import { useOrderStore } from "./useOrderStore";
import { useWaitingListStore } from "./useWaitingListStore";
import { useBaseStore } from "./useBaseStore";
import { useBoardingStore } from "./useBoardingStore";
import { useShipStore } from "./useShipStore";
import { useCrewStore } from "./useCrewStore";
import { useMaintenanceStore } from "./useMaintenanceStore";
import { useShipInspectionStore } from "./useShipInspectionStore";

interface AddStopDayResult {
  affectedSchedules: number;
  affectedOrders: number;
  classifiedOrders: {
    reschedulable: number;
    refundable: number;
    waitingConvertible: number;
    boardedUnprocessable: number;
  };
}

interface AffectedAnalysisResult {
  schedules: Schedule[];
  orders: Order[];
  waitingLists: WaitingList[];
  classifiedOrders: OrderDisposalInfo[];
  stats: {
    totalSchedules: number;
    totalOrders: number;
    totalPassengers: number;
    byCategory: Record<OrderDisposalCategory, number>;
  };
}

type StopDayWithoutId = Omit<StopDay, "id" | "createdAt" | "affectedSchedules">;
type StopDayUpdate = Omit<StopDay, "date" | "id" | "createdAt">;

interface StopDayState {
  stopDays: StopDay[];
  addStopDay: (stopDay: StopDayWithoutId) => AddStopDayResult;
  updateStopDay: (date: string, data: Partial<StopDayUpdate>) => void;
  removeStopDay: (date: string) => void;
  isStopDay: (date: string) => boolean;
  isRouteAffected: (date: string, routeId: string) => boolean;
  isDockAffected: (date: string, dockId: string) => boolean;
  getByDateRange: (startDate: string, endDate: string) => StopDay[];
  getByType: (type: StopDay["type"]) => StopDay[];
  getByDate: (date: string) => StopDay | undefined;
  analyzeAffected: (date: string, routeIds?: string[]) => AffectedAnalysisResult;
  classifyOrder: (order: Order, schedule?: Schedule) => OrderDisposalInfo;
  getOrderDisposalInfo: (orderId: string, schedule?: Schedule) => OrderDisposalInfo | null;
  getCategoryLabel: (category: OrderDisposalCategory) => string;
  getAvailableActionsLabel: (actions: string | string[]) => string;
}

function getCategoryLabel(category: OrderDisposalCategory): string {
  const labels: Record<OrderDisposalCategory, string> = {
    reschedulable: "可改签",
    refundable: "可退款",
    "waiting-convertible": "候补转正",
    "boarded-unprocessable": "已登船不可处理",
    cancelled: "已取消",
  };
  return labels[category];
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    reschedule: "改签",
    refund: "退款",
    "convert-waiting": "候补转正",
    "split-group": "拆分团体票",
    "special-handling": "特殊处理",
    "view-only": "仅查看",
  };
  return labels[action] || action;
}

export const useStopDayStore = create<StopDayState>()(
  persist(
    (set, get) => ({
      stopDays: [],

      getCategoryLabel: (category) => getCategoryLabel(category),

      getAvailableActionsLabel: (actions) => {
        if (Array.isArray(actions)) {
          return actions.map((a) => getActionLabel(a)).join("、");
        }
        return getActionLabel(actions);
      },

      isDockAffected: (date, dockId) => {
        const stopDay = get().stopDays.find((s) => s.date === date);
        if (!stopDay) return false;
        if (stopDay.type !== "terminal-limit") return false;
        if (!stopDay.affectedDocks || stopDay.affectedDocks.length === 0) return true;
        return stopDay.affectedDocks.includes(dockId);
      },

      classifyOrder: (order, scheduleParam) => {
        const scheduleStore = useScheduleStore.getState();
        const waitingStore = useWaitingListStore.getState();
        const boardingStore = useBoardingStore.getState();
        const baseStore = useBaseStore.getState();
        const orderStore = useOrderStore.getState();
        const shipStore = useShipStore.getState();
        const crewStore = useCrewStore.getState();
        const maintenanceStore = useMaintenanceStore.getState();
        const shipInspectionStore = useShipInspectionStore.getState();

        const schedule = scheduleParam || scheduleStore.schedules.find((s) => s.id === order.scheduleId);
        const stopDay = schedule ? get().getByDate(schedule.date) : null;

        const warnings: string[] = [];
        const requirements: string[] = [];

        if (order.groupTicket) {
          warnings.push("此为团体票，不可拆分登船或退票");
          requirements.push("团体票需整团核验，领队需携带单位介绍信");
        }

        if (schedule) {
          const ship = shipStore.ships.find(s => s.id === schedule.shipId);
          if (ship) {
            const safetyConfig = orderStore.getShipSafetyConfig(ship.id);
            const childPassengers = order.passengers.filter(p => {
              if (p.birthDate) {
                const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                return age < 14;
              }
              return false;
            });
            if (childPassengers.length > safetyConfig.childLifeJackets) {
              warnings.push(`儿童救生衣不足：本班次儿童乘客${childPassengers.length}人，船只仅配置${safetyConfig.childLifeJackets}件儿童救生衣`);
            }

            const activeMaintenance = maintenanceStore.getActiveByShipId(ship.id);
            if (activeMaintenance.length > 0) {
              const m = activeMaintenance[0];
              if (m.status === "delayed") {
                warnings.push(`船只检修延迟，原计划${m.plannedEndDate || "待定"}完成，当前状态：${m.notes || "检修中"}`);
              }
            }

            const isInspectionValid = shipInspectionStore.isShipSafe(ship.id);
            if (!isInspectionValid) {
              warnings.push("船只安全检查已过期或不合格，存在安全隐患");
            }
          }

          const crewSchedule = crewStore.getByScheduleId(schedule.id);
          if (crewSchedule) {
            const captain = baseStore.captains.find(c => c.id === crewSchedule.captainId);
            if (captain) {
              if (new Date(captain.licenseExpiry) < new Date()) {
                warnings.push(`船长${captain.name}的适任证书已过期，有效期至${captain.licenseExpiry}`);
              }
              if (captain.status !== "on-duty") {
                warnings.push(`船长${captain.name}当前${captain.status === "leave" ? "休假" : "未值班"}`);
              }
            } else {
              warnings.push("该班次尚未安排合格船长");
            }
          } else {
            warnings.push("该班次尚未安排船员");
          }
        }

        if (order.status === "cancelled") {
          return {
            orderId: order.id,
            category: "cancelled",
            categoryLabel: getCategoryLabel("cancelled"),
            availableActions: ["view-only"],
            reason: "订单已取消",
            warnings,
            requirements,
          };
        }

        if (order.status === "refunded") {
          return {
            orderId: order.id,
            category: "refundable",
            categoryLabel: getCategoryLabel("refundable"),
            availableActions: ["view-only"],
            reason: "订单已退款",
            warnings: ["该订单已完成退款，无法进行其他操作", ...warnings],
            requirements,
          };
        }

        if (order.status === "boarded" || boardingStore.hasBoarded(order.id)) {
          return {
            orderId: order.id,
            category: "boarded-unprocessable",
            categoryLabel: getCategoryLabel("boarded-unprocessable"),
            availableActions: ["special-handling", "view-only"],
            reason: "乘客已登船",
            warnings: ["已登船乘客需特殊处理，无法直接改签或退款", ...warnings],
            requirements: ["需联系码头工作人员进行特殊处理", ...requirements],
          };
        }

        if (schedule?.status === "cancelled") {
          const canReschedule = order.rescheduleHistory.length < 2 && order.status === "pending";

          const waitingListForOrder = waitingStore.waitingLists.find(
            (w) => w.status === "waiting" && w.passengerIds.some((pid) => order.passengerIds.includes(pid))
          );

          if (waitingListForOrder) {
            return {
              orderId: order.id,
              category: "waiting-convertible",
              categoryLabel: getCategoryLabel("waiting-convertible"),
              availableActions: ["convert-waiting", "refund"],
              reason: `班次因${stopDay?.type === "weather" ? "大风" : stopDay?.type === "tide" ? "潮汐异常" : stopDay?.type === "terminal-limit" ? "码头限流" : "其他原因"}取消，可候补其他班次或退款`,
              warnings: ["候补转正需等待目标班次有空余座位", ...warnings],
              requirements: [
                "确认候补班次信息",
                "候补成功后原班次费用自动退还",
                ...requirements,
              ],
            };
          }

          if (canReschedule) {
            return {
              orderId: order.id,
              category: "reschedulable",
              categoryLabel: getCategoryLabel("reschedulable"),
              availableActions: ["reschedule", "refund"],
              reason: `班次因${stopDay?.type === "weather" ? "大风" : stopDay?.type === "tide" ? "潮汐异常" : stopDay?.type === "terminal-limit" ? "码头限流" : "其他原因"}取消，可免费改签或全额退款`,
              warnings: ["改签最多可进行2次", "改签后二维码将重新生成", ...warnings],
              requirements: [
                "改签不收取手续费",
                "可改签至同航线其他日期班次",
                "改签后原座位自动释放",
                ...requirements,
              ],
            };
          }

          return {
            orderId: order.id,
            category: "refundable",
            categoryLabel: getCategoryLabel("refundable"),
            availableActions: ["refund"],
            reason: `班次因${stopDay?.type === "weather" ? "大风" : stopDay?.type === "tide" ? "潮汐异常" : stopDay?.type === "terminal-limit" ? "码头限流" : "其他原因"}取消，可全额退款`,
            warnings,
            requirements: [
              "停航原因导致的退票不扣手续费",
              "退款将原路返回，预计1-3个工作日到账",
              ...requirements,
            ],
          };
        }

        if (stopDay && get().isRouteAffected(stopDay.date, schedule?.routeId || "")) {
          if (order.status === "pending" && order.rescheduleHistory.length < 2) {
            return {
              orderId: order.id,
              category: "reschedulable",
              categoryLabel: getCategoryLabel("reschedulable"),
              availableActions: ["reschedule", "refund"],
              reason: `该航线因${stopDay.type === "weather" ? "大风" : stopDay.type === "tide" ? "潮汐异常" : stopDay.type === "terminal-limit" ? "码头限流" : "其他原因"}受影响`,
              warnings: ["建议尽快办理改签或退款", ...warnings],
              requirements: [
                "可免费改签至其他正常班次",
                "或选择全额退款",
                ...requirements,
              ],
            };
          }
        }

        const availableActions: OrderDisposalInfo["availableActions"] = [];
        if (order.status === "pending" && order.rescheduleHistory.length < 2) {
          availableActions.push("reschedule");
        }
        if (order.status === "pending" || order.status === "rescheduled") {
          availableActions.push("refund");
        }
        if (order.groupTicket) {
          availableActions.push("split-group");
        }

        return {
          orderId: order.id,
          category: "refundable",
          categoryLabel: getCategoryLabel("refundable"),
          availableActions,
          reason: "订单状态正常",
          warnings,
          requirements: [
            "改签需在发船前24小时办理",
            "退票将按规则扣除手续费",
            ...requirements,
          ],
        };
      },

      getOrderDisposalInfo: (orderId, schedule) => {
        const orderStore = useOrderStore.getState();
        const order = orderStore.orders.find((o) => o.id === orderId);
        if (!order) return null;
        return get().classifyOrder(order, schedule);
      },

      analyzeAffected: (date, routeIds) => {
        const scheduleStore = useScheduleStore.getState();
        const orderStore = useOrderStore.getState();
        const waitingStore = useWaitingListStore.getState();
        const stopDayStore = get();

        const daySchedules = scheduleStore.getByDate(date).filter((s) => {
          if (!routeIds || routeIds.length === 0) {
            return stopDayStore.isRouteAffected(date, s.routeId);
          }
          return routeIds.includes(s.routeId);
        });

        const affectedOrders: Order[] = [];
        const affectedWaitingLists: WaitingList[] = [];
        const classifiedOrders: OrderDisposalInfo[] = [];

        daySchedules.forEach((schedule) => {
          const orders = orderStore.getByScheduleId(schedule.id);
          const waitingLists = waitingStore.getByScheduleId(schedule.id);

          orders.forEach((order) => {
            if (order.status !== "cancelled") {
              affectedOrders.push(order);
              classifiedOrders.push(stopDayStore.classifyOrder(order, schedule));
            }
          });

          waitingLists.forEach((w) => {
            if (w.status === "waiting") {
              affectedWaitingLists.push(w);
            }
          });
        });

        const stats: AffectedAnalysisResult["stats"] = {
          totalSchedules: daySchedules.length,
          totalOrders: affectedOrders.length,
          totalPassengers: affectedOrders.reduce((sum, o) => sum + o.ticketCount, 0),
          byCategory: {
            reschedulable: classifiedOrders.filter((c) => c.category === "reschedulable").length,
            refundable: classifiedOrders.filter((c) => c.category === "refundable").length,
            "waiting-convertible": classifiedOrders.filter((c) => c.category === "waiting-convertible").length,
            "boarded-unprocessable": classifiedOrders.filter((c) => c.category === "boarded-unprocessable").length,
            cancelled: classifiedOrders.filter((c) => c.category === "cancelled").length,
          },
        };

        return {
          schedules: daySchedules,
          orders: affectedOrders,
          waitingLists: affectedWaitingLists,
          classifiedOrders,
          stats,
        };
      },

      addStopDay: (stopDay) => {
        const exists = get().stopDays.some(
          (s) => s.date === stopDay.date && s.routeId === stopDay.routeId
        );
        if (exists) {
          throw new Error("该日期已设置为停航日");
        }

        const scheduleStore = useScheduleStore.getState();
        const orderStore = useOrderStore.getState();
        const daySchedules = scheduleStore.getByDate(stopDay.date);

        const affectedScheduleIds: string[] = [];
        let affectedOrders = 0;

        daySchedules.forEach((schedule) => {
          const isRouteAffected = !stopDay.affectedRoutes ||
            stopDay.affectedRoutes.length === 0 ||
            stopDay.affectedRoutes.includes(schedule.routeId);

          const isDockAffected = stopDay.type !== "terminal-limit" ||
            !stopDay.affectedDocks ||
            stopDay.affectedDocks.length === 0 ||
            (() => {
              const route = useBaseStore.getState().routes.find(r => r.id === schedule.routeId);
              return route && (
                stopDay.affectedDocks!.includes(route.startDockId) ||
                stopDay.affectedDocks!.includes(route.endDockId)
              );
            })();

          if (isRouteAffected && isDockAffected) {
            if (schedule.status !== "cancelled") {
              affectedScheduleIds.push(schedule.id);
            }
          }
        });

        const newStopDay: StopDay = {
          ...stopDay,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          affectedSchedules: affectedScheduleIds,
        };

        set((state) => ({
          stopDays: [...state.stopDays, newStopDay],
        }));

        const analysis = get().analyzeAffected(stopDay.date, stopDay.affectedRoutes);

        affectedScheduleIds.forEach((scheduleId) => {
          try {
            const result = scheduleStore.cancelSchedule(
              scheduleId,
              `${stopDay.type === "weather" ? "天气原因" : stopDay.type === "emergency" ? "紧急情况" : stopDay.type === "tide" ? "潮汐异常" : stopDay.type === "terminal-limit" ? "码头限流" : "计划"}停航: ${stopDay.reason}`,
              "system",
              { autoRefund: false }
            );
            affectedOrders += result.affectedOrders;
          } catch (e) {
            console.error("取消班次失败:", e);
          }
        });

        if (stopDay.type === "terminal-limit" && stopDay.affectedDocks) {
          stopDay.affectedDocks.forEach(dockId => {
            const dock = useBaseStore.getState().docks.find(d => d.id === dockId);
            if (dock) {
              orderStore.getTerminalCapacity(dockId, `${stopDay.date}T00:00:00`);
            }
          });
        }

        return {
          affectedSchedules: affectedScheduleIds.length,
          affectedOrders,
          classifiedOrders: {
            reschedulable: analysis.stats.byCategory.reschedulable,
            refundable: analysis.stats.byCategory.refundable,
            waitingConvertible: analysis.stats.byCategory["waiting-convertible"],
            boardedUnprocessable: analysis.stats.byCategory["boarded-unprocessable"],
          },
        };
      },

      updateStopDay: (date, data) => {
        set((state) => ({
          stopDays: state.stopDays.map((s) =>
            s.date === date ? { ...s, ...data } : s
          ),
        }));
      },

      removeStopDay: (date) => {
        set((state) => ({
          stopDays: state.stopDays.filter((s) => s.date !== date),
        }));
      },

      isStopDay: (date) => {
        return get().stopDays.some((s) => s.date === date);
      },

      isRouteAffected: (date, routeId) => {
        const stopDay = get().stopDays.find((s) => s.date === date);
        if (!stopDay) return false;
        if (!stopDay.affectedRoutes || stopDay.affectedRoutes.length === 0) return true;
        return stopDay.affectedRoutes.includes(routeId);
      },

      getByDateRange: (startDate, endDate) => {
        return get().stopDays.filter(
          (s) => s.date >= startDate && s.date <= endDate
        );
      },

      getByType: (type) => {
        return get().stopDays.filter((s) => s.type === type);
      },

      getByDate: (date) => {
        return get().stopDays.find((s) => s.date === date);
      },
    }),
    { name: "scenic-stopdays" }
  )
);
