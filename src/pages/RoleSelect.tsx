import { useNavigate } from "react-router-dom";
import { Ship, Settings, Users, Anchor } from "lucide-react";

const roles = [
  {
    key: "dispatcher" as const,
    label: "调度员",
    desc: "管理船只信息、安排班次、处理检修与停航",
    icon: Settings,
    path: "/dispatcher",
  },
  {
    key: "tourist" as const,
    label: "游客",
    desc: "查询班次信息、预订船票、查看订单",
    icon: Users,
    path: "/tourist",
  },
  {
    key: "dock" as const,
    label: "码头人员",
    desc: "登记登船信息、查看登船记录",
    icon: Anchor,
    path: "/dock",
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden" style={{ background: "linear-gradient(160deg, #0C4A6E 0%, #075985 40%, #0369A1 100%)" }}>
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg
          className="relative block w-[calc(100%+1.3px)]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C150,90 350,10 500,50 C650,90 850,10 1000,50 C1150,90 1200,40 1200,40 L1200,120 L0,120 Z"
            fill="rgba(240,249,255,0.08)"
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
            d="M0,60 C200,20 400,90 600,50 C800,10 1000,80 1200,40 L1200,120 L0,120 Z"
            fill="rgba(240,249,255,0.05)"
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
          <path
            d="M0,80 C300,40 500,100 700,60 C900,20 1100,80 1200,60 L1200,120 L0,120 Z"
            fill="rgba(240,249,255,0.03)"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="-600 0"
              dur="10s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12 animate-[fadeInDown_0.6s_ease-out_both]">
          <Ship size={48} className="mx-auto text-[#F97316] mb-4" />
          <h1
            className="text-3xl md:text-4xl font-bold text-white tracking-wider"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            景区游船班次管理系统
          </h1>
          <p className="mt-3 text-sky-200/70 text-sm">请选择您的角色以进入系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {roles.map((r, i) => (
            <div
              key={r.key}
              className="group relative rounded-2xl p-6 md:p-8 flex flex-col items-center text-center
                bg-white/10 backdrop-blur-xl border border-white/20
                transition-all duration-300 ease-out
                hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:border-[#F97316]/60
                animate-[fadeInUp_0.5s_ease-out_both]"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-5 group-hover:bg-[#F97316]/20 transition-colors duration-300">
                <r.icon size={30} className="text-sky-100 group-hover:text-[#F97316] transition-colors duration-300" />
              </div>
              <h2
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                {r.label}
              </h2>
              <p className="text-sm text-sky-200/70 mb-6 leading-relaxed">{r.desc}</p>
              <button
                onClick={() => navigate(r.path)}
                className="mt-auto px-8 py-2.5 rounded-full bg-[#F97316] text-white font-medium text-sm
                  transition-all duration-200
                  hover:bg-[#ea580c] hover:shadow-lg hover:shadow-[#F97316]/30
                  active:scale-95"
              >
                进入
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
