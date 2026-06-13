import { useState, useMemo } from "react";
import { Clock, Ship, Plus, Trash2, Ticket, Users } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useShipStore } from "@/store/useShipStore";
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

export default function ScheduleManage() {
  const { schedules, addSchedule, deleteSchedule, getByDate } = useScheduleStore();
  const { ships } = useShipStore();
  const { isStopDay } = useStopDayStore();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    shipId: "",
    date: "",
    departureTime: "",
    ticketPrice: 0,
    totalSeats: 0,
  });

  const availableShips = ships.filter((s) => s.status === "available");
  const daySchedules = getByDate(selectedDate);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDay]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(formatDate(calYear, calMonth, day));
  };

  const openAddForm = () => {
    setForm({ shipId: "", date: selectedDate, departureTime: "", ticketPrice: 0, totalSeats: 0 });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.shipId) { window.alert("请选择船只"); return; }
    if (!form.date) { window.alert("请选择日期"); return; }
    if (!form.departureTime) { window.alert("请输入出发时间"); return; }
    if (form.ticketPrice <= 0) { window.alert("票价必须大于0"); return; }
    if (form.totalSeats <= 0) { window.alert("总座位数必须大于0"); return; }
    try {
      addSchedule({
        shipId: form.shipId,
        date: form.date,
        departureTime: form.departureTime,
        ticketPrice: form.ticketPrice,
        totalSeats: form.totalSeats,
        availableSeats: form.totalSeats,
      });
      setShowForm(false);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleDelete = (id: string) => {
    try {
      deleteSchedule(id);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const getShipName = (shipId: string) => ships.find((s) => s.id === shipId)?.name ?? "未知";

  const hasSchedule = (day: number) => {
    const dateStr = formatDate(calYear, calMonth, day);
    return schedules.some((s) => s.date === dateStr);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">班次管理</h1>
        <span className="ml-2 px-3 py-1 bg-[#0C4A6E] text-white text-sm rounded-full">
          {selectedDate} 共 {daySchedules.length} 班
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-2 py-1 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded transition-colors font-bold">&lt;</button>
            <span className="font-semibold text-[#0C4A6E]">{calYear}年{calMonth + 1}月</span>
            <button onClick={nextMonth} className="px-2 py-1 text-[#0C4A6E] hover:bg-[#F0F9FF] rounded transition-colors font-bold">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#94A3B8] mb-1">
            {weekdayLabels.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = formatDate(calYear, calMonth, day);
              const selected = dateStr === selectedDate;
              const stopDay = isStopDay(dateStr);
              const hasSched = hasSchedule(day);
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`relative w-9 h-9 text-sm rounded-lg flex items-center justify-center transition-colors ${
                    selected
                      ? "bg-[#0C4A6E] text-white"
                      : stopDay
                        ? "bg-red-100 text-red-600"
                        : "text-[#0C4A6E] hover:bg-[#0C4A6E]/10"
                  }`}
                >
                  {day}
                  {hasSched && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FBBF24] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#0C4A6E]">{selectedDate} 班次</h2>
            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0C4A6E] text-white text-sm rounded-lg hover:bg-[#083344] transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增班次
            </button>
          </div>

          {isStopDay(selectedDate) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-600 text-sm">
              当日为停航日，无法添加班次
            </div>
          )}

          {daySchedules.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-[#94A3B8]/20 text-center text-[#94A3B8]">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>当日暂无班次</p>
            </div>
          ) : (
            <div className="space-y-3">
              {daySchedules.map((s) => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-[#94A3B8]/20 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#0C4A6E]/10 flex items-center justify-center">
                    <Ship className="w-5 h-5 text-[#0C4A6E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#0C4A6E]">{getShipName(s.shipId)}</span>
                      <span className="flex items-center gap-1 text-sm text-[#94A3B8]">
                        <Clock className="w-3.5 h-3.5" />
                        {s.departureTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-[#F97316]">
                        <Ticket className="w-3.5 h-3.5" />
                        ¥{s.ticketPrice}
                      </span>
                      <span className="flex items-center gap-1 text-[#94A3B8]">
                        <Users className="w-3.5 h-3.5" />
                        {s.availableSeats}/{s.totalSeats}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-[#94A3B8]/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FBBF24] rounded-full transition-all"
                        style={{ width: `${(s.availableSeats / s.totalSeats) * 100}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-4">新增班次</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">船只</label>
                <select
                  value={form.shipId}
                  onChange={(e) => setForm({ ...form, shipId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] bg-white"
                >
                  <option value="">请选择船只</option>
                  {availableShips.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">日期</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">出发时间</label>
                <input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">票价 (元)</label>
                <input
                  type="number"
                  min={1}
                  value={form.ticketPrice || ""}
                  onChange={(e) => setForm({ ...form, ticketPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">总座位数</label>
                <input
                  type="number"
                  min={1}
                  value={form.totalSeats || ""}
                  onChange={(e) => setForm({ ...form, totalSeats: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors">
                取消
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
