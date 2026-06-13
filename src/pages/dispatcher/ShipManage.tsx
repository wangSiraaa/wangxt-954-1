import { useState, useEffect } from "react";
import { Ship, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useShipStore } from "@/store/useShipStore";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";

export default function ShipManage() {
  const { ships, addShip, updateShip, deleteShip } = useShipStore();
  const { refreshShipStatus } = useMaintenanceStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", capacity: 0 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    refreshShipStatus();
  }, []);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      window.alert("请输入船名");
      return;
    }
    if (form.capacity <= 0) {
      window.alert("载客量必须大于0");
      return;
    }
    try {
      if (editingId) {
        updateShip(editingId, { name: form.name, capacity: form.capacity });
      } else {
        addShip({ name: form.name, capacity: form.capacity, status: "available" });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", capacity: 0 });
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  const handleEdit = (id: string) => {
    const ship = ships.find((s) => s.id === id);
    if (!ship) return;
    setForm({ name: ship.name, capacity: ship.capacity });
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    try {
      deleteShip(id);
      refreshShipStatus();
      setConfirmDeleteId(null);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", capacity: 0 });
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Ship className="w-7 h-7 text-[#0C4A6E]" />
          <h1 className="text-2xl font-bold text-[#0C4A6E]">船只管理</h1>
          <span className="ml-2 px-3 py-1 bg-[#0C4A6E] text-white text-sm rounded-full">
            共 {ships.length} 艘
          </span>
        </div>
        <button
          onClick={() => { setForm({ name: "", capacity: 0 }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增船只
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ships.map((ship) => (
          <div
            key={ship.id}
            className="bg-white rounded-xl p-5 border border-[#94A3B8]/20 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#0C4A6E]">{ship.name}</h3>
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  ship.status === "available"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {ship.status === "available" ? "可用" : "检修中"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8] mb-4">
              <Users className="w-4 h-4" />
              <span className="text-sm">载客量: {ship.capacity} 人</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(ship.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0C4A6E] bg-[#F0F9FF] rounded-lg hover:bg-[#0C4A6E] hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </button>
              <button
                onClick={() => setConfirmDeleteId(ship.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {ships.length === 0 && (
        <div className="text-center py-16 text-[#94A3B8]">
          <Ship className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无船只，点击右上角新增</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeForm}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-4">
              {editingId ? "编辑船只" : "新增船只"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">船名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-1">载客量</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity || ""}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#94A3B8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeForm} className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors">
                取消
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors">
                {editingId ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-2">确认删除</h2>
            <p className="text-[#94A3B8] mb-5">确定要删除该船只吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-[#94A3B8] hover:text-[#0C4A6E] transition-colors">
                取消
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
