
import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Clock3, ShieldAlert } from "lucide-react";
import api from "../api";

export default function ITDRAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      setError("");
      const response = await api.get("/itdr/alerts");
      setAlerts(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load ITDR alerts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const severityStyle = {
    critical: "bg-red-500/10 text-red-400",
    high: "bg-orange-500/10 text-orange-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    low: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className="bg-[#0c1424] border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <ShieldAlert size={18} className="text-cyan-400" />
            ITDR Security Alerts
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Live alerts from SENTINEL backend
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading security alerts...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 text-sm">
          {error}
          <button
            onClick={fetchAlerts}
            className="block mx-auto mt-3 underline"
          >
            Try again
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-8 text-center">
          <ShieldAlert className="mx-auto text-emerald-400 mb-3" size={30} />
          <p className="text-white text-sm">No security alerts found</p>
          <p className="text-xs text-slate-500 mt-1">
            SENTINEL has no recorded ITDR alerts to display.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead className="text-xs text-slate-500 bg-slate-900/50">
              <tr>
                <th className="p-4 font-medium">THREAT</th>
                <th className="p-4 font-medium">IDENTITY</th>
                <th className="p-4 font-medium">SOURCE IP</th>
                <th className="p-4 font-medium">SEVERITY</th>
                <th className="p-4 font-medium">STATUS</th>
                <th className="p-4 font-medium">TIME</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_ref} className="border-t border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <AlertTriangle size={15} className="text-orange-400" />
                      {alert.alert_type}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {alert.description}
                    </p>
                  </td>

                  <td className="p-4 text-sm text-slate-300">
                    {alert.identity || "Unknown"}
                  </td>

                  <td className="p-4 text-sm text-slate-400">
                    {alert.source_ip || "Unknown"}
                  </td>

                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      severityStyle[(alert.severity || "medium").toLowerCase()]
                      || severityStyle.medium
                    }`}>
                      {alert.severity?.toUpperCase() || "MEDIUM"}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className={`text-xs ${
                      alert.status === "open"
                        ? "text-orange-400"
                        : "text-emerald-400"
                    }`}>
                      {alert.status?.toUpperCase()}
                    </span>
                  </td>

                  <td className="p-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock3 size={13} />
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleString()
                        : "Unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-slate-800 text-xs text-slate-500">
        {alerts.length} alert(s) retrieved from the backend
      </div>
    </div>
  );
}
