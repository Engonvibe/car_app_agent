import { useEffect, useState } from "react";
import { reportsApi, type ReportResult } from "../lib/api";
import { parseFlexibleDate, formatDisplay } from "../lib/dates";

const DATE_HINT = "e.g. 01/01/2024, 1 Jan 2024, 2024-01-01";

export default function Reports() {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromIso = fromText.trim() ? parseFlexibleDate(fromText) : null;
  const toIso = toText.trim() ? parseFlexibleDate(toText) : null;

  // Load all entries initially (no filter).
  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runReport(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (fromText.trim() && !fromIso) return setError(`From Date is not valid. ${DATE_HINT}`);
    if (toText.trim() && !toIso) return setError(`To Date is not valid. ${DATE_HINT}`);
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
    setError(null);
    setLoading(true);
    reportsApi
      .get()
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not build report"))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">Filter your service &amp; MOT entries by date range.</p>

      <form className="card" onSubmit={runReport}>
        {/* From Date and To Date side by side. */}
        <div className="date-range">
          <div>
            <label className="field-label" htmlFor="from">From Date</label>
            <input
              id="from"
              className="field-input"
              type="text"
              placeholder="From"
              value={fromText}
              onChange={(e) => setFromText(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="to">To Date</label>
            <input
              id="to"
              className="field-input"
              type="text"
              placeholder="To"
              value={toText}
              onChange={(e) => setToText(e.target.value)}
            />
          </div>
        </div>
        <div className="field-hint">{DATE_HINT}. Leave blank for all entries.</div>

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
            <div className="stat-value">{result.count}</div>
            <div className="stat-label">Records in range</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">£{result.totalCost.toFixed(2)}</div>
            <div className="stat-label">Total cost</div>
          </div>
        </div>
      )}

      {/* ---- Results ---- */}
      <h3 className="section-heading">Results</h3>
      {loading ? (
        <div className="card"><p>Loading...</p></div>
      ) : !result || result.entries.length === 0 ? (
        <div className="card"><p>No records match this date range.</p></div>
      ) : (
        result.entries.map((en) => (
          <div key={en.id} className="card">
            <div className="vehicle-head">
              <div>
                <div className="vehicle-title">
                  {en.vehicle ? `${en.vehicle.brandName} ${en.vehicle.model}` : "Vehicle"}
                </div>
                <div className="vehicle-reg">{en.entryType} · {en.serviceType}</div>
              </div>
              <span className="badge">{en.status}</span>
            </div>
            <div className="entry-grid">
              <div><span className="lbl">Service date</span>{formatDisplay(en.serviceDate)}</div>
              <div><span className="lbl">MOT due</span>{formatDisplay(en.motDueDate)}</div>
              <div><span className="lbl">Amount</span>{en.amount != null ? `£${en.amount.toFixed(2)}` : "—"}</div>
              <div><span className="lbl">Category</span>{en.category ?? "—"}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
