import { NavLink } from "react-router-dom";
import citaLogo from "../assets/CITA_logo.jpg";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "Reefs", path: "/reefs" },
  { label: "Analyze", path: "/analyze" },
  { label: "ReefBot", path: "/reefbot" },
  { label: "Reports", path: "/reports" },
];

export default function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-12 border-b border-white/5 coral-nav"
      style={{
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <img
          src={citaLogo}
          alt="CITA logo"
          className="w-7 h-7 rounded-lg object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <span
          className="text-sm font-semibold tracking-tight text-white"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          CITA-CGC
        </span>
      </div>

      {/* Nav Links */}
      <div className="flex items-center gap-1 coral-nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-white/7 text-white font-medium"
                  : "text-white/35 hover:text-white/70 font-normal"
              }`
            }
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* SDG Badge */}
      <div
        className="coral-nav-badge text-xs px-3 py-1 rounded-full border"
        style={{
          background: "rgba(74,222,128,0.08)",
          borderColor: "rgba(74,222,128,0.15)",
          color: "#4ade80",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          letterSpacing: "0.05em",
        }}
      >
        SDG 14
      </div>
    </nav>
  );
}
