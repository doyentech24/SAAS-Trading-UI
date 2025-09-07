// src/components/Sidebar.js
import { LogOut, Settings, BarChart2, Gauge, LayoutDashboard, Link2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeRoute = (path) => location.pathname.includes(path);

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 h-screen sticky top-0 flex-col bg-[#0B1220] text-white">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-xl font-extrabold">DoyenTech</div>
        <div className="text-xs text-white/60">Trading AI</div>
      </div>
      <nav className="p-2 space-y-1">
        <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeRoute("dashboard")} onClick={() => navigate("/dashboard")} />
        <NavItem icon={<Gauge size={18} />} label="AI Insights" active={activeRoute("Analyzer")} onClick={() => navigate("/Analyzer")} />
        <NavItem icon={<BarChart2 size={18} />} label="Market Analysis" active={activeRoute("market")} onClick={() => navigate("/market")} />
        
        <NavItem icon={<Link2 size={18} />} label="Accounts" active={activeRoute("setting")} onClick={() => navigate("/setting")} />
        <NavItem icon={<Settings size={18} />} label="Settings" active={activeRoute("accounts")} onClick={() => navigate("/accounts")} />
        <div className="pt-3 mt-3 border-t border-white/10" />
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/10 transition">
          <LogOut size={18} /> <span>Logout</span>
        </button>
      </nav>
      <div className="mt-auto p-4 text-xs text-white/60">v0.1 • Mock Data</div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${active ? "bg-white/10" : "hover:bg-white/10"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
