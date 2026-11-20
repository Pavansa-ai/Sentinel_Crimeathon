
import { useEffect, useState } from "react";
import api from "../api";

import {
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  CreditCard,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import StatCard from "../components/StatCard";
import ITDRAlerts from "../components/ITDRAlerts";

export default function Dashboard() {

  // Payment summary
  const [paymentSummary, setPaymentSummary] = useState({
    total: 0,
    pending: 0,
    signed: 0,
    executed: 0,
    blocked: 0,
  });

  // Credential summary
  const [credentialSummary, setCredentialSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    revoked: 0,
  });

  // ITDR open alert count
  const [alertCount, setAlertCount] = useState(0);

  // Live security activity data
  const [activityData, setActivityData] = useState([]);

  // Live system health
  const [systemHealth, setSystemHealth] = useState({
    api: "checking",
    database: "checking",
  });

  // Fetch payment summary
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await api.get("/payments/summary");
        setPaymentSummary(response.data);
      } catch (error) {
        console.error("Failed to fetch payment summary:", error);
      }
    };

    fetchPayments();
  }, []);

  // Fetch credential summary
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await api.get("/credentials/summary");
        setCredentialSummary(response.data);
      } catch (error) {
        console.error("Failed to fetch credentials:", error);
      }
    };

    fetchCredentials();
  }, []);

  // Fetch ITDR alerts and refresh every 15 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await api.get("/itdr/alerts");

        const openAlerts = response.data.filter(
          (alert) => alert.status === "open"
        );

        setAlertCount(openAlerts.length);
      } catch (error) {
        console.error("Failed to fetch ITDR alerts:", error);
      }
    };

    fetchAlerts();

    const interval = setInterval(fetchAlerts, 15000);

    return () => clearInterval(interval);
  }, []);

  // Fetch real security activity and refresh every 15 seconds
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await api.get("/events/activity");
        setActivityData(response.data);
      } catch (error) {
        console.error("Failed to fetch security activity:", error);
      }
    };

    fetchActivity();

    const interval = setInterval(fetchActivity, 15000);

    return () => clearInterval(interval);
  }, []);

  // Fetch API and database health every 15 seconds
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.get("/health");

        setSystemHealth({
          api: response.data.api,
          database: response.data.database,
        });
      } catch (error) {
        console.error("Health check failed:", error);

        setSystemHealth({
          api: "offline",
          database: "unknown",
        });
      }
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Security Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your integration security at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-2 w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          SENTINEL Gateway Online
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        <StatCard
          title="Security Alerts"
          value={alertCount}
          subtitle="Open ITDR alerts"
          icon={AlertTriangle}
          color="red"
        />

        <StatCard
          title="Protected Integrations"
          value={credentialSummary.active}
          subtitle={`${credentialSummary.total} registered integrations`}
          icon={KeyRound}
          color="cyan"
        />

        <StatCard
          title="Payments Verified"
          value={paymentSummary.executed}
          subtitle={`${paymentSummary.total} total payment instructions`}
          icon={CreditCard}
          color="green"
        />

        <StatCard
          title="Security Modules"
          value="06"
          subtitle="Backend modules implemented"
          icon={ShieldCheck}
          color="orange"
        />

      </div>

      {/* Activity Chart and System Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Live Security Activity Chart */}
        <div className="xl:col-span-2 bg-[#0c1424] border border-slate-800 rounded-xl p-5">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">
                Security Activity
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Actual security events recorded over the last 24 hours
              </p>
            </div>

            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">
              Live Data
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>

                <defs>
                  <linearGradient
                    id="activityGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#06b6d4"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="#06b6d4"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                />

                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#0c1424",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#activityGradient)"
                />

              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live System Health */}
        <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-5">

          <h3 className="text-white font-semibold">
            System Health
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Live backend connectivity status
          </p>

          <div className="space-y-6 mt-7">

            {[
              ["FastAPI Gateway", systemHealth.api],
              ["PostgreSQL Database", systemHealth.database],
            ].map(([name, status]) => {

              const healthy =
                status === "healthy" || status === "connected";

              return (
                <div key={name}>

                  <div className="flex justify-between items-center gap-2">

                    <span className="text-sm text-slate-300">
                      {name}
                    </span>

                    <span className={`text-xs font-semibold ${
                      healthy
                        ? "text-emerald-400"
                        : status === "checking"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}>
                      {status.toUpperCase()}
                    </span>

                  </div>

                  <div className="h-1.5 bg-slate-800 rounded-full mt-3">
                    <div className={`h-full rounded-full ${
                      healthy
                        ? "w-full bg-emerald-500"
                        : status === "checking"
                        ? "w-1/2 bg-yellow-400"
                        : "w-1/4 bg-red-500"
                    }`} />
                  </div>

                </div>
              );
            })}

          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Health checks refresh every 15 seconds.
            </p>
          </div>

        </div>

      </div>

      {/* Live ITDR Alerts */}
      <ITDRAlerts />

    </div>
  );
}
