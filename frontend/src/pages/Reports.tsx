import { useEffect, useState } from "react";
import { reportsApi, type ReportResult } from "../lib/api";
import { parseFlexibleDate, formatDisplay } from "../lib/dates";

const DATE_HINT = "e.g. 01/01/2024, 1 Jan 2024, 2024-01-01";

const STATUS_FILTERS = ["All", "Done", "Due", "Overdue", "Cancelled"];

export default function Reports() {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromIso = fromText.trim() ? parseFlexibleDate(fromText) : null;
  const toIso = toText.trim() ? parseFlexibleDate(toText) : null;

  const filteredEntries =
    result?.entries.filter((en) =>
      statusFilter === "All" ? true : en.status === statusFilter
    ) ?? [];

  const filteredTotalCost = filteredEntries.reduce(
    (sum, en) => sum + (en.amount ?? 0),
    0
  );

  // Load all entries initially.
  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runReport(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (fromText.trim() && !fromIso) {
      return setError(`From Date is not valid. ${DATE_HINT}`);
    }

    if (toText.trim() && !toIso) {
      return setError(`To Date is not valid. ${DATE_HINT}`);
    }

    if (fromIso && toIso && fromIso > toIso) {
      return setError("From Date must be on or before To Date");
    }

    setLoading(true);
    try {
      setResult(await reportsApi.get(fromIso ?? undefined, toIso ?? undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build report");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setFromText("");
    setToText("");
    setStatusFilter("All");
    setError(null);
    setLoading(true);

    reportsApi
      .get()
      .then(setResult)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not build report")
      )
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">
        Filter your service &amp; MOT entries by date range and status.
      </p>

      <form className="card" onSubmit={runReport}>
        {/* From Date, To Date and Status filter. */}
        <div className="date-range">
          <div>
            <label className="field-label" htmlFor="from">
              From Date
            </label>
            <input
              id="from"
              className="field-input"
              type="date"
              placeholder="From"
              value={fromText}
              onChange={(e) => setFromText(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="to">
              To Date
            </label>
            <input
              id="to"
              className="field-input"
              type="date"
              placeholder="To"
              value={toText}
              onChange={(e) => setToText(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              className="field-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Status" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-hint">
          {DATE_HINT}. Leave blank for all entries.
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Running..." : "Run report"}
          </button>

          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      {/* ---- Totals ---- */}
      {result && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{filteredEntries.length}</div>
            <div className="stat-label">Records shown</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">£{filteredTotalCost.toFixed(2)}</div>
            <div className="stat-label">Total cost shown</div>
          </div>
        </div>
      )}

      {/* ---- Results ---- */}
      <h3 className="section-heading">Results</h3>

      {loading ? (
        <div className="card">
          <p>Loading...</p>
        </div>
      ) : !result || filteredEntries.length === 0 ? (
        <div className="card">
          <p>No records match this filter.</p>
        </div>
      ) : (
        filteredEntries.map((en) => (
          <div key={en.id} className="card">
            <div className="vehicle-head">
              <div>
                <div className="vehicle-title">
                  {en.vehicle
                    ? `${en.vehicle.brandName} ${en.vehicle.model}`
                    : "Vehicle"}
                </div>
                <div className="vehicle-reg">
                  {en.entryType} · {en.serviceType}
                </div>
              </div>

              <span className="badge">{en.status}</span>
            </div>

            <div className="entry-grid">
              <div>
                <span className="lbl">SERVICE DATE</span>
                {formatDisplay(en.serviceDate)}
              </div>

              <div>
                <span className="lbl">RECOMMENDED</span>
                {formatDisplay(en.recommendedServiceDate)}
              </div>

              <div>
                <span className="lbl">MOT DUE</span>
                {formatDisplay(en.motDueDate)}
              </div>

              <div>
                <span className="lbl">AMOUNT</span>
                {en.amount != null ? `£${en.amount.toFixed(2)}` : "—"}
              </div>

              <div>
                <span className="lbl">CATEGORY</span>
                {en.category ?? "—"}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}