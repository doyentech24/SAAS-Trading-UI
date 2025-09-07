import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Gauge, BarChart2, Link2, Settings, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";

const NAVY = "#0B1220";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F7F7FB]">
      {/* Sidebar */}
      <aside
        className={`h-screen sticky top-0 shrink-0 bg-[${NAVY}] text-white border-r border-white/10 transition-all duration-200
        ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          <Link to="/dashboard" className="font-extrabold">
            {collapsed ? "DT" : "DoyenTech"}
          </Link>
          <button
            className="p-1 rounded-md hover:bg-white/10"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="p-2 space-y-1">
          <SideLink to="/dashboard" label="Dashboard" icon={<LayoutDashboard size={18} />} collapsed={collapsed} />
          <SideLink to="/insights" label="AI Insights" icon={<Gauge size={18} />} collapsed={collapsed} />
          <SideLink to="/market" label="Market Analysis" icon={<BarChart2 size={18} />} collapsed={collapsed} />
          <SideLink to="/accounts" label="Accounts" icon={<Link2 size={18} />} collapsed={collapsed} />
          <div className="pt-3 mt-3 border-t border-white/10" />
          <SideLink to="/settings" label="Settings" icon={<Settings size={18} />} collapsed={collapsed} />
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/10 transition`}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </nav>

        <div className={`mt-auto p-4 text-xs text-white/60 ${collapsed && "text-center"}`}>v0.1 • Mock</div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <Topbar />
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SideLink({ to, icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl transition
         ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
      }
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

function Topbar() {
  // mock ticker
  const sensex = 72500.45, nifty = 21850.2, banknifty = 46520.8, chg = +0.34;
  const Badge = ({ label, value }) => (
    <div className="px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 text-sm">
      <span className="font-semibold mr-1">{label}</span>
      <span>{value.toLocaleString()}</span>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-slate-800">Portfolio</div>
        <div className="flex items-center gap-3">
          <Badge label="Sensex" value={sensex} />
          <Badge label="Nifty" value={nifty} />
          <Badge label="BankNifty" value={banknifty} />
          <div className={`px-2 py-1 rounded-full text-white ${chg >= 0 ? "bg-green-600" : "bg-red-600"}`}>
            {chg >= 0 ? "+" : ""}{chg}%
          </div>
        </div>
      </div>
    </header>
  );
}
