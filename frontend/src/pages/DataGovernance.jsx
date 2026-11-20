
import { useEffect, useState } from "react";
import {
  Database,
  Download,
  Activity,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import api from "../api";

function DataGovernance() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = async () => {
    try {
      setError("");
      const response = await api.get("/data/activity");
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError("Unable to load data access activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, []);

  const totalRecords = activities.reduce(
    (sum, item) => sum + (Number(item.records_requested) || 0),
    0
  );

  const exportEvents = activities.filter(
    (item) => item.action?.toUpperCase() === "EXPORT"
  );

  const suspiciousExports = exportEvents.filter(
    (item) => Number(item.records_requested) >= 500
  );

  const statCards = [
    {
      title: "Access Events",
      value: activities.length,
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Records Requested",
      value: totalRecords.toLocaleString(),
      icon: Database,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Export Events",
      value: exportEvents.length,
      icon: Download,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Large Exports",
      value: suspiciousExports.length,
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-7 text-slate-200">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Data Governance
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor sensitive data access, exports and usage patterns.
          </p>
        </div>

        <button
          onClick={fetchActivity}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-[#111827] border border-slate-800 rounded-xl p-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-400">{card.title}</p>
                  <h2 className="text-2xl font-bold text-white mt-2">
                    {card.value}
                  </h2>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <Icon className={card.color} size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="text-emerald-400" size={20} />
          <h2 className="font-semibold text-white">
            Data Access Monitoring
          </h2>
        </div>

        <p className="text-sm text-slate-400">
          SENTINEL monitors integration activity and identifies large
          export requests for further investigation.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Large export indicator: 500 or more records in a single event.
        </p>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">
            Recent Data Access Activity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automatically refreshes every 15 seconds.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-slate-400">Loading activity...</p>
        ) : error ? (
          <p className="p-6 text-red-400">{error}</p>
        ) : activities.length === 0 ? (
          <p className="p-6 text-slate-400">
            No data access activity recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-500 bg-slate-900/60">
                <tr>
                  <th className="px-5 py-4">Identity</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Resource</th>
                  <th className="px-5 py-4">Records</th>
                  <th className="px-5 py-4">Source IP</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {activities.map((item) => {
                  const isLarge =
                    Number(item.records_requested) >= 500 &&
                    item.action?.toUpperCase() === "EXPORT";

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-white font-medium">
                        {item.identity}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                          {item.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.resource}
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {Number(item.records_requested || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {item.source_ip || "—"}
                      </td>
                      <td className="px-5 py-4">
                        {isLarge ? (
                          <span className="text-orange-400 flex items-center gap-1 text-xs">
                            <AlertTriangle size={14} />
                            Review
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-xs">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataGovernance;
