import { useState } from "react";
import { Calendar, Ship, Clock, Ticket, Users, AlertTriangle, X, Minus, Plus } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useOrderStore } from "@/store/useOrderStore";

export default function ScheduleQuery() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalScheduleId, setModalScheduleId] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [touristName, setTouristName] = useState("");

  const schedules = useScheduleStore((s) => s.getByDate(date));
  const ships = useShipStore((s) => s.ships);
  const isStopDay = useStopDayStore((s) => s.isStopDay(date));
  const addOrder = useOrderStore((s) => s.addOrder);

  const selectedSchedule = schedules.find((s) => s.id === modalScheduleId);
  const selectedShip = selectedSchedule
    ? ships.find((sh) => sh.id === selectedSchedule.shipId)
    : null;

  const getShipName = (shipId: string) =>
    ships.find((s) => s.id === shipId)?.name ?? "未知游船";

  const handlePurchase = () => {
    if (!selectedSchedule || !touristName.trim()) return;
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

  const openModal = (scheduleId: string) => {
    setTicketCount(1);
    setTouristName("");
    setModalScheduleId(scheduleId);
  };

  const stopDayInfo = useStopDayStore((s) =>
    s.stopDays.find((d) => d.date === date)
  );

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
            return (
              <div
                key={schedule.id}
                className={`rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md ${
                  soldOut
                    ? "border-l-4 border-[#94A3B8] opacity-60"
                    : "border-l-4 border-[#0C4A6E]"
                }`}
              >
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Ship className={`h-5 w-5 ${soldOut ? "text-[#94A3B8]" : "text-[#0C4A6E]"}`} />
                    <span className={`text-lg font-semibold ${soldOut ? "text-[#94A3B8]" : "text-[#0C4A6E]"}`}>
                      {getShipName(schedule.shipId)}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm text-[#94A3B8]">
                    <Clock className="h-4 w-4" />
                    <span>出发时间：{schedule.departureTime}</span>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <Ticket className="h-4 w-4 text-[#FBBF24]" />
                    <span className="font-semibold text-[#F97316]">
                      ¥{schedule.ticketPrice}/张
                    </span>
                  </div>

                  <div className="mb-4 flex items-center gap-2 text-sm text-[#94A3B8]">
                    <Users className="h-4 w-4" />
                    <span>
                      余座 {schedule.availableSeats} / {schedule.totalSeats}
                    </span>
                  </div>

                  <button
                    disabled={soldOut || isStopDay}
                    onClick={() => openModal(schedule.id)}
                    className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                      soldOut || isStopDay
                        ? "cursor-not-allowed bg-[#94A3B8]/20 text-[#94A3B8]"
                        : "bg-[#0C4A6E] text-white hover:bg-[#0C4A6E]/90"
                    }`}
                  >
                    {soldOut ? "已售罄" : "购票"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalScheduleId && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0C4A6E]">购买船票</h2>
              <button
                onClick={() => setModalScheduleId(null)}
                className="rounded-full p-1 hover:bg-[#F0F9FF]"
              >
                <X className="h-5 w-5 text-[#94A3B8]" />
              </button>
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 rounded-xl bg-[#F0F9FF] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[#94A3B8]">班次信息</h3>
                <p className="mb-1 text-[#0C4A6E]">
                  <span className="font-semibold">游船：</span>
                  {selectedShip?.name ?? "未知"}
                </p>
                <p className="mb-1 text-[#0C4A6E]">
                  <span className="font-semibold">时间：</span>
                  {selectedSchedule.departureTime}
                </p>
                <p className="mb-1 text-[#0C4A6E]">
                  <span className="font-semibold">票价：</span>
                  <span className="text-[#F97316]">¥{selectedSchedule.ticketPrice}</span>
                </p>
                <p className="text-[#0C4A6E]">
                  <span className="font-semibold">余座：</span>
                  {selectedSchedule.availableSeats}/{selectedSchedule.totalSeats}
                </p>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0C4A6E]">
                    购票数量
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#94A3B8]/30 hover:bg-[#F0F9FF]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-lg font-semibold text-[#0C4A6E]">
                      {ticketCount}
                    </span>
                    <button
                      onClick={() =>
                        setTicketCount(
                          Math.min(selectedSchedule.availableSeats, ticketCount + 1)
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#94A3B8]/30 hover:bg-[#F0F9FF]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0C4A6E]">
                    游客姓名
                  </label>
                  <input
                    type="text"
                    value={touristName}
                    onChange={(e) => setTouristName(e.target.value)}
                    placeholder="请输入姓名"
                    className="w-full rounded-lg border border-[#94A3B8]/30 px-3 py-2 text-[#0C4A6E] placeholder:text-[#94A3B8] focus:border-[#0C4A6E] focus:outline-none focus:ring-1 focus:ring-[#0C4A6E]"
                  />
                </div>

                <div className="rounded-lg bg-[#F0F9FF] p-3 text-center">
                  <span className="text-sm text-[#94A3B8]">合计：</span>
                  <span className="text-2xl font-bold text-[#F97316]">
                    ¥{selectedSchedule.ticketPrice * ticketCount}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={!touristName.trim()}
              className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
                touristName.trim()
                  ? "bg-[#0C4A6E] text-white hover:bg-[#0C4A6E]/90"
                  : "cursor-not-allowed bg-[#94A3B8]/20 text-[#94A3B8]"
              }`}
            >
              确认购票
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
