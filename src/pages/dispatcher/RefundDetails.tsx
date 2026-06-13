import { useState, useMemo } from "react";
import { CreditCard, Calendar, User, Info, FileText, Search, DollarSign, List } from "lucide-react";
import { useRefundStore } from "@/store/useRefundStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待审批",
    approved: "已批准",
    rejected: "已拒绝",
    completed: "已完成",
  };
  return labels[status] || status;
}

function getRefundTypeColor(type: string) {
  const colors: Record<string, string> = {
    passenger_initiated: "bg-blue-100 text-blue-700",
    reschedule: "bg-purple-100 text-purple-700",
    stop_day: "bg-red-100 text-red-700",
    maintenance: "bg-orange-100 text-orange-700",
    other: "bg-gray-100 text-gray-700",
  };
  return colors[type] || "bg-gray-100 text-gray-700";
}

function getRefundTypeLabel(type: string) {
  const labels: Record<string, string> = {
    passenger_initiated: "乘客申请",
    reschedule: "改签退款",
    stop_day: "停航退款",
    maintenance: "检修退款",
    other: "其他",
  };
  return labels[type] || type;
}

export default function RefundDetails() {
  const { refundDetails, calculateRefundFeePercent, approveRefund, rejectRefund } = useRefundStore();
  const { orders } = useOrderStore();
  const { schedules } = useScheduleStore();
  const { ships } = useShipStore();
  const { routes, docks } = useBaseStore();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  const filteredRefunds = useMemo(() => {
    return refundDetails
      .filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (typeFilter !== "all" && r.refundType !== typeFilter) return false;
        if (dateRange.start && r.createdAt < dateRange.start) return false;
        if (dateRange.end && r.createdAt > dateRange.end + "T23:59:59") return false;
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          const order = orders.find((o) => o.id === r.orderId);
          return (
            r.refundNo.toLowerCase().includes(keyword) ||
            order?.orderNo.toLowerCase().includes(keyword) ||
            order?.touristName.toLowerCase().includes(keyword)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [refundDetails, statusFilter, typeFilter, dateRange, searchKeyword, orders]);

  const stats = useMemo(() => {
    const total = refundDetails.length;
    const pending = refundDetails.filter((r) => r.status === "pending").length;
    const completed = refundDetails.filter((r) => r.status === "completed").length;
    const totalAmount = refundDetails
      .filter((r) => r.status === "completed" || r.status === "approved")
      .reduce((sum, r) => sum + r.refundAmount, 0);
    const totalFee = refundDetails
      .filter((r) => r.status === "completed" || r.status === "approved")
      .reduce((sum, r) => sum + r.feeAmount, 0);
    return {
      total,
      pending,
      completed,
      totalAmount,
      totalFee,
      refundRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0",
    };
  }, [refundDetails]);

  const getOrderInfo = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    const schedule = schedules.find((s) => s.id === order.scheduleId);
    const ship = schedule ? ships.find((s) => s.id === schedule.shipId) : null;
    const route = schedule ? routes.find((r) => r.id === schedule.routeId) : null;
    return { order, schedule, ship, route };
  };

  const getDockName = (id: string) => docks.find((d) => d.id === id)?.name || "未知码头";

  const handleApprove = (refundId: string) => {
    if (confirm("确定要批准该退款申请吗？")) {
      approveRefund(refundId, "调度员");
    }
  };

  const handleReject = (refundId: string) => {
    const reason = prompt("请输入拒绝原因：");
    if (reason) {
      rejectRefund(refundId, reason, "调度员");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">退款明细</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">退款申请总数</div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待审批</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">已完成</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">完成率</div>
          <div className="text-2xl font-bold text-blue-600">{stats.refundRate}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">累计退款金额</div>
          <div className="text-2xl font-bold text-[#F97316]">¥{stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">累计手续费</div>
          <div className="text-2xl font-bold text-purple-600">¥{stats.totalFee.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索退款单号、订单号、乘客姓名"
                className="w-full pl-10 pr-4 py-2 border border-[#94A3B8]/30 rounded-lg"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
            >
              <option value="all">全部状态</option>
              <option value="pending">待审批</option>
              <option value="approved">已批准</option>
              <option value="rejected">已拒绝</option>
              <option value="completed">已完成</option>
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
            >
              <option value="all">全部类型</option>
              <option value="passenger_initiated">乘客申请</option>
              <option value="reschedule">改签退款</option>
              <option value="stop_day">停航退款</option>
              <option value="maintenance">检修退款</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
            />
          </div>
          <div className="text-[#94A3B8]">至</div>
          <div>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-[#F0F9FF] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-[#0C4A6E]" />
            <span className="font-medium text-[#0C4A6E]">退票扣费规则</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">≥24h</div>
              <div className="text-xs text-[#64748B]">手续费 5%</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-600">≥12h</div>
              <div className="text-xs text-[#64748B]">手续费 10%</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-600">≥4h</div>
              <div className="text-xs text-[#64748B]">手续费 20%</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">{'<4h'}</div>
              <div className="text-xs text-[#64748B]">手续费 50%</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">停航</div>
              <div className="text-xs text-[#64748B]">全额退款</div>
            </div>
          </div>
        </div>

        {filteredRefunds.length === 0 ? (
          <div className="text-center py-16 text-[#94A3B8]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">暂无退款记录</p>
            <p className="text-sm">调整筛选条件或稍后查看</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => {
              const info = getOrderInfo(refund.orderId);
              const feePercent = refund.feePercent ?? calculateRefundFeePercent(
                info?.order ? new Date(info.order.createdAt) : new Date()
              );
              return (
                <div
                  key={refund.id}
                  className="p-5 bg-[#F8FAFC] rounded-xl border border-[#94A3B8]/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                        <CreditCard className="w-7 h-7 text-[#0C4A6E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-[#0C4A6E] text-lg">{refund.refundNo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(refund.status)}`}>
                            {getStatusLabel(refund.status)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRefundTypeColor(refund.refundType)}`}>
                            {getRefundTypeLabel(refund.refundType)}
                          </span>
                        </div>
                        <div className="text-sm text-[#64748B]">
                          关联订单：{info?.order?.orderNo || "未知订单"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">¥{refund.refundAmount.toFixed(2)}</div>
                      {refund.feeAmount > 0 && (
                        <div className="text-sm text-[#64748B]">
                          手续费：¥{refund.feeAmount.toFixed(2)} ({(refund.feePercent || feePercent).toFixed(0)}%)
                        </div>
                      )}
                      <div className="text-xs text-[#94A3B8] mt-1">
                        申请时间：{new Date(refund.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {info && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-white rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                          <User className="w-3 h-3" />
                          乘客
                        </div>
                        <div className="font-medium text-[#0C4A6E]">{info.order.touristName}</div>
                        <div className="text-xs text-[#64748B]">{info.order.ticketCount}人</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                          <DollarSign className="w-3 h-3" />
                          原订单金额
                        </div>
                        <div className="font-medium text-[#0C4A6E]">¥{info.order.totalAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                          <Calendar className="w-3 h-3" />
                          班次日期
                        </div>
                        <div className="font-medium text-[#0C4A6E]">{info.schedule?.date || "-"}</div>
                        <div className="text-xs text-[#64748B]">{info.schedule?.departureTime || "-"}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                          <List className="w-3 h-3" />
                          航线
                        </div>
                        <div className="font-medium text-[#0C4A6E]">
                          {info.route ? `${getDockName(info.route.startDockId)} → ${getDockName(info.route.endDockId)}` : "-"}
                        </div>
                        <div className="text-xs text-[#64748B]">{info.ship?.name || "-"}</div>
                      </div>
                    </div>
                  )}

                  {refund.reason && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xs text-[#64748B] mb-1">退款原因</div>
                      <div className="text-sm text-[#0C4A6E]">{refund.reason}</div>
                    </div>
                  )}

                  {refund.rejectReason && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg">
                      <div className="text-xs text-[#64748B] mb-1">拒绝原因</div>
                      <div className="text-sm text-red-600">{refund.rejectReason}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#94A3B8]">
                      {refund.operator && `操作人：${refund.operator}`}
                      {refund.operatedAt && ` · ${new Date(refund.operatedAt).toLocaleString()}`}
                    </div>
                    {refund.status === "pending" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(refund.id)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          拒绝
                        </button>
                        <button
                          onClick={() => handleApprove(refund.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          批准退款
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
