import { useState, useMemo } from "react";
import { ClipboardList, Ship, Clock, Ticket, RotateCcw, Info, AlertTriangle, CheckCircle, RefreshCcw, CreditCard, Shield, ArrowRight, AlertCircle } from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import type { Order, OrderDisposalCategory, OrderDisposalInfo } from "@/types";

type FilterTab = "all" | "pending" | "boarded" | "refunded";

const statusConfig: Record<
  Order["status"],
  { label: string; bgClass: string; textClass: string }
> = {
  pending: { label: "待登船", bgClass: "bg-[#0C4A6E]/10", textClass: "text-[#0C4A6E]" },
  boarded: { label: "已登船", bgClass: "bg-green-100", textClass: "text-green-700" },
  refunded: { label: "已退票", bgClass: "bg-[#94A3B8]/10", textClass: "text-[#94A3B8]" },
  cancelled: { label: "已取消", bgClass: "bg-red-100", textClass: "text-red-700" },
  rescheduled: { label: "已改签", bgClass: "bg-purple-100", textClass: "text-purple-700" },
};

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待登船" },
  { key: "boarded", label: "已登船" },
  { key: "refunded", label: "已退票" },
];

const categoryConfig: Record<OrderDisposalCategory, { label: string; bgClass: string; textClass: string; icon: any }> = {
  reschedulable: { label: "可改签", bgClass: "bg-purple-100", textClass: "text-purple-700", icon: RefreshCcw },
  refundable: { label: "可退款", bgClass: "bg-green-100", textClass: "text-green-700", icon: CreditCard },
  "waiting-convertible": { label: "候补转正", bgClass: "bg-blue-100", textClass: "text-blue-700", icon: Ticket },
  "boarded-unprocessable": { label: "已登船待处理", bgClass: "bg-yellow-100", textClass: "text-yellow-700", icon: AlertTriangle },
  cancelled: { label: "已取消", bgClass: "bg-gray-100", textClass: "text-gray-700", icon: Info },
};

