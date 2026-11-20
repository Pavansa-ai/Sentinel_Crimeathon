
import { useEffect, useState } from "react";
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  LockKeyhole,
  CheckCircle,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import api from "../api";

function PaymentSecurity() {
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    signed: 0,
    executed: 0,
    blocked: 0,
  });

  const [payments, setPayments] = useState([]);
  const [vendorCode, setVendorCode] = useState("V-1001");
  const [amount, setAmount] = useState("25000");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const [username, setUsername] = useState("finance-approver-01");
  const [financeOtp, setFinanceOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    try {
      const response = await api.get("/payments/summary");
      setSummary(response.data);
    } catch (err) {
      setError("Unable to load payment summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 15000);
    return () => clearInterval(interval);
  }, []);

  const createPayment = async (e) => {
    e.preventDefault();

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/payments/create", {
        vendor_code: vendorCode.trim(),
        amount: Number(amount),
        payment_date: paymentDate,
      });

      const paymentRef = response.data.payment_ref;

      if (!paymentRef) {
        throw new Error("Payment reference was not returned by the API.");
      }

      setPayments((prev) => [
        {
          payment_ref: paymentRef,
          vendor_code: vendorCode,
          amount: Number(amount),
          payment_date: paymentDate,
          status: "pending",
        },
        ...prev,
      ]);

      setMessage(`Payment created successfully: ${paymentRef}`);
      await fetchSummary();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Payment creation failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const signPayment = async (paymentRef) => {
    if (!username.trim() || !financeOtp.trim()) {
      setError("Enter the finance approver username and current MFA code.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api.post("/payments/sign", {
        payment_ref: paymentRef,
        username: username.trim(),
        otp: financeOtp.trim(),
      });

      setPayments((prev) =>
        prev.map((payment) =>
          payment.payment_ref === paymentRef
            ? { ...payment, status: "signed" }
            : payment
        )
      );

      setFinanceOtp("");
      setMessage(`Payment ${paymentRef} signed successfully.`);
      await fetchSummary();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Payment signing failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async (paymentRef) => {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api.post("/payments/verify", {
        payment_ref: paymentRef,
        username: username.trim() || "finance-approver-01",
        otp: "000000",
      });

      setPayments((prev) =>
        prev.map((payment) =>
          payment.payment_ref === paymentRef
            ? { ...payment, status: "executed" }
            : payment
        )
      );

      setMessage(
        `Payment ${paymentRef}: signature verified successfully.`
      );
    } catch (err) {
      const detail = err.response?.data?.detail || "Signature verification failed.";

      if (err.response?.status === 403) {
        setPayments((prev) =>
          prev.map((payment) =>
            payment.payment_ref === paymentRef
              ? { ...payment, status: "blocked" }
              : payment
          )
        );
      }

      setError(detail);
    } finally {
      await fetchSummary();
      setBusy(false);
    }
  };

  const stats = [
    { label: "Total Payments", value: summary.total, icon: CreditCard },
    { label: "Pending", value: summary.pending, icon: FileCheck },
    { label: "Signed", value: summary.signed, icon: ShieldCheck },
    { label: "Executed", value: summary.executed, icon: CheckCircle },
    { label: "Blocked", value: summary.blocked, icon: AlertTriangle },
  ];

  const inputClass =
    "w-full bg-[#0b1220] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500";

  const statusStyle = {
    pending: "text-amber-400 bg-amber-500/10",
    signed: "text-blue-400 bg-blue-500/10",
    executed: "text-emerald-400 bg-emerald-500/10",
    blocked: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="p-6 md:p-8 space-y-7 text-slate-200">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Payment Security
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Protect payment instructions with MFA and Ed25519 signatures.
          </p>
        </div>

        <button
          onClick={fetchSummary}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-[#111827] border border-slate-800 rounded-xl p-5"
            >
              <Icon className="text-cyan-400 mb-3" size={22} />
              <p className="text-sm text-slate-400">{stat.label}</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {loading ? "..." : stat.value}
              </h2>
            </div>
          );
        })}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <PlusCircle className="text-cyan-400" size={21} />
          <h2 className="text-lg font-semibold text-white">
            Create Payment Instruction
          </h2>
        </div>

        <form onSubmit={createPayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Vendor Code
              </label>
              <input
                required
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                className={inputClass}
                placeholder="V-1001"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Amount (INR)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium"
          >
            <PlusCircle size={17} />
            Create Payment
          </button>
        </form>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <LockKeyhole className="text-purple-400" size={21} />
          <h2 className="text-lg font-semibold text-white">
            Finance Authorization
          </h2>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Enter the finance approver credentials to sign payment instructions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Finance Approver
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Authenticator MFA Code
            </label>
            <input
              value={financeOtp}
              onChange={(e) => setFinanceOtp(e.target.value)}
              placeholder="Enter current 6-digit code"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">
            Payments Created This Session
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Use the actions to sign and verify each payment.
          </p>
        </div>

        {payments.length === 0 ? (
          <p className="p-6 text-slate-400">
            No payments created in this session. Create a payment instruction above to begin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-500 bg-slate-900/60">
                <tr>
                  <th className="px-5 py-4">Payment Reference</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.payment_ref}
                    className="border-t border-slate-800"
                  >
                    <td className="px-5 py-4 text-white font-medium">
                      {payment.payment_ref}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {payment.vendor_code}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      ₹{Number(payment.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${statusStyle[payment.status]}`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {payment.status === "pending" && (
                          <button
                            onClick={() => signPayment(payment.payment_ref)}
                            disabled={busy}
                            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs"
                          >
                            Sign
                          </button>
                        )}

                        {payment.status === "signed" && (
                          <button
                            onClick={() => verifyPayment(payment.payment_ref)}
                            disabled={busy}
                            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs"
                          >
                            Verify Signature
                          </button>
                        )}

                        {payment.status === "executed" && (
                          <span className="text-emerald-400 text-xs">
                            <CheckCircle size={14} className="inline mr-1" />
                            Verified
                          </span>
                        )}

                        {payment.status === "blocked" && (
                          <span className="text-red-400 text-xs">
                            <AlertTriangle size={14} className="inline mr-1" />
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default PaymentSecurity;
