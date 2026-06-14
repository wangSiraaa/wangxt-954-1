import { useState, useMemo } from "react";
import { AlertTriangle, Calendar, Clock, Users, RefreshCw, CheckCircle, XCircle, Info, RefreshCcw, CreditCard, Ship as ShipIcon, Filter, ArrowRight, Shield, Ticket, AlertCircle } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useRefundStore } from "@/store/useRefundStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import type { Schedule, Order, OrderDisposalCategory, OrderDisposalInfo } from "@/types";

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
  const { schedules, cancelSchedule } = useScheduleStore();
  const { orders, rescheduleOrder } = useOrderStore();
  const { ships } = useShipStore();
  const { routes, docks } = useBaseStore();
  const { refundDetails, createRefundForOrder } = useRefundStore();
  const { cancelWaitingListBySchedule } = useWaitingListStore();
  const { stopDays, addStopDay, removeStopDay, getByDate: getStopDayByDate, classifyOrder, getOrderDisposalInfo, getCategoryLabel, getAvailableActionsLabel, analyzeAffected } = useStopDayStore();
  const { getAvailableSeatsBreakdown } = useScheduleStore();
  const { validateTicketPurchase } = useOrderStore();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<OrderDisposalCategory | "all">("all");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<"disposal" | "stopdays" | "history">("disposal");
  const [newStopDate, setNewStopDate] = useState("");
  const [newStopReason, setNewStopReason] = useState("");
  const [newStopRouteId, setNewStopRouteId] = useState("all");
  const [newStopType, setNewStopType] = useState<"weather" | "tide" | "terminal-limit">("weather");
  const [newStopSeverity, setNewStopSeverity] = useState<"warning" | "severe" | "critical">("warning");
  const [newStopAffectedDocks, setNewStopAffectedDocks] = useState<string[]>([]);
  const [newWindForce, setNewWindForce] = useState<number>(6);
  const [newTideLevel, setNewTideLevel] = useState<number>(0.5);
  const [newTerminalLimit, setNewTerminalLimit] = useState<number>(100);

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
    let ordersList: Order[] = [];
    if (selectedScheduleId === "all") {
      ordersList = orders.filter((o) => {
        const schedule = schedules.find((s) => s.id === o.scheduleId);
        return schedule?.status === "cancelled" && o.status !== "refunded" && o.status !== "cancelled";
      });
    } else {
      ordersList = orders.filter((o) => o.scheduleId === selectedScheduleId && o.status !== "refunded" && o.status !== "cancelled");
    }
    
    if (selectedCategory === "all") {
      return ordersList;
    }
    
    return ordersList.filter(o => {
      const schedule = schedules.find((s) => s.id === o.scheduleId);
      const disposal = classifyOrder(o, schedule);
      return disposal.category === selectedCategory;
    });
  }, [orders, schedules, selectedScheduleId, selectedCategory, classifyOrder]);

  const categoryStats = useMemo(() => {
    const baseOrders = selectedScheduleId === "all"
      ? orders.filter((o) => {
          const schedule = schedules.find((s) => s.id === o.scheduleId);
          return schedule?.status === "cancelled" && o.status !== "refunded" && o.status !== "cancelled";
        })
      : orders.filter((o) => o.scheduleId === selectedScheduleId && o.status !== "refunded" && o.status !== "cancelled");

    const stats: Record<OrderDisposalCategory, number> = {
      reschedulable: 0,
      refundable: 0,
      "waiting-convertible": 0,
      "boarded-unprocessable": 0,
      cancelled: 0,
    };

    baseOrders.forEach(o => {
      const schedule = schedules.find((s) => s.id === o.scheduleId);
      const disposal = classifyOrder(o, schedule);
      stats[disposal.category]++;
    });

    return stats;
  }, [orders, schedules, selectedScheduleId, classifyOrder]);

  const getCategoryColor = (category: OrderDisposalCategory) => {
    const colors: Record<OrderDisposalCategory, string> = {
      reschedulable: "bg-purple-100 text-purple-700",
      refundable: "bg-green-100 text-green-700",
      "waiting-convertible": "bg-blue-100 text-blue-700",
      "boarded-unprocessable": "bg-yellow-100 text-yellow-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    return colors[category];
  };

  const getCategoryIcon = (category: OrderDisposalCategory) => {
    switch (category) {
      case "reschedulable":
        return <RefreshCcw className="w-5 h-5" />;
      case "refundable":
        return <CreditCard className="w-5 h-5" />;
      case "waiting-convertible":
        return <Ticket className="w-5 h-5" />;
      case "boarded-unprocessable":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <XCircle className="w-5 h-5" />;
    }
  };

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

    const stopDayData: any = {
      date: newStopDate,
      routeId: newStopRouteId,
      reason: newStopReason || "天气原因",
      operator: "调度员",
      type: newStopType,
      severity: newStopSeverity,
    };

    if (newStopAffectedDocks.length > 0) {
      stopDayData.affectedDocks = newStopAffectedDocks;
    }

    if (newStopType === "weather") {
      stopDayData.windForce = newWindForce;
      if (!newStopReason) {
        stopDayData.reason = `风力${newWindForce}级大风预警`;
      }
    } else if (newStopType === "tide") {
      stopDayData.tideLevel = newTideLevel;
      if (!newStopReason) {
        stopDayData.reason = `潮汐水位异常，最低${newTideLevel}米`;
      }
    } else if (newStopType === "terminal-limit") {
      stopDayData.terminalLimitCount = newTerminalLimit;
      if (!newStopReason) {
        stopDayData.reason = `码头限流，每小时限流${newTerminalLimit}人`;
      }
    }

    const stopDay = addStopDay(stopDayData);
    
    if (stopDay) {
      const analysis = analyzeAffected(newStopDate, newStopRouteId === "all" ? undefined : [newStopRouteId]);
      setResult({ 
        success: true, 
        message: `停航日期设置成功！已识别 ${analysis.schedules.length} 个受影响班次，${analysis.orders.length} 个订单待处置` 
      });
    } else {
      setResult({ success: true, message: "停航日期设置成功" });
    }
    
    setNewStopDate("");
    setNewStopReason("");
    setNewStopRouteId("all");
    setNewStopType("weather");
    setNewStopSeverity("warning");
    setNewStopAffectedDocks([]);
    setNewWindForce(6);
    setNewTideLevel(0.5);
    setNewTerminalLimit(100);
  };

  const toggleAffectedDock = (dockId: string) => {
    setNewStopAffectedDocks(prev => 
      prev.includes(dockId) 
        ? prev.filter(id => id !== dockId)
        : [...prev, dockId]
    );
  };

  const handleConvertWaiting = (orderId: string) => {
    alert("候补转正功能：请跳转到候补管理页面处理");
  };

  const handleSpecialHandling = (orderId: string) => {
    alert("特殊处理：已登船订单需联系客服进行人工处置");
  };

  const handleRemoveStopDay = (date: string) => {
    if (confirm("确定要取消这个停航日吗？相关班次将恢复正常。")) {
      removeStopDay(date);
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
      if (order.status === "pending" || order.status === "boarded") {
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
        if (order.status === "pending" || order.status === "boarded") {
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

      {selectedTab === "disposal" && stats.affectedOrders > 0 && (
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20 mb-6">
          <h3 className="text-lg font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            订单分类统计
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setSelectedCategory(selectedCategory === "reschedulable" ? "all" : "reschedulable")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === "reschedulable"
                  ? "border-purple-500 bg-purple-50"
                  : "border-[#94A3B8]/20 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCategory === "reschedulable" ? "bg-purple-200 text-purple-700" : "bg-purple-100 text-purple-600"}`}>
                  <RefreshCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{categoryStats.reschedulable}</div>
                  <div className="text-xs text-[#64748B]">可改签</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === "refundable" ? "all" : "refundable")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === "refundable"
                  ? "border-green-500 bg-green-50"
                  : "border-[#94A3B8]/20 hover:border-green-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCategory === "refundable" ? "bg-green-200 text-green-700" : "bg-green-100 text-green-600"}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{categoryStats.refundable}</div>
                  <div className="text-xs text-[#64748B]">可退款</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === "waiting-convertible" ? "all" : "waiting-convertible")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === "waiting-convertible"
                  ? "border-blue-500 bg-blue-50"
                  : "border-[#94A3B8]/20 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCategory === "waiting-convertible" ? "bg-blue-200 text-blue-700" : "bg-blue-100 text-blue-600"}`}>
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{categoryStats["waiting-convertible"]}</div>
                  <div className="text-xs text-[#64748B]">候补转正</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === "boarded-unprocessable" ? "all" : "boarded-unprocessable")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === "boarded-unprocessable"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-[#94A3B8]/20 hover:border-yellow-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCategory === "boarded-unprocessable" ? "bg-yellow-200 text-yellow-700" : "bg-yellow-100 text-yellow-600"}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{categoryStats["boarded-unprocessable"]}</div>
                  <div className="text-xs text-[#64748B]">已登船待处理</div>
                </div>
              </div>
            </button>
          </div>
          {selectedCategory !== "all" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm text-blue-700">
                当前筛选：{getCategoryLabel(selectedCategory as OrderDisposalCategory)}，共 {categoryStats[selectedCategory as OrderDisposalCategory]} 个订单
                <button onClick={() => setSelectedCategory("all")} className="ml-2 underline hover:text-blue-800">清除筛选</button>
              </span>
            </div>
          )}
        </div>
      )}

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
                    onClick={handleAutoProcessAll}
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
                <ShipIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
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
                  const disposal = classifyOrder(order, schedule);
                  const disposalInfo = getOrderDisposalInfo(order.id, schedule);
                  const seatsBreakdown = schedule ? getAvailableSeatsBreakdown(schedule.id) : null;
                  const ticketValidation = schedule ? validateTicketPurchase(schedule.id, 1) : null;

                  return (
                    <div key={order.id} className={`p-4 rounded-xl border ${
                      disposal.category === "boarded-unprocessable" 
                        ? "bg-yellow-50 border-yellow-200" 
                        : disposal.category === "waiting-convertible"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-[#FFF7ED] border-[#FBBF24]/30"
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            disposal.category === "reschedulable" ? "bg-purple-100" :
                            disposal.category === "refundable" ? "bg-green-100" :
                            disposal.category === "waiting-convertible" ? "bg-blue-100" :
                            "bg-yellow-100"
                          }`}>
                            {getCategoryIcon(disposal.category)}
                          </div>
                          <div>
                            <div className="font-medium text-[#0C4A6E]">{order.orderNo}</div>
                            <div className="text-sm text-[#64748B]">{order.touristName} · {order.ticketCount}人</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                          <span className={`text-xs px-3 py-1 rounded-full ${getCategoryColor(disposal.category)}`}>
                            {getCategoryLabel(disposal.category)}
                          </span>
                        </div>
                      </div>

                      {schedule && (
                        <div className="flex items-center gap-6 mb-3 text-sm text-[#64748B] flex-wrap">
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
                        {seatsBreakdown && (
                          <div className="flex items-center gap-2">
                            <Ticket className="w-4 h-4" />
                            <span>余票 {seatsBreakdown.availableSeats}/{seatsBreakdown.totalCapacity}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-white rounded-lg mb-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                        <span className="text-sm text-[#9A3412]">
                          停航原因：{schedule?.cancellationReason || "天气原因"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-[#1E40AF]">
                          <strong>分类说明：</strong>{disposalInfo?.reason || "系统自动分类"}
                        </span>
                      </div>
                      {disposalInfo?.requirements && disposalInfo.requirements.length > 0 && (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <div className="text-sm text-green-700">
                            <strong>操作要求：</strong>
                            <ul className="list-disc list-inside mt-1">
                              {disposalInfo.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {disposalInfo?.warnings && disposalInfo.warnings.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                          <div className="text-sm text-orange-700">
                            <strong>注意事项：</strong>
                            <ul className="list-disc list-inside mt-1">
                              {disposalInfo.warnings.map((warn, i) => (
                                <li key={i}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {seatsBreakdown && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-[#64748B] mb-2">余票构成明细</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">总容量：</span>
                              <span className="font-medium text-[#0C4A6E]">{seatsBreakdown.totalCapacity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">已售票：</span>
                              <span className="font-medium text-blue-600">{seatsBreakdown.soldSeats}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">候补锁定：</span>
                              <span className="font-medium text-purple-600">{seatsBreakdown.waitingLockedSeats}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">已登船：</span>
                              <span className="font-medium text-green-600">{seatsBreakdown.boardedSeats}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">退票释放：</span>
                              <span className="font-medium text-gray-600">{seatsBreakdown.refundReleasedSeats}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">改签锁定：</span>
                              <span className="font-medium text-orange-600">{seatsBreakdown.rescheduledLockedSeats}</span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-[#64748B] font-medium">可用余票：</span>
                              <span className="font-bold text-[#0C4A6E]">{seatsBreakdown.availableSeats}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {ticketValidation && !ticketValidation.valid && ticketValidation.blockedReason && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-700">
                              <strong>售票阻断：</strong>{ticketValidation.errors?.[0] || "该班次暂停售票"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {disposalInfo?.availableActions && (
                      <div className="mb-3">
                        <div className="text-xs text-[#64748B] mb-2">可执行操作：{getAvailableActionsLabel(disposalInfo.availableActions)}</div>
                        <div className={`flex gap-3 ${
                          disposal.category === "boarded-unprocessable" ? "flex-col" : ""
                        }`}>
                          {disposalInfo.availableActions.includes("reschedule") && (
                            <button
                              onClick={() => handleReschedule(order.id)}
                              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              改签
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("refund") && (
                            <button
                              onClick={() => handleRefund(order.id)}
                              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CreditCard className="w-4 h-4" />
                              全额退款
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("convert-waiting") && (
                            <button
                              onClick={() => handleConvertWaiting(order.id)}
                              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Ticket className="w-4 h-4" />
                              候补转正
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("special-handling") && (
                            <button
                              onClick={() => handleSpecialHandling(order.id)}
                              className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Shield className="w-4 h-4" />
                              特殊处理
                            </button>
                          )}
                          {disposalInfo.availableActions.includes("view-only") && (
                            <div className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                              <Info className="w-4 h-4" />
                              仅查看
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
      )}

      {selectedTab === "stopdays" && (
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
          <h2 className="text-lg font-semibold text-[#0C4A6E] mb-6">停航日历设置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-[#F8FAFC] rounded-xl mb-6">
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
              <label className="block text-sm text-[#64748B] mb-2">停航类型</label>
              <select
                value={newStopType}
                onChange={(e) => setNewStopType(e.target.value as "weather" | "tide" | "terminal-limit")}
                className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              >
                <option value="weather">🌬️ 天气原因（大风、暴雨等）</option>
                <option value="tide">🌊 潮汐异常</option>
                <option value="terminal-limit">🚧 码头限流</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#64748B] mb-2">严重程度</label>
              <select
                value={newStopSeverity}
                onChange={(e) => setNewStopSeverity(e.target.value as "warning" | "severe" | "critical")}
                className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              >
                <option value="warning">⚠️ 预警（部分航线受影响）</option>
                <option value="severe">🟠 严重（主要航线停航）</option>
                <option value="critical">🔴 紧急（全部停航）</option>
              </select>
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
                placeholder="根据类型自动生成，可手动修改"
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

          {newStopType === "weather" && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <h3 className="text-sm font-semibold text-[#0C4A6E] mb-3 flex items-center gap-2">
                🌬️ 天气参数设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748B] mb-2">
                    风力等级
                    <span className="ml-2 text-lg font-bold text-orange-600">{newWindForce} 级</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={newWindForce}
                    onChange={(e) => setNewWindForce(Number(e.target.value))}
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-[#64748B] mt-1">
                    <span>0级</span>
                    <span>6级</span>
                    <span>12级</span>
                  </div>
                  <div className="mt-2 text-xs text-orange-700">
                    {newWindForce < 3 && "微风：正常通航"}
                    {newWindForce >= 3 && newWindForce < 6 && "和风：注意瞭望"}
                    {newWindForce >= 6 && newWindForce < 8 && "强风：建议停航"}
                    {newWindForce >= 8 && "大风：强制停航"}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-[#64748B]">
                    <span className="font-medium">天气预警等级：</span>
                    <select
                      value={newStopSeverity}
                      onChange={(e) => setNewStopSeverity(e.target.value as "warning" | "severe" | "critical")}
                      className="ml-2 px-3 py-1 border border-orange-300 rounded"
                    >
                      <option value="warning">蓝色预警</option>
                      <option value="severe">黄色/橙色预警</option>
                      <option value="critical">红色预警</option>
                    </select>
                  </div>
                  <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded">
                    <strong>系统判定：</strong>
                    {newWindForce >= 8 ? "风力过大，所有航线强制停航" :
                     newWindForce >= 6 ? "风力较大，建议取消露天航线" :
                     "风力正常，可选择性停航"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {newStopType === "tide" && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-sm font-semibold text-[#0C4A6E] mb-3 flex items-center gap-2">
                🌊 潮汐参数设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748B] mb-2">
                    最低通航水位
                    <span className="ml-2 text-lg font-bold text-blue-600">{newTideLevel.toFixed(1)} 米</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={newTideLevel}
                    onChange={(e) => setNewTideLevel(Number(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-[#64748B] mt-1">
                    <span>0米</span>
                    <span>1.5米</span>
                    <span>3米</span>
                  </div>
                  <div className="mt-2 text-xs text-blue-700">
                    {newTideLevel < 0.5 && "水位极低：所有船只无法通航"}
                    {newTideLevel >= 0.5 && newTideLevel < 1.0 && "水位较低：小型船只可通航"}
                    {newTideLevel >= 1.0 && newTideLevel < 1.5 && "水位适中：大部分船只可通航"}
                    {newTideLevel >= 1.5 && "水位充足：所有船只可通航"}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-[#64748B]">
                    <span className="font-medium">异常类型：</span>
                    <select
                      value={newStopSeverity}
                      onChange={(e) => setNewStopSeverity(e.target.value as "warning" | "severe" | "critical")}
                      className="ml-2 px-3 py-1 border border-blue-300 rounded"
                    >
                      <option value="warning">低潮预警</option>
                      <option value="severe">严重低潮</option>
                      <option value="critical">极端低潮/风暴潮</option>
                    </select>
                  </div>
                  <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                    <strong>系统判定：</strong>
                    {newTideLevel < 0.5 ? "水位不足安全深度，所有航线停航" :
                     newTideLevel < 1.0 ? "水位偏低，吃水深的船只停航" :
                     "水位正常，可选择性停航"}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    船只吃水参考：快艇0.3米 | 游船0.6米 | 大型客船1.0米
                  </div>
                </div>
              </div>
            </div>
          )}

          {newStopType === "terminal-limit" && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h3 className="text-sm font-semibold text-[#0C4A6E] mb-3 flex items-center gap-2">
                🚧 码头吞吐管控设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-[#64748B] mb-2">
                    每小时限流人数
                    <span className="ml-2 text-lg font-bold text-yellow-600">{newTerminalLimit} 人</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={newTerminalLimit}
                    onChange={(e) => setNewTerminalLimit(Number(e.target.value))}
                    className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-[#64748B] mt-1">
                    <span>10人</span>
                    <span>250人</span>
                    <span>500人</span>
                  </div>
                  <div className="mt-2 text-xs text-yellow-700">
                    {newTerminalLimit < 50 && "严格限流：仅开放VIP通道，所有班次限流"}
                    {newTerminalLimit >= 50 && newTerminalLimit < 150 && "中度限流：部分时段暂停售票"}
                    {newTerminalLimit >= 150 && newTerminalLimit < 300 && "轻度限流：建议错峰出行"}
                    {newTerminalLimit >= 300 && "正常吞吐：无特殊限制"}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-[#64748B]">
                    <span className="font-medium">管控等级：</span>
                    <select
                      value={newStopSeverity}
                      onChange={(e) => setNewStopSeverity(e.target.value as "warning" | "severe" | "critical")}
                      className="ml-2 px-3 py-1 border border-yellow-300 rounded"
                    >
                      <option value="warning">人流预警</option>
                      <option value="severe">部分限流</option>
                      <option value="critical">全面管控</option>
                    </select>
                  </div>
                  <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                    <strong>系统判定：</strong>
                    {newTerminalLimit < 50 ? "严格管控，所有班次减半售票" :
                     newTerminalLimit < 150 ? "中度管控，热门航线限流" :
                     "轻度管控，按需调整班次"}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    码头容量参考：{docks.map(d => `${d.name}${d.capacity}人`).join(" | ")}
                  </div>
                </div>
              </div>
              <label className="block text-sm font-medium text-[#0C4A6E] mb-2">选择受影响的码头（可多选）</label>
              <div className="flex flex-wrap gap-3">
                {docks.map((dock) => (
                  <label
                    key={dock.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      newStopAffectedDocks.includes(dock.id)
                        ? "border-yellow-500 bg-yellow-100 text-yellow-700"
                        : "border-[#94A3B8]/30 bg-white hover:border-yellow-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newStopAffectedDocks.includes(dock.id)}
                      onChange={() => toggleAffectedDock(dock.id)}
                      className="w-4 h-4 text-yellow-600"
                    />
                    <span className="text-sm">{dock.name} (容量{dock.capacity}人)</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
                      onClick={() => handleRemoveStopDay(stopDay.date)}
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
                          <ShipIcon className="w-6 h-6 text-red-600" />
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
                          取消原因：{schedule.cancellationReason || "未说明"}
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
