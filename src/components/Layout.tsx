import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Ship,
  Wrench,
  Calendar,
  Wind,
  Search,
  FileText,
  UserCheck,
  ClipboardList,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Grid3X3,
  ListChecks,
  Clock,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  BarChart3,
  QrCode,
} from "lucide-react";

type Role = "dispatcher" | "tourist" | "dock";

const navConfig: Record<
  Role,
  { label: string; path: string; icon: React.ElementType }[]
> = {
  dispatcher: [
    { label: "调度日历", path: "/dispatcher/calendar", icon: LayoutDashboard },
    { label: "余票矩阵", path: "/dispatcher/seat-matrix", icon: Grid3X3 },
    { label: "船只管理", path: "/dispatcher/ships", icon: Ship },
    { label: "检修管理", path: "/dispatcher/maintenance", icon: Wrench },
    { label: "班次管理", path: "/dispatcher/schedule", icon: Calendar },
    { label: "订单详情", path: "/dispatcher/orders", icon: ListChecks },
    { label: "候补转正", path: "/dispatcher/waiting-list", icon: Clock },
    { label: "停航日历", path: "/dispatcher/stop-days", icon: Wind },
    { label: "停航处置", path: "/dispatcher/stop-disposal", icon: AlertTriangle },
    { label: "退款明细", path: "/dispatcher/refunds", icon: CreditCard },
    { label: "船只检查", path: "/dispatcher/inspection", icon: ShieldCheck },
    { label: "运营统计", path: "/dispatcher/stats", icon: BarChart3 },
  ],
  tourist: [
    { label: "班次查询", path: "/tourist", icon: Search },
    { label: "我的订单", path: "/tourist/order", icon: FileText },
  ],
  dock: [
    { label: "登船核销", path: "/dock/verification", icon: QrCode },
    { label: "登船登记", path: "/dock/register", icon: UserCheck },
    { label: "登船记录", path: "/dock/records", icon: ClipboardList },
  ],
};

const roleLabels: Record<Role, string> = {
  dispatcher: "调度员",
  tourist: "游客",
  dock: "码头人员",
};

export default function Layout({ role }: { role: Role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const items = navConfig[role];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0C4A6E 0%, #075985 40%, #0369A1 100%)" }}>
      <nav className="h-16 flex items-center justify-between px-4 md:px-6 bg-[#0C4A6E]/90 backdrop-blur-md border-b border-white/10 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Ship size={26} className="text-[#F97316]" />
          <span className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            游船班次管理系统
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-sky-200 bg-white/10 px-3 py-1 rounded-full">
            {roleLabels[role]}
          </span>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-sky-200 hover:text-[#F97316] transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">切换角色</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            fixed md:static inset-y-0 left-0 top-16 z-20
            w-56 bg-[#0C4A6E]/80 backdrop-blur-lg border-r border-white/10
            flex flex-col overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <nav className="flex-1 py-4 space-y-1 px-3">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}`}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#F97316]/15 text-[#F97316] border-l-4 border-[#F97316] pl-3"
                      : "text-sky-200 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="relative h-20 shrink-0 overflow-hidden">
            <svg
              className="absolute bottom-0 left-0 w-[200%] h-full"
              viewBox="0 0 1200 80"
              preserveAspectRatio="none"
            >
              <path
                d="M0,40 C150,80 350,0 500,40 C650,80 850,0 1000,40 C1150,80 1200,40 1200,40 L1200,80 L0,80 Z"
                fill="rgba(240,249,255,0.06)"
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="0 0"
                  to="-600 0"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </path>
              <path
                d="M0,50 C200,20 400,70 600,40 C800,10 1000,60 1200,30 L1200,80 L0,80 Z"
                fill="rgba(240,249,255,0.04)"
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="0 0"
                  to="-600 0"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/40 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-[#F0F9FF]/95">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
