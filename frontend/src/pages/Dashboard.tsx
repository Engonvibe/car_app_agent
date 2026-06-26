import { useEffect, useState } from "react";
import { dashboardApi, type DashboardSummary } from "../lib/api";
import { formatDisplay } from "../lib/dates";
import { useAuth } from "../lib/auth";
import BarChartCard from "../components/BarChartCard";
import { CarArt, EmptyArt } from "../components/CarArt";
import { CarIcon, ReportsIcon, RemindersIcon, AddIcon } from "../components/Icons";

/** Shorten long labels so they fit on a mobile chart axis. */
function shorten(s: string, n = 12): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="card"><p>Loading dashboard...</p></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="card"><p className="error-text">{error ?? "No data"}</p></div>
      </div>
    );
  }

  const { totals, monthlyCost, topServiceTypes, statusCounts, topUpcoming } = summary;
  const noData = totals.entries === 0 && totals.vehicles === 0;

  return (
    <div>
      {/* ---- Hero ---- */}
      <div className="hero-card">
        <div className="hero-greeting">Hello, {firstName} 👋</div>
        <div className="hero-title">Your car care, all in one place</div>
        <div className="hero-mini">
          <span className="n">{totals.upcomingServices}</span>
          <span className="l">upcoming service{totals.upcomingServices === 1 ? "" : "s"}</span>
        </div>
        <CarArt className="hero-car" />
      </div>

      {/* ---- Summary cards ---- */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon indigo"><CarIcon size={18} /></span>
          <div className="stat-value">{totals.vehicles}</div>
          <div className="stat-label">Total vehicles</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sky"><ReportsIcon size={18} /></span>
          <div className="stat-value">{totals.entries}</div>
          <div className="stat-label">Total entries</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber"><RemindersIcon size={18} /></span>
          <div className="stat-value">{totals.upcomingServices}</div>
          <div className="stat-label">Upcoming services</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green"><AddIcon size={18} /></span>
          <div className="stat-value">£{totals.costThisMonth.toFixed(2)}</div>
          <div className="stat-label">Cost this month</div>
        </div>
      </div>

      {noData && (
        <div className="card empty-state">
          <EmptyArt className="empty-art" />
          <span className="badge">Getting started</span>
          <h3 style={{ marginTop: 10 }}>No data yet</h3>
          <p>
            Add a vehicle on the <strong>Vehicles &amp; Roles</strong> screen, then
            record a service on the <strong>Add Entry</strong> screen. Your charts and
            upcoming services will appear here.
          </p>
        </div>
      )}

      {/* ---- Top 3 upcoming services ---- */}
      <h3 className="section-heading">Top upcoming services</h3>
      {topUpcoming.length === 0 ? (
        <div className="card"><p>No upcoming services scheduled.</p></div>
      ) : (
        topUpcoming.map((u) => (
          <div key={u.id} className="card upcoming-row">
            <div>
              <div className="vehicle-title">{u.vehicle}</div>
              <div className="vehicle-reg">{u.serviceType}</div>
            </div>
            <span className="badge">{formatDisplay(u.recommendedServiceDate)}</span>
          </div>
        ))
      )}

      {/* ---- Bar charts (bar charts only) ---- */}
      <h3 className="section-heading">Charts</h3>

      <BarChartCard
        title="Monthly cost (£)"
        data={monthlyCost.map((m) => ({ name: m.label, value: m.total }))}
        color="#4f46e5"
        money
        emptyMessage="No costs recorded yet."
      />

      <BarChartCard
        title="Most common service types"
        data={topServiceTypes.map((t) => ({ name: shorten(t.name), value: t.count }))}
        color="#0ea5e9"
        emptyMessage="No services recorded yet."
      />

      <BarChartCard
        title="Entries by status"
        data={statusCounts.map((s) => ({ name: s.status, value: s.count }))}
        color="#7c3aed"
        emptyMessage="No entries recorded yet."
      />
    </div>
  );
}
