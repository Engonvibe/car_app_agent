import { useEffect, useMemo, useState } from "react";
import { validationApi, type ValidationData } from "../lib/api";
import { runVoiceEvaluation } from "../lib/voiceEval";

/**
 * Validation Model — HIDDEN / INTERNAL ONLY (Phase 9).
 *
 * This screen is for project evaluation / demo. It is deliberately NOT in the
 * bottom navigation or any visible menu, and is reachable only by typing the
 * internal URL: /internal/validation-model. It is still protected by login
 * (the whole app requires authentication).
 *
 * NLP/voice metrics are computed live from the real parser over labelled
 * sample sentences. Other metrics are clearly-labelled sample/demo values.
 */

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function statusClass(status: string): string {
  if (status === "Done") return "badge badge-upcoming";
  if (status === "Prototype") return "badge badge-due";
  return "badge"; // Pending
}

export default function ValidationModel() {
  const [data, setData] = useState<ValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Real (small) sample evaluation of the voice parser.
  const voiceEval = useMemo(() => runVoiceEvaluation(), []);

  useEffect(() => {
    validationApi
      .get()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load validation data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="internal-banner">
        Internal / demo evaluation — not part of the normal app navigation.
      </div>
      <h1 className="page-title">Validation &amp; Evaluation</h1>
      <p className="page-subtitle">Project evaluation metrics and feasibility.</p>

      {/* ---- NLP / Voice extraction (computed live) ---- */}
      <h3 className="section-heading">NLP / Voice extraction <span className="tag-sample">sample</span></h3>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-value">{pct(voiceEval.precision)}</div><div className="stat-label">Precision</div></div>
        <div className="stat-card"><div className="stat-value">{pct(voiceEval.recall)}</div><div className="stat-label">Recall</div></div>
        <div className="stat-card"><div className="stat-value">{pct(voiceEval.f1)}</div><div className="stat-label">F1 score</div></div>
        <div className="stat-card"><div className="stat-value">{voiceEval.cases.length}</div><div className="stat-label">Test examples</div></div>
      </div>
      <div className="card">
        <p className="field-hint" style={{ marginTop: 0 }}>
          Computed live by running the real voice parser over {voiceEval.cases.length} labelled
          example sentences (TP {voiceEval.tp} · FP {voiceEval.fp} · FN {voiceEval.fn}).
          Extracted vs expected per field:
        </p>
        {voiceEval.cases.map((c, i) => (
          <div key={i} className="eval-case">
            <div className="eval-transcript">“{c.transcript}”</div>
            <table className="eval-table">
              <thead>
                <tr><th>Field</th><th>Expected</th><th>Extracted</th><th></th></tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.field}>
                    <td>{r.field}</td>
                    <td>{r.expected}</td>
                    <td>{r.got}</td>
                    <td>{r.correct ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card"><p>Loading evaluation data…</p></div>
      ) : error || !data ? (
        <div className="card"><p className="error-text">{error ?? "No data"}</p></div>
      ) : (
        <>
          {/* ---- Recommendation evaluation ---- */}
          <h3 className="section-heading">Recommendation quality <span className="tag-sample">sample</span></h3>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{pct(data.recommendationEval.precisionAtK)}</div><div className="stat-label">Precision@{data.recommendationEval.k}</div></div>
            <div className="stat-card"><div className="stat-value">{pct(data.recommendationEval.recallAtK)}</div><div className="stat-label">Recall@{data.recommendationEval.k}</div></div>
            <div className="stat-card"><div className="stat-value">{data.recommendationEval.ndcg.toFixed(2)}</div><div className="stat-label">NDCG</div></div>
          </div>
          <div className="card"><p className="field-hint" style={{ marginTop: 0 }}>{data.recommendationEval.explanation}</p></div>

          {/* ---- Reminder prediction evaluation ---- */}
          <h3 className="section-heading">Reminder timing <span className="tag-sample">sample</span></h3>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{data.reminderEval.maeDays.toFixed(1)}d</div><div className="stat-label">MAE (days)</div></div>
            <div className="stat-card"><div className="stat-value">{pct(data.reminderEval.accuracy)}</div><div className="stat-label">Accuracy</div></div>
            <div className="stat-card"><div className="stat-value">{data.reminderEval.timeDeviationDays.toFixed(1)}d</div><div className="stat-label">Time deviation</div></div>
          </div>
          <div className="card"><p className="field-hint" style={{ marginTop: 0 }}>{data.reminderEval.explanation}</p></div>

          {/* ---- System feasibility ---- */}
          <h3 className="section-heading">System feasibility</h3>
          <div className="card">
            {data.feasibility.map((f) => (
              <div key={f.label} className="feasibility-row">
                <span>{f.label}</span>
                <span className={statusClass(f.status)}>{f.status}</span>
              </div>
            ))}
            <p className="field-hint">Statuses are honest: unfinished items are marked Prototype or Pending, not Done.</p>
          </div>

          {/* ---- User evaluation ---- */}
          <h3 className="section-heading">User evaluation</h3>
          <div className="card">
            <span className="badge">{data.userEval.status}</span>
            <div style={{ marginTop: 10 }}>
              {data.userEval.items.map((it) => (
                <div key={it.label} className="detail-row">
                  <span>{it.label}</span>
                  <span>{it.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="field-hint" style={{ marginTop: 0 }}>{data.generatedNote}</p>
          </div>
        </>
      )}
    </div>
  );
}
