import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = "http://localhost:3001/api";
const PKR = v => `PKR ${Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ACCOUNT_ICONS = { bank: "🏦", wallet: "📱", cash: "💵" };
const TYPE_COLORS = { credit: "#22c55e", debit: "#ef4444" };
const CAT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#84cc16"];

// ─── API HELPERS ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const r = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return r.json();
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function Sidebar({ page, setPage }) {
  const nav = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "transactions", icon: "↕", label: "Transactions" },
    { id: "accounts", icon: "◈", label: "Accounts" },
    { id: "debts", icon: "⊖", label: "Debts" },
    { id: "import", icon: "↑", label: "Import CSV" },
    { id: "whatsapp", icon: "◎", label: "WhatsApp Bot" },
  ];
  return (
    <aside style={{
      width: 220, minHeight: "100vh", background: "#0d0d0f",
      borderRight: "1px solid #1e1e24", display: "flex", flexDirection: "column",
      padding: "0", position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #1e1e24" }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#f5f0e8", letterSpacing: -0.5 }}>
          Hisaab
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>
          Finance Tracker
        </div>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: page === n.id ? "#1a1a22" : "transparent",
            color: page === n.id ? "#c9b97a" : "#666",
            fontSize: 13, fontFamily: "inherit", textAlign: "left",
            transition: "all 0.15s", marginBottom: 2,
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 24px", borderTop: "1px solid #1e1e24", fontSize: 11, color: "#333" }}>
        v1.0 · UBL · JazzCash · Cash
      </div>
    </aside>
  );
}

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14,
      padding: "20px 24px", flex: 1, minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', serif", color: accent || "#f5f0e8", marginTop: 8, letterSpacing: -0.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ type }) {
  const colors = { credit: { bg: "#0d2918", color: "#22c55e", text: "Credit" }, debit: { bg: "#2a0d0d", color: "#ef4444", text: "Debit" } };
  const c = colors[type] || colors.debit;
  return <span style={{ background: c.bg, color: c.color, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>{c.text}</span>;
}

// ─── PAGES ────────────────────────────────────────────────────────────────────
function Dashboard({ summary, accounts }) {
  const trendData = (summary?.trend || []).map(t => ({
    ...t,
    month: t.month ? MONTHS[parseInt(t.month.split("-")[1]) - 1] + " " + t.month.split("-")[0].slice(2) : t.month,
  }));
  const catData = Object.entries(summary?.byCategory || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthLabel = MONTHS[parseInt(currentMonth.split("-")[1]) - 1] + " " + currentMonth.split("-")[0];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: 0 }}>Overview</h1>
        <p style={{ color: "#444", fontSize: 13, marginTop: 4 }}>{monthLabel} · all accounts</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Balance" value={PKR(accounts?.reduce((s, a) => s + a.balance, 0))} icon="◈" accent="#c9b97a" />
        <StatCard label="Income" value={PKR(summary?.totalIncome)} icon="↓" accent="#22c55e" sub={monthLabel} />
        <StatCard label="Expenses" value={PKR(summary?.totalExpense)} icon="↑" accent="#ef4444" sub={monthLabel} />
        <StatCard label="Net" value={PKR(summary?.net)} icon="=" accent={(summary?.net || 0) >= 0 ? "#22c55e" : "#ef4444"} />
      </div>

      {/* Account Balances */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {(accounts || []).map(acc => (
          <div key={acc.id} style={{
            background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 12,
            padding: "16px 20px", flex: 1, borderTop: `3px solid ${acc.color}`,
          }}>
            <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {ACCOUNT_ICONS[acc.type]} {acc.name}
            </div>
            <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", marginTop: 6 }}>
              {PKR(acc.balance)}
            </div>
            <div style={{ fontSize: 11, color: "#333", marginTop: 2, textTransform: "capitalize" }}>{acc.type}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Income vs Expenses (6 months)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: "#444", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, color: "#fff" }} formatter={v => PKR(v)} />
              <Bar dataKey="income" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={24} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Spending by Category</div>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8 }} formatter={v => PKR(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#666" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 13 }}>
              No expense data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Transactions({ accounts }) {
  const [txs, setTxs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", type: "", accountId: "", category: "" });
  const [categories, setCategories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), name: "", category: "Food & Dining", amount: "", type: "debit", accountId: "ubl", notes: "" });

  const loadTxs = useCallback(async () => {
    const params = new URLSearchParams({ limit: 50, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
    const data = await apiFetch("/transactions?" + params);
    setTxs(data.transactions || []);
    setTotal(data.total || 0);
  }, [filters]);

  useEffect(() => { loadTxs(); }, [loadTxs]);
  useEffect(() => { apiFetch("/categories").then(setCategories); }, []);

  const addTx = async () => {
    if (!form.name || !form.amount) return alert("Name and amount required");
    await apiFetch("/transactions", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    setForm({ date: new Date().toISOString().slice(0,10), name: "", category: "Food & Dining", amount: "", type: "debit", accountId: "ubl", notes: "" });
    loadTxs();
  };

  const deleteTx = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await apiFetch("/transactions/" + id, { method: "DELETE" });
    loadTxs();
  };

  const inputStyle = { background: "#0a0a0c", border: "1px solid #222", borderRadius: 8, color: "#f5f0e8", padding: "8px 12px", fontSize: 13, width: "100%", fontFamily: "inherit" };
  const labelStyle = { fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, display: "block" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: 0 }}>Transactions</h1>
          <p style={{ color: "#444", fontSize: 13, marginTop: 4 }}>{total} records</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8,
          padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>+ Add Transaction</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={labelStyle}>Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle}/></div>
            <div><label style={labelStyle}>Name / Description</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} placeholder="e.g. Lunch at Savour"/></div>
            <div><label style={labelStyle}>Amount (PKR)</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={inputStyle} placeholder="0"/></div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
                <option value="debit">Debit (Expense)</option>
                <option value="credit">Credit (Income)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Account</label>
              <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} style={inputStyle}>
                {(accounts||[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>Notes</label><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={inputStyle} placeholder="Optional"/></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addTx} style={{ background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ background: "transparent", color: "#555", border: "1px solid #222", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Search transactions..." style={{ ...inputStyle, flex: 1, maxWidth: 260, background: "#0d0d0f", border: "1px solid #1e1e24" }}/>
        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ ...inputStyle, width: 140, background: "#0d0d0f", border: "1px solid #1e1e24" }}>
          <option value="">All Types</option><option value="debit">Debit</option><option value="credit">Credit</option>
        </select>
        <select value={filters.accountId} onChange={e => setFilters({...filters, accountId: e.target.value})} style={{ ...inputStyle, width: 150, background: "#0d0d0f", border: "1px solid #1e1e24" }}>
          <option value="">All Accounts</option>
          {(accounts||[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e24" }}>
              {["Date","Name","Category","Account","Amount","Type",""].map(h => (
                <th key={h} style={{ padding: "12px 16px", color: "#444", fontWeight: 500, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#333" }}>No transactions found. Add one or import CSV.</td></tr>
            ) : txs.map(tx => {
              const acc = (accounts||[]).find(a => a.id === tx.accountId);
              return (
                <tr key={tx.id} style={{ borderBottom: "1px solid #111", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#111"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", color: "#666", fontFamily: "monospace", fontSize: 12 }}>{tx.date}</td>
                  <td style={{ padding: "12px 16px", color: "#f5f0e8", maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.name}</div>
                    {tx.notes && <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>{tx.notes}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#111", color: "#888", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>{tx.category}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666", fontSize: 12 }}>
                    {acc && <span style={{ color: acc.color }}>● </span>}{acc?.name || tx.accountId}
                  </td>
                  <td style={{ padding: "12px 16px", color: tx.type === "credit" ? "#22c55e" : "#ef4444", fontFamily: "monospace", fontWeight: 600 }}>
                    {tx.type === "debit" ? "−" : "+"}{PKR(tx.amount)}
                  </td>
                  <td style={{ padding: "12px 16px" }}><Badge type={tx.type}/></td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => deleteTx(tx.id)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Accounts({ accounts, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "bank", color: "#6366f1" });
  const inputStyle = { background: "#0a0a0c", border: "1px solid #222", borderRadius: 8, color: "#f5f0e8", padding: "8px 12px", fontSize: 13, fontFamily: "inherit" };

  const addAccount = async () => {
    if (!form.name) return;
    await apiFetch("/accounts", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false); setForm({ name: "", type: "bank", color: "#6366f1" }); reload();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: 0 }}>Accounts</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Account</button>
      </div>

      {showAdd && (
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Account Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ ...inputStyle, width: "100%" }} placeholder="e.g. HBL Savings"/></div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
                <option value="bank">Bank</option><option value="wallet">Mobile Wallet</option><option value="cash">Cash</option><option value="credit">Credit Card</option>
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Color</label><input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={{ ...inputStyle, width: 50, padding: 4, cursor: "pointer" }}/></div>
            <button onClick={addAccount} style={{ background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {(accounts || []).map(acc => (
          <div key={acc.id} style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24, borderTop: `3px solid ${acc.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{ACCOUNT_ICONS[acc.type] || "🏦"}</span>
              <span style={{ background: "#111", color: "#555", fontSize: 11, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>{acc.type}</span>
            </div>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{acc.name}</div>
            <div style={{ fontSize: 30, fontFamily: "'DM Serif Display', serif", color: acc.balance < 0 ? "#ef4444" : "#f5f0e8" }}>{PKR(acc.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Debts() {
  const [debts, setDebts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", type: "owe", dueDate: "", notes: "" });
  const inputStyle = { background: "#0a0a0c", border: "1px solid #222", borderRadius: 8, color: "#f5f0e8", padding: "8px 12px", fontSize: 13, width: "100%", fontFamily: "inherit" };

  const load = () => apiFetch("/debts").then(setDebts);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name || !form.amount) return;
    await apiFetch("/debts", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false); setForm({ name: "", amount: "", type: "owe", dueDate: "", notes: "" }); load();
  };

  const togglePaid = async (id, paid) => {
    await apiFetch("/debts/" + id, { method: "PATCH", body: JSON.stringify({ paid: !paid }) }); load();
  };

  const owing = debts.filter(d => d.type === "owe" && !d.paid);
  const owed  = debts.filter(d => d.type === "owed" && !d.paid);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: 0 }}>Debts</h1>
          <p style={{ color: "#444", fontSize: 13, marginTop: 4 }}>Money you owe · Money owed to you</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Debt</button>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 12, padding: "16px 20px", flex: 1, borderTop: "3px solid #ef4444" }}>
          <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 }}>You Owe</div>
          <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', serif", color: "#ef4444", marginTop: 6 }}>
            {PKR(owing.reduce((s, d) => s + d.amount, 0))}
          </div>
        </div>
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 12, padding: "16px 20px", flex: 1, borderTop: "3px solid #22c55e" }}>
          <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 }}>Owed to You</div>
          <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', serif", color: "#22c55e", marginTop: 6 }}>
            {PKR(owed.reduce((s, d) => s + d.amount, 0))}
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Person / Description</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} placeholder="e.g. Ali Khan"/></div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Amount (PKR)</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={inputStyle} placeholder="0"/></div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
                <option value="owe">I Owe Them</option><option value="owed">They Owe Me</option>
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} style={inputStyle}/></div>
            <div><label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 4 }}>Notes</label><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={inputStyle} placeholder="Optional"/></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={add} style={{ background: "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ background: "transparent", color: "#555", border: "1px solid #222", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {[{ label: "You Owe", items: owing, color: "#ef4444" }, { label: "Owed to You", items: owed, color: "#22c55e" }].map(({ label, items, color }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12, fontWeight: 500 }}>{label}</h3>
          {items.length === 0 ? (
            <div style={{ color: "#333", fontSize: 13, padding: "16px 0" }}>None · all clear</div>
          ) : items.map(d => (
            <div key={d.id} style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 10, padding: "14px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#f5f0e8", fontSize: 14 }}>{d.name}</div>
                {d.notes && <div style={{ fontSize: 12, color: "#333", marginTop: 2 }}>{d.notes}</div>}
                {d.dueDate && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Due: {d.dueDate}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color }}>{PKR(d.amount)}</span>
                <button onClick={() => togglePaid(d.id, d.paid)} style={{ background: "#111", color: "#666", border: "1px solid #222", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Mark Paid</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {debts.filter(d => d.paid).length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 13, color: "#333", cursor: "pointer" }}>Settled debts ({debts.filter(d => d.paid).length})</summary>
          {debts.filter(d => d.paid).map(d => (
            <div key={d.id} style={{ background: "#080808", borderRadius: 8, padding: "10px 16px", marginTop: 6, display: "flex", justifyContent: "space-between", color: "#333", fontSize: 13 }}>
              <span>{d.name}</span><span style={{ textDecoration: "line-through" }}>{PKR(d.amount)}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function ImportCSV({ accounts }) {
  const [file, setFile] = useState(null);
  const [accountId, setAccountId] = useState("ubl");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const doImport = async () => {
    if (!file) return alert("Select a CSV file first");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("accountId", accountId);
    const r = await fetch(API + "/import/csv", { method: "POST", body: fd });
    setResult(await r.json());
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: "0 0 8px" }}>Import CSV</h1>
      <p style={{ color: "#444", fontSize: 13, marginBottom: 28 }}>Upload your 2024 expense spreadsheet to seed your history.</p>

      <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 28, maxWidth: 560 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Expected CSV columns:</div>
          <div style={{ background: "#080808", borderRadius: 8, padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "#c9b97a" }}>
            Date · Month · Name · Category · Amount (PKR)
          </div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 8 }}>
            A "Type" column is optional — if missing, negative amounts = debit, positive = credit.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 6 }}>Assign to Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ background: "#0a0a0c", border: "1px solid #222", borderRadius: 8, color: "#f5f0e8", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", width: "100%" }}>
            {(accounts||[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 6 }}>CSV File</label>
          <input type="file" accept=".csv,.tsv,.txt" onChange={e => setFile(e.target.files[0])} style={{ color: "#888", fontSize: 13, width: "100%" }}/>
          {file && <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>📄 {file.name}</div>}
        </div>

        <button onClick={doImport} disabled={loading} style={{
          background: loading ? "#333" : "#c9b97a", color: "#0a0a0c", border: "none", borderRadius: 8,
          padding: "11px 24px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>
          {loading ? "Importing..." : "Import Transactions"}
        </button>

        {result && (
          <div style={{ marginTop: 20, background: "#080808", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ color: "#22c55e", fontSize: 14, marginBottom: 8 }}>✓ Imported {result.imported} transactions</div>
            {result.errors?.length > 0 && (
              <div>
                <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 6 }}>{result.errors.length} errors:</div>
                {result.errors.slice(0, 5).map((e, i) => <div key={i} style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{e}</div>)}
              </div>
            )}
            {result.sample?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#444", marginBottom: 6 }}>Sample imported:</div>
                {result.sample.map(tx => (
                  <div key={tx.id} style={{ fontSize: 12, color: "#666", padding: "3px 0", fontFamily: "monospace" }}>
                    {tx.date} · {tx.name.slice(0,30)} · {PKR(tx.amount)} · {tx.type}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WhatsAppSetup() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: "#f5f0e8", margin: "0 0 8px" }}>WhatsApp Bot</h1>
      <p style={{ color: "#444", fontSize: 13, marginBottom: 28 }}>Log expenses and check balances from WhatsApp.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 820 }}>
        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: "#c9b97a", fontFamily: "'DM Serif Display', serif", fontSize: 18, margin: "0 0 16px" }}>Setup Steps</h3>
          {[
            ["1", "Create Twilio account", "twilio.com — free trial available"],
            ["2", "Enable WhatsApp Sandbox", "Twilio Console → Messaging → WhatsApp"],
            ["3", "Set Webhook URL", `POST https://your-domain.com/api/whatsapp/webhook`],
            ["4", "Deploy backend", "Railway / Render / VPS"],
            ["5", "Connect your number", "Send join code to Twilio sandbox"],
          ].map(([n, title, sub]) => (
            <div key={n} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
              <div style={{ background: "#c9b97a", color: "#0a0a0c", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{n}</div>
              <div>
                <div style={{ color: "#f5f0e8", fontSize: 13 }}>{title}</div>
                <div style={{ color: "#444", fontSize: 12, marginTop: 2, fontFamily: "monospace" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: "#c9b97a", fontFamily: "'DM Serif Display', serif", fontSize: 18, margin: "0 0 16px" }}>Commands</h3>
          {[
            ["balance", "See all account balances"],
            ["summary", "This month's income vs expenses"],
            ["spent 2000 food ubl", "Log a debit from UBL"],
            ["spent 500 transport jazzcash", "Log from JazzCash"],
            ["received 15000 salary ubl", "Log income to UBL"],
            ["paid 3000 debt cash", "Record debt payment"],
          ].map(([cmd, desc]) => (
            <div key={cmd} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #111" }}>
              <div style={{ fontFamily: "monospace", color: "#c9b97a", fontSize: 13 }}>{cmd}</div>
              <div style={{ color: "#444", fontSize: 12, marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d0d0f", border: "1px solid #1e1e24", borderRadius: 14, padding: 24, gridColumn: "1 / -1" }}>
          <h3 style={{ color: "#c9b97a", fontFamily: "'DM Serif Display', serif", fontSize: 18, margin: "0 0 12px" }}>Webhook Endpoint</h3>
          <div style={{ background: "#080808", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 13, color: "#888" }}>
            <span style={{ color: "#c9b97a" }}>POST</span> /api/whatsapp/webhook
          </div>
          <p style={{ color: "#444", fontSize: 12, marginTop: 10 }}>
            The backend parses natural language messages and maps them to transactions. For production, replace the NLP parser in server.js with a call to Claude API for smarter intent recognition.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const loadData = useCallback(async () => {
    const [s, a] = await Promise.all([
      apiFetch("/summary?month=" + new Date().toISOString().slice(0, 7)),
      apiFetch("/accounts"),
    ]);
    setSummary(s);
    setAccounts(a.accounts || []);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (page === "dashboard" || page === "accounts") loadData();
  }, [page, loadData]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#070709", minHeight: "100vh", color: "#f5f0e8" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      <Sidebar page={page} setPage={setPage}/>
      <main style={{ marginLeft: 220, padding: "40px 48px", minHeight: "100vh" }}>
        {page === "dashboard"    && <Dashboard summary={summary} accounts={accounts}/>}
        {page === "transactions" && <Transactions accounts={accounts}/>}
        {page === "accounts"     && <Accounts accounts={accounts} reload={loadData}/>}
        {page === "debts"        && <Debts/>}
        {page === "import"       && <ImportCSV accounts={accounts}/>}
        {page === "whatsapp"     && <WhatsAppSetup/>}
      </main>
    </div>
  );
}
