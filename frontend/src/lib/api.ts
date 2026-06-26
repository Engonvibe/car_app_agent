/* ---------------------------------------------------------------------------
   Small API client for talking to the backend.
   The base URL comes from VITE_API_URL (see frontend/.env.example).
   A login token (if present) is attached to every request.
--------------------------------------------------------------------------- */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const TOKEN_KEY = "mot_token";
export const USER_KEY = "mot_user";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export type VehicleRole = "Owner" | "Editor" | "Viewer";

export interface VehicleAccessEntry {
  userId: string;
  role: string;
  user: PublicUser;
}

export interface Vehicle {
  id: string;
  brandName: string;
  model: string;
  registeredYear: number;
  fuelType: string;
  registrationNumber: string;
  vehicleType: string | null;
  mileage: number | null;
  ownerId: string | null;
  owner: PublicUser | null;
  accesses: VehicleAccessEntry[];
  myRole: VehicleRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInput {
  brandName: string;
  model: string;
  registeredYear: number | string;
  fuelType: string;
  registrationNumber: string;
  vehicleType?: string;
  mileage?: number | string;
}

export interface ServiceEntry {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  entryType: string;
  serviceType: string;
  category: string | null;
  serviceDate: string;
  recommendedServiceDate: string | null;
  motDueDate: string | null;
  amount: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEntryInput {
  vehicleId: string;
  entryType: string;
  serviceType: string;
  category?: string;
  serviceDate: string;
  motDueDate?: string;
  amount?: number | string;
  status: string;
  notes?: string;
}

export interface DashboardSummary {
  totals: { vehicles: number; entries: number; upcomingServices: number; costThisMonth: number };
  monthlyCost: { month: string; label: string; total: number }[];
  topServiceTypes: { name: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  topUpcoming: { id: string; vehicle: string; serviceType: string; recommendedServiceDate: string }[];
}

export interface ReportResult {
  fromDate: string | null;
  toDate: string | null;
  count: number;
  totalCost: number;
  entries: ServiceEntry[];
}

export interface ReminderItem {
  id: string;
  entryId: string;
  type: "Recommended Service" | "MOT Due";
  vehicle: string;
  serviceType: string;
  date: string;
  status: "Overdue" | "Due" | "Upcoming";
}

export interface RemindersResult {
  today: string;
  recommendedServices: ReminderItem[];
  motDue: ReminderItem[];
}

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Token missing/expired — clear it and let the app show the login screen.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---
export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export const authApi = {
  register(name: string, email: string, password: string): Promise<AuthResponse> {
    return fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }).then((r) => handle<AuthResponse>(r));
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => handle<AuthResponse>(r));
  },
  me(): Promise<{ user: PublicUser }> {
    return fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() }).then((r) =>
      handle<{ user: PublicUser }>(r)
    );
  },
  logout(): Promise<{ ok: boolean }> {
    return fetch(`${API_URL}/api/auth/logout`, { method: "POST", headers: authHeaders() })
      .then((r) => handle<{ ok: boolean }>(r))
      .catch(() => ({ ok: true }));
  },
};

// --- Vehicles ---
export const vehiclesApi = {
  list(): Promise<Vehicle[]> {
    return fetch(`${API_URL}/api/vehicles`, { headers: authHeaders() }).then((r) =>
      handle<Vehicle[]>(r)
    );
  },
  get(id: string): Promise<Vehicle> {
    return fetch(`${API_URL}/api/vehicles/${id}`, { headers: authHeaders() }).then((r) =>
      handle<Vehicle>(r)
    );
  },
  create(input: VehicleInput): Promise<Vehicle> {
    return fetch(`${API_URL}/api/vehicles`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }).then((r) => handle<Vehicle>(r));
  },
  update(id: string, input: VehicleInput): Promise<Vehicle> {
    return fetch(`${API_URL}/api/vehicles/${id}`, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }).then((r) => handle<Vehicle>(r));
  },
  remove(id: string): Promise<{ ok: boolean }> {
    return fetch(`${API_URL}/api/vehicles/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<{ ok: boolean }>(r));
  },
  assignAccess(id: string, email: string, role: string): Promise<Vehicle> {
    return fetch(`${API_URL}/api/vehicles/${id}/access`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, role }),
    }).then((r) => handle<Vehicle>(r));
  },
  removeAccess(id: string, userId: string): Promise<Vehicle> {
    return fetch(`${API_URL}/api/vehicles/${id}/access/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<Vehicle>(r));
  },
};

// --- Entries ---
export const entriesApi = {
  list(): Promise<ServiceEntry[]> {
    return fetch(`${API_URL}/api/entries`, { headers: authHeaders() }).then((r) =>
      handle<ServiceEntry[]>(r)
    );
  },
  get(id: string): Promise<ServiceEntry> {
    return fetch(`${API_URL}/api/entries/${id}`, { headers: authHeaders() }).then((r) =>
      handle<ServiceEntry>(r)
    );
  },
  create(input: ServiceEntryInput): Promise<ServiceEntry> {
    return fetch(`${API_URL}/api/entries`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }).then((r) => handle<ServiceEntry>(r));
  },
  update(id: string, input: Partial<ServiceEntryInput>): Promise<ServiceEntry> {
    return fetch(`${API_URL}/api/entries/${id}`, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }).then((r) => handle<ServiceEntry>(r));
  },
  remove(id: string): Promise<{ ok: boolean }> {
    return fetch(`${API_URL}/api/entries/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<{ ok: boolean }>(r));
  },
};

// --- Dashboard / Reports / Reminders ---
export const dashboardApi = {
  summary(): Promise<DashboardSummary> {
    return fetch(`${API_URL}/api/dashboard/summary`, { headers: authHeaders() }).then((r) =>
      handle<DashboardSummary>(r)
    );
  },
};

export const reportsApi = {
  get(fromDate?: string, toDate?: string): Promise<ReportResult> {
    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    const qs = params.toString();
    return fetch(`${API_URL}/api/reports${qs ? `?${qs}` : ""}`, { headers: authHeaders() }).then(
      (r) => handle<ReportResult>(r)
    );
  },
};

export const remindersApi = {
  list(): Promise<RemindersResult> {
    return fetch(`${API_URL}/api/reminders`, { headers: authHeaders() }).then((r) =>
      handle<RemindersResult>(r)
    );
  },
};

// --- Internal validation / evaluation (Phase 9) ---
export interface ValidationData {
  sample: boolean;
  generatedNote: string;
  recommendationEval: {
    sample: boolean;
    k: number;
    precisionAtK: number;
    recallAtK: number;
    ndcg: number;
    explanation: string;
  };
  reminderEval: {
    sample: boolean;
    maeDays: number;
    accuracy: number;
    timeDeviationDays: number;
    explanation: string;
  };
  feasibility: { label: string; status: "Done" | "Prototype" | "Pending" }[];
  userEval: { status: string; items: { label: string; value: string }[] };
}

export const validationApi = {
  get(): Promise<ValidationData> {
    return fetch(`${API_URL}/api/validation`, { headers: authHeaders() }).then((r) =>
      handle<ValidationData>(r)
    );
  },
};
