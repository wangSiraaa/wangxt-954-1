import { useState, useMemo } from "react";
import { QrCode, User, Calendar, Clock, Ship, CheckCircle, XCircle, Search, Scan, Ticket } from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useBoardingStore } from "@/store/useBoardingStore";
import type { Order } from "@/types";

function maskIdCard(idCard: string) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + "********" + idCard.slice(-4);
}

function getStatusColor(status: string) {
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

function getStatusLabel(status: string) {
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

export default function BoardingVerification() {
  const { orders, getByOrderNo, getByQRCode } = useOrderStore();
  const { schedules } = useScheduleStore();
  const { ships } = useShipStore();
  const { routes, docks } = useBaseStore();
  const { verifyAndBoard, manualBoard, hasBoarded, getBoardingStats } = useBoardingStore();

  const [searchInput, setSearchInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "manual" | "stats">("scan");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todaySchedules = useMemo(() => {
    return schedules.filter((s) => s.date === todayStr && s.status !== "cancelled");
  }, [schedules, todayStr]);

  const todayOrders = useMemo(() => {
    return orders.filter((o) => {
      const schedule = schedules.find((s) => s.id === o.scheduleId);
      return schedule?.date === todayStr && o.status !== "cancelled" && o.status !== "refunded";
    });
  }, [orders, schedules, todayStr]);

  const todayStats = useMemo(() => {
    const stats = getBoardingStats(todayStr);
    return {
      totalOrders: todayOrders.length,
      boardedOrders: todayOrders.filter((o) => o.status === "boarded").length,
      totalPassengers: todayOrders.reduce((sum, o) => sum + o.ticketCount, 0),
      boardedPassengers: stats.totalPassengers,
    };
  }, [todayOrders, getBoardingStats, todayStr]);

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return [];
    const keyword = searchInput.trim().toLowerCase();
    return todayOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(keyword) ||
        o.qrCode.toLowerCase().includes(keyword) ||
        o.touristName.toLowerCase().includes(keyword) ||
        o.passengers.some((p) => p.name.toLowerCase().includes(keyword) || p.idCard.includes(keyword))
    );
  }, [todayOrders, searchInput]);

  const schedule = useMemo(() => {
    if (!selectedOrder) return null;
    return schedules.find((s) => s.id === selectedOrder.scheduleId);
  }, [selectedOrder, schedules]);

  const ship = useMemo(() => {
    if (!schedule) return null;
    return ships.find((s) => s.id === schedule.shipId);
  }, [schedule, ships]);

  const route = useMemo(() => {
    if (!schedule) return null;
    return routes.find((r) => r.id === schedule.routeId);
  }, [schedule, routes]);

  const getDockName = (id: string) => docks.find((d) => d.id === id)?.name || "未知码头";
  const getShipName = (id: string) => ships.find((s) => s.id === id)?.name || "未知船只";

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    const keyword = searchInput.trim();
    let order = getByQRCode(keyword);
    if (!order) {
      order = getByOrderNo(keyword);
    }
    if (order) {
      const orderSchedule = schedules.find((s) => s.id === order.scheduleId);
      if (orderSchedule?.date !== todayStr) {
        setVerificationResult({
          success: false,
          message: "该订单不是今日班次",
        });
        return;
      }
      setSelectedOrder(order);
      setSelectedPassengers(order.passengers.map((p) => p.id));
      setVerificationResult(null);
    } else if (searchResults.length > 0) {
      setSelectedOrder(searchResults[0]);
      setSelectedPassengers(searchResults[0].passengers.map((p) => p.id));
      setVerificationResult(null);
    } else {
      setVerificationResult({
        success: false,
        message: "未找到有效订单",
      });
    }
  };

  const handleVerify = async () => {
    if (!selectedOrder) return;
    try {
      const result = verifyAndBoard(
        selectedOrder.qrCode,
        selectedPassengers,
        "码头工作人员",
        true
      );
      if (result.success) {
        setVerificationResult({
          success: true,
          message: `登船核验成功！已核验 ${selectedPassengers.length} 位乘客`,
        });
        const updated = getByOrderNo(selectedOrder.orderNo);
        if (updated) setSelectedOrder(updated);
      } else {
        setVerificationResult({
          success: false,
          message: result.message || "核验失败",
        });
      }
    } catch (e: unknown) {
      setVerificationResult({
        success: false,
        message: e instanceof Error ? e.message : "核验失败",
      });
    }
  };

  const handleManualBoard = () => {
    if (!selectedOrder) return;
    try {
      manualBoard(selectedOrder.id, selectedPassengers, "码头工作人员");
      setVerificationResult({
        success: true,
        message: `人工登船登记成功！已登记 ${selectedPassengers.length} 位乘客`,
      });
      const updated = getByOrderNo(selectedOrder.orderNo);
      if (updated) setSelectedOrder(updated);
    } catch (e: unknown) {
      setVerificationResult({
        success: false,
        message: e instanceof Error ? e.message : "登记失败",
      });
    }
  };

  const togglePassenger = (passengerId: string) => {
    setSelectedPassengers((prev) =>
      prev.includes(passengerId)
        ? prev.filter((id) => id !== passengerId)
        : [...prev, passengerId]
    );
  };

  const selectAllPassengers = () => {
    if (selectedOrder) {
      setSelectedPassengers(selectedOrder.passengers.map((p) => p.id));
    }
  };

  const isOrderBoarded = selectedOrder ? hasBoarded(selectedOrder.id) : false;

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">登船核销</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">今日订单</div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{todayStats.totalOrders}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">已登船订单</div>
          <div className="text-2xl font-bold text-green-600">{todayStats.boardedOrders}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">总乘客数</div>
          <div className="text-2xl font-bold text-[#F97316]">{todayStats.totalPassengers}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">已登船乘客</div>
          <div className="text-2xl font-bold text-blue-600">{todayStats.boardedPassengers}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-[#94A3B8]/20 w-fit">
        <button
          onClick={() => {
            setActiveTab("scan");
            setSelectedOrder(null);
            setVerificationResult(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "scan"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4" />
            扫码核验
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("manual");
            setSelectedOrder(null);
            setVerificationResult(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "manual"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            人工登记
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("stats");
            setSelectedOrder(null);
            setVerificationResult(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "stats"
              ? "bg-[#0C4A6E] text-white"
              : "text-[#64748B] hover:text-[#0C4A6E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            今日班次
          </div>
        </button>
      </div>

      {activeTab === "stats" ? (
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
          <h2 className="text-lg font-semibold text-[#0C4A6E] mb-4">今日班次列表</h2>
          {todaySchedules.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8]">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>今日暂无班次</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((s) => {
                const shipName = getShipName(s.shipId);
                const routeInfo = routes.find((r) => r.id === s.routeId);
                const scheduleOrders = todayOrders.filter((o) => o.scheduleId === s.id);
                const boardedCount = scheduleOrders.filter((o) => o.status === "boarded").length;
                const stats = getBoardingStats(todayStr, s.id);
                return (
                  <div
                    key={s.id}
                    className="bg-[#F8FAFC] rounded-xl p-4 border border-[#94A3B8]/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#0C4A6E]/10 flex items-center justify-center">
                          <Ship className="w-6 h-6 text-[#0C4A6E]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#0C4A6E]">
                            {s.departureTime} - {s.arrivalTime}
                          </div>
                          <div className="text-sm text-[#64748B]">
                            {shipName}
                            {routeInfo && (
                              <>
                                {" · "}
                                {getDockName(routeInfo.startDockId)} → {getDockName(routeInfo.endDockId)}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(s.status)}`}>
                        {getStatusLabel(s.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-[#0C4A6E]">{scheduleOrders.length}</div>
                        <div className="text-xs text-[#64748B]">订单数</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">{boardedCount}</div>
                        <div className="text-xs text-[#64748B]">已登船</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-[#F97316]">
                          {scheduleOrders.reduce((sum, o) => sum + o.ticketCount, 0)}
                        </div>
                        <div className="text-xs text-[#64748B]">乘客数</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-600">{stats.totalPassengers}</div>
                        <div className="text-xs text-[#64748B]">已核验</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
            <h2 className="text-lg font-semibold text-[#0C4A6E] mb-4">
              {activeTab === "scan" ? "扫码核验" : "人工登记"}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0C4A6E] mb-2">
                {activeTab === "scan" ? "扫描二维码或输入订单号" : "输入订单号或乘客信息"}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={activeTab === "scan" ? "扫描二维码或手动输入订单号" : "输入订单号、姓名或身份证号"}
                  className="flex-1 px-4 py-3 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  查询
                </button>
              </div>
            </div>

            {searchResults.length > 0 && !selectedOrder && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#0C4A6E] mb-3">搜索结果</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map((order) => {
                    const orderSchedule = schedules.find((s) => s.id === order.scheduleId);
                    const boarded = hasBoarded(order.id);
                    return (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedPassengers(order.passengers.map((p) => p.id));
                          setVerificationResult(null);
                        }}
                        className="w-full p-3 bg-[#F8FAFC] rounded-lg border border-[#94A3B8]/10 hover:border-[#0C4A6E]/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[#0C4A6E]">{order.orderNo}</div>
                            <div className="text-sm text-[#64748B]">
                              {order.touristName} · {order.ticketCount}人
                              {orderSchedule && ` · ${orderSchedule.departureTime}`}
                            </div>
                          </div>
                          {boarded ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              已登船
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {verificationResult && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                  verificationResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {verificationResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className={verificationResult.success ? "text-green-700" : "text-red-700"}>
                  {verificationResult.message}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
            {selectedOrder ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[#0C4A6E]">订单详情</h2>
                  <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="text-2xl font-bold text-[#0C4A6E] mb-2">{selectedOrder.orderNo}</div>
                  {schedule && (
                    <div className="bg-[#F0F9FF] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Ship className="w-4 h-4 text-[#0C4A6E]" />
                        <span className="font-medium text-[#0C4A6E]">
                          {ship ? ship.name : "未知船只"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>{schedule.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#64748B] mb-1">
                        <Clock className="w-4 h-4" />
                        <span>{schedule.departureTime} - {schedule.arrivalTime}</span>
                      </div>
                      {route && (
                        <div className="flex items-center gap-2 text-sm text-[#64748B]">
                          <Ticket className="w-4 h-4" />
                          <span>
                            {getDockName(route.startDockId)} → {getDockName(route.endDockId)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#0C4A6E]">乘客核验 ({selectedPassengers.length}/{selectedOrder.passengers.length})</h3>
                    <button
                      onClick={selectAllPassengers}
                      className="text-sm text-[#0C4A6E] hover:underline"
                    >
                      全选
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.passengers.map((p) => {
                      const isSelected = selectedPassengers.includes(p.id);
                      const isBoarded = isOrderBoarded;
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#0C4A6E] bg-[#F0F9FF]"
                              : "border-[#94A3B8]/20 hover:border-[#0C4A6E]/50"
                          } ${isBoarded ? "opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePassenger(p.id)}
                            disabled={isBoarded}
                            className="w-4 h-4 text-[#0C4A6E]"
                          />
                          <div className="w-10 h-10 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#0C4A6E]" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[#0C4A6E]">{p.name}</div>
                            <div className="text-xs text-[#64748B]">{maskIdCard(p.idCard)}</div>
                          </div>
                          {isBoarded && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {!isOrderBoarded && (
                  <div className="flex gap-3">
                    {activeTab === "scan" ? (
                      <button
                        onClick={handleVerify}
                        disabled={selectedPassengers.length === 0}
                        className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          selectedPassengers.length > 0
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                        二维码核验登船
                      </button>
                    ) : (
                      <button
                        onClick={handleManualBoard}
                        disabled={selectedPassengers.length === 0}
                        className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          selectedPassengers.length > 0
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <User className="w-5 h-5" />
                        人工登记登船
                      </button>
                    )}
                  </div>
                )}

                {isOrderBoarded && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">该订单已完成登船核验</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                <QrCode className="w-16 h-16 mb-4 opacity-40" />
                <p className="text-lg font-medium mb-1">请先查询订单</p>
                <p className="text-sm">扫描二维码或输入订单号进行查询</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
