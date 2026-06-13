import { useState, useMemo } from "react";
import { Calendar, Clock, Ship, Anchor, Waves, User, AlertTriangle, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useCrewStore } from "@/store/useCrewStore";
import type { Schedule, Ship, Route, Dock } from "@/types";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getShiftLabel(shift: string) {
  const labels: Record<string, string> = {
    morning: "早班",
    afternoon: "中班",
    evening: "晚班",
  };
  return labels[shift] || shift;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    scheduled: "bg-green-100 text-green-700",
    "in-progress": "bg-blue-100 text-blue-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
    available: "bg-green-100 text-green-700",
    maintenance: "bg-yellow-100 text-yellow-700",
    "in-operation": "bg-blue-100 text-blue-700",
    docked: "bg-gray-100 text-gray-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "计划中",
    "in-progress": "进行中",
    completed: "已完成",
    cancelled: "已取消",
    available: "可用",
    maintenance: "检修中",
    "in-operation": "运营中",
    docked: "停泊中",
  };
  return labels[status] || status;
}

export default function DispatcherCalendar() {
  const { schedules, getByDate, calculateAvailableSeats } = useScheduleStore();
  const { ships, getShipTypeInfo } = useShipStore();
  const { isStopDay, getByDate: getStopDayByDate } = useStopDayStore();
  const { routes, docks, getTideByDate } = useBaseStore();
  const { getByDate: getCrewByDate } = useCrewStore();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const daySchedules = getByDate(selectedDate);
  const dayTide = getTideByDate(selectedDate);
  const dayCrew = getCrewByDate(selectedDate);
  const stopDayInfo = getStopDayByDate(selectedDate);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDay]);

  const routeMap = useMemo(() => {
    const map: Record<string, Route> = {};
    routes.forEach((r) => (map[r.id] = r));
    return map;
  }, [routes]);

  const dockMap = useMemo(() => {
    const map: Record<string, Dock> = {};
    docks.forEach((d) => (map[d.id] = d));
    return map;
  }, [docks]);

  const shipMap = useMemo(() => {
    const map: Record<string, Ship> = {};
    ships.forEach((s) => (map[s.id] = s));
    return map;
  }, [ships]);

  const getRouteName = (routeId: string) => routeMap[routeId]?.name || "未知航线";
  const getDockName = (dockId: string) => dockMap[dockId]?.name || "未知码头";
  const getShipName = (shipId: string) => shipMap[shipId]?.name || "未知船只";

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else setCalMonth(calMonth + 1);
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(formatDate(calYear, calMonth, day));
    setSelectedSchedule(null);
  };

  const getDayStats = (day: number) => {
    const dateStr = formatDate(calYear, calMonth, day);
    const dayScheds = schedules.filter((s) => s.date === dateStr && s.status !== "cancelled");
    const cancelled = schedules.filter((s) => s.date === dateStr && s.status === "cancelled");
    return { total: dayScheds.length, cancelled: cancelled.length };
  };

  const getShipCrew = (shipId: string) => {
    return dayCrew.filter((c) => c.shipId === shipId && c.status !== "cancelled");
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">调度日历</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-[#0C4A6E]">
                {calYear}年{calMonth + 1}月
              </span>
              <button onClick={nextMonth} className="p-2 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#94A3B8] mb-1">
              {weekdayLabels.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                const dateStr = formatDate(calYear, calMonth, day);
                const selected = dateStr === selectedDate;
                const stopDay = isStopDay(dateStr);
                const stats = getDayStats(day);
                const tide = getTideByDate(dateStr);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`relative w-full aspect-square text-sm rounded-lg flex flex-col items-center justify-center transition-colors ${
                      selected
                        ? "bg-[#0C4A6E] text-white"
                        : stopDay
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "text-[#0C4A6E] hover:bg-[#0C4A6E]/10"
                    }`}
                  >
                    <span className="font-medium">{day}</span>
                    {stats.total > 0 && !selected && (
                      <span className="text-xs mt-0.5">{stats.total}班</span>
                    )}
                    {stats.cancelled > 0 && !selected && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    {tide && !tide.isSailable && !selected && (
                      <span className="absolute bottom-0.5 left-0.5 w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-[#94A3B8]/20 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#FBBF24] rounded-full" />
                <span className="text-[#64748B]">有班次</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-[#64748B]">有取消</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-[#64748B]">潮汐限制</span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0C4A6E] flex items-center gap-2">
                <Info className="w-5 h-5" />
                {selectedDate} 概览
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F0F9FF] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="w-5 h-5 text-[#0C4A6E]" />
                  <span className="text-sm text-[#64748B]">计划班次</span>
                </div>
                <div className="text-2xl font-bold text-[#0C4A6E]">
                  {daySchedules.filter((s) => s.status !== "cancelled").length}
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-[#64748B]">取消班次</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {daySchedules.filter((s) => s.status === "cancelled").length}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-[#64748B]">可用船只</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {ships.filter((s) => s.status === "available").length}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-[#64748B]">在岗船员</span>
                </div>
                <div className="text-2xl font-bold text-yellow-700">
                  {new Set(dayCrew.filter((c) => c.status !== "cancelled").map((c) => c.captainId)).size}
                </div>
              </div>
            </div>

            {stopDayInfo && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-700">停航通知</div>
                    <div className="text-sm text-red-600 mt-1">
                      原因：{stopDayInfo.reason}
                    </div>
                    <div className="text-sm text-red-600">
                      类型：{stopDayInfo.type === "weather" ? "天气原因" : stopDayInfo.type === "tide" ? "潮汐原因" : stopDayInfo.type === "emergency" ? "紧急停航" : "计划停航"}
                    </div>
                    {stopDayInfo.affectedRoutes && stopDayInfo.affectedRoutes.length > 0 && (
                      <div className="text-sm text-red-600">
                        影响航线：{stopDayInfo.affectedRoutes.map((id) => getRouteName(id)).join("、")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {dayTide && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Waves className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-700 flex items-center gap-2">
                      潮汐信息
                      {!dayTide.isSailable && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          不可通航
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-xs text-[#64748B]">高潮时间</div>
                        <div className="text-sm text-[#0C4A6E] font-medium">
                          {dayTide.highTideTimes.join("、") || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B]">低潮时间</div>
                        <div className="text-sm text-[#0C4A6E] font-medium">
                          {dayTide.lowTideTimes.join("、") || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B]">水位范围</div>
                        <div className="text-sm text-[#0C4A6E] font-medium">
                          {dayTide.minWaterLevel}m - {dayTide.maxWaterLevel}m
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
            <h2 className="text-lg font-semibold text-[#0C4A6E] flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              班次详情
            </h2>

            {daySchedules.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8]">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>当日暂无班次</p>
              </div>
            ) : (
              <div className="space-y-3">
                {daySchedules.map((schedule) => {
                  const ship = shipMap[schedule.shipId];
                  const route = routeMap[schedule.routeId];
                  const shipType = ship ? getShipTypeInfo(ship.shipTypeId) : null;
                  const crew = getShipCrew(schedule.shipId);
                  const availableSeats = calculateAvailableSeats(schedule.id);
                  const isSelected = selectedSchedule?.id === schedule.id;

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(isSelected ? null : schedule)}
                      className={`rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#0C4A6E] bg-[#F0F9FF]"
                          : "border-[#94A3B8]/20 bg-white hover:border-[#0C4A6E]/50"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                            schedule.status === "cancelled" ? "bg-red-100" : "bg-[#0C4A6E]/10"
                          }`}>
                            <Ship className={`w-6 h-6 ${schedule.status === "cancelled" ? "text-red-500" : "text-[#0C4A6E]"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-[#0C4A6E]">
                                {getShipName(schedule.shipId)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                                {getStatusLabel(schedule.status)}
                              </span>
                              {shipType && (
                                <span className="text-xs bg-[#F0F9FF] text-[#0C4A6E] px-2 py-0.5 rounded">
                                  {shipType.name} · {shipType.capacity}座
                                </span>
                              )}
                            </div>

                            {route && (
                              <div className="flex items-center gap-2 text-sm text-[#64748B] mb-2">
                                <Anchor className="w-4 h-4" />
                                <span>{getDockName(route.startDockId)}</span>
                                <span className="text-[#94A3B8]">→</span>
                                <span>{getDockName(route.endDockId)}</span>
                                <span className="text-[#94A3B8]">|</span>
                                <span>{route.name}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              <span className="flex items-center gap-1 text-[#64748B]">
                                <Clock className="w-4 h-4" />
                                {schedule.departureTime} - {schedule.arrivalTime}
                              </span>
                              <span className="text-[#F97316] font-medium">
                                ¥{schedule.ticketPrice}
                              </span>
                              <span className="text-[#64748B]">
                                余票 {availableSeats}/{schedule.totalSeats}
                              </span>
                              {schedule.tideWindowId && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                  潮汐窗口
                                </span>
                              )}
                            </div>

                            <div className="mt-2 h-1.5 bg-[#94A3B8]/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  availableSeats === 0
                                    ? "bg-red-500"
                                    : availableSeats <= schedule.totalSeats * 0.2
                                    ? "bg-yellow-500"
                                    : "bg-[#FBBF24]"
                                }`}
                                style={{ width: `${(availableSeats / schedule.totalSeats) * 100}%` }}
                              />
                            </div>

                            {crew.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#94A3B8]/10">
                                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                                  <User className="w-4 h-4" />
                                  <span>船员排班：</span>
                                  {crew.map((c, i) => (
                                    <span key={c.id} className="text-[#0C4A6E]">
                                      {i > 0 && "、"}
                                      {getShiftLabel(c.shift)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {schedule.status === "cancelled" && schedule.cancellationReason && (
                              <div className="mt-3 pt-3 border-t border-red-100">
                                <div className="text-sm text-red-600">
                                  取消原因：{schedule.cancellationReason}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {dayCrew.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
              <h2 className="text-lg font-semibold text-[#0C4A6E] flex items-center gap-2 mb-4">
                <User className="w-5 h-5" />
                船员排班
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dayCrew.map((crew) => (
                  <div key={crew.id} className="bg-[#F8FAFC] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-[#0C4A6E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#0C4A6E] text-sm truncate">
                          {getShipName(crew.shipId)}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {getShiftLabel(crew.shift)} · {getStatusLabel(crew.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
            <h2 className="text-lg font-semibold text-[#0C4A6E] flex items-center gap-2 mb-4">
              <Ship className="w-5 h-5" />
              船只状态
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ships.map((ship) => {
                const shipType = getShipTypeInfo(ship.shipTypeId);
                const todaySchedule = daySchedules.find((s) => s.shipId === ship.id && s.status !== "cancelled");
                return (
                  <div key={ship.id} className="bg-[#F8FAFC] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        ship.status === "available" ? "bg-green-100" : ship.status === "maintenance" ? "bg-yellow-100" : "bg-blue-100"
                      }`}>
                        <Ship className={`w-5 h-5 ${
                          ship.status === "available" ? "text-green-600" : ship.status === "maintenance" ? "text-yellow-600" : "text-blue-600"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#0C4A6E] truncate">{ship.name}</div>
                        <div className="text-xs text-[#64748B]">
                          {shipType?.name || "未知船型"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ship.status)}`}>
                        {getStatusLabel(ship.status)}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {ship.capacity}座
                      </span>
                    </div>
                    {todaySchedule && (
                      <div className="mt-2 pt-2 border-t border-[#94A3B8]/10 text-xs text-[#64748B]">
                        今日班次：{todaySchedule.departureTime}
                      </div>
                    )}
                    {ship.currentDockId && (
                      <div className="text-xs text-[#64748B] mt-1">
                        当前码头：{getDockName(ship.currentDockId)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
