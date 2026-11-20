
import { useEffect, useState } from "react";
import {
  Gauge,
  ShieldCheck,
  RefreshCw,
  Save,
  AlertTriangle,
} from "lucide-react";
import api from "../api";

function DataQuota() {
  const [integrations, setIntegrations] = useState([]);
  const [identity, setIdentity] = useState("");
  const [exportLimit, setExportLimit] = useState(2000);
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchIntegrations = async () => {
    try {
      setError("");
      const response = await api.get("/credentials/");
      setIntegrations(response.data);

      if (response.data.length > 0 && !identity) {
        setIdentity(response.data[0].identity);
      }
    } catch (err) {
      setError("Unable to load integrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const updateQuota = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await api.patch(
        `/data-governance/quota/${encodeURIComponent(identity)}`,
        {
          export_limit: Number(exportLimit),
          export_window_minutes: Number(windowMinutes),
        }
      );

      setMessage(`Export quota successfully updated for ${identity}.`);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to update export quota."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-7 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Export Quota Management
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure record limits for individual integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Gauge className="text-blue-400" size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Registered Integrations</p>
              <h2 className="text-2xl font-bold text-white">
                {integrations.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <ShieldCheck className="text-emerald-400" size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Quota Enforcement</p>
              <h2 className="text-xl font-bold text-white">Enabled</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            Configure Export Limits
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Set the maximum number of records an integration can export
            within a specified time window.
          </p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <p className="text-slate-400">No integrations found.</p>
        ) : (
          <form onSubmit={updateQuota} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Select Integration
              </label>
              <select
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-4 py-3 text-white"
              >
                {integrations.map((item) => (
                  <option key={item.identity} value={item.identity}>
                    {item.identity}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Maximum Export Records
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={exportLimit}
                  onChange={(e) => setExportLimit(e.target.value)}
                  className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Export Window (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(e.target.value)}
                  className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="text-amber-400 mt-0.5" size={18} />
              <p className="text-xs text-slate-400">
                Exports exceeding the configured quota will be rejected
                by the backend.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !identity}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium"
            >
              {saving ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Updating..." : "Update Export Quota"}
            </button>
          </form>
        )}

        {message && (
          <p className="mt-5 text-sm text-emerald-400">{message}</p>
        )}

        {error && (
          <p className="mt-5 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

export default DataQuota;
