import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Users, TrendingUp, DollarSign, Percent } from "lucide-react";
import "./CRM.css";

/* =========================================================
   API + Types
========================================================= */
const API = "http://localhost:4000";

type Account = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  createdAt: string;
};

type Lead = {
  id: string;
  fullName: string;
  company?: string | null;
  email?: string | null;
  status: string; // "NEW", "QUALIFIED", etc.
  createdAt: string;
};

type Opportunity = {
  id: string;
  name: string;
  stage: string; // "PROSPECTING", etc.
  amount?: number | null;
  createdAt: string;
  accountId?: string;
};

/* =========================================================
   App Shell (tabs)
========================================================= */
export default function CRMApp() {
  const [tab, setTab] = useState<"dashboard" | "accounts" | "leads" | "opps">("dashboard");

  return (
    <div className="crm-dashboard">
      {/* HEADER */}
      <header className="crm-header">
        <h1>CRM Starter</h1>
        <p>Manage your accounts, leads, and opportunities in one place</p>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="crm-tabs" role="tablist" style={{ position: "relative", zIndex: 100 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "dashboard"}
          className={`tab ${tab === "dashboard" ? "active" : ""}`}
          onClick={() => setTab("dashboard")}
        >
          🏠 Dashboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "accounts"}
          className={`tab ${tab === "accounts" ? "active" : ""}`}
          onClick={() => setTab("accounts")}
        >
          🏢 Accounts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "leads"}
          className={`tab ${tab === "leads" ? "active" : ""}`}
          onClick={() => setTab("leads")}
        >
          🧑‍💼 Leads
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "opps"}
          className={`tab ${tab === "opps" ? "active" : ""}`}
          onClick={() => setTab("opps")}
        >
          📈 Opportunities
        </button>
      </nav>

      {/* CONTENT */}
      {tab === "dashboard" && <DashboardCards />}
      {tab === "accounts" && <AccountsView />}
      {tab === "leads" && <LeadsView />}
      {tab === "opps" && <OppsView />}
    </div>
  );
}

