import { useState, useMemo } from "react";
import { Ship, User, Shield, FileCheck, Wrench, Award, Eye } from "lucide-react";
import { useShipStore } from "@/store/useShipStore";
import { useBaseStore } from "@/store/useBaseStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useOrderStore } from "@/store/useOrderStore";
import type { Ship as ShipType } from "@/types";

function getShipStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    maintenance: "bg-yellow-100 text-yellow-700",
    inactive: "bg-gray-100 text-gray-700",
    inspection: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getShipStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "营运中",
    maintenance: "检修中",
    inactive: "停运",
    inspection: "安检中",
  };
  return labels[status] || status;
}

function getInspectionStatusColor(status: string) {
  const colors: Record<string, string> = {
    passed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getInspectionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    passed: "合格",
    failed: "不合格",
    pending: "待检查",
  };
  return labels[status] || status;
}

function maskIdCard(idCard: string) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + "********" + idCard.slice(-4);
}

export default function ShipInspection() {
  const { ships, inspections, maintenances, addInspection } = useShipStore();
  const { shipTypes, captains } = useBaseStore();
  const { schedules } = useScheduleStore();
  const { orders } = useOrderStore();

  const [selectedShipId, setSelectedShipId] = useState<string>("all");
  const [inspectionFilter, setInspectionFilter] = useState<string>("all");
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    shipId: "",
    inspector: "",
    items: [] as { name: string; result: "pass" | "fail" | "na"; remark: string }[],
    overallResult: "passed" as "passed" | "failed" | "pending",
    remark: "",
  });

  const inspectionItems = [
    { name: "船体结构", category: "船体" },
    { name: "救生设备", category: "安全" },
    { name: "消防设备", category: "安全" },
    { name: "导航设备", category: "设备" },
    { name: "通讯设备", category: "设备" },
    { name: "动力系统", category: "机械" },
    { name: "舵机系统", category: "机械" },
    { name: "电气系统", category: "电气" },
    { name: "船员资质", category: "人员" },
    { name: "应急预案", category: "管理" },
  ];

  const selectedShip = useMemo(() => {
    if (selectedShipId === "all") return null;
    return ships.find((s) => s.id === selectedShipId);
  }, [selectedShipId, ships]);

  const filteredInspections = useMemo(() => {
    return inspections
      .filter((i) => {
        if (selectedShipId !== "all" && i.shipId !== selectedShipId) return false;
        if (inspectionFilter !== "all" && i.result !== inspectionFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
  }, [inspections, selectedShipId, inspectionFilter]);

  const stats = useMemo(() => {
    const activeShips = ships.filter((s) => s.status === "active").length;
    const maintenanceShips = ships.filter((s) => s.status === "maintenance").length;
    const totalCapacity = ships.reduce((sum, s) => {
      const shipType = shipTypes.find((t) => t.id === s.shipTypeId);
      return sum + (shipType?.passengerCapacity || 0);
    }, 0);
    const recentInspections = filteredInspections.slice(0, 10);
    const passRate = recentInspections.length > 0
      ? ((recentInspections.filter((i) => i.result === "passed").length / recentInspections.length) * 100).toFixed(1)
      : "0";
    return {
      totalShips: ships.length,
      activeShips,
      maintenanceShips,
      totalCapacity,
      passRate,
      pendingInspections: inspections.filter((i) => i.result === "pending").length,
    };
  }, [ships, shipTypes, filteredInspections, inspections]);

  const getShipStats = (ship: ShipType) => {
    const shipSchedules = schedules.filter((s) => s.shipId === ship.id);
    const shipOrders = orders.filter((o) => {
      const schedule = schedules.find((s) => s.id === o.scheduleId);
      return schedule?.shipId === ship.id;
    });
    const shipType = shipTypes.find((t) => t.id === ship.shipTypeId);
    const captain = captains.find((c) => c.id === ship.captainId);
    const latestInspection = inspections
      .filter((i) => i.shipId === ship.id)
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())[0];
    const activeMaintenance = maintenances.find(
      (m) => m.shipId === ship.id && m.status === "in_progress"
    );
    return { shipSchedules, shipOrders, shipType, captain, latestInspection, activeMaintenance };
  };

  const getShipTypeInfo = (shipTypeId: string) => {
    return shipTypes.find((t) => t.id === shipTypeId);
  };

  const getCaptainInfo = (captainId: string) => {
    return captains.find((c) => c.id === captainId);
  };

  const handleStartInspection = (shipId: string) => {
    setNewInspection({
      shipId,
      inspector: "调度员",
      items: inspectionItems.map((item) => ({ name: item.name, result: "na" as const, remark: "" })),
      overallResult: "pending",
      remark: "",
    });
    setShowInspectionModal(true);
  };

  const handleSaveInspection = () => {
    if (!newInspection.shipId) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    addInspection({
      shipId: newInspection.shipId,
      inspectionDate: dateStr,
      inspector: newInspection.inspector,
      result: newInspection.overallResult,
      items: newInspection.items,
      remark: newInspection.remark,
    });
    
    setShowInspectionModal(false);
    setNewInspection({
      shipId: "",
      inspector: "",
      items: [],
      overallResult: "passed",
      remark: "",
    });
  };

  const updateInspectionItem = (index: number, field: "result" | "remark", value: string) => {
    setNewInspection((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      
      const hasFail = items.some((i) => i.result === "fail");
      const allNa = items.every((i) => i.result === "na");
      let overallResult: "passed" | "failed" | "pending" = "passed";
      if (hasFail) overallResult = "failed";
      else if (allNa) overallResult = "pending";
      
      return { ...prev, items, overallResult };
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-[#0C4A6E]" />
        <h1 className="text-2xl font-bold text-[#0C4A6E]">船只检查</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">船只总数</div>
          <div className="text-2xl font-bold text-[#0C4A6E]">{stats.totalShips}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">营运中</div>
          <div className="text-2xl font-bold text-green-600">{stats.activeShips}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">检修中</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.maintenanceShips}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">总载客量</div>
          <div className="text-2xl font-bold text-[#F97316]">{stats.totalCapacity}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">安检合格率</div>
          <div className="text-2xl font-bold text-blue-600">{stats.passRate}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#94A3B8]/20">
          <div className="text-xs text-[#64748B] mb-1">待检查</div>
          <div className="text-2xl font-bold text-purple-600">{stats.pendingInspections}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-sm text-[#64748B] mb-1">选择船只</label>
          <select
            value={selectedShipId}
            onChange={(e) => setSelectedShipId(e.target.value)}
            className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
          >
            <option value="all">全部船只</option>
            {ships.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#64748B] mb-1">检查结果</label>
          <select
            value={inspectionFilter}
            onChange={(e) => setInspectionFilter(e.target.value)}
            className="px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
          >
            <option value="all">全部</option>
            <option value="passed">合格</option>
            <option value="failed">不合格</option>
            <option value="pending">待检查</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0C4A6E]">船只列表</h2>
          {ships.map((ship) => {
            const stats = getShipStats(ship);
            const shipType = getShipTypeInfo(ship.shipTypeId);
            const captain = getCaptainInfo(ship.captainId);
            return (
              <div
                key={ship.id}
                className={`p-5 rounded-xl border transition-colors ${
                  selectedShipId === ship.id
                    ? "bg-[#F0F9FF] border-[#0C4A6E]"
                    : "bg-white border-[#94A3B8]/20"
                }`}
                onClick={() => setSelectedShipId(ship.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                      <Ship className="w-7 h-7 text-[#0C4A6E]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0C4A6E] text-lg">{ship.name}</div>
                      <div className="text-sm text-[#64748B]">{ship.code}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${getShipStatusColor(ship.status)}`}>
                    {getShipStatusLabel(ship.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-[#64748B] mb-1">船型</div>
                    <div className="font-medium text-[#0C4A6E]">{shipType?.name || "-"}</div>
                    <div className="text-xs text-[#64748B]">
                      载客 {shipType?.passengerCapacity || 0} 人 · 长度 {shipType?.length || 0}m
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B] mb-1">船长</div>
                    <div className="font-medium text-[#0C4A6E]">{captain?.name || "-"}</div>
                    <div className="text-xs text-[#64748B]">
                      资质 {captain?.licenseLevel || "-"} · {captain?.yearsOfExperience || 0}年经验
                    </div>
                  </div>
                </div>

                {stats.latestInspection && (
                  <div className="p-3 bg-white rounded-lg border border-[#94A3B8]/10 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#64748B]" />
                        <span className="text-sm text-[#64748B]">最近检查</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getInspectionStatusColor(stats.latestInspection.result)}`}>
                        {getInspectionStatusLabel(stats.latestInspection.result)}
                      </span>
                    </div>
                    <div className="text-sm text-[#0C4A6E] mt-1">
                      {stats.latestInspection.inspectionDate} · {stats.latestInspection.inspector}
                    </div>
                  </div>
                )}

                {stats.activeMaintenance && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <Wrench className="w-4 h-4" />
                      <span className="text-sm font-medium">检修中：{stats.activeMaintenance.reason}</span>
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      预计完成：{stats.activeMaintenance.plannedEndDate || "未设定"}
                    </div>
                  </div>
                )}

                {ship.status === "active" && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartInspection(ship.id);
                      }}
                      className="flex-1 py-2 bg-[#0C4A6E] text-white rounded-lg text-sm font-medium hover:bg-[#083344] transition-colors flex items-center justify-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      开始检查
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="px-4 py-2 border border-[#0C4A6E]/30 text-[#0C4A6E] rounded-lg text-sm font-medium hover:bg-[#0C4A6E]/5 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0C4A6E]">检查记录</h2>
          {filteredInspections.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-[#94A3B8]/20 text-center text-[#94A3B8]">
              <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-1">暂无检查记录</p>
              <p className="text-sm">选择船只或开始新的检查</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInspections.slice(0, 10).map((inspection) => {
                const ship = ships.find((s) => s.id === inspection.shipId);
                return (
                  <div key={inspection.id} className="p-4 bg-white rounded-xl border border-[#94A3B8]/20">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-[#0C4A6E]">
                          {ship?.name || "未知船只"}
                        </div>
                        <div className="text-sm text-[#64748B]">
                          {inspection.inspectionDate} · {inspection.inspector}
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${getInspectionStatusColor(inspection.result)}`}>
                        {getInspectionStatusLabel(inspection.result)}
                      </span>
                    </div>
                    
                    {inspection.items && inspection.items.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {inspection.items.filter((i) => i.result !== "na").map((item, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full ${
                                item.result === "pass"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {inspection.remark && (
                      <div className="text-sm text-[#64748B] p-3 bg-[#F8FAFC] rounded-lg">
                        备注：{inspection.remark}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedShip && (
            <div className="p-5 bg-white rounded-xl border border-[#94A3B8]/20">
              <h3 className="font-semibold text-[#0C4A6E] mb-4">船长资质信息</h3>
              {(() => {
                const captain = getCaptainInfo(selectedShip.captainId);
                if (!captain) {
                  return <div className="text-[#94A3B8]">暂无船长信息</div>;
                }
                return (
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-[#0C4A6E]/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-[#0C4A6E]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#0C4A6E] text-lg">{captain.name}</div>
                        <div className="text-sm text-[#64748B]">{captain.licenseNo}</div>
                      </div>
                      <div className="ml-auto">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-medium">{captain.licenseLevel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#64748B] mb-1">身份证号</div>
                        <div className="text-sm text-[#0C4A6E]">{maskIdCard(captain.idCard)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B] mb-1">从业年限</div>
                        <div className="text-sm text-[#0C4A6E]">{captain.yearsOfExperience} 年</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B] mb-1">驾驶证有效期</div>
                        <div className="text-sm text-[#0C4A6E]">{captain.licenseValidDate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B] mb-1">联系电话</div>
                        <div className="text-sm text-[#0C4A6E]">{captain.phone}</div>
                      </div>
                    </div>
                    {captain.certifications && captain.certifications.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-[#64748B] mb-2">所持证书</div>
                        <div className="flex flex-wrap gap-2">
                          {captain.certifications.map((cert, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0C4A6E]">船只安全检查</h2>
              <button
                onClick={() => setShowInspectionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0C4A6E] mb-2">检查船只</label>
                  <select
                    value={newInspection.shipId}
                    onChange={(e) => setNewInspection((prev) => ({ ...prev, shipId: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
                  >
                    <option value="">请选择船只</option>
                    {ships.filter((s) => s.status === "active").map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0C4A6E] mb-2">检查人员</label>
                  <input
                    type="text"
                    value={newInspection.inspector}
                    onChange={(e) => setNewInspection((prev) => ({ ...prev, inspector: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
                    placeholder="检查人员姓名"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-3">检查项目</label>
                <div className="space-y-2">
                  {newInspection.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-[#0C4A6E] text-sm">{item.name}</div>
                      </div>
                      <select
                        value={item.result}
                        onChange={(e) => updateInspectionItem(idx, "result", e.target.value)}
                        className="px-3 py-1 border border-[#94A3B8]/30 rounded text-sm"
                      >
                        <option value="na">未检</option>
                        <option value="pass">合格</option>
                        <option value="fail">不合格</option>
                      </select>
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) => updateInspectionItem(idx, "remark", e.target.value)}
                        placeholder="备注"
                        className="flex-1 px-3 py-1 border border-[#94A3B8]/30 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-2">总体结果</label>
                <div className="flex items-center gap-4">
                  <span className={`text-sm px-3 py-1 rounded-full ${getInspectionStatusColor(newInspection.overallResult)}`}>
                    {getInspectionStatusLabel(newInspection.overallResult)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0C4A6E] mb-2">检查备注</label>
                <textarea
                  value={newInspection.remark}
                  onChange={(e) => setNewInspection((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="填写检查备注..."
                  rows={3}
                  className="w-full px-4 py-2 border border-[#94A3B8]/30 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInspectionModal(false)}
                className="flex-1 py-3 border border-[#94A3B8]/30 text-[#64748B] rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveInspection}
                disabled={!newInspection.shipId}
                className="flex-1 py-3 bg-[#0C4A6E] text-white rounded-lg hover:bg-[#083344] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存检查记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
