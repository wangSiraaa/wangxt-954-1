import { useState } from "react";
import { UserCheck, Calendar, Ship, Clock, Users, Anchor } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useShipStore } from "@/store/useShipStore";
import { useBoardingStore } from "@/store/useBoardingStore";

export default function BoardingRegister() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleId, setScheduleId] = useState("");

  const schedules = useScheduleStore((s) => s.getByDate(date));
  const orders = useOrderStore((s) => s.orders);
  const ships = useShipStore((s) => s.ships);
  const boardingRecords = useBoardingStore((s) => s.boardingRecords);
  const markAsBoarded = useOrderStore((s) => s.markAsBoarded);
  const addBoardingRecord = useBoardingStore((s) => s.addBoardingRecord);

  const getShipName = (shipId: string) =>
    ships.find((s) => s.id === shipId)?.name ?? "未知游船";

  const selectedSchedule = schedules.find((s) => s.id === scheduleId);

  const scheduleOrders = scheduleId
    ? orders.filter((o) => o.scheduleId === scheduleId)
    : [];

  const pendingOrders = scheduleOrders.filter((o) => o.status === "pending");

  const boardedCount = scheduleId
    ? boardingRecords.filter((r) => r.scheduleId === scheduleId).length
    : 0;

  const totalOrderCount = scheduleOrders.length;

  const handleBoard = (orderId: string) => {
    try {
      markAsBoarded(orderId);
      addBoardingRecord({ orderId, scheduleId });
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "登记登船失败");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C4A6E]">
            <UserCheck className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0C4A6E]">登船登记</h1>
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
              <option value="">选择班次</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {getShipName(s.shipId)} - {s.departureTime}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!scheduleId ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <Anchor className="mb-4 h-16 w-16" />
            <p className="text-lg">请选择日期和班次</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4 rounded-xl bg-[#0C4A6E] px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                <span className="font-semibold">
                  {selectedSchedule
                    ? getShipName(selectedSchedule.shipId)
                    : "未知"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{selectedSchedule?.departureTime ?? "--"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>
                  已登船{" "}
                  <span className="font-bold text-[#FBBF24]">{boardedCount}</span>
                  /{totalOrderCount}
                </span>
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
                <UserCheck className="mb-4 h-12 w-12" />
                <p>该班次暂无待登船订单</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border-l-4 border-[#0C4A6E] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#0C4A6E]" />
                        <span className="font-semibold text-[#0C4A6E]">
                          {order.touristName}
                        </span>
                      </div>
                      <span className="text-sm text-[#94A3B8]">
                        {order.ticketCount}张票
                      </span>
                      <span className="text-sm text-[#94A3B8]">
                        ¥{order.totalPrice}
                      </span>
                    </div>
                    <button
                      onClick={() => handleBoard(order.id)}
                      className="flex items-center gap-1 rounded-lg bg-[#0C4A6E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0C4A6E]/90"
                    >
                      <UserCheck className="h-4 w-4" />
                      登记登船
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
