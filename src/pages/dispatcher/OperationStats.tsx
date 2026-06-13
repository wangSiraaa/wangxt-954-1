import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  Ship,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { useStatsStore } from "@/store/useStatsStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useRefundStore } from "@/store/useRefundStore";

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getTrendIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  if (current < previous) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return null;
}

function getTrendColor(current: number, previous: number, isPositive: boolean = true) {
  if (current === previous) return "text-gray-500";
  const isUp = current > previous;
  if (isPositive) return isUp ? "text-green-500" : "text-red-500";
  return isUp ? "text-red-500" : "text-green-500";
}

export default function OperationStats() {
  const { calculateRangeStats, getDashboardStats } = useStatsStore();
  const { routes } = useBaseStore();
  const { schedules } = useScheduleStore();
  const { orders } = useOrderStore();
  const { refundDetails } = useRefundStore();

  const today = new Date();
  const thirtyDaysAgo = addDays(today, -29);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: formatDate(thirtyDaysAgo),
    end: formatDate(today),
  });
  const [viewMode, setViewMode] = useState<"overview" | "route" | "trend">("overview");

  const routeMap = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    routes.forEach((r) => (map[r.id] = r));
    return map;
  }, [routes]);

  const dashboardStats = useMemo(() => getDashboardStats(), [getDashboardStats]);

  const rangeStats = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return null;
    return calculateRangeStats(dateRange.start, dateRange.end);
  }, [dateRange, calculateRangeStats]);

  const yesterdayStats = useMemo(() => {
    const yesterday = addDays(today, -1);
    const yesterdayStr = formatDate(yesterday);
    const twoDaysAgo = addDays(today, -2);
    const twoDaysAgoStr = formatDate(twoDaysAgo);
    return {
      yesterday: calculateRangeStats(yesterdayStr, yesterdayStr),
      twoDaysAgo: calculateRangeStats(twoDaysAgoStr, twoDaysAgoStr),
    };
  }, [calculateRangeStats, today]);

  const weekTrendData = dashboardStats.weekTrend || [];
  const monthTrendData = dashboardStats.monthTrend || [];

  const maxRevenue = Math.max(...weekTrendData.map((d) => d.totalRevenue), 1);
  const maxPassengers = Math.max(...weekTrendData.map((d) => d.totalPassengers), 1);

  const getRouteName = (id: string) => routeMap[id]?.name || "未知航线";

  const quickDateRanges = [
    { label: "今日", days: 0 },
    { label: "昨日", days: 1 },
    { label: "近7天", days: 6 },
    { label: "近30天", days: 29 },
  ];

  const handleQuickDate = (days: number) => {
    const end = formatDate(today);
    const start = formatDate(addDays(today, -days));
    setDateRange({ start, end });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">运营统计</h1>
          <p className="text-gray-500 mt-1">实时监控客流量、营收、上座率等关键指标</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">快捷日期：</span>
            <div className="flex gap-2">
              {quickDateRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handleQuickDate(range.days)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    dateRange.start === formatDate(addDays(today, -range.days)) && dateRange.end === formatDate(today)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            {yesterdayStats.yesterday && yesterdayStats.twoDaysAgo && (
              <div className="flex items-center gap-1">
                {getTrendIcon(yesterdayStats.yesterday.totalPassengers, yesterdayStats.twoDaysAgo.totalPassengers)}
                <span
                  className={`text-sm font-medium ${getTrendColor(
                    yesterdayStats.yesterday.totalPassengers,
                    yesterdayStats.twoDaysAgo.totalPassengers,
                    true
                  )}`}
                >
                  {yesterdayStats.yesterday.totalPassengers !== yesterdayStats.twoDaysAgo.totalPassengers
                    ? `${Math.abs(
                        ((yesterdayStats.yesterday.totalPassengers - yesterdayStats.twoDaysAgo.totalPassengers) /
                          Math.max(yesterdayStats.twoDaysAgo.totalPassengers, 1)) *
                          100
                      ).toFixed(1)}%`
                    : "持平"}
                </span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {rangeStats?.totalPassengers?.toLocaleString() || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">总客流量（人次）</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            {yesterdayStats.yesterday && yesterdayStats.twoDaysAgo && (
              <div className="flex items-center gap-1">
                {getTrendIcon(yesterdayStats.yesterday.totalRevenue, yesterdayStats.twoDaysAgo.totalRevenue)}
                <span
                  className={`text-sm font-medium ${getTrendColor(
                    yesterdayStats.yesterday.totalRevenue,
                    yesterdayStats.twoDaysAgo.totalRevenue,
                    true
                  )}`}
                >
                  {yesterdayStats.yesterday.totalRevenue !== yesterdayStats.twoDaysAgo.totalRevenue
                    ? `${Math.abs(
                        ((yesterdayStats.yesterday.totalRevenue - yesterdayStats.twoDaysAgo.totalRevenue) /
                          Math.max(yesterdayStats.twoDaysAgo.totalRevenue, 1)) *
                          100
                      ).toFixed(1)}%`
                    : "持平"}
                </span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatCurrency(rangeStats?.totalRevenue || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">总营收</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <Percent className="w-5 h-5 text-purple-500" />
            </div>
            {yesterdayStats.yesterday && yesterdayStats.twoDaysAgo && (
              <div className="flex items-center gap-1">
                {getTrendIcon(
                  yesterdayStats.yesterday.averageOccupancyRate,
                  yesterdayStats.twoDaysAgo.averageOccupancyRate
                )}
                <span
                  className={`text-sm font-medium ${getTrendColor(
                    yesterdayStats.yesterday.averageOccupancyRate,
                    yesterdayStats.twoDaysAgo.averageOccupancyRate,
                    true
                  )}`}
                >
                  {yesterdayStats.yesterday.averageOccupancyRate !==
                  yesterdayStats.twoDaysAgo.averageOccupancyRate
                    ? `${Math.abs(
                        ((yesterdayStats.yesterday.averageOccupancyRate -
                          yesterdayStats.twoDaysAgo.averageOccupancyRate) /
                          Math.max(yesterdayStats.twoDaysAgo.averageOccupancyRate, 0.01)) *
                          100
                      ).toFixed(1)}%`
                    : "持平"}
                </span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatPercent(rangeStats?.averageOccupancyRate || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">平均上座率</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            {yesterdayStats.yesterday && yesterdayStats.twoDaysAgo && (
              <div className="flex items-center gap-1">
                {getTrendIcon(yesterdayStats.yesterday.refundRate, yesterdayStats.twoDaysAgo.refundRate)}
                <span
                  className={`text-sm font-medium ${getTrendColor(
                    yesterdayStats.yesterday.refundRate,
                    yesterdayStats.twoDaysAgo.refundRate,
                    false
                  )}`}
                >
                  {yesterdayStats.yesterday.refundRate !== yesterdayStats.twoDaysAgo.refundRate
                    ? `${Math.abs(
                        ((yesterdayStats.yesterday.refundRate - yesterdayStats.twoDaysAgo.refundRate) /
                          Math.max(yesterdayStats.twoDaysAgo.refundRate, 0.01)) *
                          100
                      ).toFixed(1)}%`
                    : "持平"}
                </span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatPercent(rangeStats?.refundRate || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">退票率</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Ship className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{rangeStats?.totalSchedules || 0}</p>
              <p className="text-xs text-gray-500">计划班次</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{rangeStats?.cancelledSchedules || 0}</p>
              <p className="text-xs text-gray-500">取消班次</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency(rangeStats?.refundAmount || 0)}
              </p>
              <p className="text-xs text-gray-500">累计退款</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency((rangeStats?.totalRevenue || 0) - (rangeStats?.refundAmount || 0))}
              </p>
              <p className="text-xs text-gray-500">净营收</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">数据分析</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("overview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === "overview"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                概览
              </button>
              <button
                onClick={() => setViewMode("route")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === "route"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <PieChart className="w-4 h-4" />
                航线分布
              </button>
              <button
                onClick={() => setViewMode("trend")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === "trend"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                趋势分析
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {viewMode === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">近7日营收与客流趋势</h3>
                <div className="flex items-end justify-between gap-2 h-64">
                  {weekTrendData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center gap-1 h-48">
                        <div
                          className="w-4 bg-green-400 rounded-t transition-all hover:bg-green-500"
                          style={{
                            height: `${(day.totalRevenue / maxRevenue) * 100}%`,
                            minHeight: day.totalRevenue > 0 ? "4px" : "0",
                          }}
                          title={`营收: ${formatCurrency(day.totalRevenue)}`}
                        />
                        <div
                          className="w-4 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                          style={{
                            height: `${(day.totalPassengers / maxPassengers) * 100}%`,
                            minHeight: day.totalPassengers > 0 ? "4px" : "0",
                          }}
                          title={`客流: ${day.totalPassengers}人次`}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded" />
                    <span className="text-xs text-gray-600">营收</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span className="text-xs text-gray-600">客流</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">近7日日均上座率</h4>
                  <div className="space-y-3">
                    {weekTrendData.slice().reverse().map((day, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">
                            {new Date(day.date).getMonth() + 1}月{new Date(day.date).getDate()}日
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatPercent(day.occupancyRate)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              day.occupancyRate >= 0.8
                                ? "bg-green-500"
                                : day.occupancyRate >= 0.5
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${day.occupancyRate * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">近7日退票情况</h4>
                  <div className="space-y-3">
                    {weekTrendData.slice().reverse().map((day, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">
                            {new Date(day.date).getMonth() + 1}月{new Date(day.date).getDate()}日
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">
                              {formatCurrency(day.refundAmount)}
                            </span>
                            <span className="font-medium text-gray-800">
                              {formatPercent(day.refundRate)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              day.refundRate <= 0.05
                                ? "bg-green-500"
                                : day.refundRate <= 0.1
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(day.refundRate * 1000, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === "route" && rangeStats && (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-gray-700">各航线运营情况</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">航线</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">班次</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">客流量</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">营收</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">上座率</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(rangeStats.byRoute).map(([routeId, data]) => (
                      <tr key={routeId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-800">{getRouteName(routeId)}</div>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-600">{data.schedules}</td>
                        <td className="text-center py-3 px-4 text-gray-600">
                          {data.passengers.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4 text-gray-800 font-medium">
                          {formatCurrency(data.revenue)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              data.occupancyRate >= 0.8
                                ? "bg-green-100 text-green-700"
                                : data.occupancyRate >= 0.5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {formatPercent(data.occupancyRate)}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 bg-blue-500 rounded-full"
                                style={{
                                  width: `${rangeStats.totalRevenue > 0 ? (data.revenue / rangeStats.totalRevenue) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {rangeStats.totalRevenue > 0
                                ? `${((data.revenue / rangeStats.totalRevenue) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(rangeStats.byRoute).map(([routeId, data]) => {
                  const route = routeMap[routeId];
                  const totalRevenue = rangeStats.totalRevenue || 1;
                  const percentage = (data.revenue / totalRevenue) * 100;
                  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
                  const colorIndex = Object.keys(rangeStats.byRoute).indexOf(routeId) % colors.length;
                  return (
                    <div key={routeId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">{route?.name || "未知航线"}</span>
                        <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[colorIndex]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{data.schedules} 班次</span>
                        <span>{formatCurrency(data.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "trend" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">近30日客流趋势</h3>
                <div className="flex items-end justify-between gap-0.5 h-64">
                  {monthTrendData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t transition-all hover:opacity-80 ${
                          day.totalPassengers === 0
                            ? "bg-gray-200"
                            : day.cancelledSchedules > 0
                              ? "bg-orange-400"
                              : "bg-blue-400"
                        }`}
                        style={{
                          height: `${(day.totalPassengers / Math.max(...monthTrendData.map((d) => d.totalPassengers), 1)) * 100}%`,
                          minHeight: day.totalPassengers > 0 ? "2px" : "0",
                        }}
                        title={`${day.date}: ${day.totalPassengers}人次, 取消${day.cancelledSchedules}班`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>30天前</span>
                  <span>今天</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">客流增长</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {weekTrendData.length > 1 && weekTrendData[weekTrendData.length - 1]?.totalPassengers >
                    (weekTrendData[0]?.totalPassengers || 0)
                      ? "+"
                      : ""}
                    {weekTrendData.length > 1
                      ? `${(
                          ((weekTrendData[weekTrendData.length - 1]?.totalPassengers || 0) -
                            (weekTrendData[0]?.totalPassengers || 0)) /
                          Math.max(weekTrendData[0]?.totalPassengers || 1, 1)
                        ).toFixed(1)}%`
                      : "0%"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">本周环比上周</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">营收增长</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {weekTrendData.length > 1 && weekTrendData[weekTrendData.length - 1]?.totalRevenue >
                    (weekTrendData[0]?.totalRevenue || 0)
                      ? "+"
                      : ""}
                    {weekTrendData.length > 1
                      ? `${(
                          ((weekTrendData[weekTrendData.length - 1]?.totalRevenue || 0) -
                            (weekTrendData[0]?.totalRevenue || 0)) /
                          Math.max(weekTrendData[0]?.totalRevenue || 1, 1)
                        ).toFixed(1)}%`
                      : "0%"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">本周环比上周</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">平均客单价</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(
                      rangeStats?.totalPassengers
                        ? rangeStats.totalRevenue / rangeStats.totalPassengers
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">人均消费</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">业务健康度指标</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${
                        (rangeStats?.averageOccupancyRate || 0) >= 0.7
                          ? "text-green-500"
                          : (rangeStats?.averageOccupancyRate || 0) >= 0.4
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {formatPercent(rangeStats?.averageOccupancyRate || 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">上座率</p>
                    <p className="text-xs text-gray-400">目标: ≥70%</p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${
                        (rangeStats?.refundRate || 0) <= 0.05
                          ? "text-green-500"
                          : (rangeStats?.refundRate || 0) <= 0.1
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {formatPercent(rangeStats?.refundRate || 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">退票率</p>
                    <p className="text-xs text-gray-400">目标: ≤5%</p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${
                        rangeStats?.cancelledSchedules === 0
                          ? "text-green-500"
                          : rangeStats && rangeStats.cancelledSchedules / rangeStats.totalSchedules <= 0.05
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {rangeStats?.totalSchedules
                        ? `${((rangeStats.cancelledSchedules / rangeStats.totalSchedules) * 100).toFixed(1)}%`
                        : "0%"}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">取消率</p>
                    <p className="text-xs text-gray-400">目标: ≤5%</p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${
                        (rangeStats?.totalPassengers && rangeStats?.totalSchedules
                          ? rangeStats.totalPassengers / rangeStats.totalSchedules
                          : 0) >= 20
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {rangeStats?.totalPassengers && rangeStats?.totalSchedules
                        ? Math.round(rangeStats.totalPassengers / rangeStats.totalSchedules)
                        : 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">平均载客</p>
                    <p className="text-xs text-gray-400">人/班次</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">实时数据概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-800">{schedules.length}</p>
            <p className="text-sm text-gray-500 mt-1">总班次</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
            <p className="text-sm text-gray-500 mt-1">总订单</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-800">
              {orders.filter((o) => o.status === "boarded").length}
            </p>
            <p className="text-sm text-gray-500 mt-1">已登船</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-800">{refundDetails.length}</p>
            <p className="text-sm text-gray-500 mt-1">退款记录</p>
          </div>
        </div>
      </div>
    </div>
  );
}
