import DataQuota from "./pages/DataQuota";
import { useState } from "react";
import DataGovernance from "./pages/DataGovernance";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import FinancialIntegrity from "./pages/FinancialIntegrity";
import Dashboard from "./pages/Dashboard";
import Credentials from "./pages/Credentials";
import ITDRMonitoring from "./pages/ITDRMonitering";
import PaymentSecurity from "./pages/PaymentSecurity";
function App() {
  const [activePage, setActivePage] = useState("Overview");

  return (
    <div className="min-h-screen bg-[#080d18] flex">

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="flex-1 min-w-0">
        <Topbar />

        {activePage === "Overview" && <Dashboard />}
        {activePage === "ITDR Monitoring" && <ITDRMonitoring />}
        {activePage === "Data Governance" && <DataGovernance />}
        {activePage === "Credentials" && <Credentials />}
        {activePage === "Data Governance" && <DataGovernance />}
        {activePage === "Export Quotas" && <DataQuota />}
        {activePage === "Financial Integrity" && <FinancialIntegrity />}
        {activePage === "Payment Security" && <PaymentSecurity />}

        {!["Overview", "Credentials"].includes(activePage) && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white">
              {activePage}
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              This module is not connected to the dashboard yet.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
