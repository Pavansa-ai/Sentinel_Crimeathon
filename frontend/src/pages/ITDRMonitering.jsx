
import { useEffect, useState } from "react";
import {
  Activity,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ScanSearch,
  CheckCircle,
  Clock,
  Wifi,
} from "lucide-react";
import api from "../api";

function ITDRMonitoring() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [resolving, setResolving] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      setError("");
      const response = await api.get("/itdr/alerts");
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError("Unable to load ITDR alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const runScan = async () => {
    setScanning(true);
    setMessage("");
    setError("");
    setScanResult(null);

    try {
      const response = await api.post("/itdr/scan");
      setScanResult(response.data);
      setMessage("ITDR scan completed successfully.");
      await fetchAlerts();
    } catch (err) {
      setError(err.response?.data?.detail || "ITDR scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const resolveAlert = async (alertRef) => {
    setResolving(alertRef);
    setMessage("");
    setError("");

    try {
      await api.patch(
        `/itdr/alerts/${encodeURIComponent(alertRef)}/resolve`
      );

      setMessage(`Alert ${alertRef} resolved successfully.`);
      await fetchAlerts();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to resolve alert."
      );
    } finally {
      setResolving("");
    }
  };

  const openAlerts = alerts.filter(
    (alert) => alert.status?.toLowerCase() === "open"
  );

  const criticalAlerts = openAlerts.filter(
    (alert) => alert.severity?.toLowerCase() === "critical"
  );

  const highAlerts = openAlerts.filter(
    (alert) => alert.severity?.toLowerCase() === "high"
  );

  const stats = [
    {
      label: "Total Alerts",
      value: alerts.length,
      icon: Activity,
      color: "text-blue-400",
    },
    {
      label: "Open Alerts",
      value: openAlerts.length,
      icon: ShieldAlert,
      color: "text-orange-400",
    },
    {
      label: "Critical Alerts",
      value: criticalAlerts.length,
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      label: "High Alerts",
      value: highAlerts.length,
      icon: Wifi,
      color: "text-amber-400",
    },
  ];

  const severityStyle = {
    critical: "text-red-400 bg-red-500/10",
    high: "text-orange-400 bg-orange-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    low: "text-slate-400 bg-slate-500/10",
  };

  return (
    <div className="p-6 md:p-8 space-y-7 text-slate-200">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            ITDR Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Identity Threat Detection and Response monitoring.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm"
          >
            <ScanSearch size={17} />
            {scanning ? "Scanning..." : "Run ITDR Scan"}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-[#111827] border border-slate-800 rounded-xl p-5"
            >
              <Icon className={`${stat.color} mb-3`} size={23} />
              <p className="text-sm text-slate-400">{stat.label}</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {loading ? "..." : stat.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="bg-[#111827] border border-cyan-500/20 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">
            Latest Scan Results
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Scan Status</p>
              <p className="text-emerald-400 font-medium mt-1">
                {scanResult.message}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Authentication Alerts
              </p>
              <p className="text-xl text-white font-bold mt-1">
                {scanResult.authentication_alerts_detected ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Bulk Export Alerts
              </p>
              <p className="text-xl text-white font-bold mt-1">
                {scanResult.bulk_export_alerts_detected ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Detection Groups
              </p>
              <p className="text-xl text-white font-bold mt-1">
                {scanResult.total_detection_groups ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-cyan-400" size={21} />
            <h2 className="font-semibold text-white">
              Security Alerts
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automatically refreshes every 15 seconds.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-slate-400">Loading alerts...</p>
        ) : error && alerts.length === 0 ? (
          <p className="p-6 text-red-400">{error}</p>
        ) : alerts.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck
              className="mx-auto text-emerald-400 mb-3"
              size={34}
            />
            <p className="text-white font-medium">
              No security alerts found
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Run an ITDR scan to check for suspicious activity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-500 bg-slate-900/60">
                <tr>
                  <th className="px-5 py-4">Alert Reference</th>
                  <th className="px-5 py-4">Identity</th>
                  <th className="px-5 py-4">Alert Type</th>
                  <th className="px-5 py-4">Source IP</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Events</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {alerts.map((alert) => {
                  const severity =
                    alert.severity?.toLowerCase() || "low";

                  const isOpen =
                    alert.status?.toLowerCase() === "open";

                  return (
                    <tr
                      key={alert.alert_ref}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 text-white font-medium whitespace-nowrap">
                        {alert.alert_ref}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {alert.identity || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {alert.alert_type}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {alert.source_ip || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded text-xs uppercase ${severityStyle[severity] || severityStyle.low}`}>
                          {severity}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-white">
                        {alert.event_count}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`text-xs ${isOpen ? "text-amber-400" : "text-emerald-400"}`}>
                          {alert.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isOpen ? (
                          <button
                            onClick={() => resolveAlert(alert.alert_ref)}
                            disabled={resolving === alert.alert_ref}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs"
                          >
                            {resolving === alert.alert_ref
                              ? "Resolving..."
                              : "Resolve"}
                          </button>
                        ) : (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle size={14} />
                            Resolved
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert descriptions */}
      {alerts.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">
            Alert Investigation Details
          </h2>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.alert_ref}
                className="border-b border-slate-800 last:border-0 pb-4 last:pb-0"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm text-white font-medium">
                    {alert.alert_type}
                  </p>
                  <span className="text-xs text-slate-500">
                    <Clock size={12} className="inline mr-1" />
                    {alert.created_at
                      ? new Date(alert.created_at).toLocaleString()
                      : "—"}
                  </span>
                </div>

                <p className="text-sm text-slate-400 mt-2">
                  {alert.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          {message}
        </div>
      )}

      {error && alerts.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

export default ITDRMonitoring;