export default function MyOrders() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const orders = useOrderStore((s) => s.orders);
  const refundOrder = useOrderStore((s) => s.refundOrder);
  const schedules = useScheduleStore((s) => s.schedules);
  const ships = useShipStore((s) => s.ships);
  const { classifyOrder, getOrderDisposalInfo, getCategoryLabel, getAvailableActionsLabel } = useStopDayStore();
  const { validateTicketPurchase, validateBoarding } = useOrderStore();
  const { getAvailableSeatsBreakdown } = useScheduleStore();
  const waitingLists = useWaitingListStore((s) => s.waitingLists);

  const getSchedule = (scheduleId: string) =>
    schedules.find((s) => s.id === scheduleId);

  const getShipName = (scheduleId: string) => {
    const schedule = getSchedule(scheduleId);
    if (!schedule) return "未知游船";
    return ships.find((s) => s.id === schedule.shipId)?.name ?? "未知游船";
  };

  const getDepartureTime = (scheduleId: string) =>
    getSchedule(scheduleId)?.departureTime ?? "--";

  const getDisposalInfo = (order: Order): OrderDisposalInfo | null => {
    const schedule = getSchedule(order.scheduleId);
    if (!schedule) return null;
    return getOrderDisposalInfo(order.id, schedule);
  };

  const filteredOrders =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {
      normal: 0,
      reschedulable: 0,
      refundable: 0,
      "waiting-convertible": 0,
      "boarded-unprocessable": 0,
    };
    orders.forEach(order => {
      const schedule = getSchedule(order.scheduleId);
      if (schedule?.status === "cancelled") {
        const disposal = classifyOrder(order, schedule);
        stats[disposal.category] = (stats[disposal.category] || 0) + 1;
      } else {
        stats.normal++;
      }
    });
    return stats;
  }, [orders, schedules, classifyOrder]);

  const handleRefund = (orderId: string) => {
    if (!window.confirm("确认退票？退票后将释放对应座位。")) return;
    try {
      refundOrder(orderId);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "退票失败");
    }
  };

  const handleReschedule = (orderId: string) => {
    alert("改签功能：请选择其他可用班次进行改签");
  };

  const handleConvertWaiting = (orderId: string) => {
    alert("候补转正：您的候补订单已自动转为正票，请查看订单详情");
  };

  const handleSpecialHandling = (orderId: string) => {
    alert("已登船订单：请联系客服人员进行人工处置，电话：400-888-8888");
  };

  const getCategoryIcon = (category: OrderDisposalCategory) => {
    const config = categoryConfig[category];
    if (!config) return <Info className="w-4 h-4" />;
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C4A6E]">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0C4A6E]">我的订单</h1>
        </div>

        {(categoryStats.reschedulable > 0 || categoryStats.refundable > 0 || categoryStats["waiting-convertible"] > 0 || categoryStats["boarded-unprocessable"] > 0) && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">订单变动通知</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categoryStats.reschedulable > 0 && (
                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <RefreshCcw className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{categoryStats.reschedulable}</div>
                    <div className="text-xs text-gray-500">可改签</div>
                  </div>
                </div>
              )}
              {categoryStats.refundable > 0 && (
                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{categoryStats.refundable}</div>
                    <div className="text-xs text-gray-500">可退款</div>
                  </div>
                </div>
              )}
              {categoryStats["waiting-convertible"] > 0 && (
                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{categoryStats["waiting-convertible"]}</div>
                    <div className="text-xs text-gray-500">候补转正</div>
                  </div>
                </div>
              )}
              {categoryStats["boarded-unprocessable"] > 0 && (
                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">{categoryStats["boarded-unprocessable"]}</div>
                    <div className="text-xs text-gray-500">待人工处理</div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-yellow-700 mt-3">
              由于航班变动，部分订单需要您的处理。请查看下方订单列表中的"操作说明"了解详情。
            </p>
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-[#0C4A6E] text-white"
                  : "text-[#94A3B8] hover:bg-[#F0F9FF]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <ClipboardList className="mb-4 h-16 w-16" />
            <p className="text-lg">暂无订单记录</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full overflow-hidden rounded-xl bg-white shadow-sm">
                <thead>
                  <tr className="border-b border-[#94A3B8]/10 bg-[#0C4A6E]/5">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      订单号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      游船
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      出发时间
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      票数
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      分类说明
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const cfg = statusConfig[order.status];
                    const schedule = getSchedule(order.scheduleId);
                    const disposalInfo = getDisposalInfo(order);
                    const isCancelled = schedule?.status === "cancelled";
                    const seatsBreakdown = schedule ? getAvailableSeatsBreakdown(schedule.id) : null;
                    
                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-[#94A3B8]/5 transition-colors hover:bg-[#F0F9FF] ${
                          isCancelled ? "bg-yellow-50/50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-sm text-[#0C4A6E]">
                          {order.id.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                          <div className="flex items-center gap-1">
                            <Ship className="h-4 w-4 text-[#0C4A6E]" />
                            {getShipName(order.scheduleId)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-[#94A3B8]" />
                            {getDepartureTime(order.scheduleId)}
                            {isCancelled && (
                              <span className="ml-2 text-xs text-red-600 font-medium">(已停航)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                          {order.ticketCount}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isCancelled && disposalInfo ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                {getCategoryIcon(disposalInfo.category)}
                                <span className={`font-medium ${categoryConfig[disposalInfo.category]?.textClass}`}>
                                  {disposalInfo.categoryLabel}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{disposalInfo.reason}</span>
                              </div>
                              {disposalInfo.availableActions && disposalInfo.availableActions.length > 0 && (
                                <div className="text-xs text-blue-600">
                                  可执行：{getAvailableActionsLabel(disposalInfo.availableActions)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span>订单正常</span>
                              </div>
                              {seatsBreakdown && (
                                <div className="text-gray-400 mt-1">
                                  余票：{seatsBreakdown.availableSeats}/{seatsBreakdown.totalCapacity}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}
                          >
                            {cfg.label}
                          </span>
                          {disposalInfo && isCancelled && (
                            <span
                              className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${categoryConfig[disposalInfo.category]?.bgClass} ${categoryConfig[disposalInfo.category]?.textClass}`}
                            >
                              {disposalInfo.categoryLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {disposalInfo && isCancelled ? (
                            <div className="flex flex-col gap-2">
                              {disposalInfo.availableActions.includes("reschedule") && (
                                <button
                                  onClick={() => handleReschedule(order.id)}
                                  className="flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors"
                                >
                                  <RefreshCcw className="h-3 w-3" />
                                  改签
                                </button>
                              )}
                              {disposalInfo.availableActions.includes("refund") && (
                                <button
                                  onClick={() => handleRefund(order.id)}
                                  className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                                >
                                  <CreditCard className="h-3 w-3" />
                                  退款
                                </button>
                              )}
                              {disposalInfo.availableActions.includes("convert-waiting") && (
                                <button
                                  onClick={() => handleConvertWaiting(order.id)}
                                  className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                                >
                                  <Ticket className="h-3 w-3" />
                                  候补转正
                                </button>
                              )}
                              {disposalInfo.availableActions.includes("special-handling") && (
                                <button
                                  onClick={() => handleSpecialHandling(order.id)}
                                  className="flex items-center justify-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700 transition-colors"
                                >
                                  <Shield className="h-3 w-3" />
                                  联系客服
                                </button>
                              )}
                              {disposalInfo.availableActions.includes("view-only") && (
                                <div className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
                                  <Info className="h-3 w-3" />
                                  仅查看
                                </div>
                              )}
                            </div>
                          ) : (
                            order.status === "pending" && (
                              <button
                                onClick={() => handleRefund(order.id)}
                                className="flex items-center gap-1 rounded-lg border border-[#F97316] px-3 py-1 text-xs font-semibold text-[#F97316] transition-colors hover:bg-[#F97316]/10"
                              >
                                <RotateCcw className="h-3 w-3" />
                                退票
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {filteredOrders.map((order) => {
                const cfg = statusConfig[order.status];
                const schedule = getSchedule(order.scheduleId);
                const disposalInfo = getDisposalInfo(order);
                const isCancelled = schedule?.status === "cancelled";
                const seatsBreakdown = schedule ? getAvailableSeatsBreakdown(schedule.id) : null;
                
                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border-l-4 ${isCancelled ? "border-yellow-500" : "border-[#0C4A6E]"} bg-white p-4 shadow-sm`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-sm text-[#94A3B8]">
                        {order.id.slice(-8)}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}
                        >
                          {cfg.label}
                        </span>
                        {isCancelled && disposalInfo && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryConfig[disposalInfo.category]?.bgClass} ${categoryConfig[disposalInfo.category]?.textClass}`}
                          >
                            {disposalInfo.categoryLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-1 flex items-center gap-2 text-sm text-[#0C4A6E]">
                      <Ship className="h-4 w-4" />
                      {getShipName(order.scheduleId)}
                    </div>
                    
                    <div className="mb-1 flex items-center gap-2 text-sm text-[#94A3B8]">
                      <Clock className="h-4 w-4" />
                      {getDepartureTime(order.scheduleId)}
                      {isCancelled && (
                        <span className="text-xs text-red-600 font-medium">(已停航)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Ticket className="h-4 w-4 text-[#FBBF24]" />
                      <span className="text-[#0C4A6E]">{order.ticketCount}张</span>
                      <span className="font-semibold text-[#F97316]">
                        ¥{order.totalPrice}
                      </span>
                    </div>
                    
                    {isCancelled && disposalInfo ? (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(disposalInfo.category)}
                          <span className={`text-sm font-medium ${categoryConfig[disposalInfo.category]?.textClass}`}>
                            {disposalInfo.categoryLabel}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-start gap-1 mb-2">
                          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{disposalInfo.reason}</span>
                        </div>
                        {disposalInfo.requirements && disposalInfo.requirements.length > 0 && (
                          <div className="text-xs text-green-700 flex items-start gap-1 mb-2">
                            <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <div>
                              <strong>操作要求：</strong>
                              <ul className="list-disc list-inside mt-1">
                                {disposalInfo.requirements.map((req, i) => (
                                  <li key={i}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {disposalInfo.warnings && disposalInfo.warnings.length > 0 && (
                          <div className="text-xs text-orange-700 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <div>
                              <strong>注意事项：</strong>
                              <ul className="list-disc list-inside mt-1">
                                {disposalInfo.warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : seatsBreakdown ? (
                      <div className="mb-2 text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>订单正常 · 余票 {seatsBreakdown.availableSeats}/{seatsBreakdown.totalCapacity}</span>
                      </div>
                    ) : null}
                    
                    <div className="flex flex-wrap gap-2">
                      {disposalInfo && isCancelled ? (
                        <>
                          {disposalInfo.availableActions.includes("reschedule") && (
                            <button
                              onClick={() => handleReschedule(order.id)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-colors"
                            >
                              <RefreshCcw className="h-3 w-3" />
                              改签
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("refund") && (
                            <button
                              onClick={() => handleRefund(order.id)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                            >
                              <CreditCard className="h-3 w-3" />
                              退款
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("convert-waiting") && (
                            <button
                              onClick={() => handleConvertWaiting(order.id)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                            >
                              <Ticket className="h-3 w-3" />
                              候补转正
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("special-handling") && (
                            <button
                              onClick={() => handleSpecialHandling(order.id)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-700 transition-colors"
                            >
                              <Shield className="h-3 w-3" />
                              联系客服
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("view-only") && (
                            <div className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">
                              <Info className="h-3 w-3" />
                              仅查看
                            </div>
                          )}
                        </>
                      ) : (
                        order.status === "pending" && (
                          <button
                            onClick={() => handleRefund(order.id)}
                            className="flex items-center gap-1 rounded-lg border border-[#F97316] px-3 py-2 text-xs font-semibold text-[#F97316] hover:bg-[#F97316]/10"
                          >
                            <RotateCcw className="h-3 w-3" />
                            退票
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
