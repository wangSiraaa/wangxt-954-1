import { useState, useMemo } from "react";
import { Calendar, AlertTriangle, X, Wind, Waves, Users, MapPin } from "lucide-react";
import { useStopDayStore } from "@/store/useStopDayStore";
import { useBaseStore } from "@/store/useBaseStore";

type StopDayType = "weather" | "tide" | "terminal-limit";

interface StopDayFormData {
  date: string;
  type: StopDayType;
  reason: string;
  severity: "warning" | "severe" | "critical";
  windForce?: number;
  tideLevel?: number;
  terminalLimitCount?: number;
  affectedDocks?: string[];
  affectedRoutes?: string[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function StopDayCalendar() {
  const { stopDays, addStopDay, removeStopDay, isStopDay } = useStopDayStore();
  const { docks, routes } = useBaseStore();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [formData, setFormData] = useState<StopDayFormData | null>(null);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDay]);

  const monthStopCount = stopDays.filter((sd) => {
    const d = new Date(sd.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  }).length;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const stopTypeOptions = [
    { value: "weather", label: "大风停航", icon: Wind, color: "#F97316" },
    { value: "tide", label: "潮汐异常", icon: Waves, color: "#0EA5E9" },
    { value: "terminal-limit", label: "码头限流", icon: Users, color: "#8B5CF6" },
  ];

  const severityOptions = [
    { value: "warning", label: "预警", color: "#F59E0B" },
    { value: "severe", label: "严重", color: "#EF4444" },
    { value: "critical", label: "紧急", color: "#991B1B" },
  ];

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(calYear, calMonth, day);
    if (isStopDay(dateStr)) {
      try {
        removeStopDay(dateStr);
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : "操作失败");
      }
    } else {
      setFormData({
        date: dateStr,
        type: "weather",
        reason: "大风停航",
        severity: "severe",
        windForce: 8,
        tideLevel: undefined,
        terminalLimitCount: undefined,
        affectedDocks: [],
        affectedRoutes: [],
      });
    }
  };

  const handleTypeChange = (type: StopDayType) => {
    if (!formData) return;
    const baseData = { ...formData, type };
    switch (type) {
      case "weather":
        setFormData({ ...baseData, reason: "大风停航", windForce: 8, tideLevel: undefined, terminalLimitCount: undefined });
        break;
      case "tide":
        setFormData({ ...baseData, reason: "潮汐异常", tideLevel: 0.5, windForce: undefined, terminalLimitCount: undefined });
        break;
      case "terminal-limit":
        setFormData({ ...baseData, reason: "码头限流", terminalLimitCount: 200, windForce: undefined, tideLevel: undefined });
        break;
    }
  };

  const handleDockToggle = (dockId: string) => {
    if (!formData) return;
    const currentDocks = formData.affectedDocks || [];
    const newDocks = currentDocks.includes(dockId)
      ? currentDocks.filter(id => id !== dockId)
      : [...currentDocks, dockId];
    setFormData({ ...formData, affectedDocks: newDocks });
  };

  const handleRouteToggle = (routeId: string) => {
    if (!formData) return;
    const currentRoutes = formData.affectedRoutes || [];
    const newRoutes = currentRoutes.includes(routeId)
      ? currentRoutes.filter(id => id !== routeId)
      : [...currentRoutes, routeId];
    setFormData({ ...formData, affectedRoutes: newRoutes });
  };

  const confirmAddStopDay = () => {
    if (!formData) return;
    if (!formData.reason.trim()) {
      window.alert("请输入停航原因");
      return;
    }
    try {
      const stopDayData = {
        date: formData.date,
        type: formData.type,
        reason: formData.reason,
        severity: formData.severity,
        windForce: formData.windForce,
        tideLevel: formData.tideLevel,
        terminalLimitCount: formData.terminalLimitCount,
        affectedDocks: formData.affectedDocks,
        affectedRoutes: formData.affectedRoutes,
      };
      addStopDay(stopDayData);
      setFormData(null);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  const getStopReason = (date: string) => stopDays.find((sd) => sd.date === date)?.reason ?? "";
  const getStopTypeInfo = (date: string) => {
    const sd = stopDays.find((sd) => sd.date === date);
    if (!sd) return null;
    return stopTypeOptions.find(opt => opt.value === sd.type);
  };

  const getSeverityInfo = (date: string) => {
    const sd = stopDays.find((sd) => sd.date === date);
    if (!sd || !sd.severity) return null;
    return severityOptions.find(opt => opt.value === sd.severity);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">停航日历</h1>
        <span className="ml-2 px-3 py-1 bg-[#F97316] text-white text-sm rounded-full">
          本月 {monthStopCount} 天停航
        </span>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl p-6 border border-[#94A3B8]/20">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="px-3 py-1.5 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors font-bold text-lg">
              &lt;
            </button>
            <span className="text-xl font-bold text-[#0C4A6E]">{calYear}年{calMonth + 1}月</span>
            <button onClick={nextMonth} className="px-3 py-1.5 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded-lg transition-colors font-bold text-lg">
              &gt;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-[#94A3B8] mb-2">
            {weekdayLabels.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="h-16" />;
              const dateStr = formatDate(calYear, calMonth, day);
              const stop = isStopDay(dateStr);
              const isToday = dateStr === formatDate(today.getFullYear(), today.getMonth(), today.getDate());
              const stopType = getStopTypeInfo(dateStr);
              const severity = getSeverityInfo(dateStr);
              const TypeIcon = stopType?.icon || AlertTriangle;
              const iconColor = stopType?.color || "#F97316";
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative ${
                    stop
                      ? `border-2 hover:opacity-90`
                      : isToday
                        ? "bg-[#0C4A6E]/10 border border-[#0C4A6E]/30 text-[#0C4A6E] hover:bg-[#0C4A6E]/15"
                        : "text-[#0C4A6E] hover:bg-[#0C4A6E]/5"
                  }`}
                  style={stop ? { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}40`, color: iconColor } : {}}
                >
                  {stop && <TypeIcon className="w-3.5 h-3.5" />}
                  <span className="font-medium">{day}</span>
                  {stop && (
                    <span className="text-[10px] leading-tight truncate w-full px-1" style={{ color: iconColor }}>
                      {getStopReason(dateStr)}
                    </span>
                  )}
                  {stop && severity && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: severity.color }} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#94A3B8]/20">
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#94A3B8]">
              {stopTypeOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border" style={{ backgroundColor: `${opt.color}15`, borderColor: `${opt.color}40` }} />
                    <Icon className="w-3 h-3" style={{ color: opt.color }} />
                    {opt.label}
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0C4A6E]/10 border border-[#0C4A6E]/30" />
                今天
              </div>
              <div className="flex items-center gap-1 ml-4">
                <div className="flex gap-0.5">
                  {severityOptions.map(opt => (
                    <span key={opt.value} className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  ))}
                </div>
                <span>严重程度</span>
              </div>
            </div>
          </div>
        </div>

        {stopDays.filter((sd) => {
          const d = new Date(sd.date);
          return d.getFullYear() === calYear && d.getMonth() === calMonth;
        }).length > 0 && (
          <div className="mt-4 bg-white rounded-xl p-5 border border-[#94A3B8]/20">
            <h3 className="text-sm font-semibold text-[#0C4A6E] mb-3">本月停航详情</h3>
            <div className="space-y-2">
              {stopDays
                .filter((sd) => {
                  const d = new Date(sd.date);
                  return d.getFullYear() === calYear && d.getMonth() === calMonth;
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((sd) => {
                  const typeInfo = stopTypeOptions.find(opt => opt.value === sd.type);
                  const severityInfo = severityOptions.find(opt => opt.value === sd.severity);
                  const TypeIcon = typeInfo?.icon || AlertTriangle;
                  return (
                    <div key={sd.date} className="py-3 px-4 rounded-lg border" style={{ backgroundColor: `${typeInfo?.color || '#F97316'}08`, borderColor: `${typeInfo?.color || '#F97316'}20` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <TypeIcon className="w-4 h-4 shrink-0" style={{ color: typeInfo?.color }} />
                        <span className="text-sm font-semibold text-[#0C4A6E]">{sd.date}</span>
                        {severityInfo && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full text-white" style={{ backgroundColor: severityInfo.color }}>
                            {severityInfo.label}
                          </span>
                        )}
                        <span className="ml-auto text-sm font-medium" style={{ color: typeInfo?.color }}>{sd.reason}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-[#94A3B8]">
                        {sd.windForce !== undefined && (
                          <span className="px-2 py-1 bg-[#F97316]/10 rounded">风力 {sd.windForce} 级</span>
                        )}
                        {sd.tideLevel !== undefined && (
                          <span className="px-2 py-1 bg-[#0EA5E9]/10 rounded">潮汐偏差 {sd.tideLevel}m</span>
                        )}
                        {sd.terminalLimitCount !== undefined && (
                          <span className="px-2 py-1 bg-[#8B5CF6]/10 rounded">限流 {sd.terminalLimitCount} 人</span>
                        )}
                        {sd.affectedDocks && sd.affectedDocks.length > 0 && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            影响码头: {sd.affectedDocks.length} 个
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {formData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setFormData(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0C4A6E]">发布停航通知</h2>
              <button onClick={() => setFormData(null)} className="text-[#94A3B8] hover:text-[#0C4A6E]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#94A3B8] mb-4">日期: {formData.date}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-2">停航类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {stopTypeOptions.map(opt => {
                    const Icon = opt.icon;
                    const isActive = formData.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleTypeChange(opt.value as StopDayType)}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          isActive ? 'border-opacity-100 bg-opacity-10' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={isActive ? { borderColor: opt.color, backgroundColor: `${opt.color}10`, color: opt.color } : {}}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-2">严重程度</label>
                <div className="grid grid-cols-3 gap-2">
                  {severityOptions.map(opt => {
                    const isActive = formData.severity === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, severity: opt.value as any })}
                        className={`py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          isActive ? 'text-white border-transparent' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                        style={isActive ? { backgroundColor: opt.color } : {}}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">停航原因</label>
                <input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>

              {formData.type === "weather" && (
                <div>
                  <label className="block text-sm font-medium text-[#0C4A6E] mb-1">
                    <Wind className="w-4 h-4 inline mr-1" />
                    风力等级 (级)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={formData.windForce ?? ""}
                    onChange={(e) => setFormData({ ...formData, windForce: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                  <p className="text-xs text-[#94A3B8] mt-1">通常8级以上大风建议停航</p>
                </div>
              )}

              {formData.type === "tide" && (
                <div>
                  <label className="block text-sm font-medium text-[#0C4A6E] mb-1">
                    <Waves className="w-4 h-4 inline mr-1" />
                    潮汐水位偏差 (米)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tideLevel ?? ""}
                    onChange={(e) => setFormData({ ...formData, tideLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                  <p className="text-xs text-[#94A3B8] mt-1">正数表示水位过高，负数表示水位过低</p>
                </div>
              )}

              {formData.type === "terminal-limit" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#0C4A6E] mb-1">
                      <Users className="w-4 h-4 inline mr-1" />
                      码头限流人数
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.terminalLimitCount ?? ""}
                      onChange={(e) => setFormData({ ...formData, terminalLimitCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0C4A6E] mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      受影响码头 (不选则影响全部)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {docks.map(dock => {
                        const isSelected = (formData.affectedDocks || []).includes(dock.id);
                        return (
                          <button
                            key={dock.id}
                            type="button"
                            onClick={() => handleDockToggle(dock.id)}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                              isSelected
                                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                                : 'border-gray-200 hover:border-[#8B5CF6] text-gray-600'
                            }`}
                          >
                            {dock.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-2">受影响航线 (可选)</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {routes.map(route => {
                    const isSelected = (formData.affectedRoutes || []).includes(route.id);
                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => handleRouteToggle(route.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                          isSelected
                            ? 'bg-[#0C4A6E] text-white border-[#0C4A6E]'
                            : 'border-gray-200 hover:border-[#0C4A6E] text-gray-600'
                        }`}
                      >
                        {route.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#F0F9FF] rounded-lg text-xs text-[#94A3B8]">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-[#F97316]" />
                发布后系统将自动识别受影响班次，并对游客订单进行分类处置
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setFormData(null)} className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors">
                取消
              </button>
              <button onClick={confirmAddStopDay} className="px-6 py-2 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#082F49] transition-colors">
                发布停航
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
