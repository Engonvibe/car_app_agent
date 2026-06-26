import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useAuth } from "../lib/auth";

/**
 * Layout wraps every visible screen with:
 *   - a mobile-style header (shows the logged-in user + logout)
 *   - the page content (<Outlet/>)
 *   - the bottom navigation bar
 */
export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="title">MOT-UK</div>
          <div className="subtitle">Car Service &amp; MOT Manager</div>
        </div>
        <div className="header-user">
          {user && <span className="header-name">{user.name}</span>}
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
