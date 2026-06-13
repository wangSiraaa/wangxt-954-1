import { useState, useMemo } from "react";
import { FileText, User, Users, Calendar, Clock, Ship, Ticket, Shield, RefreshCw, QrCode, CreditCard, ArrowLeft, Info, CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useBoardingStore } from "@/store/useBoardingStore";
import { useRefundStore } from "@/store/useRefundStore";
import type { Order } from "@/types";

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

function maskIdCard(idCard: string) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + "********" + idCard.slice(-4);
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

export default function OrderDetail() {
  const { orders, getByOrderNo, rescheduleOrder, refundOrder } = useOrderStore();
  const { schedules, calculateAvailableSeats } = useScheduleStore();
  const { ships, getShipTypeInfo } = useShipStore();
  const { routes, docks, insurances } = useBaseStore();
  const { boardingRecords, getByOrderId } = useBoardingStore();
  const { refundDetails, getByOrderId: getRefundByOrderId } = useRefundStore();

  const [searchOrderNo, setSearchOrderNo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [targetScheduleId, setTargetScheduleId] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const searchResults = useMemo(() => {
    if (!searchOrderNo.trim()) return [];
    const keyword = searchOrderNo.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(keyword) ||
        o.touristName.toLowerCase().includes(keyword) ||
        o.passengers.some((p) => p.name.toLowerCase().includes(keyword))
    );
  }, [orders, searchOrderNo]);

  const orderSchedules = useMemo(() => {
    if (!selectedOrder) return [];
    const orderSchedule = schedules.find((s) => s.id === selectedOrder.scheduleId);
    if (!orderSchedule) return [];
    return schedules
      .filter(
        (s) =>
          s.routeId === orderSchedule.routeId &&
          s.date >= orderSchedule.date &&
          s.status !== "cancelled" &&
          s.id !== selectedOrder.scheduleId
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.departureTime.localeCompare(b.departureTime);
      });
  }, [selectedOrder, schedules]);

  const orderBoardingRecords = useMemo(() => {
    if (!selectedOrder) return [];
    return getByOrderId(selectedOrder.id);
  }, [selectedOrder, getByOrderId]);

  const orderRefunds = useMemo(() => {
    if (!selectedOrder) return [];
    return getRefundByOrderId(selectedOrder.id);
  }, [selectedOrder, getRefundByOrderId]);

  const schedule = useMemo(() => {
    if (!selectedOrder) return null;
    return schedules.find((s) => s.id === selectedOrder.scheduleId);
  }, [selectedOrder, schedules]);

  const ship = useMemo(() => {
    if (!schedule) return null;
    return ships.find((s) => s.id === schedule.shipId);
  }, [schedule, ships]);

  const shipType = useMemo(() => {
    if (!ship) return null;
    return getShipTypeInfo(ship.shipTypeId);
  }, [ship, getShipTypeInfo]);

  const route = useMemo(() => {
    if (!schedule) return null;
    return routes.find((r) => r.id === schedule.routeId);
  }, [schedule, routes]);

  const insurance = useMemo(() => {
    if (!selectedOrder?.insuranceId) return null;
    return insurances.find((i) => i.id === selectedOrder.insuranceId);
  }, [selectedOrder, insurances]);

  const getDockName = (id: string) => docks.find((d) => d.id === id)?.name || "未知码头";
  const getShipName = (id: string) => ships.find((s) => s.id === id)?.name || "未知船只";

  const handleSearch = () => {
    if (searchOrderNo.trim()) {
      const order = getByOrderNo(searchOrderNo.trim());
      if (order) {
        setSelectedOrder(order);
      } else {
        window.alert("未找到该订单");
      }
    }
  };

  const handleReschedule = () => {
    if (!selectedOrder || !targetScheduleId) return;
    try {
      rescheduleOrder(selectedOrder.id, targetScheduleId, "调度员改签", "system");
      setShowRescheduleModal(false);
      setTargetScheduleId("");
      const updated = getByOrderNo(selectedOrder.orderNo);
      if (updated) setSelectedOrder(updated);
      window.alert("改签成功");
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "改签失败");
    }
  };

  const handleRefund = () => {
    if (!selectedOrder) return;
    try {
      refundOrder(selectedOrder.id, refundReason || "乘客申请", "passenger-initiated", "system");
      setShowRefundModal(false);
      setRefundReason("");
      const updated = getByOrderNo(selectedOrder.orderNo);
      if (updated) setSelectedOrder(updated);
      window.alert("退款申请已提交");
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "退款失败");
    }
  };

  const canReschedule = selectedOrder && 
    selectedOrder.status !== "boarded" && 
    selectedOrder.status !== "refunded" && 
    selectedOrder.status !== "cancelled" &&
    selectedOrder.rescheduleHistory.length < 2;

  const canRefund = selectedOrder && 
    selectedOrder.status !== "boarded" && 
    selectedOrder.status !== "refunded" && 
    selectedOrder.status !== "cancelled";

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">订单详情</h1>
      </div>

      {!selectedOrder ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20 mb-6">
            <h2 className="text-lg font-semibold text-[#0C4A6E] mb-4">查询订单</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchOrderNo}
                onChange={(e) => setSearchOrderNo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="输入订单号或乘客姓名"
                className="flex-1 px-4 py-3 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors"
              >
                查询
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl border border-[#94A3B8]/20 overflow-hidden">
              <div className="p-4 border-b border-[#94A3B8]/10">
                <h3 className="font-semibold text-[#0C4A6E]">搜索结果 ({searchResults.length})</h3>
              </div>
              <div className="divide-y divide-[#94A3B8]/10">
                {searchResults.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[#F0F9FF] transition-colors text-left"
                  >
                    <div>
                      <div className="font-medium text-[#0C4A6E]">{order.orderNo}</div>
                      <div className="text-sm text-[#64748B]">
                        {order.touristName} · {order.ticketCount}人 · ¥{order.totalPrice}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {orders.length > 0 && searchResults.length === 0 && !searchOrderNo.trim() && (
            <div className="bg-white rounded-xl border border-[#94A3B8]/20 overflow-hidden">
              <div className="p-4 border-b border-[#94A3B8]/10">
                <h3 className="font-semibold text-[#0C4A6E]">最近订单</h3>
              </div>
              <div className="divide-y divide-[#94A3B8]/10 max-h-[400px] overflow-y-auto">
                {orders.slice(0, 20).map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[#F0F9FF] transition-colors text-left"
                  >
                    <div>
                      <div className="font-medium text-[#0C4A6E]">{order.orderNo}</div>
                      <div className="text-sm text-[#64748B]">
                        {order.touristName} · {order.ticketCount}人 · ¥{order.totalPrice}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#0C4A6E] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-[#0C4A6E]">{selectedOrder.orderNo}</h2>
                      <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="text-sm text-[#64748B]">
                      下单时间：{selectedOrder.createdAt}
                      {selectedOrder.paidAt && ` · 支付时间：${selectedOrder.paidAt}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#F97316]">¥{selectedOrder.totalPrice}</div>
                    <div className="text-sm text-[#64748B]">{selectedOrder.ticketCount}张票</div>
                    {selectedOrder.insuranceAmount > 0 && (
                      <div className="text-sm text-[#64748B]">含保险 ¥{selectedOrder.insuranceAmount}</div>
                    )}
                  </div>
                </div>

                {schedule && (
                  <div className="bg-[#F0F9FF] rounded-xl p-5 mb-6">
                    <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                      <Ship className="w-5 h-5" />
                      班次信息
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#64748B]" />
                        <div>
                          <div className="text-xs text-[#64748B]">日期</div>
                          <div className="font-medium text-[#0C4A6E]">{schedule.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[#64748B]" />
                        <div>
                          <div className="text-xs text-[#64748B]">时间</div>
                          <div className="font-medium text-[#0C4A6E]">
                            {schedule.departureTime} - {schedule.arrivalTime}
                          </div>
                        </div>
                      </div>
                      {ship && (
                        <div className="flex items-center gap-3">
                          <Ship className="w-5 h-5 text-[#64748B]" />
                          <div>
                            <div className="text-xs text-[#64748B]">船只</div>
                            <div className="font-medium text-[#0C4A6E]">
                              {ship.name}
                              {shipType && <span className="text-sm text-[#64748B] ml-1">({shipType.name})</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      {route && (
                        <div className="flex items-center gap-3">
                          <Ticket className="w-5 h-5 text-[#64748B]" />
                          <div>
                            <div className="text-xs text-[#64748B]">航线</div>
                            <div className="font-medium text-[#0C4A6E]">
                              {getDockName(route.startDockId)} → {getDockName(route.endDockId)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    实名乘客 ({selectedOrder.passengers.length}人)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedOrder.passengers.map((p, i) => (
                      <div key={p.id} className="bg-[#F8FAFC] rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#0C4A6E]" />
                          </div>
                          <div>
                            <div className="font-medium text-[#0C4A6E]">{p.name}</div>
                            <div className="text-xs text-[#64748B]">{maskIdCard(p.idCard)}</div>
                          </div>
                        </div>
                        {p.phone && (
                          <div className="text-xs text-[#64748B]">联系电话：{maskPhone(p.phone)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {insurance && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      保险信息
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-green-700">{insurance.name}</div>
                          <div className="text-sm text-green-600">{insurance.coverage}</div>
                          <div className="text-xs text-green-600 mt-1">保障期限：{insurance.duration}天</div>
                        </div>
                        <div className="text-lg font-bold text-green-700">¥{insurance.price}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.groupTicket && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      团体票信息
                    </h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-purple-600">团体名称</div>
                          <div className="font-medium text-purple-700">{selectedOrder.groupTicket.groupName}</div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-600">领队</div>
                          <div className="font-medium text-purple-700">
                            {selectedOrder.groupTicket.leaderName} ({maskPhone(selectedOrder.groupTicket.leaderPhone)})
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-600">人数</div>
                          <div className="font-medium text-purple-700">{selectedOrder.groupTicket.passengerCount}人</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.rescheduleHistory.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      改签历史 ({selectedOrder.rescheduleHistory.length}/2)
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.rescheduleHistory.map((record, i) => {
                        const fromSchedule = schedules.find((s) => s.id === record.fromScheduleId);
                        const toSchedule = schedules.find((s) => s.id === record.toScheduleId);
                        return (
                          <div key={record.id} className="bg-[#F8FAFC] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-[#64748B]">第 {i + 1} 次改签</span>
                              <span className="text-xs text-[#64748B]">{record.createdAt}</span>
                            </div>
                            <div className="text-sm text-[#0C4A6E] mb-1">
                              {fromSchedule?.date} {fromSchedule?.departureTime} → {toSchedule?.date} {toSchedule?.departureTime}
                            </div>
                            <div className="text-xs text-[#64748B]">
                              原因：{record.reason}
                              {record.fee > 0 && ` · 手续费：¥${record.fee}`}
                              {record.operator && ` · 操作人：${record.operator}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {orderRefunds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      退款记录
                    </h3>
                    <div className="space-y-3">
                      {orderRefunds.map((refund) => (
                        <div key={refund.id} className="bg-[#F8FAFC] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              refund.status === "completed" ? "bg-green-100 text-green-700" :
                              refund.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {refund.status === "completed" ? "已完成" : refund.status === "pending" ? "处理中" : "已拒绝"}
                            </span>
                            <span className="text-xs text-[#64748B]">{refund.createdAt}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-[#64748B]">退款金额</div>
                              <div className="font-medium text-[#0C4A6E]">¥{refund.amount}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#64748B]">手续费</div>
                              <div className="font-medium text-red-600">¥{refund.fee}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#64748B]">实退金额</div>
                              <div className="font-medium text-green-600">¥{refund.netAmount}</div>
                            </div>
                          </div>
                          <div className="text-xs text-[#64748B] mt-2">原因：{refund.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {orderBoardingRecords.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
                  <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    登船记录
                  </h3>
                  <div className="space-y-3">
                    {orderBoardingRecords.map((record) => (
                      <div key={record.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-2 text-green-700">
                            {record.qrCodeScanned ? (
                              <QrCode className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                            {record.qrCodeScanned ? "二维码扫码登船" : "人工登记登船"}
                          </span>
                          <span className="text-xs text-green-600">{record.boardedAt}</span>
                        </div>
                        <div className="text-sm text-green-600">
                          核验人：{record.verifiedBy}
                          {record.notes && ` · 备注：${record.notes}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
                <h3 className="font-semibold text-[#0C4A6E] mb-4 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  登船二维码
                </h3>
                <div className="bg-white border-2 border-dashed border-[#94A3B8]/30 rounded-xl p-6 text-center">
                  <div className="w-40 h-40 mx-auto bg-[#F0F9FF] rounded-xl flex items-center justify-center mb-4">
                    <QrCode className="w-24 h-24 text-[#0C4A6E]" />
                  </div>
                  <div className="text-xs text-[#64748B] break-all">{selectedOrder.qrCode}</div>
                  <div className="text-xs text-[#94A3B8] mt-2">
                    改签后二维码会重新生成
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
                <h3 className="font-semibold text-[#0C4A6E] mb-4">订单操作</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => canReschedule && setShowRescheduleModal(true)}
                    disabled={!canReschedule}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      canReschedule
                        ? "bg-purple-50 text-purple-600 hover:bg-purple-100"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    改签订单
                  </button>
                  <button
                    onClick={() => canRefund && setShowRefundModal(true)}
                    disabled={!canRefund}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      canRefund
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    申请退款
                  </button>
                </div>

                {!canReschedule && selectedOrder?.status === "boarded" && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-700">已登船的订单不能改签或退款</div>
                    </div>
                  </div>
                )}

                {selectedOrder?.rescheduleHistory.length >= 2 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-700">订单最多允许改签2次，已达到上限</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
                <h3 className="font-semibold text-[#0C4A6E] mb-4">费用说明</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">票价 × {selectedOrder.ticketCount}</span>
                    <span className="text-[#0C4A6E]">¥{selectedOrder.totalPrice - selectedOrder.insuranceAmount}</span>
                  </div>
                  {selectedOrder.insuranceAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">保险费</span>
                      <span className="text-[#0C4A6E]">¥{selectedOrder.insuranceAmount}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#94A3B8]/10 flex justify-between font-semibold">
                    <span className="text-[#0C4A6E]">合计</span>
                    <span className="text-[#F97316]">¥{selectedOrder.totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-4">改签订单</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0C4A6E] mb-2">选择目标班次</label>
              {orderSchedules.length === 0 ? (
                <div className="text-center py-8 text-[#94A3B8]">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>暂无可用的改签班次</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {orderSchedules.map((s) => {
                    const available = calculateAvailableSeats(s.id);
                    const shipName = getShipName(s.shipId);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          targetScheduleId === s.id
                            ? "border-[#0C4A6E] bg-[#F0F9FF]"
                            : "border-[#94A3B8]/20 hover:border-[#0C4A6E]/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          value={s.id}
                          checked={targetScheduleId === s.id}
                          onChange={(e) => setTargetScheduleId(e.target.value)}
                          className="w-4 h-4 text-[#0C4A6E]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0C4A6E]">
                            {s.date} {s.departureTime} - {s.arrivalTime}
                          </div>
                          <div className="text-xs text-[#64748B]">
                            {shipName} · 余票 {available}/{s.totalSeats} · ¥{s.ticketPrice}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setTargetScheduleId("");
                }}
                className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReschedule}
                disabled={!targetScheduleId}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  targetScheduleId
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                确认改签
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-4">申请退款</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0C4A6E] mb-2">退款原因</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请输入退款原因"
                rows={3}
                className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-700">
                  <div className="font-medium mb-1">退票扣费规则：</div>
                  <div>• 发船前 ≥24小时：扣除 5% 手续费</div>
                  <div>• 发船前 ≥12小时：扣除 10% 手续费</div>
                  <div>• 发船前 ≥4小时：扣除 20% 手续费</div>
                  <div>• 发船前 &lt;4小时：扣除 50% 手续费</div>
                  <div>• 停航导致的退票：全额退款</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReason("");
                }}
                className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认退款
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
