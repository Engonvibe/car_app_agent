import { NavLink } from "react-router-dom";
import {
  DashboardIcon,
  AddIcon,
  ReportsIcon,
  RemindersIcon,
  CarIcon,
  SettingsIcon,
} from "./Icons";

/**
 * Bottom navigation bar.
 *
 * IMPORTANT: The "Validation Model" screen is deliberately NOT listed here.
 * It must never appear in the menu bar, sidebar, bottom navigation, or any
 * visible app navigation. It remains an internal-only route.
 */
const navItems = [
  { to: "/dashboard", label: "Home", Icon: DashboardIcon },
  { to: "/add-entry", label: "Add", Icon: AddIcon },
  { to: "/reports", label: "Reports", Icon: ReportsIcon },
  { to: "/reminders", label: "Reminders", Icon: RemindersIcon },
  { to: "/vehicles", label: "Vehicles", Icon: CarIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon" aria-hidden="true">
            <Icon size={22} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
