import { useState, useMemo } from "react";
import { AlertTriangle, Calendar, Clock, Ship, Users, RefreshCw, CheckCircle, XCircle, Info, ArrowRight, RefreshCcw, CreditCard, Ship as ShipIcon } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useRefundStore } from "@/store/useRefundStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import type { Schedule, Order } from "@/types";

function getScheduleStatusColor(status: string) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    full: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getScheduleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "正常",
    full: "满员",
    cancelled: "已停航",
    completed: "已完成",
  };
  return labels[status] || status;
}

function getOrderStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-blue-100 text-blue-700",
    boarded: "bg-green-100 text-green-700",
    refunded: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
    rescheduled: "bg-purple-100 text-purple-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待支付",
    paid: "已支付",
    boarded: "已登船",
    refunded: "已退款",
    cancelled: "已取消",
    rescheduled: "已改签",
  };
  return labels[status] || status;
}

export default function StopDayDisposal() {
  const { schedules, stopDays, cancelSchedule, addStopDay, removeStopDay } = useScheduleStore();
  const { orders, rescheduleOrder } = useOrderStore();
  const { ships } = useShipStore();
  const { routes, docks } = useBaseStore();
  const { refundDetails, createRefundForOrder } = useRefundStore();
  const { cancelWaitingListBySchedule } = useWaitingListStore();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<"disposal" | "stopdays" | "history">("disposal");
  const [newStopDate, setNewStopDate] = useState("");
  const [newStopReason, setNewStopReason] = useState("");
  const [newStopRouteId, setNewStopRouteId] = useState("all");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const activeSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.status !== "completed" && s.status !== "cancelled")
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.departureTime.localeCompare(b.departureTime);
      });
  }, [schedules]);

  const affectedOrders = useMemo(() => {
    if (selectedScheduleId === "all") {
      return orders.filter((o) => {
        const schedule = schedules.find((s) => s.id === o.scheduleId);
        return schedule?.status === "cancelled" && o.status !== "refunded" && o.status !== "cancelled";
      });
    }
    return orders.filter((o) => o.scheduleId === selectedScheduleId && o.status !== "refunded" && o.status !== "cancelled");
  }, [orders, schedules, selectedScheduleId]);

  const cancelledSchedules = useMemo(() => {
    return schedules.filter((s) => s.status === "cancelled");
  }, [schedules]);

  const activeStopDays = useMemo(() => {
    return stopDays.sort((a, b) => a.date.localeCompare(b.date));
  }, [stopDays]);

  const stats = useMemo(() => {
    const cancelled = cancelledSchedules.length;
    const affected = orders.filter((o) => {
      const s = schedules.find((s) => s.id === o.scheduleId);
      return s?.status === "cancelled" && o.status !== "refunded" && o.status !== "cancelled";
    });
    const pendingRefund = affected.filter((o) => o.status === "paid");
    const pendingReschedule = affected.filter((o) => o.status === "paid");
    return {
      cancelledSchedules: cancelled,
      affectedOrders: affected.length,
      pendingRefund: pendingRefund.length,
      pendingReschedule: pendingReschedule.length,
      affectedPassengers: affected.reduce((sum, o) => sum + o.ticketCount, 0),
    };
  }, [cancelledSchedules, orders, schedules]);

  const getDockName = (id: string) => docks.find((d) => d.id === id)?.name || "未知码头";
  const getShipName = (id: string) => ships.find((s) => s.id === id)?.name || "未知船只";
  const getRouteName = (id: string) => {
    const route = routes.find((r) => r.id === id);
    if (!route) return "未知航线";
    return `${getDockName(route.startDockId)} → ${getDockName(route.endDockId)}`;
  };

  const handleAddStopDay = () => {
    if (!newStopDate) {
      setResult({ success: false, message: "请选择停航日期" });
      return;
    }
    const existing = stopDays.find(
      (s) => s.date === newStopDate && s.routeId === newStopRouteId
    );
    if (existing) {
      setResult({ success: false, message: "该日期已设置过停航" });
      return;
    }
    addStopDay({
      date: newStopDate,
      routeId: newStopRouteId,
      reason: newStopReason || "天气原因",
      operator: "调度员",
    });
    setNewStopDate("");
    setNewStopReason("");
    setNewStopRouteId("all");
    setResult({ success: true, message: "停航日期设置成功" });
  };

  const handleRemoveStopDay = (id: string) => {
    if (confirm("确定要取消这个停航日吗？相关班次将恢复正常。")) {
      removeStopDay(id);
      setResult({ success: true, message: "已取消停航日" });
    }
  };

  const handleCancelSchedule = (scheduleId: string) => {
    if (!confirm("确定要取消这个班次吗？所有已购票订单将进入改签或退款流程。")) {
      return;
    }
    setProcessing(true);
    try {
      cancelSchedule(scheduleId, "调度员取消");
      setResult({ success: true, message: "班次已取消，相关订单已进入处置流程" });
    } catch (e: unknown) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : "取消失败",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundAll = () => {
    if (!confirm("确定要为所有待处理订单执行全额退款吗？")) {
      return;
    }
    setProcessing(true);
    let successCount = 0;
    let failCount = 0;
    affectedOrders.forEach((order) => {
      if (order.status === "paid") {
        try {
          createRefundForOrder(order.id, 0, "停航全额退款", "系统自动");
          successCount++;
        } catch {
          failCount++;
        }
      }
    });
    setResult({
      success: true,
      message: `退款处理完成：成功${successCount}笔，失败${failCount}笔`,
    });
    setProcessing(false);
  };

  const handleAutoProcessAll = () => {
    if (!confirm("确定要自动处理所有待处理订单吗？系统将自动为所有订单创建全额退款记录。")) {
      return;
    }
    setProcessing(true);
    try {
      let refunded = 0;
      affectedOrders.forEach((order) => {
        if (order.status === "paid") {
          createRefundForOrder(order.id, 0, "停航全额退款", "系统自动");
          refunded++;
        }
      });
      cancelledSchedules.forEach((s) => {
        cancelWaitingListBySchedule(s.id, "停航取消");
      });
      setResult({
        success: true,
        message: `自动处理完成：退款${refunded}笔订单，取消候补${cancelledSchedules.length}个班次的候补`,
      });
    } catch (e: unknown) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : "处理失败",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = (orderId: string) => {
    alert("请跳转到订单详情页进行改签操作");
  };

  const handleRefund = (orderId: string) => {
    if (!confirm("确定要为该订单办理全额退款吗？")) {
      return;
    }
    try {
      createRefundForOrder(orderId, 0, "停航全额退款", "调度员操作");
      setResult({ success: true, message: "退款已处理" });
    } catch (e: unknown) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : "退款失败",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-7 h-7 text-[#DC2626]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">停航处置</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">已停航班次</div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelledSchedules}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">受影响订单</div>
          <div className="text-2xl font-bold text-[#F97316]">{stats.affectedOrders}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">受影响乘客</div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{stats.affectedPassengers}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待退款</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingRefund}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待改签</div>
          <div className="text-2xl font-bold text-purple-600">{stats.pendingReschedule}</div>
        </div>
      </div>

      {result && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className={result.success ? "text-green-700" : "text-red-700"}>
            {result.message}
          </div>
          <button
            onClick={() => setResult(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-[#94A3B8]/20 w-fit">
        <button
          onClick={() => setSelectedTab("disposal")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTab === "disposal"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
            处置中心
          </div>
        </button>
        <button
          onClick={() => setSelectedTab("stopdays")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTab === "stopdays"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            停航日历
          </div>
        </button>
        <button
          onClick={() => setSelectedTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTab === "history"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            历史记录
          </div>
        </button>
      </div>

      {selectedTab === "disposal" && (
        <>
          <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#0C4A6E]">可取消班次</h2>
              {stats.affectedOrders > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={handleRefundAll}
                    disabled={processing}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    全额退款
                  </button>
                  <button
                    onClick={handleAutoProcess}
                    disabled={processing}
                    className="px-4 py-2 bg-[#0C4A6E] text-white rounded-lg text-sm font-medium hover:bg-[#083344] transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    一键处理
                  </button>
                </div>
              )}
            </div>

            {activeSchedules.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8]">
                <Ship className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>暂无运行中的班次</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#94A3B8]/20">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">日期</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">航线</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">船只</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">订单数</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">乘客数</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">状态</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-[#64748B]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSchedules.map((schedule) => {
                      const route = routes.find((r) => r.id === schedule.routeId);
                      const ship = ships.find((s) => s.id === schedule.shipId);
                      const scheduleOrders = orders.filter((o) => o.scheduleId === schedule.id);
                      const passengerCount = scheduleOrders.reduce((sum, o) => sum + o.ticketCount, 0);
                      return (
                        <tr key={schedule.id} className="border-b border-[#94A3B8]/10 hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">{schedule.date}</td>
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">{schedule.departureTime} - {schedule.arrivalTime}</td>
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">
                            {route ? `${getDockName(route.startDockId)} → ${getDockName(route.endDockId)}` : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">{ship?.name || "-"}</td>
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">{scheduleOrders.length}</td>
                          <td className="py-3 px-4 text-sm text-[#0C4A6E]">{passengerCount}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${getScheduleStatusColor(schedule.status)}`}>
                              {getScheduleStatusLabel(schedule.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleCancelSchedule(schedule.id)}
                              disabled={processing || schedule.status === "cancelled"}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              取消班次
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#0C4A6E]">待处置订单</h2>
              <div>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
                >
                  <option value="all">全部班次</option>
                  {cancelledSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} {s.departureTime}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {affectedOrders.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8]">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>暂无待处置订单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {affectedOrders.map((order) => {
                  const schedule = schedules.find((s) => s.id === order.scheduleId);
                  return (
                    <div key={order.id} className="p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#F97316]/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-[#F97316]" />
                          </div>
                          <div>
                            <div className="font-medium text-[#0C4A6E]">{order.orderNo}</div>
                            <div className="text-sm text-[#64748B]">{order.touristName} · {order.ticketCount}人</div>
                          </div>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>

                      {schedule && (
                        <div className="flex items-center gap-6 mb-3 text-sm text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <ShipIcon className="w-4 h-4" />
                          <span>{getShipName(schedule.shipId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{schedule.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{schedule.departureTime}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-white rounded-lg mb-3">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#F97316]" />
                        <span className="text-sm text-[#9A3412]">
                          停航原因：{schedule?.cancelReason || "天气原因"}
                        </span>
                      </div>
                    </div>

                    {order.status === "paid" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReschedule(order.id)}
                          className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          改签
                        </button>
                        <button
                          onClick={() => handleRefund(order.id)}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          全额退款
                        </button>
                      </div>
                    )}

                    {order.status === "boarded" && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-yellow-700">
                            该订单已登船，需特殊处理
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTab === "stopdays" && (
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
          <h2 className="text-lg font-semibold text-[#0C4A6E] mb-6">停航日历设置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#F8FAFC] rounded-xl mb-6">
            <div>
              <label className="block text-sm text-[#64748B] mb-2">停航日期</label>
              <input
                type="date"
                value={newStopDate}
                onChange={(e) => setNewStopDate(e.target.value)}
                min={todayStr}
                className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748B] mb-2">航线范围</label>
              <select
                value={newStopRouteId}
                onChange={(e) => setNewStopRouteId(e.target.value)}
                className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              >
                <option value="all">全部航线</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {getDockName(r.startDockId)} → {getDockName(r.endDockId)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#64748B] mb-2">停航原因</label>
              <input
                type="text"
                value={newStopReason}
                onChange={(e) => setNewStopReason(e.target.value)}
                placeholder="如：大风天气"
                className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddStopDay}
                className="w-full px-4 py-2 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors"
              >
                添加停航日
              </button>
            </div>
          </div>

          {activeStopDays.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8]">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>暂无停航日设置</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeStopDays.map((stopDay) => (
                <div key={stopDay.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#94A3B8]/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-[#0C4A6E]">{stopDay.date}</div>
                      <div className="text-sm text-[#64748B]">
                        {stopDay.routeId === "all" ? "全部航线" : getRouteName(stopDay.routeId)}
                        {" · "}
                        {stopDay.reason}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-[#64748B]">
                      <div>操作人：{stopDay.operator}</div>
                      <div>{new Date(stopDay.createdAt).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveStopDay(stopDay.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      取消停航
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === "history" && (
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
          <h2 className="text-lg font-semibold text-[#0C4A6E] mb-6">停航历史记录</h2>
          {cancelledSchedules.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8]">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>暂无停航历史记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cancelledSchedules.map((schedule) => {
                const route = routes.find((r) => r.id === schedule.routeId);
                const ship = ships.find((s) => s.id === schedule.shipId);
                const scheduleOrders = orders.filter((o) => o.scheduleId === schedule.id);
                const refundedCount = scheduleOrders.filter((o) => o.status === "refunded").length;
                const rescheduledCount = scheduleOrders.filter((o) => o.status === "rescheduled").length;
                return (
                  <div key={schedule.id} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#94A3B8]/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                          <Ship className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-[#0C4A6E]">
                            {schedule.date} {schedule.departureTime} - {schedule.arrivalTime}
                          </div>
                          <div className="text-sm text-[#64748B]">
                            {ship?.name}
                            {route && ` · ${getDockName(route.startDockId)} → ${getDockName(route.endDockId)}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#64748B]">
                          取消时间：{schedule.updatedAt ? new Date(schedule.updatedAt).toLocaleString() : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700">
                          取消原因：{schedule.cancelReason || "未说明"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-[#0C4A6E]">{scheduleOrders.length}</div>
                        <div className="text-xs text-[#64748B]">总订单</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">{refundedCount}</div>
                        <div className="text-xs text-[#64748B]">已退款</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-purple-600">{rescheduledCount}</div>
                        <div className="text-xs text-[#64748B]">已改签</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-[#F97316]">
                          {scheduleOrders.reduce((sum, o) => sum + o.ticketCount, 0)}
                        </div>
                        <div className="text-xs text-[#64748B]">乘客数</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
