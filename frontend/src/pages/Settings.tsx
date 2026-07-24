import { useEffect, useState } from "react";

const NOTIFICATION_DAYS_KEY = "motNotificationDays";

const TIMELINE_OPTIONS = [
  { value: "1", label: "1 day before due date" },
  { value: "3", label: "3 days before due date" },
  { value: "7", label: "7 days before due date" },
  { value: "14", label: "14 days before due date" },
  { value: "30", label: "30 days before due date" },
];

export default function Settings() {
  const [notificationDays, setNotificationDays] = useState("7");

  useEffect(() => {
    const savedDays = localStorage.getItem(NOTIFICATION_DAYS_KEY);

    if (savedDays) {
      setNotificationDays(savedDays);
    }
  }, []);

  function handleNotificationChange(value: string) {
    setNotificationDays(value);
    localStorage.setItem(NOTIFICATION_DAYS_KEY, value);
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">App preferences.</p>

      <div className="card">
        <span className="badge">Notifications</span>

        <h3>Reminder notification settings</h3>

        <p className="field-hint">
          Notifications will start coming from the app a few days before the due date.
        </p>

        <p className="field-hint">
          Users can change the notification timeline if they want.
        </p>

        <label className="field-label" htmlFor="notificationDays">
          Notification timeline
        </label>

        <select
          id="notificationDays"
          className="field-input"
          value={notificationDays}
          onChange={(e) => handleNotificationChange(e.target.value)}
        >
          {TIMELINE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="field-hint">
          Current setting: reminder notification will be shown{" "}
          <strong>
            {notificationDays} day{notificationDays === "1" ? "" : "s"}
          </strong>{" "}
          before the due date.
        </div>
      </div>
    </div>
  );
}