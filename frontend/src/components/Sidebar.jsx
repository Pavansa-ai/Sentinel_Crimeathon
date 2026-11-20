
import {
  ShieldCheck,
  LayoutDashboard,
  KeyRound,
  Database,
  Gauge,
  Landmark,
  CreditCard,
  Activity,
  Settings,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Credentials", icon: KeyRound },
  { name: "Data Governance", icon: Database },
  { name: "Export Quotas", icon: Gauge },
  { name: "Financial Integrity", icon: Landmark },
  { name: "Payment Security", icon: CreditCard },
  { name: "ITDR Monitoring", icon: Activity },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-64 min-h-screen bg-[#0c1424] border-r border-slate-800 flex flex-col shrink-0">

      {/* Brand */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <ShieldCheck className="text-cyan-400" size={25} />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-widest text-white">
            SENTINEL
          </h1>
          <p className="text-[9px] tracking-[2px] text-slate-500">
            SECURITY PLATFORM
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 pt-8">
        <p className="text-[10px] font-semibold tracking-[2px] text-slate-500 px-3 mb-4">
          MAIN MENU
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.name;

            return (
              <button
                key={item.name}
                onClick={() => onNavigate(item.name)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition ${
                  active
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {item.name}
                </span>

                {active && <ChevronRight size={16} />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-400">
          <Settings size={18} />
          Settings
        </div>

        <div className="mt-4 rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-400">
            System protection
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">
              Gateway online
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
}
