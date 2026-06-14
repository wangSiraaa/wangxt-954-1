import { useState, useMemo } from "react";
import { LayoutGrid, Calendar, Ship, Ticket, AlertCircle, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useShipStore } from "@/store/useShipStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useWaitingListStore } from "@/store/useWaitingListStore";
import type { Schedule, Route } from "@/types";

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getSeatStatusColor(available: number, total: number) {
  const ratio = available / total;
  if (available === 0) return "bg-red-500";
  if (ratio <= 0.2) return "bg-yellow-500";
  if (ratio <= 0.5) return "bg-[#FBBF24]";
  return "bg-green-500";
}

function getSeatStatusText(available: number, total: number) {
  const ratio = available / total;
  if (available === 0) return { text: "售罄", color: "text-red-600" };
  if (ratio <= 0.2) return { text: "紧张", color: "text-yellow-600" };
  if (ratio <= 0.5) return { text: "充足", color: "text-[#F97316]" };
  return { text: "充裕", color: "text-green-600" };
}

export default function SeatMatrix() {
  const { calculateAvailableSeats, getByDateRange } = useScheduleStore();
  const { routes, docks, getTideByDate } = useBaseStore();
  const { ships, getShipTypeInfo } = useShipStore();
  const { isStopDay, getByDate: getStopDayByDate } = useStopDayStore();
  const { getByScheduleId } = useWaitingListStore();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"week" | "matrix">("matrix");

  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }, [startDate]);

  const dateStrings = useMemo(() => dateRange.map((d) => formatDate(d)), [dateRange]);

  const filteredSchedules = useMemo(() => {
    const startStr = dateStrings[0];
    const endStr = dateStrings[dateStrings.length - 1];
    let scheds = getByDateRange(startStr, endStr).filter((s) => s.status !== "cancelled");
    if (selectedRouteId !== "all") {
      scheds = scheds.filter((s) => s.routeId === selectedRouteId);
    }
    return scheds.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.departureTime.localeCompare(b.departureTime);
    });
  }, [dateStrings, selectedRouteId, getByDateRange]);

  const routeMap = useMemo(() => {
    const map: Record<string, Route> = {};
    routes.forEach((r) => (map[r.id] = r));
    return map;
  }, [routes]);

  const shipMap = useMemo(() => {
    const map: Record<string, { name: string; shipTypeId?: string }> = {};
    ships.forEach((s) => (map[s.id] = s));
    return map;
  }, [ships]);

  const dockMap = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    docks.forEach((d) => (map[d.id] = d));
    return map;
  }, [docks]);

  const getRouteName = (id: string) => routeMap[id]?.name || "未知航线";
  const getShipName = (id: string) => shipMap[id]?.name || "未知船只";
  const getDockName = (id: string) => dockMap[id]?.name || "未知码头";

  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, Schedule[]>> = {};
    routes.forEach((route) => {
      data[route.id] = {};
      dateStrings.forEach((date) => {
        data[route.id][date] = filteredSchedules.filter(
          (s) => s.routeId === route.id && s.date === date
        );
      });
    });
    return data;
  }, [routes, dateStrings, filteredSchedules]);

  const stats = useMemo(() => {
    let totalSchedules = 0;
    let totalSeats = 0;
    let soldSeats = 0;
    let soldOutCount = 0;
    let waitingCount = 0;

    filteredSchedules.forEach((s) => {
      const available = calculateAvailableSeats(s.id);
      totalSchedules++;
      totalSeats += s.totalSeats;
      soldSeats += s.totalSeats - available;
      if (available === 0) soldOutCount++;
      waitingCount += getByScheduleId(s.id).filter((w) => w.status === "waiting").length;
    });

    return {
      totalSchedules,
      totalSeats,
      soldSeats,
      occupancyRate: totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0,
      soldOutCount,
      waitingCount,
    };
  }, [filteredSchedules, calculateAvailableSeats, getByScheduleId]);

  const prevWeek = () => setStartDate(addDays(startDate, -7));
  const nextWeek = () => setStartDate(addDays(startDate, 7));

  const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">余票矩阵</h1>
      </div>

      <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-2 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-[#0C4A6E] min-w-[200px] text-center">
              {dateStrings[0]} ~ {dateStrings[dateStrings.length - 1]}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#64748B]" />
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] bg-white text-sm"
            >
              <option value="all">全部航线</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#F0F9FF] rounded-lg p-1">
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "matrix"
                  ? "bg-[#0C4A6E] text-white"
                  : "text-[#64748B] hover:text-[#0C4A6E]"
              }`}
            >
              矩阵视图
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "week"
                  ? "bg-[#0C4A6E] text-white"
                  : "text-[#64748B] hover:text-[#0C4A6E]"
              }`}
            >
              列表视图
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="w-4 h-4 text-[#0C4A6E]" />
            <span className="text-xs text-[#64748B]">计划班次</span>
          </div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{stats.totalSchedules}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-4 h-4 text-[#F97316]" />
            <span className="text-xs text-[#64748B]">总座位数</span>
          </div>
          <div className="text-2xl font-bold text-[#F97316]">{stats.totalSeats}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[#64748B]">已售座位</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.soldSeats}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-[#64748B]">上座率</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-[#64748B]">售罄班次</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.soldOutCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-[#64748B]">候补人数</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.waitingCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20 mb-6">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-[#64748B]">充裕</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FBBF24]" />
            <span className="text-[#64748B]">充足</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-[#64748B]">紧张</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[#64748B]">售罄</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-[#64748B]">停航</span>
          </div>
        </div>
      </div>

      {viewMode === "matrix" ? (
        <div className="bg-white rounded-xl border border-[#94A3B8]/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E] sticky left-0 bg-[#F0F9FF] z-10 min-w-[180px]">
                    航线
                  </th>
                  {dateRange.map((date, i) => {
                    const dateStr = dateStrings[i];
                    const stopDay = isStopDay(dateStr);
                    const tide = getTideByDate(dateStr);
                    return (
                      <th
                        key={dateStr}
                        className={`px-4 py-3 text-center text-sm font-semibold min-w-[140px] ${
                          stopDay ? "bg-red-50 text-red-600" : "text-[#0C4A6E]"
                        }`}
                      >
                        <div>{weekdayLabels[date.getDay()]}</div>
                        <div className="text-xs font-normal">
                          {date.getMonth() + 1}/{date.getDate()}
                        </div>
                        {stopDay && (
                          <div className="text-xs text-red-500 mt-1">停航</div>
                        )}
                        {tide && !tide.isSailable && !stopDay && (
                          <div className="text-xs text-yellow-600 mt-1">潮汐限制</div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => {
                  if (selectedRouteId !== "all" && route.id !== selectedRouteId) return null;
                  return (
                    <tr key={route.id} className="border-t border-[#94A3B8]/10">
                      <td className="px-4 py-4 sticky left-0 bg-white z-10">
                        <div className="font-medium text-[#0C4A6E]">{route.name}</div>
                        <div className="text-xs text-[#64748B] mt-1">
                          {getDockName(route.startDockId)} → {getDockName(route.endDockId)}
                        </div>
                        <div className="text-xs text-[#94A3B8]">
                          航程 {route.duration}分钟 · {route.distance}海里
                        </div>
                      </td>
                      {dateStrings.map((dateStr) => {
                        const daySchedules = matrixData[route.id]?.[dateStr] || [];
                        const stopDay = isStopDay(dateStr);
                        const stopDayInfo = getStopDayByDate(dateStr);
                        const isRouteAffected = stopDayInfo?.affectedRoutes?.includes(route.id) ?? true;

                        if (stopDay && isRouteAffected) {
                          return (
                            <td key={dateStr} className="px-4 py-4 text-center">
                              <div className="bg-gray-100 rounded-lg p-3">
                                <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">停航</div>
                              </div>
                            </td>
                          );
                        }

                        if (daySchedules.length === 0) {
                          return (
                            <td key={dateStr} className="px-4 py-4 text-center">
                              <div className="text-xs text-[#94A3B8]">暂无班次</div>
                            </td>
                          );
                        }

                        return (
                          <td key={dateStr} className="px-4 py-4">
                            <div className="space-y-2">
                              {daySchedules.map((s) => {
                                const available = calculateAvailableSeats(s.id);
                                const status = getSeatStatusText(available, s.totalSeats);
                                const waiting = getByScheduleId(s.id).filter(
                                  (w) => w.status === "waiting"
                                ).length;
                                return (
                                  <div
                                    key={s.id}
                                    className="bg-[#F8FAFC] rounded-lg p-3 hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-[#0C4A6E]">
                                        {s.departureTime}
                                      </span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} bg-white`}>
                                        {status.text}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
                                      <span>{getShipName(s.shipId)}</span>
                                      <span className="text-[#F97316]">¥{s.ticketPrice}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-[#94A3B8]/20 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${getSeatStatusColor(available, s.totalSeats)}`}
                                          style={{
                                            width: `${(available / s.totalSeats) * 100}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-[#0C4A6E]">
                                        {available}/{s.totalSeats}
                                      </span>
                                    </div>
                                    {waiting > 0 && (
                                      <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        候补 {waiting} 人
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8]">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>该时段暂无班次</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchedules.map((s) => {
                const available = calculateAvailableSeats(s.id);
                const status = getSeatStatusText(available, s.totalSeats);
                const waiting = getByScheduleId(s.id).filter((w) => w.status === "waiting").length;
                const ship = shipMap[s.shipId];
                const shipType = ship ? getShipTypeInfo(ship.shipTypeId || "") : null;
                const route = routeMap[s.routeId];
                const stopDay = isStopDay(s.date);

                return (
                  <div
                    key={s.id}
                    className={`rounded-xl p-4 border transition-all ${
                      stopDay
                        ? "bg-red-50 border-red-200"
                        : "bg-white border-[#94A3B8]/20 hover:border-[#0C4A6E]/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#0C4A6E]/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-[#0C4A6E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-[#0C4A6E]">{s.date}</span>
                          <span className="text-[#64748B]">{s.departureTime} - {s.arrivalTime}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} bg-white`}>
                            {status.text}
                          </span>
                          {stopDay && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                              停航
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#64748B] mb-2 flex-wrap">
                          <span>{getShipName(s.shipId)}</span>
                          {shipType && <span>· {shipType.name}</span>}
                          <span>·</span>
                          <span>{getRouteName(s.routeId)}</span>
                          {route && (
                            <>
                              <span>·</span>
                              <span>
                                {getDockName(route.startDockId)} → {getDockName(route.endDockId)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[#F97316] font-medium">¥{s.ticketPrice}</span>
                          <span className="text-[#64748B]">
                            余票 {available}/{s.totalSeats}
                          </span>
                          {waiting > 0 && (
                            <span className="text-yellow-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              候补 {waiting} 人
                            </span>
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
      )}
    </div>
  );
}
