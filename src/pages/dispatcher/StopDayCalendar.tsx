import { useState, useMemo } from "react";
import { Calendar, AlertTriangle, X } from "lucide-react";
import { useStopDayStore } from "@/store/useStopDayStore";

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

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [reasonInput, setReasonInput] = useState<{ date: string; reason: string } | null>(null);

  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

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

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(calYear, calMonth, day);
    if (isStopDay(dateStr)) {
      try {
        removeStopDay(dateStr);
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : "操作失败");
      }
    } else {
      setReasonInput({ date: dateStr, reason: "大风停航" });
    }
  };

  const confirmAddStopDay = () => {
    if (!reasonInput) return;
    if (!reasonInput.reason.trim()) {
      window.alert("请输入停航原因");
      return;
    }
    try {
      addStopDay({ date: reasonInput.date, reason: reasonInput.reason });
      setReasonInput(null);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  const getStopReason = (date: string) => stopDays.find((sd) => sd.date === date)?.reason ?? "";

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
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm ${
                    stop
                      ? "bg-[#F97316]/15 border-2 border-[#F97316]/40 text-[#F97316] hover:bg-[#F97316]/25"
                      : isToday
                        ? "bg-[#0C4A6E]/10 border border-[#0C4A6E]/30 text-[#0C4A6E] hover:bg-[#0C4A6E]/15"
                        : "text-[#0C4A6E] hover:bg-[#0C4A6E]/5"
                  }`}
                >
                  <span className="font-medium">{day}</span>
                  {stop && (
                    <span className="text-[10px] leading-tight truncate w-full px-1 text-[#F97316]">
                      {getStopReason(dateStr)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#94A3B8]/20">
            <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#F97316]/15 border border-[#F97316]/40" />
                停航日（点击取消）
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0C4A6E]/10 border border-[#0C4A6E]/30" />
                今天
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
                .map((sd) => (
                  <div key={sd.date} className="flex items-center gap-3 py-2 px-3 bg-[#F97316]/5 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-[#F97316] shrink-0" />
                    <span className="text-sm font-medium text-[#0C4A6E]">{sd.date}</span>
                    <span className="text-sm text-[#94A3B8]">—</span>
                    <span className="text-sm text-[#F97316]">{sd.reason}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {reasonInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setReasonInput(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0C4A6E]">设置停航日</h2>
              <button onClick={() => setReasonInput(null)} className="text-[#94A3B8] hover:text-[#0C4A6E]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#94A3B8] mb-3">日期: {reasonInput.date}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0C4A6E] mb-1">停航原因</label>
              <input
                value={reasonInput.reason}
                onChange={(e) => setReasonInput({ ...reasonInput, reason: e.target.value })}
                className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReasonInput(null)} className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors">
                取消
              </button>
              <button onClick={confirmAddStopDay} className="px-4 py-2 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors">
                确认停航
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
