import { useState, useMemo } from "react";
import { Calendar, Ship, Clock, Ticket, Users, AlertTriangle, X, Minus, Plus, Info, XCircle, CheckCircle, AlertCircle, Shield, RefreshCcw, CreditCard } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import type { BlockReason } from "@/types";

const blockReasonLabels: Record<BlockReason, string> = {
  "group-split-not-allowed": "团体票不可拆分",
  "insufficient-life-jackets": "救生衣不足",
  "crew-qualification-mismatch": "船员资质不匹配",
  "maintenance-delay": "船只检修延迟",
  "terminal-capacity-exceeded": "码头容量超限",
  "weather-condition": "天气条件不适航",
  "tide-abnormal": "潮汐异常",
  "schedule-cancelled": "班次已取消",
  "inspection-expired": "安检过期",
};

const blockReasonIcons: Record<BlockReason, any> = {
  "group-split-not-allowed": Users,
  "insufficient-life-jackets": Shield,
  "crew-qualification-mismatch": Shield,
  "maintenance-delay": Clock,
  "terminal-capacity-exceeded": Users,
  "weather-condition": AlertTriangle,
  "tide-abnormal": AlertTriangle,
  "schedule-cancelled": XCircle,
  "inspection-expired": AlertCircle,
};

export default function ScheduleQuery() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalScheduleId, setModalScheduleId] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [touristName, setTouristName] = useState("");
  const [showBreakdown, setShowBreakdown] = useState<string | null>(null);

  const allSchedules = useScheduleStore((s) => s.schedules);
  const ships = useShipStore((s) => s.ships);
  const stopDays = useStopDayStore((s) => s.stopDays);
  const addOrder = useOrderStore((s) => s.addOrder);
  const { validateTicketPurchase } = useOrderStore();
  const { getAvailableSeatsBreakdown } = useScheduleStore();
  const { routes, docks } = useBaseStore();
  const waitingLists = useWaitingListStore((s) => s.waitingLists);

  const schedules = useMemo(() => {
    return allSchedules.filter((s) => s.date === date && s.status !== "cancelled");
  }, [allSchedules, date]);

  const isStopDay = useMemo(() => {
    return stopDays.some((d) => d.date === date);
  }, [stopDays, date]);

  const stopDayInfo = useMemo(() => {
    return stopDays.find((d) => d.date === date) || null;
  }, [stopDays, date]);

  const selectedSchedule = schedules.find((s) => s.id === modalScheduleId);
  const selectedShip = selectedSchedule
    ? ships.find((sh) => sh.id === selectedSchedule.shipId)
    : null;

  const getShipName = (shipId: string) =>
    ships.find((s) => s.id === shipId)?.name ?? "未知游船";

  const getRouteName = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return "未知航线";
    const startDock = docks.find((d) => d.id === route.startDockId);
    const endDock = docks.find((d) => d.id === route.endDockId);
    return `${startDock?.name || "??"} → ${endDock?.name || "??"}`;
  };

  const handlePurchase = () => {
    if (!selectedSchedule || !touristName.trim()) return;
    
    const validation = validateTicketPurchase(selectedSchedule.id, ticketCount);
    if (!validation.valid) {
      const errorMsg = validation.errors.length > 0 
        ? validation.errors.join("\n") 
        : "购票失败，请稍后重试";
      window.alert(errorMsg);
      return;
    }
    
    try {
      addOrder({
        scheduleId: selectedSchedule.id,
        touristName: touristName.trim(),
        ticketCount,
        totalPrice: selectedSchedule.ticketPrice * ticketCount,
        status: "pending",
      });
      window.alert("购票成功！");
      setModalScheduleId(null);
      setTouristName("");
      setTicketCount(1);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "购票失败");
    }
  };

  const getBlockReasonLabel = (reason: BlockReason) => blockReasonLabels[reason] || reason;
  const getBlockReasonIcon = (reason: BlockReason) => {
    const Icon = blockReasonIcons[reason] || AlertTriangle;
    return <Icon className="w-4 h-4" />;
  };

  const openModal = (scheduleId: string) => {
    setTicketCount(1);
    setTouristName("");
    setModalScheduleId(scheduleId);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C4A6E]">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0C4A6E]">班次查询</h1>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
          <Calendar className="h-5 w-5 text-[#94A3B8]" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[#94A3B8]/30 px-4 py-2 text-[#0C4A6E] focus:border-[#0C4A6E] focus:outline-none focus:ring-1 focus:ring-[#0C4A6E]"
          />
        </div>

        {isStopDay && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-[#F97316] bg-[#F97316]/10 p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-[#F97316]" />
            <div>
              <p className="text-lg font-bold text-[#F97316]">该日停航，暂停售票</p>
              {stopDayInfo?.reason && (
                <p className="text-sm text-[#F97316]/80">{stopDayInfo.reason}</p>
              )}
            </div>
          </div>
        )}

        {schedules.length === 0 && !isStopDay && (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <Ship className="mb-4 h-16 w-16" />
            <p className="text-lg">该日暂无班次安排</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const soldOut = schedule.availableSeats === 0;
            const seatsBreakdown = getAvailableSeatsBreakdown(schedule.id);
            const ticketValidation = validateTicketPurchase(schedule.id, 1);
            const isBlocked = !ticketValidation.valid;
            const hasWarnings = ticketValidation.warnings && ticketValidation.warnings.length > 0;
            
            return (
              <div
                key={schedule.id}
                className={`rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md ${
                  soldOut
                    ? "border-l-4 border-[#94A3B8] opacity-60"
                    : isBlocked
                    ? "border-l-4 border-red-500"
                    : hasWarnings
                    ? "border-l-4 border-yellow-500"
                    : "border-l-4 border-[#0C4A6E]"
                }`}
              >
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ship className={`h-5 w-5 ${soldOut ? "text-[#94A3B8]" : "text-[#0C4A6E]"}`} />
                      <span className={`text-lg font-semibold ${soldOut ? "text-[#94A3B8]" : "text-[#0C4A6E]"}`}>
                        {getShipName(schedule.shipId)}
                      </span>
                    </div>
                    {isBlocked && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        暂停售票
                      </span>
                    )}
                    {!isBlocked && hasWarnings && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        购票须知
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm text-[#94A3B8]">
                    <Clock className="h-4 w-4" />
                    <span>出发时间：{schedule.departureTime}</span>
                  </div>

                  <div className="mb-2 text-xs text-[#64748B]">
                    航线：{getRouteName(schedule.routeId)}
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <Ticket className="h-4 w-4 text-[#FBBF24]" />
                    <span className="font-semibold text-[#F97316]">
                      ¥{schedule.ticketPrice}/张
                    </span>
                  </div>

                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(showBreakdown === schedule.id ? null : schedule.id)}
                      className="flex items-center gap-1 text-xs text-[#0C4A6E] hover:underline"
                    >
                      <Users className="h-3 w-3" />
                      <span>余座 {seatsBreakdown.availableSeats} / {seatsBreakdown.totalCapacity}</span>
                      <Info className="h-3 w-3" />
                    </button>
                    
                    {showBreakdown === schedule.id && (
                      <div className="mt-2 p-3 bg-[#F0F9FF] rounded-lg text-xs space-y-1.5">
                        <div className="font-medium text-[#0C4A6E] mb-2">余票构成明细</div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">总容量：</span>
                          <span className="font-medium text-[#0C4A6E]">{seatsBreakdown.totalCapacity} 座</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">已售票：</span>
                          <span className="font-medium text-blue-600">{seatsBreakdown.soldSeats} 座</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">候补锁定：</span>
                          <span className="font-medium text-purple-600">{seatsBreakdown.waitingLockedSeats} 座</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">改签锁定：</span>
                          <span className="font-medium text-orange-600">{seatsBreakdown.rescheduledLockedSeats} 座</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">已登船：</span>
                          <span className="font-medium text-green-600">{seatsBreakdown.boardedSeats} 座</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">退票释放：</span>
                          <span className="font-medium text-gray-600">{seatsBreakdown.refundReleasedSeats} 座</span>
                        </div>
                        <div className="border-t border-blue-200 my-1 pt-1 flex justify-between">
                          <span className="text-[#64748B] font-medium">可用余票：</span>
                          <span className="font-bold text-[#0C4A6E]">{seatsBreakdown.availableSeats} 座</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-1">
                          计算公式：总容量 - 已售票 - 候补锁定 - 改签锁定 - 已登船 + 退票释放 = 可用余票
                        </div>
                      </div>
                    )}
                  </div>

                  {isBlocked && ticketValidation.blockedReason && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-700">
                          <strong>售票阻断：</strong>
                          {getBlockReasonLabel(ticketValidation.blockedReason)}
                        </div>
                      </div>
                      {ticketValidation.errors && ticketValidation.errors.length > 0 && (
                        <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                          {ticketValidation.errors.slice(0, 2).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {!isBlocked && hasWarnings && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-700">
                          <strong>购票须知：</strong>
                          {ticketValidation.warnings[0]}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={soldOut || isStopDay || isBlocked}
                    onClick={() => openModal(schedule.id)}
                    className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                      soldOut || isStopDay || isBlocked
                        ? "cursor-not-allowed bg-[#94A3B8]/20 text-[#94A3B8]"
                        : "bg-[#0C4A6E] text-white hover:bg-[#0C4A6E]/90"
                    }`}
                  >
                    {soldOut ? "已售罄" : isBlocked ? "暂停售票" : isStopDay ? "停航中" : "购票"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalScheduleId && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0C4A6E]">购买船票</h2>
              <button
                onClick={() => setModalScheduleId(null)}
                className="rounded-full p-1 hover:bg-[#F0F9FF]"
              >
                <X className="h-5 w-5 text-[#94A3B8]" />
              </button>
            </div>

            {(() => {
              const seatsBreakdown = getAvailableSeatsBreakdown(selectedSchedule.id);
              const ticketValidation = validateTicketPurchase(selectedSchedule.id, ticketCount);
              const canPurchase = ticketValidation.valid && touristName.trim();
              
              return (
                <>
                  <div className="mb-4 p-4 bg-[#F0F9FF] rounded-xl">
                    <h3 className="text-sm font-semibold text-[#0C4A6E] mb-3">班次信息</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[#64748B]">游船：</span>
                        <span className="text-[#0C4A6E] font-medium">{selectedShip?.name ?? "未知"}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">航线：</span>
                        <span className="text-[#0C4A6E] font-medium">{getRouteName(selectedSchedule.routeId)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">时间：</span>
                        <span className="text-[#0C4A6E] font-medium">{selectedSchedule.departureTime}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">票价：</span>
                        <span className="text-[#F97316] font-bold">¥{selectedSchedule.ticketPrice}/张</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <h4 className="text-xs font-semibold text-[#0C4A6E] mb-2">余票构成明细</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex justify-between bg-white p-2 rounded">
                          <span className="text-[#64748B]">总容量</span>
                          <span className="font-medium text-[#0C4A6E]">{seatsBreakdown.totalCapacity}</span>
                        </div>
                        <div className="flex justify-between bg-white p-2 rounded">
                          <span className="text-[#64748B]">已售票</span>
                          <span className="font-medium text-blue-600">{seatsBreakdown.soldSeats}</span>
                        </div>
                        <div className="flex justify-between bg-white p-2 rounded">
                          <span className="text-[#64748B]">候补锁定</span>
                          <span className="font-medium text-purple-600">{seatsBreakdown.waitingLockedSeats}</span>
                        </div>
                        <div className="flex justify-between bg-white p-2 rounded">
                          <span className="text-[#64748B]">改签锁定</span>
                          <span className="font-medium text-orange-600">{seatsBreakdown.rescheduledLockedSeats}</span>
                        </div>
                        <div className="flex justify-between bg-white p-2 rounded">
                          <span className="text-[#64748B]">已登船</span>
                          <span className="font-medium text-green-600">{seatsBreakdown.boardedSeats}</span>
                        </div>
                        <div className="flex justify-between bg-[#0C4A6E] p-2 rounded">
                          <span className="text-white/80">可用余票</span>
                          <span className="font-bold text-white">{seatsBreakdown.availableSeats}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!ticketValidation.valid && ticketValidation.blockedReason && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-red-800 mb-1">
                            无法购票：{getBlockReasonLabel(ticketValidation.blockedReason)}
                          </h4>
                          {ticketValidation.errors && ticketValidation.errors.length > 0 && (
                            <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                              {ticketValidation.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {ticketValidation.valid && ticketValidation.warnings && ticketValidation.warnings.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-yellow-800 mb-1">购票须知</h4>
                          <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                            {ticketValidation.warnings.map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#0C4A6E]">
                        购票数量
                        <span className="ml-2 text-xs text-[#64748B] font-normal">
                          (最多可购 {Math.min(seatsBreakdown.availableSeats, 10)} 张)
                        </span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#94A3B8]/30 hover:bg-[#F0F9FF] transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center text-xl font-bold text-[#0C4A6E]">
                          {ticketCount}
                        </span>
                        <button
                          onClick={() =>
                            setTicketCount(
                              Math.min(Math.min(seatsBreakdown.availableSeats, 10), ticketCount + 1)
                            )
                          }
                          disabled={ticketCount >= Math.min(seatsBreakdown.availableSeats, 10)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#94A3B8]/30 hover:bg-[#F0F9FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {ticketValidation.valid && ticketCount > seatsBreakdown.availableSeats && (
                        <p className="text-xs text-red-600 mt-2">
                          余票不足，仅剩余 {seatsBreakdown.availableSeats} 张
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#0C4A6E]">
                        游客姓名
                      </label>
                      <input
                        type="text"
                        value={touristName}
                        onChange={(e) => setTouristName(e.target.value)}
                        placeholder="请输入游客姓名"
                        className="w-full rounded-lg border border-[#94A3B8]/30 px-4 py-2.5 text-[#0C4A6E] placeholder:text-[#94A3B8] focus:border-[#0C4A6E] focus:outline-none focus:ring-1 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-[#64748B]">订单合计</span>
                        <div className="text-xs text-[#94A3B8]">
                          {selectedSchedule.ticketPrice} × {ticketCount} 张
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-[#F97316]">
                          ¥{selectedSchedule.ticketPrice * ticketCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalScheduleId(null)}
                      className="flex-1 rounded-lg py-3 text-sm font-semibold border border-[#94A3B8]/30 text-[#64748B] hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={!canPurchase}
                      className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-colors ${
                        canPurchase
                          ? "bg-[#0C4A6E] text-white hover:bg-[#0C4A6E]/90"
                          : "cursor-not-allowed bg-[#94A3B8]/20 text-[#94A3B8]"
                      }`}
                    >
                      {!ticketValidation.valid ? "暂不可购票" : !touristName.trim() ? "请输入姓名" : "确认购票"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
