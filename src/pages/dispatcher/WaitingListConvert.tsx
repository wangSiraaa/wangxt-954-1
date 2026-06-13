import { useState, useMemo } from "react";
import { Users, Calendar, Clock, Ship, User, CheckCircle, XCircle, AlertCircle, ArrowRight, Ticket, RefreshCw, Info } from "lucide-react";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useOrderStore } from "@/store/useOrderStore";
import type { WaitingList } from "@/types";

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    converted: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
    expired: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待转正",
    converted: "已转正",
    cancelled: "已取消",
    expired: "已过期",
  };
  return labels[status] || status;
}

export default function WaitingListConvert() {
  const { waitingLists, checkAndConvertWaitingList, processWaitingListForSchedule, cancelWaitingList } = useWaitingListStore();
  const { schedules, calculateAvailableSeats } = useScheduleStore();
  const { ships } = useShipStore();
  const { routes, docks } = useBaseStore();
  const { getByOrderNo } = useOrderStore();

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");
  const [convertResult, setConvertResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showDetail, setShowDetail] = useState<WaitingList | null>(null);

  const pendingLists = useMemo(() => {
    return waitingLists.filter((w) => {
      if (selectedStatus !== "all" && w.status !== selectedStatus) return false;
      if (selectedScheduleId !== "all" && w.scheduleId !== selectedScheduleId) return false;
      return true;
    }).sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "pending") return -1;
        if (b.status === "pending") return 1;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [waitingLists, selectedStatus, selectedScheduleId]);

  const activeSchedules = useMemo(() => {
    const scheduleIds = [...new Set(waitingLists.filter(w => w.status === "pending").map((w) => w.scheduleId))];
    return schedules.filter((s) => scheduleIds.includes(s.id) && s.status !== "cancelled");
  }, [waitingLists, schedules]);

  const stats = useMemo(() => {
    const pending = waitingLists.filter((w) => w.status === "pending");
    const converted = waitingLists.filter((w) => w.status === "converted");
    const pendingSeats = pending.reduce((sum, w) => sum + w.ticketCount, 0);
    return {
      total: waitingLists.length,
      pending: pending.length,
      converted: converted.length,
      pendingSeats,
    };
  }, [waitingLists]);

  const getScheduleInfo = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return null;
    const ship = ships.find((s) => s.id === schedule.shipId);
    const route = routes.find((r) => r.id === schedule.routeId);
    const available = calculateAvailableSeats(scheduleId);
    return { schedule, ship, route, available };
  };

  const getDockName = (id: string) => docks.find((d) => d.id === id)?.name || "未知码头";

  const handleAutoConvert = async (scheduleId: string) => {
    try {
      const info = getScheduleInfo(scheduleId);
      if (!info) {
        setConvertResult({ success: false, message: "班次不存在" });
        return;
      }
      const result = processWaitingListForSchedule(scheduleId, info.available, "系统自动");
      if (result.converted > 0) {
        setConvertResult({
          success: true,
          message: `自动转正成功！${result.converted}个候补订单，${result.notConverted}个未能转正`,
        });
      } else {
        setConvertResult({
          success: false,
          message: result.message || "没有可转正的候补订单",
        });
      }
    } catch (e: unknown) {
      setConvertResult({
        success: false,
        message: e instanceof Error ? e.message : "转正失败",
      });
    }
  };

  const handleManualConvert = (waitingId: string) => {
    try {
      const waiting = waitingLists.find((w) => w.id === waitingId);
      if (!waiting) return;
      const info = getScheduleInfo(waiting.scheduleId);
      if (!info) {
        setConvertResult({ success: false, message: "班次不存在" });
        return;
      }
      if (info.available < waiting.ticketCount) {
        setConvertResult({ success: false, message: "余票不足，无法转正" });
        return;
      }
      const result = checkAndConvertWaitingList(waiting.scheduleId, waiting.ticketCount, "调度员手动");
      if (result.converted > 0) {
        setConvertResult({
          success: true,
          message: `手动转正成功！已为${result.converted}位乘客转正`,
        });
      } else {
        setConvertResult({
          success: false,
          message: result.message || "转正失败",
        });
      }
    } catch (e: unknown) {
      setConvertResult({
        success: false,
        message: e instanceof Error ? e.message : "转正失败",
      });
    }
  };

  const handleCancel = (waitingId: string) => {
    if (confirm("确定要取消这个候补订单吗？")) {
      cancelWaitingList(waitingId, "调度员取消");
      setConvertResult({ success: true, message: "已取消候补订单" });
    }
  };

  const refreshAll = () => {
    const pending = waitingLists.filter((w) => w.status === "pending");
    let totalConverted = 0;
    pending.forEach((w) => {
      const info = getScheduleInfo(w.scheduleId);
      if (info && info.available >= w.ticketCount) {
        const result = checkAndConvertWaitingList(w.scheduleId, info.available, "批量处理");
        totalConverted += result.converted;
      }
    });
    setConvertResult({
      success: true,
      message: `批量处理完成！共转正${totalConverted}个候补订单`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">候补转正</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">总候补数</div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待转正</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">已转正</div>
          <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待转正座位</div>
          <div className="text-2xl font-bold text-[#F97316]">{stats.pendingSeats}</div>
        </div>
      </div>

      {convertResult && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            convertResult.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {convertResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className={convertResult.success ? "text-green-700" : "text-red-700"}>
            {convertResult.message}
          </div>
          <button
            onClick={() => setConvertResult(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm text-[#64748B] mb-1">状态筛选</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              >
                <option value="all">全部</option>
                <option value="pending">待转正</option>
                <option value="converted">已转正</option>
                <option value="cancelled">已取消</option>
                <option value="expired">已过期</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#64748B] mb-1">班次筛选</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              >
                <option value="all">全部班次</option>
                {activeSchedules.map((s) => {
                  const route = routes.find((r) => r.id === s.routeId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.date} {s.departureTime}
                      {route ? ` ${getDockName(route.startDockId)}→${getDockName(route.endDockId)}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshAll}
              disabled={stats.pending === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                stats.pending > 0
                  ? "bg-[#0C4A6E] text-white hover:bg-[#083344]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              批量处理
            </button>
          </div>
        </div>

        {activeSchedules.length > 0 && selectedStatus === "all" && (
          <div className="mb-6 p-4 bg-[#FFF7ED] border border-[#FBBF24]/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-[#F97316]" />
              <span className="font-medium text-[#9A3412]">有候补待转正的班次</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeSchedules.map((s) => {
                const info = getScheduleInfo(s.id);
                const route = routes.find((r) => r.id === s.routeId);
                const pendingForSchedule = pendingLists.filter(
                  (w) => w.scheduleId === s.id && w.status === "pending"
                );
                const pendingSeats = pendingForSchedule.reduce((sum, w) => sum + w.ticketCount, 0);
                const canConvert = info && info.available > 0;
                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-lg p-4 border border-[#FBBF24]/30"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
                        <Ship className="w-5 h-5 text-[#F97316]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#0C4A6E] text-sm">
                          {s.date} {s.departureTime}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {route
                            ? `${getDockName(route.startDockId)}→${getDockName(route.endDockId)}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3 text-sm">
                      <div>
                        <span className="text-[#64748B]">候补：</span>
                        <span className="font-medium text-[#F97316]">{pendingForSchedule.length}单 {pendingSeats}座</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">余票：</span>
                        <span className={`font-medium ${info && info.available > 0 ? "text-green-600" : "text-red-600"}`}>
                          {info?.available || 0}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAutoConvert(s.id)}
                      disabled={!canConvert}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        canConvert
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {canConvert ? "自动转正" : "余票不足"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingLists.length === 0 ? (
          <div className="text-center py-16 text-[#94A3B8]">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">暂无候补订单</p>
            <p className="text-sm">选择筛选条件或稍后查看</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLists.map((waiting) => {
              const info = getScheduleInfo(waiting.scheduleId);
              const canConvert = info && info.available >= waiting.ticketCount && waiting.status === "pending";
              const createdTime = new Date(waiting.createdAt);
              const convertedOrder = waiting.convertedOrderId
                ? getByOrderNo(waiting.convertedOrderId)
                : null;
              return (
                <div
                  key={waiting.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    waiting.status === "pending"
                      ? "bg-[#FFF7ED] border-[#FBBF24]/30"
                      : "bg-[#F8FAFC] border-[#94A3B8]/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-[#0C4A6E]" />
                      </div>
                      <div>
                        <div className="font-medium text-[#0C4A6E]">{waiting.touristName}</div>
                        <div className="text-sm text-[#64748B]">{maskPhone(waiting.phone)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(waiting.status)}`}>
                        {getStatusLabel(waiting.status)}
                      </span>
                      <div className="text-xs text-[#64748B] mt-1">
                        申请时间：{createdTime.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-3">
                    {info && (
                      <>
                        <div className="flex items-center gap-2">
                          <Ship className="w-4 h-4 text-[#0C4A6E]" />
                          <span className="text-sm">{info.ship?.name || "未知船只"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#0C4A6E]" />
                          <span className="text-sm">{info.schedule.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#0C4A6E]" />
                          <span className="text-sm">{info.schedule.departureTime}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#F97316]" />
                      <span className="text-sm text-[#F97316] font-medium">{waiting.ticketCount} 张票</span>
                    </div>
                    {waiting.groupCount && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-600">团体 {waiting.groupCount} 人</span>
                      </div>
                    )}
                  </div>

                  {waiting.status === "pending" && info && (
                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg mb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${info.available >= waiting.ticketCount ? "text-green-600" : "text-yellow-600"}`} />
                        <span className={`text-sm ${info.available >= waiting.ticketCount ? "text-green-700" : "text-yellow-700"}`}>
                          当前余票 {info.available} 张
                          {info.available >= waiting.ticketCount
                            ? "，可立即转正"
                            : `，还差 ${waiting.ticketCount - info.available} 张`}
                        </span>
                      </div>
                      <div className="text-sm text-[#64748B]">
                        候补编号：{waiting.waitingNo}
                      </div>
                    </div>
                  )}

                  {waiting.status === "converted" && convertedOrder && (
                    <div className="p-3 bg-green-50 rounded-lg mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          已转正，订单号：{convertedOrder.orderNo}
                        </span>
                      </div>
                    </div>
                  )}

                  {waiting.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleManualConvert(waiting.id)}
                        disabled={!canConvert}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          canConvert
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <ArrowRight className="w-4 h-4" />
                        手动转正
                      </button>
                      <button
                        onClick={() => handleCancel(waiting.id)}
                        className="px-6 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        取消候补
                      </button>
                      <button
                        onClick={() => setShowDetail(waiting)}
                        className="px-6 py-2 border border-[#0C4A6E]/30 text-[#0C4A6E] rounded-lg text-sm font-medium hover:bg-[#0C4A6E]/5 transition-colors"
                      >
                        详情
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0C4A6E]">候补详情</h2>
              <button
                onClick={() => setShowDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#64748B] mb-1">候补编号</div>
                  <div className="font-medium text-[#0C4A6E]">{showDetail.waitingNo}</div>
                </div>
                <div>
                  <div className="text-sm text-[#64748B] mb-1">状态</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(showDetail.status)}`}>
                    {getStatusLabel(showDetail.status)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-[#64748B] mb-1">乘客姓名</div>
                <div className="font-medium text-[#0C4A6E]">{showDetail.touristName}</div>
              </div>

              <div>
                <div className="text-sm text-[#64748B] mb-1">联系电话</div>
                <div className="font-medium text-[#0C4A6E]">{maskPhone(showDetail.phone)}</div>
              </div>

              <div>
                <div className="text-sm text-[#64748B] mb-1">候补票数</div>
                <div className="font-medium text-[#0C4A6E]">{showDetail.ticketCount} 张</div>
              </div>

              {showDetail.groupCount && (
                <div>
                  <div className="text-sm text-[#64748B] mb-1">团体人数</div>
                  <div className="font-medium text-purple-600">{showDetail.groupCount} 人</div>
                </div>
              )}

              {showDetail.insuranceId && (
                <div>
                  <div className="text-sm text-[#64748B] mb-1">保险要求</div>
                  <div className="font-medium text-green-600">需要购买保险</div>
                </div>
              )}

              <div>
                <div className="text-sm text-[#64748B] mb-1">申请时间</div>
                <div className="font-medium text-[#0C4A6E]">{new Date(showDetail.createdAt).toLocaleString()}</div>
              </div>

              {showDetail.convertedOrderId && (
                <div>
                  <div className="text-sm text-[#64748B] mb-1">转正订单</div>
                  <div className="font-medium text-green-600">{showDetail.convertedOrderId}</div>
                </div>
              )}

              {showDetail.remark && (
                <div>
                  <div className="text-sm text-[#64748B] mb-1">备注</div>
                  <div className="font-medium text-[#0C4A6E]">{showDetail.remark}</div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowDetail(null)}
                className="w-full py-3 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
