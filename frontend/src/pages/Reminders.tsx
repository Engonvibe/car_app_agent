import { useEffect, useState } from "react";
import { remindersApi, type RemindersResult, type ReminderItem } from "../lib/api";
import { formatDisplay } from "../lib/dates";

function statusClass(status: ReminderItem["status"]): string {
  if (status === "Overdue") return "badge badge-overdue";
  if (status === "Due") return "badge badge-due";
  return "badge badge-upcoming";
}

function ReminderCard({ item }: { item: ReminderItem }) {
  return (
    <div className="card">
      <div className="vehicle-head">
        <div>
          <div className="vehicle-title">{item.vehicle}</div>
          <div className="vehicle-reg">{item.type} · {item.serviceType}</div>
        </div>
        <span className={statusClass(item.status)}>{item.status}</span>
      </div>
      <div className="vehicle-meta">
        <span>📅 {formatDisplay(item.date)}</span>
      </div>
    </div>
  );
}

export default function Reminders() {
  const [data, setData] = useState<RemindersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    remindersApi
      .list()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load reminders"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Reminders</h1>
      <p className="page-subtitle">Upcoming services and MOT due dates.</p>

      {loading ? (
        <div className="card"><p>Loading reminders...</p></div>
      ) : error || !data ? (
        <div className="card"><p className="error-text">{error ?? "No data"}</p></div>
      ) : (
        <>
          {/* Recommended service reminders. */}
          <h3 className="section-heading">Recommended services</h3>
          {data.recommendedServices.length === 0 ? (
            <div className="card"><p>No recommended service reminders yet.</p></div>
          ) : (
            data.recommendedServices.map((r) => <ReminderCard key={r.id} item={r} />)
          )}

          {/* MOT due reminders — kept SEPARATE from recommended services. */}
          <h3 className="section-heading">MOT due</h3>
          {data.motDue.length === 0 ? (
            <div className="card"><p>No MOT due reminders yet.</p></div>
          ) : (
            data.motDue.map((r) => <ReminderCard key={r.id} item={r} />)
          )}
        </>
      )}
    </div>
  );
}
