import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Map, ClipboardPlus, BrainCircuit, FileText,
  Settings, Bell, Leaf, ChevronRight, Menu, X
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assessment", label: "New Assessment", icon: ClipboardPlus },
  { to: "/climate-map", label: "Climate Map", icon: Map },
  { to: "/optimizer", label: "AI Optimizer", icon: BrainCircuit },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Leaf size={21} /></div>
          <div>
            <div className="brand-name">Urban Climate</div>
            <div className="brand-sub">INTELLIGENCE PLATFORM</div>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>

        <div className="workspace">
          <div className="workspace-label">WORKSPACE</div>
          <div className="workspace-card">
            <div className="workspace-avatar">PM</div>
            <div className="workspace-info">
              <strong>Pune Municipal</strong>
              <span>Climate Cell</span>
            </div>
            <ChevronRight size={15} className="muted" />
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">OVERVIEW</div>
          {navItems.map(({to, label, icon: Icon}) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="nav-label">SYSTEM</div>
          <div className="nav-item"><Settings size={18}/><span>Settings</span></div>
          <div className="status-pill"><span className="status-dot"></span> Intelligence engine online</div>
        </div>
      </aside>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <div className="breadcrumb">
            <span>Climate Intelligence</span>
            <ChevronRight size={14}/>
            <strong>{getPageName(location.pathname)}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-btn notification"><Bell size={18}/><span></span></button>
            <div className="user-chip">
              <div className="avatar">SP</div>
              <div className="user-text"><strong>Municipal Planner</strong><span>Administrator</span></div>
            </div>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}

function getPageName(path) {
  if (path.includes("assessment")) return path.includes("result") ? "Assessment Result" : "New Assessment";
  if (path.includes("optimizer")) return "AI Optimizer";
  if (path.includes("climate-map")) return "Climate Map";
  if (path.includes("reports")) return "Reports";
  return "Dashboard";
}
