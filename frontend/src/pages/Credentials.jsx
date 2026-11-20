
import { useEffect, useState } from "react";
import {
  KeyRound,
  RefreshCw,
  Ban,
  ShieldCheck,
  Clock,
  Globe,
} from "lucide-react";
import api from "../api";

export default function Credentials() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/credentials/");
      setCredentials(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load credentials. Check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const revokeCredential = async (identity) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke ${identity}? This action will disable the integration credential.`
    );

    if (!confirmed) return;

    try {
      setRevoking(identity);

      await api.post(`/credentials/${encodeURIComponent(identity)}/revoke`);

      await fetchCredentials();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail || "Failed to revoke credential."
      );
    } finally {
      setRevoking(null);
    }
  };

  const statusStyle = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400";
      case "inactive":
        return "bg-yellow-500/10 text-yellow-400";
      case "revoked":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  const activeCount = credentials.filter(
    (item) => item.status === "active"
  ).length;

  const revokedCount = credentials.filter(
    (item) => item.status === "revoked"
  ).length;

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Credential Governance
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage integration identities and access permissions.
          </p>
        </div>

        <button
          onClick={fetchCredentials}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Total Integrations
            </p>
            <KeyRound className="text-cyan-400" size={20} />
          </div>
          <h2 className="text-3xl font-bold text-white mt-3">
            {credentials.length}
          </h2>
        </div>

        <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Active Credentials
            </p>
            <ShieldCheck className="text-emerald-400" size={20} />
          </div>
          <h2 className="text-3xl font-bold text-white mt-3">
            {activeCount}
          </h2>
        </div>

        <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Revoked Credentials
            </p>
            <Ban className="text-red-400" size={20} />
          </div>
          <h2 className="text-3xl font-bold text-white mt-3">
            {revokedCount}
          </h2>
        </div>

      </div>

      {/* Integration List */}
      <div className="bg-[#0c1424] border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold">
            Registered Integrations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Credential identities retrieved from the backend.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading credentials...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">
            {error}
          </div>
        ) : credentials.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No integrations registered.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">

            {credentials.map((item) => (
              <div
                key={item.identity}
                className="p-5 hover:bg-slate-900/40 transition"
              >

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-white font-semibold">
                        {item.name}
                      </h3>

                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusStyle(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-sm text-cyan-400 mt-2">
                      {item.identity}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Owner: {item.owner || "Not specified"}
                    </p>
                  </div>

                  {item.status === "active" && (
                    <button
                      onClick={() => revokeCredential(item.identity)}
                      disabled={revoking === item.identity}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold disabled:opacity-50"
                    >
                      <Ban size={14} />
                      {revoking === item.identity
                        ? "Revoking..."
                        : "Revoke Credential"}
                    </button>
                  )}

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">

                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      ACCESS SCOPES
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(item.scopes || []).length > 0 ? (
                        item.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded"
                          >
                            {scope}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          No scopes
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      ALLOWED IP ADDRESSES
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(item.allowed_ips || []).length > 0 ? (
                        item.allowed_ips.map((ip) => (
                          <span
                            key={ip}
                            className="flex items-center gap-1 text-xs text-slate-300"
                          >
                            <Globe size={12} />
                            {ip}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          No IP restrictions
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      CREDENTIAL EXPIRY
                    </p>
                    <p className="flex items-center gap-2 text-xs text-slate-300">
                      <Clock size={13} />
                      {item.expires_at
                        ? new Date(item.expires_at).toLocaleString()
                        : "No expiry configured"}
                    </p>
                  </div>

                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}
