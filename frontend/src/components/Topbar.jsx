
import { Bell, Search, ShieldCheck } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-20 bg-[#0c1424] border-b border-slate-800 flex items-center justify-between px-8">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Security Overview
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor your integration security environment
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-2 bg-[#111d30] border border-slate-800 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            placeholder="Search..."
            className="bg-transparent outline-none text-sm text-white w-32"
          />
        </div>

        <button className="relative text-slate-400 hover:text-white">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3 border-l border-slate-800 pl-5">
          <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <ShieldCheck size={19} className="text-cyan-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-white font-medium">Administrator</p>
            <p className="text-[11px] text-slate-500">Security Operator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
