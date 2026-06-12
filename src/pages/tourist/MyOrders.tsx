import { useState } from "react";
import { ClipboardList, Ship, Clock, Ticket, RotateCcw } from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import type { Order } from "@/types";

type FilterTab = "all" | "pending" | "boarded" | "refunded";

const statusConfig: Record<
  Order["status"],
  { label: string; bgClass: string; textClass: string }
> = {
  pending: { label: "待登船", bgClass: "bg-[#0C4A6E]/10", textClass: "text-[#0C4A6E]" },
  boarded: { label: "已登船", bgClass: "bg-green-100", textClass: "text-green-700" },
  refunded: { label: "已退票", bgClass: "bg-[#94A3B8]/10", textClass: "text-[#94A3B8]" },
};

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待登船" },
  { key: "boarded", label: "已登船" },
  { key: "refunded", label: "已退票" },
];

export default function MyOrders() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const orders = useOrderStore((s) => s.orders);
  const refundOrder = useOrderStore((s) => s.refundOrder);
  const schedules = useScheduleStore((s) => s.schedules);
  const ships = useShipStore((s) => s.ships);

  const getSchedule = (scheduleId: string) =>
    schedules.find((s) => s.id === scheduleId);

  const getShipName = (scheduleId: string) => {
    const schedule = getSchedule(scheduleId);
    if (!schedule) return "未知游船";
    return ships.find((s) => s.id === schedule.shipId)?.name ?? "未知游船";
  };

  const getDepartureTime = (scheduleId: string) =>
    getSchedule(scheduleId)?.departureTime ?? "--";

  const filteredOrders =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const handleRefund = (orderId: string) => {
    if (!window.confirm("确认退票？退票后将释放对应座位。")) return;
    try {
      refundOrder(orderId);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "退票失败");
    }
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
                      总价
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
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[#94A3B8]/5 transition-colors hover:bg-[#F0F9FF]"
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0C4A6E]">
                          {order.ticketCount}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#F97316]">
                          ¥{order.totalPrice}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleRefund(order.id)}
                              className="flex items-center gap-1 rounded-lg border border-[#F97316] px-3 py-1 text-xs font-semibold text-[#F97316] transition-colors hover:bg-[#F97316]/10"
                            >
                              <RotateCcw className="h-3 w-3" />
                              退票
                            </button>
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
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border-l-4 border-[#0C4A6E] bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-sm text-[#94A3B8]">
                        {order.id.slice(-8)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mb-1 flex items-center gap-2 text-sm text-[#0C4A6E]">
                      <Ship className="h-4 w-4" />
                      {getShipName(order.scheduleId)}
                    </div>
                    <div className="mb-1 flex items-center gap-2 text-sm text-[#94A3B8]">
                      <Clock className="h-4 w-4" />
                      {getDepartureTime(order.scheduleId)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Ticket className="h-4 w-4 text-[#FBBF24]" />
                        <span className="text-[#0C4A6E]">{order.ticketCount}张</span>
                        <span className="font-semibold text-[#F97316]">
                          ¥{order.totalPrice}
                        </span>
                      </div>
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleRefund(order.id)}
                          className="flex items-center gap-1 rounded-lg border border-[#F97316] px-3 py-1 text-xs font-semibold text-[#F97316] hover:bg-[#F97316]/10"
                        >
                          <RotateCcw className="h-3 w-3" />
                          退票
                        </button>
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
