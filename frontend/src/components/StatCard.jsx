
export default function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    cyan: "text-cyan-400 bg-cyan-400/10",
    green: "text-emerald-400 bg-emerald-400/10",
    red: "text-red-400 bg-red-400/10",
    orange: "text-orange-400 bg-orange-400/10",
  };

  return (
    <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-3">{value}</h3>
        </div>

        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">{subtitle}</p>
    </div>
  );
}
