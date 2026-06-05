import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qufjjpknmqhvqxykabkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_0q0fpZNWArQbbLXzY0PmsA_blbX3Lm-";

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "return=representation",
    },
    ...opts,
  });
  if (r.status === 204 || r.status === 201) {
    try { return await r.json(); } catch { return []; }
  }
  return r.json();
}

const get  = (table, query = "") => sb(`${table}?${query}`);
const post = (table, body) => sb(table, { method: "POST", body: JSON.stringify(body) });
const put  = (table, id, body) => sb(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body), prefer: "return=representation" });
const del  = (table, id) => sb(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const PKR = v => `PKR ${Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ACCOUNT_ICONS = { bank: "🏦", wallet: "📱", cash: "💵" };
const CAT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#84cc16"];
const CATEGORIES = ["Food & Dining","Transport","Shopping","Bills & Utilities","Health","Education","Entertainment","Salary","Freelance","Debt Payment","Debt Received","Transfer","Other"];

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
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
    <aside style={{ width:220, minHeight:"100vh", background:"#0d0d0f", borderRight:"1px solid #1e1e24", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, zIndex:100 }}>
      <div style={{ padding:"28px 24px 20px", borderBottom:"1px solid #1e1e24" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#f5f0e8", letterSpacing:-0.5 }}>Hisaab</div>
        <div style={{ fontSize:11, color:"#555", marginTop:2, letterSpacing:1, textTransform:"uppercase" }}>Finance Tracker</div>
      </div>
      <nav style={{ flex:1, padding:"16px 12px" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", background:page===n.id?"#1a1a22":"transparent", color:page===n.id?"#c9b97a":"#666", fontSize:13, fontFamily:"inherit", textAlign:"left", transition:"all 0.15s", marginBottom:2 }}>
            <span style={{ fontSize:16, width:20, textAlign:"center" }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:"16px 24px", borderTop:"1px solid #1e1e24", fontSize:11, color:"#333" }}>v2.0 · Supabase</div>
    </aside>
  );
}

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:"20px 24px", flex:1, minWidth:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:12, color:"#555", textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ fontSize:26, fontFamily:"'DM Serif Display',serif", color:accent||"#f5f0e8", marginTop:8, letterSpacing:-0.5 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#444", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ type }) {
  const c = type==="credit" ? { bg:"#0d2918", color:"#22c55e", text:"Credit" } : { bg:"#2a0d0d", color:"#ef4444", text:"Debit" };
  return <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500 }}>{c.text}</span>;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ accounts }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    const month = new Date().toISOString().slice(0,7);
    Promise.all([
      get("transactions", `date=gte.${month}-01&date=lte.${month}-31`),
      get("transactions", "order=date.desc"),
    ]).then(([monthTxs, allTxs]) => {
      const income  = monthTxs.filter(t=>t.type==="credit").reduce((s,t)=>s+Number(t.amount),0);
      const expense = monthTxs.filter(t=>t.type==="debit" ).reduce((s,t)=>s+Number(t.amount),0);
      const byCategory = {};
      monthTxs.filter(t=>t.type==="debit").forEach(t => { byCategory[t.category]=(byCategory[t.category]||0)+Number(t.amount); });
      const trendMap = {};
      allTxs.forEach(t => {
        const m = t.date.slice(0,7);
        if (!trendMap[m]) trendMap[m]={income:0,expense:0};
        if (t.type==="credit") trendMap[m].income+=Number(t.amount);
        else trendMap[m].expense+=Number(t.amount);
      });
      setSummary({ income, expense, net:income-expense, byCategory });
      setTrend(Object.entries(trendMap).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([m,v])=>({ month:MONTHS[parseInt(m.split("-")[1])-1]+" "+m.split("-")[0].slice(2), ...v })));
    });
  }, []);

  const totalBalance = (accounts||[]).reduce((s,a)=>s+Number(a.balance||0),0);
  const catData = Object.entries(summary?.byCategory||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));
  const month = new Date().toISOString().slice(0,7);
  const monthLabel = MONTHS[parseInt(month.split("-")[1])-1]+" "+month.split("-")[0];

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:0 }}>Overview</h1>
        <p style={{ color:"#444", fontSize:13, marginTop:4 }}>{monthLabel} · all accounts</p>
      </div>
      <div style={{ display:"flex", gap:14, marginBottom:24 }}>
        <StatCard label="Total Balance" value={PKR(totalBalance)} icon="◈" accent="#c9b97a"/>
        <StatCard label="Income" value={PKR(summary?.income)} icon="↓" accent="#22c55e" sub={monthLabel}/>
        <StatCard label="Expenses" value={PKR(summary?.expense)} icon="↑" accent="#ef4444" sub={monthLabel}/>
        <StatCard label="Net" value={PKR(summary?.net)} icon="=" accent={(summary?.net||0)>=0?"#22c55e":"#ef4444"}/>
      </div>
      <div style={{ display:"flex", gap:14, marginBottom:24 }}>
        {(accounts||[]).map(acc => (
          <div key={acc.id} style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:12, padding:"16px 20px", flex:1, borderTop:`3px solid ${acc.color}` }}>
            <div style={{ fontSize:12, color:"#555", textTransform:"uppercase", letterSpacing:0.8 }}>{ACCOUNT_ICONS[acc.type]||"🏦"} {acc.name}</div>
            <div style={{ fontSize:22, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", marginTop:6 }}>{PKR(acc.balance)}</div>
            <div style={{ fontSize:11, color:"#333", marginTop:2, textTransform:"capitalize" }}>{acc.type}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, color:"#888", marginBottom:16 }}>Income vs Expenses (6 months)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barGap={4}>
              <XAxis dataKey="month" tick={{ fill:"#444", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#444", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{ background:"#111", border:"1px solid #222", borderRadius:8, color:"#fff" }} formatter={v=>PKR(v)}/>
              <Bar dataKey="income" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={24}/>
              <Bar dataKey="expense" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={24}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, color:"#888", marginBottom:16 }}>Spending by Category</div>
          {catData.length>0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {catData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:"#111", border:"1px solid #222", borderRadius:8 }} formatter={v=>PKR(v)}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:11, color:"#666" }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"#333", fontSize:13 }}>No expense data yet</div>}
        </div>
      </div>
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({ accounts, reloadAccounts }) {
  const [txs, setTxs] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAcc, setFilterAcc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), name:"", category:"Food & Dining", amount:"", type:"debit", account_id:"ubl", notes:"" });

  const load = useCallback(async () => {
    let q = "order=date.desc&limit=100";
    if (filterType) q += `&type=eq.${filterType}`;
    if (filterAcc)  q += `&account_id=eq.${filterAcc}`;
    const data = await get("transactions", q);
    setTxs(Array.isArray(data) ? data : []);
  }, [filterType, filterAcc]);

  useEffect(() => { load(); }, [load]);

  const addTx = async () => {
    if (!form.name || !form.amount) return alert("Name and amount required");
    await post("transactions", { ...form, amount: Number(form.amount), month: form.date.slice(0,7) });
    setShowAdd(false);
    setForm({ date:new Date().toISOString().slice(0,10), name:"", category:"Food & Dining", amount:"", type:"debit", account_id:"ubl", notes:"" });
    load(); reloadAccounts();
  };

  const deleteTx = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await del("transactions", id);
    load(); reloadAccounts();
  };

  const filtered = txs.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const inp = { background:"#0a0a0c", border:"1px solid #222", borderRadius:8, color:"#f5f0e8", padding:"8px 12px", fontSize:13, fontFamily:"inherit" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:0 }}>Transactions</h1>
          <p style={{ color:"#444", fontSize:13, marginTop:4 }}>{filtered.length} records</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ Add Transaction</button>
      </div>

      {showAdd && (
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{...inp,width:"100%"}}/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...inp,width:"100%"}} placeholder="e.g. Lunch at Savour"/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Amount (PKR)</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{...inp,width:"100%"}} placeholder="0"/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Type</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{...inp,width:"100%"}}>
                <option value="debit">Debit (Expense)</option><option value="credit">Credit (Income)</option>
              </select></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Account</label>
              <select value={form.account_id} onChange={e=>setForm({...form,account_id:e.target.value})} style={{...inp,width:"100%"}}>
                {(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...inp,width:"100%"}}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{...inp,width:"100%"}} placeholder="Optional"/></div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={addTx} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
            <button onClick={()=>setShowAdd(false)} style={{ background:"transparent", color:"#555", border:"1px solid #222", borderRadius:8, padding:"9px 20px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{...inp,flex:1,maxWidth:260,background:"#0d0d0f",border:"1px solid #1e1e24"}}/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{...inp,width:140,background:"#0d0d0f",border:"1px solid #1e1e24"}}>
          <option value="">All Types</option><option value="debit">Debit</option><option value="credit">Credit</option>
        </select>
        <select value={filterAcc} onChange={e=>setFilterAcc(e.target.value)} style={{...inp,width:150,background:"#0d0d0f",border:"1px solid #1e1e24"}}>
          <option value="">All Accounts</option>
          {(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #1e1e24" }}>
              {["Date","Name","Category","Account","Amount","Type",""].map(h=>(
                <th key={h} style={{ padding:"12px 16px", color:"#444", fontWeight:500, textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:0.6 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:"#333" }}>No transactions yet. Add one above or import CSV.</td></tr>
            ) : filtered.map(tx => {
              const acc = (accounts||[]).find(a=>a.id===tx.account_id);
              return (
                <tr key={tx.id} style={{ borderBottom:"1px solid #111" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#111"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"12px 16px", color:"#666", fontFamily:"monospace", fontSize:12 }}>{tx.date}</td>
                  <td style={{ padding:"12px 16px", color:"#f5f0e8", maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.name}</div>
                    {tx.notes && <div style={{ fontSize:11, color:"#333", marginTop:2 }}>{tx.notes}</div>}
                  </td>
                  <td style={{ padding:"12px 16px" }}><span style={{ background:"#111", color:"#888", fontSize:11, padding:"2px 8px", borderRadius:20 }}>{tx.category}</span></td>
                  <td style={{ padding:"12px 16px", color:"#666", fontSize:12 }}>{acc&&<span style={{ color:acc.color }}>● </span>}{acc?.name||tx.account_id}</td>
                  <td style={{ padding:"12px 16px", color:tx.type==="credit"?"#22c55e":"#ef4444", fontFamily:"monospace", fontWeight:600 }}>{tx.type==="debit"?"−":"+"}{ PKR(tx.amount)}</td>
                  <td style={{ padding:"12px 16px" }}><Badge type={tx.type}/></td>
                  <td style={{ padding:"12px 16px" }}><button onClick={()=>deleteTx(tx.id)} style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:14 }}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
function Accounts({ accounts, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", type:"bank", color:"#6366f1" });
  const inp = { background:"#0a0a0c", border:"1px solid #222", borderRadius:8, color:"#f5f0e8", padding:"8px 12px", fontSize:13, fontFamily:"inherit" };

  const add = async () => {
    if (!form.name) return;
    await post("accounts", { id: form.name.toLowerCase().replace(/\s+/g,"-"), ...form });
    setShowAdd(false); setForm({ name:"", type:"bank", color:"#6366f1" }); reload();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:0 }}>Accounts</h1>
        <button onClick={()=>setShowAdd(!showAdd)} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ Add Account</button>
      </div>
      {showAdd && (
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:"flex", gap:14, alignItems:"flex-end" }}>
            <div style={{ flex:1 }}><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...inp,width:"100%"}} placeholder="e.g. HBL Savings"/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Type</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                <option value="bank">Bank</option><option value="wallet">Mobile Wallet</option><option value="cash">Cash</option>
              </select></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Color</label><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} style={{...inp,width:50,padding:4,cursor:"pointer"}}/></div>
            <button onClick={add} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
        {(accounts||[]).map(acc => (
          <div key={acc.id} style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:24, borderTop:`3px solid ${acc.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:28 }}>{ACCOUNT_ICONS[acc.type]||"🏦"}</span>
              <span style={{ background:"#111", color:"#555", fontSize:11, padding:"3px 10px", borderRadius:20, textTransform:"capitalize" }}>{acc.type}</span>
            </div>
            <div style={{ fontSize:14, color:"#888", marginBottom:4 }}>{acc.name}</div>
            <div style={{ fontSize:30, fontFamily:"'DM Serif Display',serif", color:Number(acc.balance)<0?"#ef4444":"#f5f0e8" }}>{PKR(acc.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DEBTS ────────────────────────────────────────────────────────────────────
function Debts() {
  const [debts, setDebts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", amount:"", type:"owe", due_date:"", notes:"" });
  const inp = { background:"#0a0a0c", border:"1px solid #222", borderRadius:8, color:"#f5f0e8", padding:"8px 12px", fontSize:13, width:"100%", fontFamily:"inherit" };

  const load = () => get("debts","order=created_at.desc").then(d=>setDebts(Array.isArray(d)?d:[]));
  useEffect(()=>{ load(); },[]);

  const add = async () => {
    if (!form.name||!form.amount) return;
    await post("debts",{...form,amount:Number(form.amount)});
    setShowAdd(false); setForm({name:"",amount:"",type:"owe",due_date:"",notes:""}); load();
  };

  const togglePaid = async (id, paid) => { await put("debts",id,{paid:!paid}); load(); };

  const owing = debts.filter(d=>d.type==="owe"&&!d.paid);
  const owed  = debts.filter(d=>d.type==="owed"&&!d.paid);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:0 }}>Debts</h1>
          <p style={{ color:"#444", fontSize:13, marginTop:4 }}>Money you owe · Money owed to you</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ Add Debt</button>
      </div>
      <div style={{ display:"flex", gap:14, marginBottom:24 }}>
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:12, padding:"16px 20px", flex:1, borderTop:"3px solid #ef4444" }}>
          <div style={{ fontSize:12, color:"#555", textTransform:"uppercase" }}>You Owe</div>
          <div style={{ fontSize:26, fontFamily:"'DM Serif Display',serif", color:"#ef4444", marginTop:6 }}>{PKR(owing.reduce((s,d)=>s+Number(d.amount),0))}</div>
        </div>
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:12, padding:"16px 20px", flex:1, borderTop:"3px solid #22c55e" }}>
          <div style={{ fontSize:12, color:"#555", textTransform:"uppercase" }}>Owed to You</div>
          <div style={{ fontSize:26, fontFamily:"'DM Serif Display',serif", color:"#22c55e", marginTop:6 }}>{PKR(owed.reduce((s,d)=>s+Number(d.amount),0))}</div>
        </div>
      </div>
      {showAdd && (
        <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Person</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="e.g. Ali Khan"/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Amount (PKR)</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inp} placeholder="0"/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Type</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                <option value="owe">I Owe Them</option><option value="owed">They Owe Me</option>
              </select></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} style={inp}/></div>
            <div><label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={inp} placeholder="Optional"/></div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={add} style={{ background:"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
            <button onClick={()=>setShowAdd(false)} style={{ background:"transparent", color:"#555", border:"1px solid #222", borderRadius:8, padding:"9px 20px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          </div>
        </div>
      )}
      {[{label:"You Owe",items:owing,color:"#ef4444"},{label:"Owed to You",items:owed,color:"#22c55e"}].map(({label,items,color})=>(
        <div key={label} style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:13, color:"#555", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12, fontWeight:500 }}>{label}</h3>
          {items.length===0 ? <div style={{ color:"#333", fontSize:13, padding:"16px 0" }}>None · all clear</div>
          : items.map(d=>(
            <div key={d.id} style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:10, padding:"14px 20px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"#f5f0e8", fontSize:14 }}>{d.name}</div>
                {d.notes&&<div style={{ fontSize:12, color:"#333", marginTop:2 }}>{d.notes}</div>}
                {d.due_date&&<div style={{ fontSize:11, color:"#444", marginTop:2 }}>Due: {d.due_date}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <span style={{ fontSize:18, fontFamily:"'DM Serif Display',serif", color }}>{PKR(d.amount)}</span>
                <button onClick={()=>togglePaid(d.id,d.paid)} style={{ background:"#111", color:"#666", border:"1px solid #222", borderRadius:6, padding:"5px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Mark Paid</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── CSV IMPORT ───────────────────────────────────────────────────────────────
function ImportCSV({ accounts, reload }) {
  const [file, setFile] = useState(null);
  const [accountId, setAccountId] = useState("ubl");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const doImport = async () => {
    if (!file) return alert("Select a CSV file first");
    setLoading(true);
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
    const rows = lines.slice(1);
    const imported = []; const errors = [];

    for (let i=0; i<rows.length; i++) {
      try {
        const vals = rows[i].split(",").map(v=>v.trim().replace(/"/g,""));
        const row = {};
        headers.forEach((h,j)=>{ row[h]=vals[j]||""; });
        const name   = row["Name"]||row["name"]||row["Description"]||"";
        const cat    = row["Category"]||row["category"]||"Other";
        const rawAmt = row["Amount (PKR)"]||row["Amount"]||row["amount"]||"0";
        const amount = Math.abs(parseFloat(rawAmt.replace(/[^0-9.\-]/g,""))||0);
        const rawType= (row["Type"]||row["type"]||"").toLowerCase();
        const type   = rawType.includes("credit")?"credit":rawType.includes("debit")?"debit":"debit";
        let date     = row["Date"]||row["date"]||"";
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(date)) {
          const p=date.split(/[\/\-]/);
          date=`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
        }
        if (!name||!amount||!date) { errors.push(`Row ${i+2}: missing fields`); continue; }
        const tx = { date, month:date.slice(0,7), name, category:cat, amount, type, account_id:accountId, notes:"Imported from CSV" };
        await post("transactions", tx);
        imported.push(tx);
      } catch(e) { errors.push(`Row ${i+2}: ${e.message}`); }
    }
    setResult({ imported:imported.length, errors });
    setLoading(false); reload();
  };

  const inp = { background:"#0a0a0c", border:"1px solid #222", borderRadius:8, color:"#f5f0e8", padding:"8px 12px", fontSize:13, fontFamily:"inherit", width:"100%" };

  return (
    <div>
      <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:"0 0 8px" }}>Import CSV</h1>
      <p style={{ color:"#444", fontSize:13, marginBottom:28 }}>Upload your 2024 expense data to seed your history.</p>
      <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:28, maxWidth:560 }}>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:13, color:"#888", marginBottom:10 }}>Your CSV columns:</div>
          <div style={{ background:"#080808", borderRadius:8, padding:"10px 16px", fontFamily:"monospace", fontSize:12, color:"#c9b97a" }}>Date · Month · Name · Category · Amount (PKR)</div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:0.6, display:"block", marginBottom:6 }}>Assign to Account</label>
          <select value={accountId} onChange={e=>setAccountId(e.target.value)} style={inp}>
            {(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:0.6, display:"block", marginBottom:6 }}>CSV File</label>
          <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} style={{ color:"#888", fontSize:13 }}/>
          {file&&<div style={{ fontSize:12, color:"#555", marginTop:6 }}>📄 {file.name}</div>}
        </div>
        <button onClick={doImport} disabled={loading} style={{ background:loading?"#333":"#c9b97a", color:"#0a0a0c", border:"none", borderRadius:8, padding:"11px 24px", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
          {loading?"Importing...":"Import Transactions"}
        </button>
        {result&&(
          <div style={{ marginTop:20, background:"#080808", borderRadius:10, padding:"16px 20px" }}>
            <div style={{ color:"#22c55e", fontSize:14, marginBottom:8 }}>✓ Imported {result.imported} transactions</div>
            {result.errors?.length>0&&result.errors.slice(0,5).map((e,i)=><div key={i} style={{ color:"#555", fontSize:11, fontFamily:"monospace" }}>{e}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WHATSAPP PAGE ────────────────────────────────────────────────────────────
function WhatsAppPage() {
  return (
    <div>
      <h1 style={{ fontSize:28, fontFamily:"'DM Serif Display',serif", color:"#f5f0e8", margin:"0 0 8px" }}>WhatsApp Bot</h1>
      <p style={{ color:"#444", fontSize:13, marginBottom:28 }}>Coming soon — log expenses via WhatsApp messages.</p>
      <div style={{ background:"#0d0d0f", border:"1px solid #1e1e24", borderRadius:14, padding:28, maxWidth:500 }}>
        <div style={{ fontSize:13, color:"#666", lineHeight:1.8 }}>
          Once your web app is live, we can connect a WhatsApp bot via Twilio.<br/><br/>
          For now, use the web app to log all your expenses. The WhatsApp integration can be added as a next step.
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);

  const loadAccounts = useCallback(async () => {
    const accs = await get("accounts");
    if (!Array.isArray(accs)) return;
    // Calculate balance for each account from transactions
    const txs = await get("transactions");
    const balances = {};
    if (Array.isArray(txs)) {
      txs.forEach(t => {
        if (!balances[t.account_id]) balances[t.account_id]=0;
        if (t.type==="credit") balances[t.account_id]+=Number(t.amount);
        else balances[t.account_id]-=Number(t.amount);
      });
    }
    setAccounts(accs.map(a=>({...a, balance: balances[a.id]||0})));
  }, []);

  useEffect(()=>{ loadAccounts(); },[loadAccounts]);
  useEffect(()=>{ if(page==="dashboard"||page==="accounts") loadAccounts(); },[page,loadAccounts]);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#070709", minHeight:"100vh", color:"#f5f0e8" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      <Sidebar page={page} setPage={setPage}/>
      <main style={{ marginLeft:220, padding:"40px 48px", minHeight:"100vh" }}>
        {page==="dashboard"    && <Dashboard accounts={accounts}/>}
        {page==="transactions" && <Transactions accounts={accounts} reloadAccounts={loadAccounts}/>}
        {page==="accounts"     && <Accounts accounts={accounts} reload={loadAccounts}/>}
        {page==="debts"        && <Debts/>}
        {page==="import"       && <ImportCSV accounts={accounts} reload={loadAccounts}/>}
        {page==="whatsapp"     && <WhatsAppPage/>}
      </main>
    </div>
  );
}
