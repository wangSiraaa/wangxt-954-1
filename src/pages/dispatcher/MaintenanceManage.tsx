import { useState, useEffect } from "react";
import { Wrench, Calendar, Ship, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { useShipStore } from "@/store/useShipStore";

export default function MaintenanceManage() {
  const { maintenances, addMaintenance, updateMaintenance, deleteMaintenance, refreshShipStatus } = useMaintenanceStore();
  const { ships } = useShipStore();
  const [form, setForm] = useState({ shipId: "", startDate: "", endDate: "", reason: "" });

  useEffect(() => {
    refreshShipStatus();
  }, []);

  const activeCount = maintenances.filter((m) => m.isActive).length;
  const totalCount = maintenances.length;

  const getShipName = (shipId: string) => ships.find((s) => s.id === shipId)?.name ?? "未知船只";

  const handleSubmit = () => {
    if (!form.shipId) { window.alert("请选择船只"); return; }
    if (!form.startDate) { window.alert("请选择开始日期"); return; }
    if (!form.endDate) { window.alert("请选择结束日期"); return; }
    if (!form.reason.trim()) { window.alert("请输入检修原因"); return; }
    try {
      addMaintenance({ ...form, isActive: true });
      setForm({ shipId: "", startDate: "", endDate: "", reason: "" });
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleEndMaintenance = (id: string) => {
    try {
      updateMaintenance(id, { isActive: false });
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  const handleDelete = (id: string) => {
    try {
      deleteMaintenance(id);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const sortedMaintenances = [...maintenances].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.startDate.localeCompare(a.startDate);
  });

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">检修管理</h1>
        <span className="ml-2 px-3 py-1 bg-[#F97316] text-white text-sm rounded-full">
          进行中 {activeCount}
        </span>
        <span className="px-3 py-1 bg-[#94A3B8]/20 text-[#0C4A6E] text-sm rounded-full">
          共 {totalCount} 条
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20">
            <h2 className="text-lg font-semibold text-[#0C4A6E] mb-4">检修记录</h2>
            {sortedMaintenances.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8]">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>暂无检修记录</p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[#94A3B8]/20" />
                <div className="space-y-4">
                  {sortedMaintenances.map((m) => (
                    <div
                      key={m.id}
                      className={`relative pl-6 pb-4 border-l-4 ${
                        m.isActive ? "border-[#F97316]" : "border-[#94A3B8]/20"
                      }`}
                    >
                      <div className={`absolute -left-[9px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                        m.isActive ? "bg-[#F97316] border-[#F97316]" : "bg-[#94A3B8] border-[#94A3B8]"
                      }`} />
                      <div className="bg-[#F0F9FF] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Ship className="w-4 h-4 text-[#0C4A6E]" />
                            <span className="font-medium text-[#0C4A6E]">{getShipName(m.shipId)}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              m.isActive
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {m.isActive ? "进行中" : "已结束"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {m.isActive && (
                              <button
                                onClick={() => handleEndMaintenance(m.id)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-3 h-3" />
                                结束检修
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-600 hover:text-white transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.startDate} ~ {m.endDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-sm text-[#0C4A6E]/70">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {m.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-5 border border-[#94A3B8]/20 sticky top-6">
            <h2 className="text-lg font-semibold text-[#0C4A6E] mb-4">新增检修</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">选择船只</label>
                <select
                  value={form.shipId}
                  onChange={(e) => setForm({ ...form, shipId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] bg-white"
                >
                  <option value="">请选择船只</option>
                  {ships.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">开始日期</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">结束日期</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">检修原因</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-2.5 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors font-medium"
              >
                添加检修记录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
