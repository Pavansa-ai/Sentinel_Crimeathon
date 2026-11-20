
import { useEffect, useState } from "react";
import {
  Landmark,
  RefreshCw,
  ShieldCheck,
  Send,
  KeyRound,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import api from "../api";

function FinancialIntegrity() {
  const [changes, setChanges] = useState([]);
  const [selected, setSelected] = useState("");
  const [vendorOtp, setVendorOtp] = useState("");
  const [financeOtp, setFinanceOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [username, setUsername] = useState("finance-approver-01");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchChanges = async () => {
    try {
      setError("");
      const response = await api.get("/financial/bank-changes");
      const data = Array.isArray(response.data) ? response.data : [];

      setChanges(data);

      if (selected && !data.some((item) => item.change_ref === selected)) {
        setSelected("");
        setVerified(false);
        setDemoOtp("");
        setVendorOtp("");
        setFinanceOtp("");
      }
    } catch (err) {
      setError("Unable to load pending bank changes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchChanges();

  const interval = setInterval(() => {
    fetchChanges();
  }, 5000);

  return () => clearInterval(interval);
}, []);

  const selectedChange = changes.find(
    (item) => item.change_ref === selected
  );

  const generateOtp = async () => {
    if (!selected) return;

    setBusy(true);
    setMessage("");
    setError("");
    setDemoOtp("");

    try {
      const response = await api.post(
        "/financial/verification/generate",
        { change_ref: selected }
      );

      setDemoOtp(response.data.demo_otp || "");
      setVendorOtp("");
      setVerified(false);
      setMessage("Vendor verification OTP generated.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not generate vendor OTP."
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyVendor = async () => {
    if (!selected || !vendorOtp.trim()) {
      setError("Enter the vendor OTP first.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api.post("/financial/verification/verify", {
        change_ref: selected,
        otp: vendorOtp.trim(),
      });

      setVerified(true);
      setMessage("Vendor verification successful. Finance approval is now available.");
    } catch (err) {
      setVerified(false);
      setError(
        err.response?.data?.detail || "Vendor verification failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const approveChange = async () => {
    if (!selected || !username.trim() || !financeOtp.trim()) {
      setError("Enter the finance approver username and current MFA code.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api.post("/financial/approval/approve", {
        change_ref: selected,
        username: username.trim(),
        otp: financeOtp.trim(),
      });

      setMessage("Bank change approved successfully.");
      setVendorOtp("");
      setFinanceOtp("");
      setDemoOtp("");
      setVerified(false);
      await fetchChanges();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Finance approval failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full bg-[#0b1220] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500";

  return (
    <div className="p-6 md:p-8 space-y-7 text-slate-200">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Financial Integrity
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Protect vendor bank details through independent verification
            and finance approval.
          </p>
        </div>

        <button
          onClick={fetchChanges}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <Landmark className="text-cyan-400 mb-3" size={23} />
          <p className="text-sm text-slate-400">Pending Bank Changes</p>
          <h2 className="text-2xl font-bold text-white mt-1">
            {changes.length}
          </h2>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <ShieldCheck className="text-emerald-400 mb-3" size={23} />
          <p className="text-sm text-slate-400">Vendor Verification</p>
          <h2 className="text-xl font-bold text-white mt-1">
            {verified ? "Verified" : "Required"}
          </h2>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <KeyRound className="text-purple-400 mb-3" size={23} />
          <p className="text-sm text-slate-400">Finance MFA</p>
          <h2 className="text-xl font-bold text-white mt-1">
            Required
          </h2>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Pending Bank Change Requests
        </h2>
        <p className="text-sm text-slate-400 mb-5">
          Select a pending request to begin the verification workflow.
        </p>

        {loading ? (
          <p className="text-slate-400">Loading requests...</p>
        ) : changes.length === 0 ? (
          <div className="p-5 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
            <Clock className="mx-auto text-slate-500 mb-3" size={28} />
            <p className="text-white font-medium">
              No pending bank changes
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Submit a bank change request through the existing integration
              API to test this workflow.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {changes.map((item) => (
              <button
                key={item.change_ref}
                onClick={() => {
                  setSelected(item.change_ref);
                  setVerified(false);
                  setDemoOtp("");
                  setVendorOtp("");
                  setFinanceOtp("");
                  setMessage("");
                  setError("");
                }}
                className={`w-full text-left p-4 rounded-lg border transition ${
                  selected === item.change_ref
                    ? "border-cyan-500 bg-cyan-500/5"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-white font-medium">
                    {item.change_ref}
                  </span>
                  <span className="text-xs text-amber-400">
                    {item.status || "Pending"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Vendor: {item.vendor_id || "—"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChange && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Verification Workflow
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Selected request: {selected}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Send className="text-cyan-400" size={19} />
                <h3 className="font-medium text-white">
                  1. Vendor Verification
                </h3>
              </div>

              <button
                onClick={generateOtp}
                disabled={busy || verified}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm"
              >
                Generate Vendor OTP
              </button>

              {demoOtp && (
                <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <p className="text-xs text-slate-400">
                    Demo OTP — simulated delivery
                  </p>
                  <p className="text-xl font-bold tracking-widest text-cyan-400 mt-1">
                    {demoOtp}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <input
                  value={vendorOtp}
                  onChange={(e) => setVendorOtp(e.target.value)}
                  placeholder="Enter vendor OTP"
                  className={inputClass}
                />

                <button
                  onClick={verifyVendor}
                  disabled={busy || verified}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm"
                >
                  Verify Vendor
                </button>
              </div>

              {verified && (
                <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle size={16} />
                  Vendor successfully verified
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="text-purple-400" size={19} />
                <h3 className="font-medium text-white">
                  2. Independent Finance Approval
                </h3>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                Approval requires a separate finance approver and a
                current authenticator MFA code.
              </p>

              <div className="space-y-3">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Finance approver username"
                  className={inputClass}
                />

                <input
                  value={financeOtp}
                  onChange={(e) => setFinanceOtp(e.target.value)}
                  placeholder="Enter current finance MFA code"
                  className={inputClass}
                />

                <button
                  onClick={approveChange}
                  disabled={busy || !verified}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium"
                >
                  <ShieldCheck size={17} />
                  Approve Bank Change
                </button>

                {!verified && (
                  <p className="text-xs text-amber-400">
                    Complete vendor verification before requesting finance approval.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertTriangle size={16} className="inline mr-2" />
          {error}
        </div>
      )}
    </div>
  );
}

export default FinancialIntegrity;
