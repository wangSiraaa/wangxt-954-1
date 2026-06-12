import { useState, useMemo } from "react";
import { FileText, Calendar, Ship, Clock, Users, Anchor } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useShipStore } from "@/store/useShipStore";
import { useBoardingStore } from "@/store/useBoardingStore";

export default function BoardingRecords() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleId, setScheduleId] = useState("");

  const schedules = useScheduleStore((s) => s.schedules);
  const orders = useOrderStore((s) => s.orders);
  const ships = useShipStore((s) => s.ships);
  const boardingRecords = useBoardingStore((s) => s.boardingRecords);

  const dateSchedules = useMemo(
    () => schedules.filter((s) => s.date === date),
    [schedules, date]
  );

  const getShipName = (shipId: string) =>
    ships.find((s) => s.id === shipId)?.name ?? "未知游船";

  const getSchedule = (id: string) => schedules.find((s) => s.id === id);
  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const filteredRecords = scheduleId
    ? boardingRecords.filter((r) => r.scheduleId === scheduleId)
    : boardingRecords.filter((r) => {
        const schedule = getSchedule(r.scheduleId);
        return schedule?.date === date;
      });

  const enrichedRecords = filteredRecords.map((record) => {
    const order = getOrder(record.orderId);
    const schedule = getSchedule(record.scheduleId);
    const ship = schedule
      ? ships.find((s) => s.id === schedule.shipId)
      : null;
    return {
      ...record,
      touristName: order?.touristName ?? "未知",
      ticketCount: order?.ticketCount ?? 0,
      shipName: ship?.name ?? "未知游船",
      departureTime: schedule?.departureTime ?? "--",
    };
  });

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C4A6E]">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0C4A6E]">登船记录</h1>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#94A3B8]" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setScheduleId("");
              }}
              className="rounded-lg border border-[#94A3B8]/30 px-4 py-2 text-[#0C4A6E] focus:border-[#0C4A6E] focus:outline-none focus:ring-1 focus:ring-[#0C4A6E]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-[#94A3B8]" />
            <select
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              className="rounded-lg border border-[#94A3B8]/30 px-4 py-2 text-[#0C4A6E] focus:border-[#0C4A6E] focus:outline-none focus:ring-1 focus:ring-[#0C4A6E]"
            >
              <option value="">全部班次</option>
              {dateSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {getShipName(s.shipId)} - {s.departureTime}
                </option>
              ))}
            </select>
          </div>
        </div>

        {enrichedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <Anchor className="mb-4 h-16 w-16" />
            <p className="text-lg">暂无登船记录</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full overflow-hidden rounded-xl bg-white shadow-sm">
                <thead>
                  <tr className="border-b border-[#94A3B8]/10 bg-[#0C4A6E]/5">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#0C4A6E]">
                      游客姓名
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
                      登船时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-[#94A3B8]/5 transition-colors hover:bg-[#F0F9FF]"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#0C4A6E]">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-[#0C4A6E]" />
                          {record.touristName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                        <div className="flex items-center gap-1">
                          <Ship className="h-4 w-4 text-[#0C4A6E]" />
                          {record.shipName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-[#94A3B8]" />
                          {record.departureTime}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                        {record.ticketCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {new Date(record.boardedAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {enrichedRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border-l-4 border-[#0C4A6E] bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-[#0C4A6E]">
                      <Users className="h-4 w-4" />
                      {record.touristName}
                    </div>
                    <span className="text-xs text-[#94A3B8]">
                      {new Date(record.boardedAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                    <div className="flex items-center gap-1">
                      <Ship className="h-4 w-4" />
                      {record.shipName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {record.departureTime}
                    </div>
                    <span>{record.ticketCount}张</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