/* =========================================================
   DASHBOARD — metrics + charts (live)
========================================================= */
function DashboardCards() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // canvases for chart.js
  const pipelineRef = useRef<HTMLCanvasElement | null>(null);
  const leadStatusRef = useRef<HTMLCanvasElement | null>(null);
  const revenueRef = useRef<HTMLCanvasElement | null>(null);

  // Chart instances so we can destroy when re-drawing
  const charts = useRef<{ pipeline?: any; leadStatus?: any; revenue?: any }>({});

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ra, rl, ro] = await Promise.all([
          fetch(`${API}/accounts`),
          fetch(`${API}/leads`),
          fetch(`${API}/opps`),
        ]);
        if (cancelled) return;
        setAccounts(await ra.json());
        setLeads(await rl.json());
        setOpps(await ro.json());
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Metrics
  const totalAccounts = accounts.length;
  const totalLeads = leads.length;
  const totalOpps = opps.length;
  const totalRevenue = useMemo(
    () => opps.reduce((sum, o) => sum + (o.amount ?? 0), 0),
    [opps]
  );
  const qualifiedLeads = leads.filter((l) => l.status?.toUpperCase() === "QUALIFIED").length;
  const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

  // Chart helpers
  function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
  }
  function lastNMonthsLabels(n: number) {
    const arr: string[] = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - i, 1);
      arr.push(
        dt.toLocaleString(undefined, { month: "short" }) + " " + String(dt.getFullYear()).slice(2)
      );
    }
    return arr;
  }

  // Build datasets
  const pipelineByStage = useMemo(() => {
    const stageMap = new Map<string, number>();
    for (const o of opps) {
      stageMap.set(o.stage || "UNKNOWN", (stageMap.get(o.stage || "UNKNOWN") ?? 0) + 1);
    }
    return {
      labels: Array.from(stageMap.keys()),
      data: Array.from(stageMap.values()),
    };
  }, [opps]);

  const leadStatusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const s = (l.status || "NEW").toUpperCase();
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return { labels: Array.from(map.keys()), data: Array.from(map.values()) };
  }, [leads]);

  const revenueByMonth = useMemo(() => {
    // last 6 months labels
    const labels = lastNMonthsLabels(6);
    // build index map for assignment
    const now = new Date();
    const keyIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keyIndex.set(monthKey(dt), 5 - i);
    }
    const values = new Array(6).fill(0);
    for (const o of opps) {
      const k = monthKey(new Date(o.createdAt));
      const idx = keyIndex.get(k);
      if (idx !== undefined) values[idx] += o.amount ?? 0;
    }
    return { labels, data: values };
  }, [opps]);

  // Draw charts with Chart.js (loaded only on dashboard)
  useEffect(() => {
    (async () => {
      try {
        const { default: Chart } = await import("chart.js/auto");

        // destroy old instances if present
        charts.current.pipeline?.destroy?.();
        charts.current.leadStatus?.destroy?.();
        charts.current.revenue?.destroy?.();

        // Pipeline by stage (bar)
        if (pipelineRef.current) {
          charts.current.pipeline = new Chart(pipelineRef.current, {
            type: "bar",
            data: {
              labels: pipelineByStage.labels,
              datasets: [
                {
                  label: "Count",
                  data: pipelineByStage.data,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            },
          });
        }

        // Lead status (doughnut)
        if (leadStatusRef.current) {
          charts.current.leadStatus = new Chart(leadStatusRef.current, {
            type: "doughnut",
            data: {
              labels: leadStatusCounts.labels,
              datasets: [
                {
                  label: "Leads",
                  data: leadStatusCounts.data,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            },
          });
        }

        // Revenue trend (line)
        if (revenueRef.current) {
          charts.current.revenue = new Chart(revenueRef.current, {
            type: "line",
            data: {
              labels: revenueByMonth.labels,
              datasets: [
                {
                  label: "Revenue",
                  data: revenueByMonth.data,
                  tension: 0.35,
                  fill: false,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
              scales: { y: { beginAtZero: true } },
            },
          });
        }
      } catch {
        // If chart.js isn't installed, just keep placeholders silently.
      }
    })();

    // cleanup on unmount
    return () => {
      charts.current.pipeline?.destroy?.();
      charts.current.leadStatus?.destroy?.();
      charts.current.revenue?.destroy?.();
    };
  }, [pipelineByStage, leadStatusCounts, revenueByMonth]);

  return (
    <>
      {/* METRIC CARDS */}
      <section className="metrics">
        <div className="metric-card">
          <div className="icon-box blue"><Building2 /></div>
          <div>
            <h3>Total Accounts</h3>
            <p className="metric-number">{totalAccounts || "—"}</p>
            <span>Active business accounts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="icon-box purple"><Users /></div>
          <div>
            <h3>Total Leads</h3>
            <p className="metric-number">{totalLeads || "—"}</p>
            <span>In pipeline</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="icon-box green"><TrendingUp /></div>
          <div>
            <h3>Opportunities</h3>
            <p className="metric-number">{totalOpps || "—"}</p>
            <span>Open deals</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="icon-box teal"><DollarSign /></div>
          <div>
            <h3>Total Revenue</h3>
            <p className="metric-number">
              {totalRevenue ? `$${Intl.NumberFormat().format(totalRevenue)}` : "$—"}
            </p>
            <span>All opportunities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="icon-box orange"><Percent /></div>
          <div>
            <h3>Conversion Rate</h3>
            <p className="metric-number">
              {totalLeads ? `${conversionRate.toFixed(1)}%` : "—%"}
            </p>
            <span>Lead to qualified</span>
          </div>
        </div>
      </section>

      {/* CHARTS */}
      <section className="graphs">
        <div className="graph-card">
          <div className="graph-title">
            <TrendingUp /> Opportunity Pipeline by Stage
          </div>
          <div className="graph-placeholder">
            <canvas ref={pipelineRef} style={{ width: "100%", height: "220px" }} />
          </div>
        </div>

        <div className="graph-card">
          <div className="graph-title">
            <Users /> Lead Status Distribution
          </div>
          <div className="graph-placeholder">
            <canvas ref={leadStatusRef} style={{ width: "100%", height: "220px" }} />
          </div>
        </div>

        <div className="graph-card full-width">
          <div className="graph-title">
            <DollarSign /> Revenue Trend (Last 6 Months)
          </div>
          <div className="graph-placeholder">
            <canvas ref={revenueRef} style={{ width: "100%", height: "260px" }} />
          </div>
        </div>
      </section>

      {err && (
        <div style={{ marginTop: 12, color: "#b42318", fontWeight: 600 }}>
          {err}
        </div>
      )}
    </>
  );
}

/* =========================================================
   ACCOUNTS — Add / Search / Edit / Delete
========================================================= */
function AccountsView() {
  const [items, setItems] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    const res = await fetch(`${API}/accounts`);
    setItems(await res.json());
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry: industry || undefined, website: website || undefined }),
    });
    setName(""); setIndustry(""); setWebsite("");
    await load();
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.industry ?? "").toLowerCase().includes(q) ||
        (a.website ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  // Edit / Delete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editWebsite, setEditWebsite] = useState("");

  const beginEdit = (a: Account) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditIndustry(a.industry ?? "");
    setEditWebsite(a.website ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch(`${API}/accounts/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, industry: editIndustry || null, website: editWebsite || null }),
    });
    setEditingId(null);
    await load();
  };

  const cancelEdit = () => setEditingId(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this account? This cannot be undone.")) return;
    const res = await fetch(`${API}/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {}
      alert(`Failed to delete account: ${msg}`);
      return;
    }
    await load();
  };

  return (
    <section className="crm-section">
      <h2 className="crm-section-title">Accounts</h2>
      <form className="crm-form grid-4" onSubmit={create}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
        <input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} />
        <button type="submit" className="btn-primary">Add</button>
      </form>

      <div className="search-bar">
        <input
          placeholder="Search accounts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-table">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Industry</th><th>Website</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: 48 }}>🏢</div>
                    <div className="empty-title">No accounts found</div>
                    <div className="empty-sub">Create your first account to get started</div>
                  </div>
                </td>
              </tr>
            ) : filtered.map((a) => (
              <tr key={a.id}>
                <td>
                  {editingId === a.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : a.name}
                </td>
                <td>
                  {editingId === a.id ? (
                    <input value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} />
                  ) : (a.industry || "—")}
                </td>
                <td>
                  {editingId === a.id ? (
                    <input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
                  ) : (
                    a.website ? <a href={a.website} target="_blank" rel="noreferrer">{a.website}</a> : "—"
                  )}
                </td>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {editingId === a.id ? (
                    <>
                      <button className="btn-secondary" onClick={saveEdit} type="button">Save</button>
                      <button className="btn-ghost" onClick={cancelEdit} type="button">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => beginEdit(a)} type="button">Edit</button>
                      <button className="btn-danger" onClick={() => remove(a.id)} type="button">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   LEADS — Add / Search / Delete
========================================================= */
function LeadsView() {
  const [items, setItems] = useState<Lead[]>([]);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    const res = await fetch(`${API}/leads`);
    setItems(await res.json());
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        company: company || undefined,
        email: email || undefined,
      }),
    });
    setFullName(""); setCompany(""); setEmail("");
    await load();
  };

  const removeLead = async (id: string) => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        alert(`Failed to delete lead: ${msg}`);
        return;
      }
      await load();
    } catch (e: any) {
      alert(`Failed to delete lead: ${e?.message || e}`);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (l) =>
        l.fullName.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.status ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <section className="crm-section">
      <h2 className="crm-section-title">Leads</h2>

      <form className="crm-form grid-4" onSubmit={create}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add</button>
      </form>

      <div className="search-bar">
        <input
          placeholder="Search leads..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-table">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Company</th><th>Email</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">No leads yet. Add your first one above!</td>
              </tr>
            ) : filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.fullName}</td>
                <td>{l.company || "—"}</td>
                <td>{l.email || "—"}</td>
                <td>{l.status}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn-danger"
                    type="button"
                    onClick={() => removeLead(l.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   OPPORTUNITIES — Add / Search
========================================================= */
function OppsView() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    const [ro, ra] = await Promise.all([fetch(`${API}/opps`), fetch(`${API}/accounts`)]);
    setItems(await ro.json());
    setAccounts(await ra.json());
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/opps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, name, amount: amount ? Number(amount) : undefined }),
    });
    setAccountId(""); setName(""); setAmount("");
    await load();
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.stage ?? "").toLowerCase().includes(q) ||
        String(o.amount ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <section className="crm-section">
      <h2 className="crm-section-title">Opportunities</h2>
      <form className="crm-form grid-4" onSubmit={create}>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} required>
          <option value="">Select account…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input placeholder="Opportunity name" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <button type="submit" className="btn-primary">Add</button>
      </form>

      <div className="search-bar">
        <input
          placeholder="Search opportunities..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-table">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Stage</th><th style={{ textAlign: "right" }}>Amount</th><th>Created</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="empty">No opportunities yet. Add your first one above!</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{o.stage}</td>
                <td style={{ textAlign: "right" }}>{o.amount ?? "—"}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
