import { useEffect, useState } from "react";
import {
  vehiclesApi,
  entriesApi,
  type Vehicle,
  type ServiceEntry,
} from "../lib/api";
import {
  ENTRY_TYPES,
  SERVICE_TYPES,
  CATEGORIES,
  STATUSES,
} from "../data/serviceData";
import { parseFlexibleDate, formatDisplay } from "../lib/dates";
import { predictRecommendation } from "../lib/prediction";
import VoiceCapture from "../components/VoiceCapture";
import { parseVoiceEntry } from "../lib/voiceParse";

interface FormState {
  vehicleId: string;
  entryType: string;
  serviceType: string;
  category: string;
  serviceDate: string;
  motDueDate: string;
  amount: string;
  status: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  vehicleId: "",
  entryType: "Service",
  serviceType: "",
  category: "",
  serviceDate: "",
  motDueDate: "",
  amount: "",
  status: "Done",
  notes: "",
};

const DATE_HINT = "Accepts e.g. 12/05/2024, 12 May 2024, or 2024-05-12";

function vehicleLabel(v: Vehicle): string {
  return `${v.brandName} ${v.model} (${v.registrationNumber})`;
}

export default function AddEntry() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<ServiceEntry[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceMissing, setVoiceMissing] = useState<string[]>([]);

  // Live, derived values (these update automatically as the user types).
  const serviceIso = parseFlexibleDate(form.serviceDate);
  const motIso = form.motDueDate ? parseFlexibleDate(form.motDueDate) : null;
  const isMot = form.entryType === "MOT";

  // Smart prediction — recomputed live whenever the vehicle, service date,
  // service type, category or entry type changes.
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId) ?? null;
  const historyDates = entries
    .filter((e) => e.vehicleId === form.vehicleId && e.id !== editingId)
    .map((e) => e.serviceDate.slice(0, 10));
  const prediction =
    serviceIso && selectedVehicle && form.serviceType
      ? predictRecommendation({
          vehicle: selectedVehicle,
          entryType: form.entryType,
          serviceType: form.serviceType,
          category: form.category || null,
          serviceDateIso: serviceIso,
          historyDatesIso: historyDates,
        })
      : null;
  const recommendedIso = prediction?.recommendedServiceDate ?? null;

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [vs, es] = await Promise.all([vehiclesApi.list(), entriesApi.list()]);
      setVehicles(vs);
      setEntries(es);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Fill the form from a spoken transcript. Nothing is saved automatically —
  // the user reviews and corrects, then presses Save.
  function handleVoice(transcript: string) {
    const ex = parseVoiceEntry(transcript, vehicles);
    // Only auto-select a spoken vehicle if the user can actually add entries
    // for it (owner/editor); otherwise keep the current selection.
    const canUseSpoken =
      ex.vehicleId && vehicles.some((v) => v.id === ex.vehicleId && (v.myRole === "Owner" || v.myRole === "Editor"));
    setVoiceTranscript(transcript);
    setVoiceMissing(ex.missing);
    setError(null);
    setForm((f) => ({
      ...f,
      vehicleId: canUseSpoken ? ex.vehicleId! : f.vehicleId,
      entryType: ex.entryType ?? f.entryType,
      serviceType: ex.serviceType ?? f.serviceType,
      category: ex.category ?? f.category,
      serviceDate: ex.serviceDate ?? f.serviceDate,
      motDueDate: ex.motDueDate ?? f.motDueDate,
      amount: ex.amount ?? f.amount,
      status: ex.status ?? f.status,
      notes: ex.notes ?? f.notes,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setVoiceTranscript(null);
    setVoiceMissing([]);
  }

  function startEdit(en: ServiceEntry) {
    setForm({
      vehicleId: en.vehicleId,
      entryType: en.entryType,
      serviceType: en.serviceType,
      category: en.category ?? "",
      serviceDate: en.serviceDate.slice(0, 10),
      motDueDate: en.motDueDate ? en.motDueDate.slice(0, 10) : "",
      amount: en.amount != null ? String(en.amount) : "",
      status: en.status,
      notes: en.notes ?? "",
    });
    setEditingId(en.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.vehicleId) return setError("Please select a vehicle");
    if (!form.entryType) return setError("Please choose an Entry Type");
    if (!form.serviceType) return setError("Please choose a Service Type");
    if (!form.status) return setError("Please choose a Status");
    if (!form.serviceDate.trim() || !serviceIso) {
      return setError(`Service Date is not valid. ${DATE_HINT}`);
    }
    if (form.motDueDate.trim() && !motIso) {
      return setError(`MOT Due Date is not valid. ${DATE_HINT}`);
    }
    if (form.amount !== "" && Number(form.amount) < 0) {
      return setError("Amount cannot be negative");
    }

    const payload = {
      vehicleId: form.vehicleId,
      entryType: form.entryType,
      serviceType: form.serviceType,
      category: form.category,
      serviceDate: serviceIso,
      motDueDate: motIso ?? "",
      amount: form.amount,
      status: form.status,
      notes: form.notes,
    };

    setSaving(true);
    try {
      if (editingId) {
        await entriesApi.update(editingId, payload);
      } else {
        await entriesApi.create(payload);
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(en: ServiceEntry) {
    const name = en.vehicle ? vehicleLabel(en.vehicle) : "this entry";
    if (!window.confirm(`Delete ${en.entryType} entry for ${name}?`)) return;
    try {
      await entriesApi.remove(en.id);
      if (editingId === en.id) resetForm();
      if (viewingId === en.id) setViewingId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete entry");
    }
  }

  // Permissions: you can only add/edit entries for vehicles you own or can edit.
  const roleByVehicle = new Map(vehicles.map((v) => [v.id, v.myRole]));
  const editableVehicles = vehicles.filter((v) => v.myRole === "Owner" || v.myRole === "Editor");
  const noEditable = !loading && editableVehicles.length === 0;

  return (
    <div>
      <h1 className="page-title">Add Entry</h1>
      <p className="page-subtitle">Record an MOT or service entry for a vehicle.</p>

      {noEditable && (
        <div className="card">
          {vehicles.length === 0 ? (
            <p>You need a vehicle first. Add one on the <strong>Vehicles &amp; Roles</strong> screen.</p>
          ) : (
            <p>You only have view-only access to your vehicles, so you can't add entries. Ask the owner for Editor access.</p>
          )}
        </div>
      )}

      {/* ---- Entry form ---- */}
      <form className="card" onSubmit={onSubmit}>
        <h3>{editingId ? "Edit entry" : "Add an entry"}</h3>

        {/* Voice input (Phase 7). Fills the form for review; never auto-saves. */}
        <VoiceCapture onTranscript={handleVoice} />

        {voiceTranscript && (
          <div className="voice-transcript">
            <span className="lbl">You said</span>
            “{voiceTranscript}”
          </div>
        )}

        {voiceMissing.length > 0 && (
          <div className="voice-missing">
            Please add the following manually: {voiceMissing.join(" and ")}.
          </div>
        )}

        <label className="field-label" htmlFor="vehicle">Vehicle</label>
        <select
          id="vehicle"
          className="field-input"
          value={form.vehicleId}
          onChange={(e) => update("vehicleId", e.target.value)}
          disabled={noEditable}
        >
          <option value="">Select a vehicle</option>
          {editableVehicles.map((v) => (
            <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="entryType">Entry Type</label>
        <select
          id="entryType"
          className="field-input"
          value={form.entryType}
          onChange={(e) => update("entryType", e.target.value)}
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="serviceType">Service Type</label>
        <select
          id="serviceType"
          className="field-input"
          value={form.serviceType}
          onChange={(e) => update("serviceType", e.target.value)}
        >
          <option value="">Select a service type</option>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="category">Category</label>
        <select
          id="category"
          className="field-input"
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Select a category (optional)</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="serviceDate">Service Date</label>
        <input
          id="serviceDate"
          className="field-input"
          type="text"
          placeholder="e.g. 12 May 2024"
          value={form.serviceDate}
          onChange={(e) => update("serviceDate", e.target.value)}
        />
        <div className={`field-hint ${form.serviceDate && !serviceIso ? "field-hint-warn" : ""}`}>
          {form.serviceDate
            ? serviceIso
              ? `Stored as ${serviceIso} (${formatDisplay(serviceIso)})`
              : `Couldn't read this date. ${DATE_HINT}`
            : DATE_HINT}
        </div>

        {/* Recommended Service Date — auto-generated by the prediction engine. */}
        <label className="field-label">Recommended Service Date (auto)</label>
        <div className="field-readonly">
          {recommendedIso
            ? formatDisplay(recommendedIso)
            : !form.vehicleId
            ? "Select a vehicle first"
            : !form.serviceType
            ? "Choose a Service Type"
            : "Enter a valid Service Date"}
        </div>
        <div className="field-hint">
          {prediction
            ? `🔎 ${prediction.explanation}`
            : "Auto-generated from the vehicle, service date, service type and history. Kept separate from the MOT Due Date."}
        </div>

        <label className="field-label" htmlFor="motDueDate">
          MOT Due Date {isMot ? "(separate from recommended service date)" : "(optional)"}
        </label>
        <input
          id="motDueDate"
          className="field-input"
          type="text"
          placeholder="e.g. 11/05/2025"
          value={form.motDueDate}
          onChange={(e) => update("motDueDate", e.target.value)}
        />
        {form.motDueDate && (
          <div className={`field-hint ${!motIso ? "field-hint-warn" : ""}`}>
            {motIso ? `Stored as ${motIso} (${formatDisplay(motIso)})` : `Couldn't read this date. ${DATE_HINT}`}
          </div>
        )}

        <label className="field-label" htmlFor="amount">Amount (£)</label>
        <input
          id="amount"
          className="field-input"
          type="number"
          min={0}
          step="0.01"
          placeholder="e.g. 149.99 (optional)"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
        />

        <label className="field-label" htmlFor="status">Status</label>
        <select
          id="status"
          className="field-input"
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="notes">Notes / Fault Description</label>
        <textarea
          id="notes"
          className="field-input"
          rows={3}
          placeholder="Optional notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || noEditable}>
            {saving ? "Saving..." : editingId ? "Update entry" : "Add entry"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---- Entries list ---- */}
      <h3 className="section-heading">Saved entries</h3>

      {loading ? (
        <div className="card"><p>Loading entries...</p></div>
      ) : entries.length === 0 ? (
        <div className="card"><p>No entries yet. Add your first entry above.</p></div>
      ) : (
        entries.map((en) => {
          const open = viewingId === en.id;
          const role = roleByVehicle.get(en.vehicleId) ?? null;
          const canEdit = role === "Owner" || role === "Editor";
          const canDelete = role === "Owner";
          return (
            <div key={en.id} className="card">
              <div className="vehicle-head">
                <div>
                  <div className="vehicle-title">
                    {en.vehicle ? `${en.vehicle.brandName} ${en.vehicle.model}` : "Vehicle"}
                  </div>
                  <div className="vehicle-reg">
                    {en.entryType} · {en.serviceType}
                  </div>
                </div>
                <span className="badge">{en.status}</span>
              </div>

              <div className="entry-grid">
                <div><span className="lbl">Service date</span>{formatDisplay(en.serviceDate)}</div>
                <div><span className="lbl">Recommended</span>{formatDisplay(en.recommendedServiceDate)}</div>
                <div><span className="lbl">MOT due</span>{formatDisplay(en.motDueDate)}</div>
                <div><span className="lbl">Amount</span>{en.amount != null ? `£${en.amount.toFixed(2)}` : "—"}</div>
              </div>

              {open && (
                <div className="entry-detail">
                  <div className="detail-row"><span>Vehicle</span><span>{en.vehicle ? vehicleLabel(en.vehicle) : "—"}</span></div>
                  <div className="detail-row"><span>Entry type</span><span>{en.entryType}</span></div>
                  <div className="detail-row"><span>Service type</span><span>{en.serviceType}</span></div>
                  <div className="detail-row"><span>Category</span><span>{en.category ?? "—"}</span></div>
                  <div className="detail-row"><span>Service date</span><span>{formatDisplay(en.serviceDate)}</span></div>
                  <div className="detail-row"><span>Recommended service date</span><span>{formatDisplay(en.recommendedServiceDate)}</span></div>
                  <div className="detail-row"><span>MOT due date</span><span>{formatDisplay(en.motDueDate)}</span></div>
                  <div className="detail-row"><span>Amount</span><span>{en.amount != null ? `£${en.amount.toFixed(2)}` : "—"}</span></div>
                  <div className="detail-row"><span>Status</span><span>{en.status}</span></div>
                  <div className="detail-row"><span>Notes</span><span>{en.notes ?? "—"}</span></div>
                </div>
              )}

              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setViewingId(open ? null : en.id)}>
                  {open ? "Hide" : "View"}
                </button>
                {canEdit && (
                  <button className="btn btn-ghost" onClick={() => startEdit(en)}>Edit</button>
                )}
                {canDelete && (
                  <button className="btn btn-danger" onClick={() => onDelete(en)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
