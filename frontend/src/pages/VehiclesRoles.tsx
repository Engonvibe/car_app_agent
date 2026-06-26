import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import { vehiclesApi, type Vehicle } from "../lib/api";
import {
  BRAND_NAMES,
  FUEL_TYPES,
  VEHICLE_TYPES,
  OTHER_MODEL,
  getModelsForBrand,
} from "../data/ukVehicles";

const CURRENT_YEAR = new Date().getFullYear();
// Realistic vehicle registration years: next year down to 1950.
const YEARS: number[] = Array.from(
  { length: CURRENT_YEAR + 1 - 1950 + 1 },
  (_, i) => CURRENT_YEAR + 1 - i
);

interface FormState {
  brandName: string;
  modelChoice: string; // value chosen in the model dropdown
  customModel: string; // typed model when "Other Model" is chosen
  registeredYear: string;
  fuelType: string;
  registrationNumber: string;
  vehicleType: string;
  mileage: string;
}

const EMPTY_FORM: FormState = {
  brandName: "",
  modelChoice: "",
  customModel: "",
  registeredYear: "",
  fuelType: "",
  registrationNumber: "",
  vehicleType: "",
  mileage: "",
};

export default function VehiclesRoles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelOptions = useMemo(
    () => (form.brandName ? getModelsForBrand(form.brandName) : []),
    [form.brandName]
  );
  const usingCustomModel = form.modelChoice === OTHER_MODEL;

  // Load the vehicle list on first render.
  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setVehicles(await vehiclesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load vehicles");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onBrandChange(brand: string) {
    // Changing the brand resets the model selection.
    setForm((f) => ({ ...f, brandName: brand, modelChoice: "", customModel: "" }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  function startEdit(v: Vehicle) {
    const options = getModelsForBrand(v.brandName);
    const isKnownModel = options.includes(v.model);
    setForm({
      brandName: v.brandName,
      modelChoice: isKnownModel ? v.model : OTHER_MODEL,
      customModel: isKnownModel ? "" : v.model,
      registeredYear: String(v.registeredYear),
      fuelType: v.fuelType,
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType ?? "",
      mileage: v.mileage != null ? String(v.mileage) : "",
    });
    setEditingId(v.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalModel = usingCustomModel ? form.customModel.trim() : form.modelChoice;

    // Friendly front-end checks before sending to the backend.
    if (!form.brandName) return setError("Please choose a Vehicle Brand Name");
    if (!finalModel) return setError("Please choose or type a Vehicle Model");
    if (!form.registeredYear) return setError("Please choose a Registered Year");
    if (!form.fuelType) return setError("Please choose a Fuel Type");
    if (!form.registrationNumber.trim()) return setError("Please enter a Registration Number");

    const payload = {
      brandName: form.brandName,
      model: finalModel,
      registeredYear: form.registeredYear,
      fuelType: form.fuelType,
      registrationNumber: form.registrationNumber.trim(),
      vehicleType: form.vehicleType,
      mileage: form.mileage,
    };

    setSaving(true);
    try {
      if (editingId) {
        await vehiclesApi.update(editingId, payload);
      } else {
        await vehiclesApi.create(payload);
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save vehicle");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(v: Vehicle) {
    if (!window.confirm(`Delete ${v.brandName} ${v.model} (${v.registrationNumber})?`)) return;
    try {
      await vehiclesApi.remove(v.id);
      if (editingId === v.id) resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete vehicle");
    }
  }

  return (
    <div>
      <h1 className="page-title">Vehicles &amp; Roles</h1>
      <p className="page-subtitle">Add a vehicle profile and manage your saved vehicles.</p>

      {/* ---- Vehicle form ---- */}
      <form className="card" onSubmit={onSubmit}>
        <h3>{editingId ? "Edit vehicle" : "Add a vehicle"}</h3>

        <label className="field-label" htmlFor="brand">Vehicle Brand Name</label>
        <SearchableSelect
          id="brand"
          value={form.brandName}
          onChange={onBrandChange}
          options={BRAND_NAMES}
          placeholder="Search brand (e.g. Ford, BMW, Tesla)"
        />

        <label className="field-label" htmlFor="model">Vehicle Model</label>
        <select
          id="model"
          className="field-input"
          value={form.modelChoice}
          disabled={!form.brandName}
          onChange={(e) => update("modelChoice", e.target.value)}
        >
          <option value="">
            {form.brandName ? "Select a model" : "Choose a brand first"}
          </option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {usingCustomModel && (
          <input
            className="field-input"
            style={{ marginTop: 8 }}
            type="text"
            placeholder="Type the model name"
            value={form.customModel}
            onChange={(e) => update("customModel", e.target.value)}
          />
        )}

        <label className="field-label" htmlFor="year">Registered Year</label>
        <select
          id="year"
          className="field-input"
          value={form.registeredYear}
          onChange={(e) => update("registeredYear", e.target.value)}
        >
          <option value="">Select year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="fuel">Fuel Type</label>
        <select
          id="fuel"
          className="field-input"
          value={form.fuelType}
          onChange={(e) => update("fuelType", e.target.value)}
        >
          <option value="">Select fuel type</option>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="reg">Registration Number</label>
        <input
          id="reg"
          className="field-input"
          type="text"
          placeholder="e.g. AB12 CDE"
          value={form.registrationNumber}
          onChange={(e) => update("registrationNumber", e.target.value.toUpperCase())}
        />

        <label className="field-label" htmlFor="vtype">Vehicle Type</label>
        <select
          id="vtype"
          className="field-input"
          value={form.vehicleType}
          onChange={(e) => update("vehicleType", e.target.value)}
        >
          <option value="">Select vehicle type (optional)</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="mileage">Mileage</label>
        <input
          id="mileage"
          className="field-input"
          type="number"
          min={0}
          placeholder="Current mileage (optional)"
          value={form.mileage}
          onChange={(e) => update("mileage", e.target.value)}
        />

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update vehicle" : "Add vehicle"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---- Saved vehicles ---- */}
      <h3 className="section-heading">Saved vehicles</h3>

      {loading ? (
        <div className="card"><p>Loading vehicles...</p></div>
      ) : vehicles.length === 0 ? (
        <div className="card"><p>No vehicles yet. Add your first vehicle above.</p></div>
      ) : (
        vehicles.map((v) => {
          const isOwner = v.myRole === "Owner";
          return (
            <div key={v.id} className="card vehicle-card">
              <div className="vehicle-head">
                <div>
                  <div className="vehicle-title">{v.brandName} {v.model}</div>
                  <div className="vehicle-reg">{v.registrationNumber}</div>
                </div>
                <span className="badge">{v.registeredYear}</span>
              </div>
              <div className="vehicle-meta">
                <span>⛽ {v.fuelType}</span>
                {v.vehicleType && <span>🚙 {v.vehicleType}</span>}
                {v.mileage != null && <span>🛣️ {v.mileage.toLocaleString()} mi</span>}
              </div>

              <div className="access-summary">
                <span><span className="lbl">Owner</span>{v.owner?.name ?? "—"}</span>
                <span className={`badge role-${(v.myRole ?? "").toLowerCase()}`}>Your access: {v.myRole}</span>
              </div>

              {isOwner ? (
                <AccessPanel vehicle={v} onChanged={refresh} />
              ) : (
                <div className="field-hint">
                  You have <strong>{v.myRole}</strong> access. Only the owner can edit this vehicle or manage users.
                </div>
              )}

              {isOwner && (
                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => startEdit(v)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => onDelete(v)}>Delete</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/** Owner-only panel to assign/remove users on a vehicle. */
function AccessPanel({ vehicle, onChanged }: { vehicle: Vehicle; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Enter the user's email");
    setBusy(true);
    try {
      await vehiclesApi.assignAccess(vehicle.id, email.trim(), role);
      setEmail("");
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not assign user");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setErr(null);
    try {
      await vehiclesApi.removeAccess(vehicle.id, userId);
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not remove user");
    }
  }

  return (
    <div className="access-panel">
      <div className="access-title">Assigned users</div>
      {vehicle.accesses.length === 0 ? (
        <div className="field-hint">No users assigned yet.</div>
      ) : (
        vehicle.accesses.map((a) => (
          <div key={a.userId} className="access-row">
            <div>
              <div className="access-name">{a.user.name}</div>
              <div className="access-email">{a.user.email}</div>
            </div>
            <div className="access-actions">
              <span className="badge">{a.role}</span>
              <button type="button" className="btn-mini" onClick={() => remove(a.userId)}>
                Remove
              </button>
            </div>
          </div>
        ))
      )}

      <form className="access-form" onSubmit={assign}>
        <input
          className="field-input"
          type="email"
          placeholder="user@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select className="field-input access-role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="Editor">Editor</option>
          <option value="Viewer">Viewer</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "…" : "Assign"}
        </button>
      </form>
      {err && <div className="form-error">{err}</div>}
    </div>
  );
}
