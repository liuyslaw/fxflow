import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import * as XLSX from "xlsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const P = {
  ink:"#0b0b0d", ink2:"#111116", card:"#16161c", panel:"#1b1b22",
  border:"#2a2a35", text:"#ddd5c8", muted:"#6e6660", sub:"#9e978f",
  gold:"#FAA819", mag:"#B84480", purple:"#7C3AED", blue:"#4a9fd4",
  teal:"#2ab5a5", green:"#22D3A0", red:"#F43F5E", orange:"#FB923C",
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "fxflow_v3";
const CREDS = { user: "admin", pass: "FXFlow2025!" };
const GROQ_MODEL = "llama-3.3-70b-versatile";
const BASE_DEFAULT = "MYR";

const DEFAULT_CURRENCIES = ["MYR", "USD", "SGD", "PHP"];
const CCY_COLORS = { MYR: P.mag, USD: P.blue, SGD: P.gold, PHP: P.purple };
const CCY_AUTO = [P.teal, P.orange, P.green, P.red, "#06B6D4", "#F59E0B", "#84CC16"];
const CCY_SYM = { MYR:"RM", USD:"US$", SGD:"S$", PHP:"₱", EUR:"€", JPY:"¥", AUD:"A$", GBP:"£" };
function ccyColor(c) { if (CCY_COLORS[c]) return CCY_COLORS[c]; let h=0; for(let i=0;i<c.length;i++) h=(h*31+c.charCodeAt(i))%CCY_AUTO.length; return CCY_AUTO[h]; }

const ENTITY_TYPES = ["Headquarters","Subsidiary","Branch","JV","Representative Office"];
const COUNTRIES = ["Malaysia","Singapore","Philippines","Indonesia","Thailand","Vietnam","Australia","China","India","Japan","United Kingdom","United States","Other"];
const ENT_COLORS = [P.mag, P.gold, P.purple, P.blue, P.teal, P.orange, P.green, P.red];

const DEFAULT_ENTITIES = [
  { id:"E001", name:"Malaysia HQ",           country:"Malaysia",    currency:"MYR", type:"Headquarters", active:true, color:P.mag    },
  { id:"E002", name:"Singapore Office",       country:"Singapore",   currency:"SGD", type:"Subsidiary",   active:true, color:P.gold   },
  { id:"E003", name:"Philippines Branch",     country:"Philippines", currency:"PHP", type:"Branch",       active:true, color:P.purple },
  { id:"E004", name:"Broadcast & Education",  country:"Malaysia",    currency:"MYR", type:"Subsidiary",   active:true, color:P.blue   },
];

const DEFAULT_FX_MONTHLY = [
  { period:"Jan 2024", MYR:4.723, USD:1, SGD:1.338, PHP:56.14 },
  { period:"Feb 2024", MYR:4.752, USD:1, SGD:1.331, PHP:56.80 },
  { period:"Mar 2024", MYR:4.728, USD:1, SGD:1.349, PHP:55.95 },
  { period:"Apr 2024", MYR:4.781, USD:1, SGD:1.358, PHP:57.36 },
  { period:"May 2024", MYR:4.706, USD:1, SGD:1.339, PHP:58.06 },
  { period:"Jun 2024", MYR:4.714, USD:1, SGD:1.344, PHP:58.61 },
  { period:"Jul 2024", MYR:4.679, USD:1, SGD:1.325, PHP:58.32 },
  { period:"Aug 2024", MYR:4.428, USD:1, SGD:1.308, PHP:56.14 },
  { period:"Sep 2024", MYR:4.218, USD:1, SGD:1.296, PHP:56.29 },
  { period:"Oct 2024", MYR:4.311, USD:1, SGD:1.302, PHP:57.97 },
  { period:"Nov 2024", MYR:4.473, USD:1, SGD:1.338, PHP:58.49 },
  { period:"Dec 2024", MYR:4.458, USD:1, SGD:1.346, PHP:57.88 },
];

// Weekly mock data — Q1 2024, one row per week (Mon date format DD/MM/YYYY)
// Daily FX rates (Mon–Fri) — Jan to Mar 2024
// period format: DD/MM/YYYY
const DEFAULT_FX_WEEKLY = [
  // Week 01/01 – 05/01
  { period:"01/01/2024", MYR:4.710, USD:1, SGD:1.334, PHP:55.88 },
  { period:"02/01/2024", MYR:4.715, USD:1, SGD:1.335, PHP:55.92 },
  { period:"03/01/2024", MYR:4.718, USD:1, SGD:1.336, PHP:55.97 },
  { period:"04/01/2024", MYR:4.720, USD:1, SGD:1.337, PHP:56.05 },
  { period:"05/01/2024", MYR:4.723, USD:1, SGD:1.338, PHP:56.14 },
  // Week 08/01 – 12/01
  { period:"08/01/2024", MYR:4.726, USD:1, SGD:1.339, PHP:56.20 },
  { period:"09/01/2024", MYR:4.729, USD:1, SGD:1.340, PHP:56.28 },
  { period:"10/01/2024", MYR:4.731, USD:1, SGD:1.341, PHP:56.35 },
  { period:"11/01/2024", MYR:4.728, USD:1, SGD:1.340, PHP:56.30 },
  { period:"12/01/2024", MYR:4.733, USD:1, SGD:1.341, PHP:56.40 },
  // Week 15/01 – 19/01
  { period:"15/01/2024", MYR:4.735, USD:1, SGD:1.342, PHP:56.45 },
  { period:"16/01/2024", MYR:4.738, USD:1, SGD:1.343, PHP:56.52 },
  { period:"17/01/2024", MYR:4.741, USD:1, SGD:1.344, PHP:56.60 },
  { period:"18/01/2024", MYR:4.737, USD:1, SGD:1.342, PHP:56.48 },
  { period:"19/01/2024", MYR:4.735, USD:1, SGD:1.341, PHP:56.42 },
  // Week 22/01 – 26/01
  { period:"22/01/2024", MYR:4.730, USD:1, SGD:1.339, PHP:56.22 },
  { period:"23/01/2024", MYR:4.728, USD:1, SGD:1.338, PHP:56.15 },
  { period:"24/01/2024", MYR:4.725, USD:1, SGD:1.337, PHP:56.08 },
  { period:"25/01/2024", MYR:4.727, USD:1, SGD:1.338, PHP:56.12 },
  { period:"26/01/2024", MYR:4.729, USD:1, SGD:1.339, PHP:56.18 },
  // Week 29/01 – 02/02
  { period:"29/01/2024", MYR:4.733, USD:1, SGD:1.340, PHP:56.30 },
  { period:"30/01/2024", MYR:4.738, USD:1, SGD:1.342, PHP:56.45 },
  { period:"31/01/2024", MYR:4.741, USD:1, SGD:1.343, PHP:56.55 },
  { period:"01/02/2024", MYR:4.745, USD:1, SGD:1.330, PHP:56.68 },
  { period:"02/02/2024", MYR:4.748, USD:1, SGD:1.331, PHP:56.72 },
  // Week 05/02 – 09/02
  { period:"05/02/2024", MYR:4.752, USD:1, SGD:1.331, PHP:56.80 },
  { period:"06/02/2024", MYR:4.755, USD:1, SGD:1.330, PHP:56.88 },
  { period:"07/02/2024", MYR:4.758, USD:1, SGD:1.329, PHP:56.95 },
  { period:"08/02/2024", MYR:4.761, USD:1, SGD:1.328, PHP:57.05 },
  { period:"09/02/2024", MYR:4.760, USD:1, SGD:1.329, PHP:57.10 },
  // Week 12/02 – 16/02
  { period:"12/02/2024", MYR:4.758, USD:1, SGD:1.330, PHP:57.02 },
  { period:"13/02/2024", MYR:4.754, USD:1, SGD:1.331, PHP:56.95 },
  { period:"14/02/2024", MYR:4.750, USD:1, SGD:1.332, PHP:56.88 },
  { period:"15/02/2024", MYR:4.748, USD:1, SGD:1.333, PHP:56.82 },
  { period:"16/02/2024", MYR:4.746, USD:1, SGD:1.334, PHP:56.78 },
  // Week 19/02 – 23/02
  { period:"19/02/2024", MYR:4.748, USD:1, SGD:1.333, PHP:56.90 },
  { period:"20/02/2024", MYR:4.746, USD:1, SGD:1.334, PHP:56.85 },
  { period:"21/02/2024", MYR:4.744, USD:1, SGD:1.335, PHP:56.80 },
  { period:"22/02/2024", MYR:4.745, USD:1, SGD:1.335, PHP:56.77 },
  { period:"23/02/2024", MYR:4.747, USD:1, SGD:1.334, PHP:56.75 },
  // Week 26/02 – 01/03
  { period:"26/02/2024", MYR:4.745, USD:1, SGD:1.335, PHP:56.75 },
  { period:"27/02/2024", MYR:4.742, USD:1, SGD:1.336, PHP:56.68 },
  { period:"28/02/2024", MYR:4.740, USD:1, SGD:1.337, PHP:56.62 },
  { period:"29/02/2024", MYR:4.738, USD:1, SGD:1.338, PHP:56.55 },
  { period:"01/03/2024", MYR:4.735, USD:1, SGD:1.339, PHP:56.48 },
  // Week 04/03 – 08/03
  { period:"04/03/2024", MYR:4.728, USD:1, SGD:1.349, PHP:55.95 },
  { period:"05/03/2024", MYR:4.725, USD:1, SGD:1.350, PHP:55.88 },
  { period:"06/03/2024", MYR:4.722, USD:1, SGD:1.351, PHP:55.80 },
  { period:"07/03/2024", MYR:4.718, USD:1, SGD:1.352, PHP:55.72 },
  { period:"08/03/2024", MYR:4.715, USD:1, SGD:1.352, PHP:55.70 },
  // Week 11/03 – 15/03
  { period:"11/03/2024", MYR:4.715, USD:1, SGD:1.352, PHP:55.70 },
  { period:"12/03/2024", MYR:4.717, USD:1, SGD:1.351, PHP:55.75 },
  { period:"13/03/2024", MYR:4.719, USD:1, SGD:1.350, PHP:55.80 },
  { period:"14/03/2024", MYR:4.721, USD:1, SGD:1.349, PHP:55.84 },
  { period:"15/03/2024", MYR:4.722, USD:1, SGD:1.348, PHP:55.85 },
  // Week 18/03 – 22/03
  { period:"18/03/2024", MYR:4.722, USD:1, SGD:1.347, PHP:55.85 },
  { period:"19/03/2024", MYR:4.724, USD:1, SGD:1.346, PHP:55.90 },
  { period:"20/03/2024", MYR:4.726, USD:1, SGD:1.346, PHP:55.94 },
  { period:"21/03/2024", MYR:4.728, USD:1, SGD:1.345, PHP:55.98 },
  { period:"22/03/2024", MYR:4.730, USD:1, SGD:1.344, PHP:56.00 },
  // Week 25/03 – 29/03
  { period:"25/03/2024", MYR:4.730, USD:1, SGD:1.344, PHP:56.00 },
  { period:"26/03/2024", MYR:4.733, USD:1, SGD:1.345, PHP:56.08 },
  { period:"27/03/2024", MYR:4.736, USD:1, SGD:1.346, PHP:56.15 },
  { period:"28/03/2024", MYR:4.738, USD:1, SGD:1.347, PHP:56.20 },
  { period:"29/03/2024", MYR:4.781, USD:1, SGD:1.358, PHP:57.36 },
];

const DEFAULT_FX = DEFAULT_FX_MONTHLY;

// ─── STORE ───────────────────────────────────────────────────────────────────
function freshStore() {
  return {
    entities: DEFAULT_ENTITIES.map(e => ({...e})),
    fxRates: DEFAULT_FX_MONTHLY.map(r => ({...r})),
    fxRatesWeekly: DEFAULT_FX_WEEKLY.map(r => ({...r})),
    currencies: [...DEFAULT_CURRENCIES],
    importHistory: [],
    importTemplate: null,
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshStore();
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return freshStore();
    if (!Array.isArray(s.fxRates) || s.fxRates.length === 0) return freshStore();
    if (!Array.isArray(s.entities)) s.entities = DEFAULT_ENTITIES.map(e => ({...e}));
    if (!Array.isArray(s.currencies)) s.currencies = [...DEFAULT_CURRENCIES];
    if (!Array.isArray(s.importHistory)) s.importHistory = [];
    if (s.importTemplate === undefined) s.importTemplate = null;
    if (!Array.isArray(s.fxRatesWeekly) || s.fxRatesWeekly.length === 0) s.fxRatesWeekly = DEFAULT_FX_WEEKLY.map(r => ({...r}));
    return s;
  } catch (e) {
    return freshStore();
  }
}

function saveStore(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

const StoreCtx = createContext(null);
function useStore() { return useContext(StoreCtx); }

// ─── UTILS ───────────────────────────────────────────────────────────────────
let _id = 0;
function uid() { return Date.now().toString(36) + (++_id); }
function f4(n) { return (n != null && !isNaN(n)) ? Number(n).toFixed(4) : "—"; }
function fpct(n) { if (n == null) return "—"; return (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%"; }
function pct(a, b) { if (!a || !b) return null; return ((b - a) / a) * 100; }
function fdate(iso) { try { return new Date(iso).toLocaleString("en-GB", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch(e) { return iso; } }

// Convert raw FX data to "X per 1 baseCcy"
// Raw format: MYR col = USD/MYR rate, other cols = units per 1 USD
function rebase(fxRates, foreignCcys, baseCcy) {
  return fxRates.map(row => {
    const out = { period: row.period };
    // Get base currency in USD terms (how many USD = 1 baseCcy)
    let baseUsd;
    if (baseCcy === "USD") baseUsd = 1;
    else if (baseCcy === "MYR") baseUsd = row.MYR ? 1 / row.MYR : null;
    else baseUsd = row[baseCcy] ? 1 / row[baseCcy] : null;
    if (!baseUsd) return out;
    foreignCcys.forEach(c => {
      let cUsd;
      if (c === "USD") cUsd = 1;
      else if (c === "MYR") cUsd = row.MYR ? 1 / row.MYR : null;
      else cUsd = row[c] ? 1 / row[c] : null;
      if (cUsd != null) out[c] = parseFloat((cUsd / baseUsd).toFixed(6));
    });
    return out;
  });
}

function isWeeklyData(periods) {
  if (!periods || periods.length === 0) return false;
  const patterns = [/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/, /\d{4}[\/\-]\d{2}[\/\-]\d{2}/, /[A-Za-z]+\s+\d{1,2},?\s+\d{4}/, /\d{1,2}\s+[A-Za-z]+\s+\d{4}/];
  return patterns.some(p => periods.some(s => p.test(s)));
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
function Card({ title, accent, noPad, children, style }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden", ...(accent ? { borderTop: `2px solid ${accent}` } : {}), ...style }}>
      {title && (
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          {accent && <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: P.sub, letterSpacing: 1.4, textTransform: "uppercase" }}>{title}</span>
        </div>
      )}
      <div style={noPad ? {} : { padding: 16 }}>{children}</div>
    </div>
  );
}

function KPI({ label, value, sub, color, up, down }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${color || P.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || P.text, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: up ? P.green : down ? P.red : P.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, color, outline, small, disabled, full, style }) {
  const bg = outline ? "transparent" : (color || P.gold);
  const cl = outline ? (color || P.muted) : (color === P.red || color === P.green || color === P.teal || color === P.blue ? "#fff" : "#000");
  return (
    <button onClick={onClick} disabled={!!disabled} style={{
      padding: small ? "4px 12px" : "8px 18px", borderRadius: 8,
      border: `1px solid ${outline ? (color || P.border) : bg}`,
      background: bg, color: outline ? (color || P.muted) : cl,
      fontSize: small ? 11 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Outfit',sans-serif", opacity: disabled ? 0.5 : 1,
      whiteSpace: "nowrap", width: full ? "100%" : undefined, ...style
    }}>{children}</button>
  );
}

function Inp({ value, onChange, placeholder, type, style }) {
  return (
    <input type={type || "text"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", ...style }} />
  );
}

function Sel({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", cursor: "pointer", ...style }}>
      {children}
    </select>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: P.ink2, borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: active === t.id ? P.card : "transparent",
          color: active === t.id ? P.gold : P.muted,
          fontSize: 12, fontWeight: active === t.id ? 600 : 400,
          cursor: "pointer", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function Badge({ label, color }) {
  return <span style={{ padding: "2px 8px", borderRadius: 10, background: `${color || P.muted}20`, color: color || P.muted, fontSize: 10, fontWeight: 700 }}>{label}</span>;
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: P.muted }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: P.sub, marginBottom: 3 }}>{title}</div>
      {sub && <div style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

function PageTitle({ title, sub }) {
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, color: P.text, lineHeight: 1.1 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function submit() {
    if (!user.trim() || !pass) { setErr("Enter username and password."); return; }
    setBusy(true);
    setTimeout(() => {
      if (user.trim() === CREDS.user && pass === CREDS.pass) {
        onLogin(user.trim());
      } else {
        setErr("Incorrect username or password.");
        setBusy(false);
      }
    }, 500);
  }

  return (
    <div style={{ minHeight: "100vh", background: P.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", top: -150, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(ellipse,${P.mag}14 0%,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 600, background: `linear-gradient(135deg,${P.gold},${P.mag})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>FXFlow</div>
          <div style={{ fontSize: 11, color: P.muted, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 6 }}>FX Rate Management</div>
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Username</div>
              <Inp value={user} onChange={v => { setUser(v); setErr(""); }} placeholder="admin" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Password</div>
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="••••••••"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${err ? P.red : P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none" }} />
            </div>
            {err && <div style={{ fontSize: 12, color: P.red }}>{err}</div>}
            <button onClick={submit} disabled={busy} style={{
              padding: "10px", borderRadius: 8, border: "none",
              background: `linear-gradient(135deg,${P.gold},${P.mag})`,
              color: "#000", fontSize: 14, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1,
              fontFamily: "'Outfit',sans-serif", marginTop: 2,
            }}>{busy ? "Signing in…" : "Sign in"}</button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: P.muted }}>FXFlow v2.0</div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"import",    icon:"↑", label:"Import Data" },
  { id:"dashboard", icon:"◈", label:"Dashboard"  },
  { id:"rates",     icon:"↕", label:"FX Rates"   },
  { id:"ai",        icon:"✦", label:"AI Insights" },
  { id:"entities",  icon:"⊞", label:"Entities"   },
];

function Sidebar({ active, onChange, onLogout, user }) {
  return (
    <div style={{ width: 210, minHeight: "100vh", background: P.ink2, borderRight: `1px solid ${P.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${P.border}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, background: `linear-gradient(135deg,${P.gold},${P.mag})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FXFlow</div>
        <div style={{ fontSize: 9, color: P.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>FX Rate Management</div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => onChange(n.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 9,
            padding: "9px 11px", borderRadius: 8, border: "none", marginBottom: 2,
            background: active === n.id ? `${P.gold}14` : "transparent",
            color: active === n.id ? P.gold : P.muted,
            fontSize: 13, fontWeight: active === n.id ? 600 : 400,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif", textAlign: "left",
            borderLeft: `2px solid ${active === n.id ? P.gold : "transparent"}`,
          }}>
            <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${P.border}` }}>
        <div style={{ fontSize: 10, color: P.muted }}>Signed in as</div>
        <div style={{ fontSize: 12, color: P.sub, fontWeight: 500, marginBottom: 8, marginTop: 2 }}>{user}</div>
        <button onClick={onLogout} style={{ width: "100%", padding: "6px", borderRadius: 8, border: `1px solid ${P.border}`, background: "transparent", color: P.muted, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { store } = useStore();
  const ccys = (store.currencies || DEFAULT_CURRENCIES).filter(c => c !== BASE_DEFAULT);
  const rb = useMemo(() => rebase(store.fxRates, ccys, BASE_DEFAULT), [store.fxRates, store.currencies]);
  const last    = rb[rb.length - 1] || {};
  const prev    = rb[rb.length - 2] || {};
  const prevPeriod = prev.period || null;

  // YTD high/low per currency across all rebased periods
  function ytdStats(c) {
    const vals = rb.map(r => r[c]).filter(v => v != null);
    if (!vals.length) return { high: null, low: null };
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageTitle title="Dashboard" sub={`${store.fxRates.length} periods · base MYR`} />

      {/* KPI cards — "vs [period name]" instead of "vs prior" */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {ccys.map(c => {
          const v = last[c], pv = prev[c], d = pct(pv, v);
          const subLabel = d != null && prevPeriod ? `${fpct(d)} vs ${prevPeriod}` : "—";
          return <KPI key={c} label={`${c}/MYR`} value={f4(v)} color={ccyColor(c)} up={d > 0} down={d < 0} sub={subLabel} />;
        })}
      </div>

      {/* Trend chart */}
      <Card title="Trend — last 6 periods (X per 1 MYR)" accent={P.gold}>
        {rb.length === 0 ? <Empty icon="📈" title="No data" sub="Import rates to get started" /> : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={rb.slice(-6)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="period" tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} width={52} />
              <Tooltip contentStyle={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [f4(v), `${n}/MYR`]} />
              <Legend formatter={v => <span style={{ color: ccyColor(v), fontSize: 11 }}>{v}/MYR</span>} />
              {ccys.map(c => <Line key={c} type="monotone" dataKey={c} stroke={ccyColor(c)} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Closing Rates table */}
      <Card noPad title={`Closing Rates — ${last.period || "—"} · X per 1 MYR`} accent={P.mag}>
        {rb.length === 0 ? <Empty icon="📋" title="No data" sub="Import rates to get started" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: P.panel }}>
                  {["Currency", "Closing Rate", "Period", `vs ${prevPeriod || "Prev"}`, "YTD High", "YTD Low"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: h === "Currency" ? "left" : "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccys.map((c, i) => {
                  const v = last[c], pv = prev[c];
                  const d = pct(pv, v);
                  const { high, low } = ytdStats(c);
                  const isHigh = v != null && high != null && Math.abs(v - high) < 0.000001;
                  const isLow  = v != null && low  != null && Math.abs(v - low)  < 0.000001;
                  return (
                    <tr key={c} style={{ background: i % 2 ? P.panel + "80" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ccyColor(c), flexShrink: 0 }} />
                          <span style={{ color: ccyColor(c), fontWeight: 700 }}>{c}/MYR</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: isHigh ? P.green : isLow ? P.red : P.text, fontSize: 13 }}>
                        {f4(v)}
                        {isHigh && <span style={{ fontSize: 9, color: P.green, marginLeft: 5, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>YTD HIGH</span>}
                        {isLow  && <span style={{ fontSize: 9, color: P.red,   marginLeft: 5, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>YTD LOW</span>}
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "right", color: P.sub, fontSize: 11 }}>{last.period || "—"}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: d == null ? P.muted : d > 0 ? P.green : d < 0 ? P.red : P.muted }}>{d != null ? fpct(d) : "—"}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: P.green }}>{f4(high)}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: P.red }}>{f4(low)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── WEEKLY RATE TABLE COMPONENT ─────────────────────────────────────────────
function WeeklyRateTable({ fxRatesWeekly, foreignCcys, baseCcy }) {
  // Group daily rows into weeks (Mon–Fri blocks)
  const weeks = useMemo(() => {
    if (!fxRatesWeekly || fxRatesWeekly.length === 0) return [];
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    // Parse DD/MM/YYYY date strings
    function parseDate(s) {
      const [d,m,y] = s.split("/"); return new Date(parseInt(y), parseInt(m)-1, parseInt(d));
    }
    // Group by ISO week (Mon = week start)
    const weekMap = {};
    fxRatesWeekly.forEach(row => {
      const dt = parseDate(row.period);
      // Get Monday of this week
      const day = dt.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(dt); mon.setDate(dt.getDate() + diff);
      const wk = `${String(mon.getDate()).padStart(2,"0")}/${String(mon.getMonth()+1).padStart(2,"0")}/${mon.getFullYear()}`;
      if (!weekMap[wk]) weekMap[wk] = { monDate: mon, days: [] };
      weekMap[wk].days.push({ ...row, dayName: DAY_NAMES[dt.getDay()], dt });
    });
    // Sort weeks chronologically, sort days within each week
    return Object.entries(weekMap)
      .sort((a,b) => a[1].monDate - b[1].monDate)
      .map(([wkKey, val]) => {
        const days = val.days.sort((a,b) => a.dt - b.dt);
        // Build end-of-week date label
        const fri = days[days.length-1];
        const label = `${wkKey} – ${fri.period}`;
        return { key: wkKey, label, days };
      });
  }, [fxRatesWeekly]);

  const [selWeek, setSelWeek] = useState(0);

  // Rebase daily rows for selected week
  const weekData = weeks[selWeek] || null;
  const rebasedDays = useMemo(() => {
    if (!weekData) return [];
    return weekData.days.map(row => {
      const out = { dayName: row.dayName, period: row.period };
      let baseUsd;
      if (baseCcy === "USD") baseUsd = 1;
      else if (baseCcy === "MYR") baseUsd = row.MYR ? 1/row.MYR : null;
      else baseUsd = row[baseCcy] ? 1/row[baseCcy] : null;
      if (!baseUsd) return out;
      foreignCcys.forEach(c => {
        let cUsd = c === "USD" ? 1 : c === "MYR" ? (row.MYR ? 1/row.MYR : null) : (row[c] ? 1/row[c] : null);
        if (cUsd != null) out[c] = parseFloat((cUsd/baseUsd).toFixed(6));
      });
      return out;
    });
  }, [weekData, foreignCcys, baseCcy]);

  // Stats per currency across the week's days
  function weekStats(c) {
    const vals = rebasedDays.map(d => d[c]).filter(v => v != null);
    if (!vals.length) return { min: null, max: null, avg: null, chg: null };
    const min = Math.min(...vals), max = Math.max(...vals);
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    const chg = vals.length >= 2 ? ((vals[vals.length-1] - vals[0]) / vals[0]) * 100 : null;
    return { min, max, avg, chg };
  }

  const ORDERED_DAYS = ["Mon","Tue","Wed","Thu","Fri"];

  if (weeks.length === 0) return <Empty icon="📋" title="No daily data" sub="Import daily rates (Mon–Fri) to use weekly view" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Week selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: P.muted, letterSpacing: 1, textTransform: "uppercase" }}>Week</span>
        <Sel value={selWeek} onChange={v => setSelWeek(Number(v))} style={{ minWidth: 220 }}>
          {weeks.map((w, i) => <option key={w.key} value={i}>{w.label}</option>)}
        </Sel>
        <span style={{ fontSize: 11, color: P.muted }}>{rebasedDays.length} trading days</span>
      </div>

      {/* Table — currencies as rows, days as columns */}
      <Card noPad title={`Week of ${weekData?.label || ""} · X per 1 ${baseCcy}`} accent={P.gold}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: P.panel }}>
                <th style={{ padding: "9px 14px", textAlign: "left", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>Currency</th>
                {ORDERED_DAYS.map(d => {
                  const row = rebasedDays.find(r => r.dayName === d);
                  return (
                    <th key={d} style={{ padding: "9px 14px", textAlign: "right", color: row ? P.sub : P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>
                      <div>{d}</div>
                      {row && <div style={{ fontSize: 9, color: P.muted, fontWeight: 400, marginTop: 2 }}>{row.period.slice(0,5)}</div>}
                    </th>
                  );
                })}
                <th style={{ padding: "9px 10px", textAlign: "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, background: P.panel+"90", borderLeft: `1px solid ${P.border}` }}>Min</th>
                <th style={{ padding: "9px 10px", textAlign: "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, background: P.panel+"90" }}>Max</th>
                <th style={{ padding: "9px 10px", textAlign: "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, background: P.panel+"90" }}>Avg</th>
                <th style={{ padding: "9px 10px", textAlign: "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, background: P.panel+"90" }}>Wk Chg</th>
              </tr>
            </thead>
            <tbody>
              {foreignCcys.map((c, i) => {
                const stats = weekStats(c);
                return (
                  <tr key={c} style={{ background: i % 2 ? P.panel+"80" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                    {/* Currency label */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ color: ccyColor(c), fontWeight: 700, fontSize: 12 }}>{c}/{baseCcy}</span>
                    </td>
                    {/* Mon–Fri values */}
                    {ORDERED_DAYS.map(d => {
                      const row = rebasedDays.find(r => r.dayName === d);
                      const val = row?.[c];
                      // Highlight min/max
                      const isMin = val != null && stats.min != null && Math.abs(val - stats.min) < 0.000001;
                      const isMax = val != null && stats.max != null && Math.abs(val - stats.max) < 0.000001;
                      return (
                        <td key={d} style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: isMin ? P.red : isMax ? P.green : val != null ? P.text : P.muted, fontWeight: isMin || isMax ? 700 : 400 }}>
                          {f4(val)}
                        </td>
                      );
                    })}
                    {/* Stats */}
                    <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: P.red, fontWeight: 600, borderLeft: `1px solid ${P.border}`, background: P.panel+"40" }}>{f4(stats.min)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: P.green, fontWeight: 600, background: P.panel+"40" }}>{f4(stats.max)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: P.text, background: P.panel+"40" }}>{f4(stats.avg)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: stats.chg == null ? P.muted : stats.chg > 0 ? P.green : stats.chg < 0 ? P.red : P.muted, background: P.panel+"40" }}>{fpct(stats.chg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "8px 14px 10px", fontSize: 10, color: P.muted, display: "flex", gap: 16 }}>
          <span><span style={{ color: P.green, fontWeight: 700 }}>Green</span> = week high</span>
          <span><span style={{ color: P.red, fontWeight: 700 }}>Red</span> = week low</span>
          <span>Wk Chg = Fri vs Mon</span>
        </div>
      </Card>
    </div>
  );
}

// ─── FX RATES ─────────────────────────────────────────────────────────────────
function FXRates() {
  const { store, setStore } = useStore();
  const { fxRates, currencies } = store;
  const allCcys = currencies || DEFAULT_CURRENCIES;
  const fxRatesWeekly = store.fxRatesWeekly || DEFAULT_FX_WEEKLY;

  const [tab, setTab] = useState("table");
  const [baseCcy, setBaseCcy] = useState(BASE_DEFAULT);
  const [viewMode, setViewMode] = useState("monthly");

  // Derive foreign currencies (all except base)
  const foreignCcys = useMemo(() => allCcys.filter(c => c !== baseCcy), [allCcys, baseCcy]);

  // Select correct dataset based on view mode
  const activeRates = viewMode === "weekly" ? fxRatesWeekly : fxRates;
  const effectiveMode = viewMode;

  // Rebased data from active dataset
  const rb = useMemo(() => rebase(activeRates, foreignCcys, baseCcy), [activeRates, foreignCcys, baseCcy]);
  const last = rb[rb.length - 1] || {};
  const prev = rb[rb.length - 2] || {};
  const periods = activeRates.map(r => r.period);

  // Selected ccys for trend (safe init via useEffect)
  const [selCcys, setSelCcys] = useState([]);
  useEffect(() => { setSelCcys(foreignCcys.slice(0, 3)); }, [baseCcy, currencies]);

  // Compare periods (safe init via useEffect)
  const [cp1, setCp1] = useState("");
  const [cp2, setCp2] = useState("");
  useEffect(() => {
    if (periods.length >= 2) { setCp1(periods[periods.length - 2]); setCp2(periods[periods.length - 1]); }
    else if (periods.length === 1) { setCp1(periods[0]); setCp2(periods[0]); }
  }, [fxRates]);

  // Add currency
  const [showAddCcy, setShowAddCcy] = useState(false);
  const [newCcy, setNewCcy] = useState("");
  const [newCcyErr, setNewCcyErr] = useState("");
  function addCcy() {
    const c = newCcy.trim().toUpperCase();
    if (!c || c.length < 2 || c.length > 6) { setNewCcyErr("Enter a valid 2–6 character code."); return; }
    if (allCcys.includes(c)) { setNewCcyErr(`${c} already exists.`); return; }
    const ns = { ...store, currencies: [...allCcys, c] };
    setStore(ns); saveStore(ns);
    setNewCcy(""); setNewCcyErr(""); setShowAddCcy(false);
  }

  // Manual edit
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  function startEdit() { setEditData(JSON.parse(JSON.stringify(activeRates))); setEditing(true); }
  function cancelEdit() { setEditData(null); setEditing(false); }
  function saveEdit() {
    const cleaned = editData.map(r => {
      const o = { period: r.period };
      Object.keys(r).filter(k => k !== "period").forEach(k => { const v = parseFloat(r[k]); if (!isNaN(v)) o[k] = v; });
      return o;
    });
    const key = viewMode === "weekly" ? "fxRatesWeekly" : "fxRates";
    const ns = { ...store, [key]: cleaned };
    setStore(ns); saveStore(ns); setEditing(false); setEditData(null);
  }
  function setCell(period, col, val) {
    setEditData(prev => prev.map(r => r.period === period ? { ...r, [col]: val } : r));
  }

  const [newPeriod, setNewPeriod] = useState("");
  function addPeriod() {
    const p = newPeriod.trim();
    if (!p || activeRates.find(r => r.period === p)) return;
    const key = viewMode === "weekly" ? "fxRatesWeekly" : "fxRates";
    const ns = { ...store, [key]: [...activeRates, { period: p }] };
    setStore(ns); saveStore(ns); setNewPeriod("");
    if (editData) setEditData(prev => [...prev, { period: p }]);
  }
  function delPeriod(p) {
    if (!window.confirm(`Remove period "${p}"?`)) return;
    const key = viewMode === "weekly" ? "fxRatesWeekly" : "fxRates";
    const ns = { ...store, [key]: activeRates.filter(r => r.period !== p) };
    setStore(ns); saveStore(ns);
    if (editData) setEditData(prev => prev.filter(r => r.period !== p));
  }

  const r1 = rb.find(r => r.period === cp1) || {};
  const r2 = rb.find(r => r.period === cp2) || {};
  const rawCols = allCcys.filter(c => c !== "USD");
  const inpStyle = { width: 82, padding: "3px 6px", borderRadius: 6, border: `1px solid ${P.border}`, background: P.ink2, color: P.text, fontSize: 11, textAlign: "right", fontFamily: "'DM Mono',monospace", outline: "none" };

  function stddev(c) { const v = rb.map(r => r[c]).filter(x => x != null); if (v.length < 2) return null; const m = v.reduce((a,b)=>a+b,0)/v.length; return Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length); }
  function avg(c) { const v = rb.map(r => r[c]).filter(x => x != null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }

  const toolbar = { padding: "10px 14px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" };
  const selStyle = { padding: "6px 10px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: "none", cursor: "pointer" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <PageTitle title="FX Rates" sub={`${fxRates.length} periods · ${effectiveMode} view`} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {allCcys.map(c => <span key={c} style={{ padding: "3px 9px", borderRadius: 12, background: `${ccyColor(c)}20`, color: ccyColor(c), fontSize: 11, fontWeight: 700 }}>{c}</span>)}
          <button onClick={() => setShowAddCcy(v => !v)} style={{ padding: "3px 9px", borderRadius: 12, border: `1px dashed ${P.border}`, background: "transparent", color: P.muted, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>+ Add</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={toolbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>Base</span>
          <select value={baseCcy} onChange={e => setBaseCcy(e.target.value)} style={{ ...selStyle, color: ccyColor(baseCcy), fontWeight: 700, borderColor: ccyColor(baseCcy) + "60" }}>
            {allCcys.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ width: 1, height: 22, background: P.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>View</span>
          <select value={viewMode} onChange={e => setViewMode(e.target.value)} style={selStyle}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {baseCcy !== BASE_DEFAULT && (
          <button onClick={() => setBaseCcy(BASE_DEFAULT)} style={{ fontSize: 11, color: P.muted, background: "transparent", border: `1px solid ${P.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginLeft: "auto" }}>Reset to MYR</button>
        )}
      </div>

      {/* Add currency */}
      {showAddCcy && (
        <Card title="Add Currency" accent={P.gold}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: P.muted }}>Enter ISO code (e.g. EUR, JPY). Rates must be entered manually in Manage Rates.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={newCcy} onChange={e => { setNewCcy(e.target.value.toUpperCase()); setNewCcyErr(""); }} placeholder="e.g. EUR"
                style={{ width: 100, padding: "7px 12px", borderRadius: 8, border: `1px solid ${newCcyErr ? P.red : P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", textTransform: "uppercase" }} />
              <Btn onClick={addCcy}>Add</Btn>
              <Btn outline color={P.muted} onClick={() => { setShowAddCcy(false); setNewCcy(""); setNewCcyErr(""); }}>Cancel</Btn>
            </div>
            {newCcyErr && <div style={{ fontSize: 12, color: P.red }}>{newCcyErr}</div>}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
        {foreignCcys.map(c => {
          const v = last[c], pv = prev[c], d = pct(pv, v);
          const prevPer = prev.period || null;
          return <KPI key={c} label={`${c}/${baseCcy}`} value={f4(v)} color={ccyColor(c)} up={d > 0} down={d < 0} sub={d != null && prevPer ? `${fpct(d)} vs ${prevPer}` : "—"} />;
        })}
      </div>

      <Tabs tabs={[{id:"table",label:"Rate Table"},{id:"trend",label:"Trend"},{id:"compare",label:"Compare"},{id:"insights",label:"Insights"},{id:"manage",label:"⚙ Manage"}]} active={tab} onChange={setTab} />

      {/* RATE TABLE */}
      {tab === "table" && effectiveMode === "monthly" && (
        <Card noPad title={`X per 1 ${baseCcy} · ${rb.length} periods`} accent={P.gold}>
          {rb.length === 0 ? <Empty icon="📋" title="No data" sub="Import or add rates in Manage tab" /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: P.panel }}>
                  <th style={{ padding: "9px 14px", textAlign: "left", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Period</th>
                  {foreignCcys.map(c => <th key={c} style={{ padding: "9px 14px", textAlign: "right", color: ccyColor(c), borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, whiteSpace: "nowrap" }}>{c}/{baseCcy}</th>)}
                </tr></thead>
                <tbody>
                  {rb.map((r, i) => (
                    <tr key={r.period} style={{ background: i % 2 ? P.panel + "80" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                      <td style={{ padding: "8px 14px", color: P.sub, whiteSpace: "nowrap" }}>{r.period}</td>
                      {foreignCcys.map(c => <td key={c} style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: r[c] != null ? P.text : P.muted }}>{f4(r[c])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* WEEKLY RATE TABLE — currencies as rows, Mon-Fri as columns */}
      {tab === "table" && effectiveMode === "weekly" && (
        <WeeklyRateTable fxRatesWeekly={fxRatesWeekly} foreignCcys={foreignCcys} baseCcy={baseCcy} />
      )}

      {/* TREND */}
      {tab === "trend" && (
        <Card title={`Trend — X per 1 ${baseCcy}`} accent={P.blue}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {foreignCcys.map(c => {
              const on = selCcys.includes(c);
              return <button key={c} onClick={() => setSelCcys(s => on ? s.filter(x => x !== c) : [...s, c])} style={{ padding: "3px 12px", borderRadius: 12, border: `1px solid ${on ? ccyColor(c) : P.border}`, background: on ? `${ccyColor(c)}20` : "transparent", color: on ? ccyColor(c) : P.muted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{c}</button>;
            })}
          </div>
          {rb.length === 0 ? <Empty icon="📈" title="No data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rb} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="period" tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} width={56} />
                <Tooltip contentStyle={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [f4(v), `${n}/${baseCcy}`]} />
                <Legend formatter={v => <span style={{ color: ccyColor(v), fontSize: 11 }}>{v}/{baseCcy}</span>} />
                {selCcys.map(c => <Line key={c} type="monotone" dataKey={c} stroke={ccyColor(c)} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />)}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {/* COMPARE */}
      {tab === "compare" && (
        <Card title={`Period Compare — base ${baseCcy}`} accent={P.teal}>
          <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Period 1</div>
              <Sel value={cp1} onChange={setCp1} style={{ minWidth: 140 }}>{periods.map(p => <option key={p}>{p}</option>)}</Sel></div>
            <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Period 2</div>
              <Sel value={cp2} onChange={setCp2} style={{ minWidth: 140 }}>{periods.map(p => <option key={p}>{p}</option>)}</Sel></div>
          </div>
          {periods.length === 0 ? <Empty icon="↔" title="No periods" /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: P.panel }}>
                  {["Currency", cp1, cp2, "Change", "%"].map(h => <th key={h} style={{ padding: "9px 14px", textAlign: h === "Currency" ? "left" : "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {foreignCcys.map(c => {
                    const v1 = r1[c], v2 = r2[c], diff = v1 != null && v2 != null ? v2 - v1 : null, p = pct(v1, v2);
                    return (
                      <tr key={c} style={{ borderBottom: `1px solid ${P.border}30` }}>
                        <td style={{ padding: "9px 14px" }}><span style={{ color: ccyColor(c), fontWeight: 700 }}>{c}/{baseCcy}</span></td>
                        <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "'DM Mono',monospace" }}>{f4(v1)}</td>
                        <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "'DM Mono',monospace" }}>{f4(v2)}</td>
                        <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: diff == null ? P.muted : diff > 0 ? P.green : P.red }}>{diff != null ? (diff > 0 ? "+" : "") + f4(diff) : "—"}</td>
                        <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: p == null ? P.muted : p > 0 ? P.green : P.red }}>{fpct(p)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* INSIGHTS */}
      {tab === "insights" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title={`Volatility & Averages — base ${baseCcy}`} accent={P.mag}>
            {rb.length < 2 ? <Empty icon="📊" title="Need at least 2 periods" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={rb} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="period" tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: P.muted, fontSize: 10 }} tickLine={false} width={56} />
                  <Tooltip contentStyle={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [f4(v), n]} />
                  <Legend formatter={v => <span style={{ color: ccyColor(v), fontSize: 11 }}>{v}</span>} />
                  {foreignCcys.map(c => <Line key={c} type="monotone" dataKey={c} stroke={ccyColor(c)} strokeWidth={2} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {foreignCcys.map(c => {
              const sd = stddev(c), av = avg(c), fv = rb[0]?.[c], lv = last[c];
              const dir = fv != null && lv != null ? (lv > fv ? "strengthened" : "weakened") : null;
              return (
                <div key={c} style={{ background: P.card, border: `1px solid ${ccyColor(c)}30`, borderRadius: 12, padding: "13px 15px", borderTop: `2px solid ${ccyColor(c)}` }}>
                  <div style={{ color: ccyColor(c), fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>{c}/{baseCcy}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: P.muted }}>Average</span><span style={{ fontFamily: "'DM Mono',monospace" }}>{f4(av)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: P.muted }}>Volatility σ</span><span style={{ fontFamily: "'DM Mono',monospace" }}>{f4(sd)}</span></div>
                    {dir && <div style={{ fontSize: 11, color: dir === "strengthened" ? P.green : P.red, marginTop: 3 }}>{baseCcy} {dir} vs {c}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MANAGE */}
      {tab === "manage" && (
        <Card noPad title="Edit Rates — MYR = USD/MYR spot · others = units per 1 USD" accent={P.gold}>
          <div style={{ padding: "10px 14px 6px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {!editing
              ? <Btn onClick={startEdit} color={P.gold}>✏ Edit</Btn>
              : <><Btn onClick={saveEdit} color={P.green}>💾 Save</Btn><Btn outline color={P.muted} onClick={cancelEdit}>Cancel</Btn></>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <input value={newPeriod} onChange={e => setNewPeriod(e.target.value)} placeholder="e.g. Jan 2025"
                style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: "none", width: 150 }} />
              <Btn small color={P.blue} onClick={addPeriod}>+ Period</Btn>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: P.panel }}>
                <th style={{ padding: "8px 14px", textAlign: "left", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>Period</th>
                {["MYR", "USD", "SGD", "PHP", ...allCcys.filter(c => !["MYR","USD","SGD","PHP"].includes(c))].filter(c => allCcys.includes(c)).map(c => (
                  <th key={c} style={{ padding: "8px 14px", textAlign: "right", color: ccyColor(c), borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>{c}</th>
                ))}
                <th style={{ borderBottom: `1px solid ${P.border}`, width: 32 }}></th>
              </tr></thead>
              <tbody>
                {(editData || activeRates).map((r, i) => {
                  const cols = ["MYR", "USD", "SGD", "PHP", ...allCcys.filter(c => !["MYR","USD","SGD","PHP"].includes(c))].filter(c => allCcys.includes(c));
                  return (
                    <tr key={r.period} style={{ background: i % 2 ? P.panel + "60" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                      <td style={{ padding: "6px 14px", color: P.sub, whiteSpace: "nowrap" }}>{r.period}</td>
                      {cols.map(c => (
                        <td key={c} style={{ padding: "3px 6px", textAlign: "right" }}>
                          {editing
                            ? <input type="number" step="0.0001" value={(editData.find(x => x.period === r.period) || {})[c] ?? ""} onChange={e => setCell(r.period, c, e.target.value)} style={inpStyle} />
                            : <span style={{ fontFamily: "'DM Mono',monospace", color: r[c] != null ? P.text : P.muted }}>{r[c] ?? "—"}</span>}
                        </td>
                      ))}
                      <td style={{ padding: "3px 8px", textAlign: "center" }}>
                        <button onClick={() => delPeriod(r.period)} style={{ background: "transparent", border: "none", color: P.muted, cursor: "pointer", fontSize: 13 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "6px 14px 10px", fontSize: 10, color: P.muted }}>MYR = USD/MYR spot (e.g. 4.458). USD = 1. SGD/PHP = units per 1 USD.</div>
        </Card>
      )}
    </div>
  );
}

// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
function AIInsights({ onInsightGenerated }) {
  const { store } = useStore();
  const ccys = (store.currencies || DEFAULT_CURRENCIES).filter(c => c !== BASE_DEFAULT);
  const rb = useMemo(() => rebase(store.fxRates, ccys, BASE_DEFAULT), [store.fxRates, store.currencies]);
  const last = rb[rb.length - 1] || {};
  const prev = rb[rb.length - 2] || {};

  const [autoText, setAutoText] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoErr, setAutoErr] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function buildSummary() {
    const lines = [
      `FX data: ${store.fxRates.length} periods (${store.fxRates[0]?.period || "?"} to ${store.fxRates[store.fxRates.length-1]?.period || "?"}).`,
      `Base: MYR. Currencies: ${ccys.join(", ")}.`,
      `Entities: ${store.entities.map(e => `${e.name} (${e.currency})`).join(", ")}.`,
      "\nLatest rates (X per 1 MYR):",
      ...ccys.map(c => last[c] != null ? `  ${c}/MYR: ${f4(last[c])} (prev: ${f4(prev[c])}, chg: ${fpct(pct(prev[c], last[c]))})` : `  ${c}/MYR: —`),
      "\nRecent data:",
      ...rb.slice(-4).map(r => `  ${r.period}: ` + ccys.map(c => `${c}=${f4(r[c])}`).join(", ")),
    ];
    return lines.join("\n");
  }

  async function callGroq(messages) {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) throw new Error("VITE_GROQ_API_KEY not set in Vercel environment variables.");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 700, temperature: 0.4 }),
    });
    if (!res.ok) throw new Error(`Groq API error ${res.status}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "No response.";
  }

  async function runAuto() {
    setAutoLoading(true); setAutoErr(""); setAutoText("");
    try {
      const text = await callGroq([
        { role: "system", content: "You are an FX analyst. Write a plain-English summary for a business manager. Use short paragraphs. Cover: trend, biggest movers, volatility, 1-2 practical notes. Under 250 words." },
        { role: "user", content: `Analyse this FX data:\n\n${buildSummary()}` },
      ]);
      setAutoText(text);
      if (onInsightGenerated) onInsightGenerated(text);
    } catch (e) { setAutoErr(e.message); }
    setAutoLoading(false);
  }

  async function sendChat() {
    const msg = input.trim(); if (!msg) return;
    const newMsgs = [...msgs, { role: "user", text: msg }];
    setMsgs(newMsgs); setInput(""); setChatLoading(true);
    try {
      const history = [
        { role: "system", content: `FX analyst assistant. Answer in plain English. Be concise.\n\nData:\n${buildSummary()}` },
        ...newMsgs.map(m => ({ role: m.role, content: m.text })),
      ];
      const reply = await callGroq(history);
      setMsgs(p => [...p, { role: "assistant", text: reply }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", text: `Error: ${e.message}` }]);
    }
    setChatLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageTitle title="AI Insights" sub="Powered by Groq · llama-3.3-70b" />
      <Card title="Auto Analysis" accent={P.gold}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: P.muted }}>Generate an instant plain-English summary of your FX data.</div>
          <Btn onClick={runAuto} disabled={autoLoading} color={P.gold}>{autoLoading ? "Analysing…" : "✦ Analyse My FX Data"}</Btn>
          {autoErr && <div style={{ fontSize: 12, color: P.red, background: `${P.red}10`, border: `1px solid ${P.red}30`, borderRadius: 8, padding: "10px 14px" }}>{autoErr}</div>}
          {autoText && <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 10, padding: 14, fontSize: 13, color: P.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{autoText}</div>}
        </div>
      </Card>
      <Card title="Ask a Question" accent={P.mag}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.length > 0 && (
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: 12, fontSize: 13, lineHeight: 1.7, background: m.role === "user" ? `${P.gold}20` : P.panel, color: m.role === "user" ? P.gold : P.text, border: `1px solid ${m.role === "user" ? P.gold + "40" : P.border}`, whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
              ))}
              {chatLoading && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "9px 13px", borderRadius: 12, background: P.panel, border: `1px solid ${P.border}`, color: P.muted, fontSize: 13 }}>Thinking…</div></div>}
              <div ref={endRef} />
            </div>
          )}
          {msgs.length === 0 && <div style={{ fontSize: 12, color: P.muted }}>Ask anything: "Which currency was most volatile?" · "How did MYR perform in Q3?" · "Any risks to watch?"</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Ask about your FX data…" disabled={chatLoading}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none" }} />
            <Btn onClick={sendChat} disabled={chatLoading || !input.trim()} color={P.mag}>Send</Btn>
          </div>
          {msgs.length > 0 && <button onClick={() => setMsgs([])} style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: P.muted, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Clear conversation</button>}
        </div>
      </Card>
    </div>
  );
}

// ─── IMPORT DATA ──────────────────────────────────────────────────────────────
// Auto-mapping logic: score each user column against FXFlow target fields
const FX_TARGETS = [
  { key:"period", label:"Period / Date",  aliases:["period","date","month","week","time","dt","날짜","fecha","periode"] },
  { key:"MYR",    label:"MYR (USD/MYR)",  aliases:["myr","ringgit","malaysia","usd/myr","myr rate","myrrate","rm"] },
  { key:"USD",    label:"USD",            aliases:["usd","dollar","us dollar","usdrate","usd rate","united states"] },
  { key:"SGD",    label:"SGD",            aliases:["sgd","singapore","sing dollar","sgd rate","s$"] },
  { key:"PHP",    label:"PHP",            aliases:["php","peso","philippine","philippines","phrate","php rate"] },
  { key:"SKIP",   label:"Skip (ignore)",  aliases:[] },
];

function autoMap(headers, sampleRows) {
  // Score each header against each target
  return headers.map(h => {
    const hn = h.toLowerCase().replace(/[^a-z0-9]/g,"");
    let bestKey = "SKIP", bestScore = 0, confidence = "low";

    FX_TARGETS.filter(t => t.key !== "SKIP").forEach(t => {
      t.aliases.forEach(alias => {
        const an = alias.replace(/[^a-z0-9]/g,"");
        let score = 0;
        if (hn === an) score = 100;                          // exact
        else if (hn.includes(an) || an.includes(hn)) score = 80; // substring
        else {
          // character overlap score
          const common = [...hn].filter(c => an.includes(c)).length;
          score = Math.round((common / Math.max(hn.length, an.length)) * 60);
        }
        if (score > bestScore) { bestScore = score; bestKey = t.key; }
      });
    });

    // Also check sample values — if numeric and in plausible FX range, boost
    const sampleVals = sampleRows.slice(0,3).map(r => parseFloat(r[h])).filter(v => !isNaN(v));
    if (sampleVals.length) {
      const avg = sampleVals.reduce((a,b)=>a+b,0)/sampleVals.length;
      if (bestKey === "SKIP" && avg > 3 && avg < 6)   { bestKey = "MYR"; bestScore = Math.max(bestScore, 40); }
      if (bestKey === "SKIP" && avg > 1 && avg < 2)   { bestKey = "SGD"; bestScore = Math.max(bestScore, 40); }
      if (bestKey === "SKIP" && avg > 40 && avg < 80) { bestKey = "PHP"; bestScore = Math.max(bestScore, 40); }
      if (bestKey === "SKIP" && avg === 1)             { bestKey = "USD"; bestScore = Math.max(bestScore, 40); }
    }

    if      (bestScore >= 80) confidence = "high";
    else if (bestScore >= 40) confidence = "medium";
    else                      confidence = "low";

    return { header: h, mappedTo: bestKey, confidence, score: bestScore };
  });
}

function applyMapping(rows, mapping) {
  const periodMap = mapping.find(m => m.mappedTo === "period");
  if (!periodMap) return [];
  return rows.map(row => {
    const out = { period: String(row[periodMap.header] || "").trim() };
    mapping.forEach(m => {
      if (m.mappedTo === "SKIP" || m.mappedTo === "period") return;
      const v = parseFloat(row[m.header]);
      if (!isNaN(v) && v >= 0) out[m.mappedTo] = v;
    });
    return out;
  }).filter(r => r.period);
}

function ImportData() {
  const { store, setStore } = useStore();
  const history = store.importHistory || [];
  const savedTemplate = store.importTemplate || null;

  const [tab, setTab] = useState("upload");
  // Template setup
  const [templateFile, setTemplateFile]   = useState(null); // { name, headers, sampleRows }
  const [mapping, setMapping]             = useState(null); // array of { header, mappedTo, confidence }
  const [templateSaved, setTemplateSaved] = useState(false);
  // Upload
  const [drag, setDrag]       = useState(false);
  const [preview, setPreview] = useState(null);
  const [parseErr, setParseErr] = useState("");
  const [gsUrl, setGsUrl]     = useState("");
  const [gsStatus, setGsStatus] = useState("");
  const templateFileRef = useRef(null);
  const uploadFileRef   = useRef(null);

  // Load saved template mapping on mount
  useEffect(() => {
    if (savedTemplate && !mapping) setMapping(savedTemplate.mapping);
  }, []);

  // ── Template: parse file and auto-map ──
  function loadTemplateFile(file) {
    setParseErr(""); setTemplateFile(null); setMapping(null); setTemplateSaved(false);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!rows.length) { setParseErr("No data found in file."); return; }
        const headers = Object.keys(rows[0]);
        const autoMapped = autoMap(headers, rows.slice(0, 5));
        setTemplateFile({ name: file.name, headers, sampleRows: rows.slice(0, 3) });
        setMapping(autoMapped);
      } catch (err) { setParseErr("Failed to read file: " + err.message); }
    };
    reader.onerror = () => setParseErr("Could not read file.");
    reader.readAsArrayBuffer(file);
  }

  function saveTemplate() {
    const ns = { ...store, importTemplate: { name: templateFile?.name || "Custom", mapping, savedAt: new Date().toISOString() } };
    setStore(ns); saveStore(ns); setTemplateSaved(true);
  }

  function clearTemplate() {
    if (!window.confirm("Remove saved template?")) return;
    const ns = { ...store, importTemplate: null };
    setStore(ns); saveStore(ns); setMapping(null); setTemplateFile(null); setTemplateSaved(false);
  }

  // ── Upload: parse and apply mapping ──
  function parseUploadFile(file) {
    setParseErr(""); setPreview(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!rows.length) { setParseErr("No data found."); return; }
        // Use saved template mapping if available, else auto-map on the fly
        const activeMapping = (store.importTemplate?.mapping) || autoMap(Object.keys(rows[0]), rows.slice(0,5));
        const parsed = applyMapping(rows, activeMapping);
        if (!parsed.length) { setParseErr("Could not map data. Set up a template first."); return; }
        setPreview({ rows: parsed, filename: file.name, count: parsed.length });
      } catch (err) { setParseErr("Parse error: " + err.message); }
    };
    reader.onerror = () => setParseErr("Could not read file.");
    reader.readAsArrayBuffer(file);
  }

  function confirmImport() {
    if (!preview) return;
    const isWk = isWeeklyData(preview.rows.map(r => r.period));
    const impKey = isWk ? "fxRatesWeekly" : "fxRates";
    const entry = { id: uid(), filename: preview.filename, importedAt: new Date().toISOString(), periods: preview.count, importedBy: "admin", dataType: isWk ? "weekly" : "monthly", snapshot: store[impKey] };
    const ns = { ...store, [impKey]: preview.rows, importHistory: [entry, ...history].slice(0, 20) };
    setStore(ns); saveStore(ns); setPreview(null);
  }

  async function importGSheet() {
    if (!gsUrl.trim()) { setGsStatus("error:Paste a URL first."); return; }
    setGsStatus("loading");
    try {
      let url = gsUrl.trim();
      const m = url.match(/spreadsheets\/d\/([^/]+)/);
      const g = url.match(/[?&]gid=(\d+)/);
      if (m) url = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${g ? g[1] : "0"}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = text.trim().split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      if (rows.length < 2) throw new Error("Sheet is empty.");
      const hdrs = rows[0];
      const dataRows = rows.slice(1).map(row => { const o = {}; hdrs.forEach((h,i) => o[h] = row[i]||""); return o; });
      const activeMapping = (store.importTemplate?.mapping) || autoMap(hdrs, dataRows.slice(0,5));
      const parsed = applyMapping(dataRows, activeMapping);
      if (!parsed.length) throw new Error("Could not map data. Set up a template first.");
      const isWk2 = isWeeklyData(parsed.map(r => r.period));
      const gsKey = isWk2 ? "fxRatesWeekly" : "fxRates";
      const entry = { id: uid(), filename: "Google Sheets", importedAt: new Date().toISOString(), periods: parsed.length, importedBy: "admin", dataType: isWk2 ? "weekly" : "monthly", snapshot: store[gsKey] };
      const ns = { ...store, [gsKey]: parsed, importHistory: [entry, ...history].slice(0, 20) };
      setStore(ns); saveStore(ns); setGsStatus("ok");
    } catch (e) { setGsStatus("error:" + e.message); }
  }

  function restore(entry) {
    if (!window.confirm(`Restore data from "${entry.filename}"?`)) return;
    const rKey = entry.dataType === "weekly" ? "fxRatesWeekly" : "fxRates";
    const ns = { ...store, [rKey]: entry.snapshot };
    setStore(ns); saveStore(ns);
  }

  function removeHistory(id) {
    const ns = { ...store, importHistory: history.filter(h => h.id !== id) };
    setStore(ns); saveStore(ns);
  }

  const confColor  = { high: P.green, medium: P.gold, low: P.red };
  const confLabel  = { high: "High", medium: "Medium", low: "Low" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageTitle title="Import Data" sub="Upload FX rate data from Excel or Google Sheets" />

      <Tabs tabs={[
        { id:"upload",   label:"📂 Upload Data"     },
        { id:"template", label:"⚙ Column Template"  },
        { id:"gsheet",   label:"📊 Google Sheets"   },
        { id:"history",  label:"🕓 Import History"  },
      ]} active={tab} onChange={setTab} />

      {/* ── UPLOAD DATA ── */}
      {tab === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Template status banner */}
          {savedTemplate || store.importTemplate ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${P.green}12`, border: `1px solid ${P.green}30`, borderRadius: 10 }}>
              <span style={{ fontSize: 14 }}>✓</span>
              <div style={{ flex: 1, fontSize: 12, color: P.green }}>
                Template active: <strong>{store.importTemplate?.name || "Custom"}</strong>
                <span style={{ color: P.muted, marginLeft: 8 }}>· Saved {fdate(store.importTemplate?.savedAt)}</span>
              </div>
              <button onClick={() => setTab("template")} style={{ fontSize: 11, color: P.gold, background: "transparent", border: `1px solid ${P.gold}40`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Edit</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${P.gold}10`, border: `1px solid ${P.gold}30`, borderRadius: 10 }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <div style={{ flex: 1, fontSize: 12, color: P.gold }}>No template set. App will auto-detect columns — <button onClick={() => setTab("template")} style={{ color: P.gold, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, textDecoration: "underline", padding: 0 }}>set up template</button> for reliable mapping.</div>
            </div>
          )}

          <Card title="Upload Excel File" accent={P.gold}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
                Upload <code style={{ color: P.gold, background: P.panel, padding: "1px 5px", borderRadius: 4 }}>.xlsx</code> or <code style={{ color: P.gold, background: P.panel, padding: "1px 5px", borderRadius: 4 }}>.xls</code>.
                Columns will be mapped using your saved template.
              </div>
              <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) parseUploadFile(f); }}
                onClick={() => uploadFileRef.current?.click()}
                style={{ border: `2px dashed ${drag ? P.gold : P.border}`, borderRadius: 12, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: drag ? `${P.gold}08` : P.panel, transition: "all 0.2s" }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 13, color: drag ? P.gold : P.sub, fontWeight: 500 }}>Drag & drop Excel file here</div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>or click to browse</div>
                <input ref={uploadFileRef} type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files[0]; if (f) parseUploadFile(f); e.target.value = ""; }} style={{ display: "none" }} />
              </div>
              {parseErr && <div style={{ fontSize: 12, color: P.red, background: `${P.red}10`, border: `1px solid ${P.red}30`, borderRadius: 8, padding: "10px 14px" }}>{parseErr}</div>}
              {preview && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, color: P.green }}>✓ Mapped {preview.count} rows from <strong>{preview.filename}</strong></div>
                  <div style={{ overflowX: "auto", maxHeight: 200, overflowY: "auto", border: `1px solid ${P.border}`, borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead style={{ position: "sticky", top: 0, background: P.panel }}>
                        <tr>{Object.keys(preview.rows[0] || {}).map(k => <th key={k} style={{ padding: "6px 12px", textAlign: k === "period" ? "left" : "right", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.border}30`, background: i % 2 ? P.panel + "60" : "transparent" }}>
                            {Object.keys(r).map(k => <td key={k} style={{ padding: "5px 12px", textAlign: k === "period" ? "left" : "right", fontFamily: k === "period" ? "inherit" : "'DM Mono',monospace", fontSize: 11, color: P.text }}>{String(r[k])}</td>)}
                          </tr>
                        ))}
                        {preview.rows.length > 5 && <tr><td colSpan={99} style={{ padding: "5px 12px", color: P.muted, fontSize: 10 }}>…and {preview.rows.length - 5} more rows</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={confirmImport} color={P.green}>✓ Confirm Import</Btn>
                    <Btn outline color={P.muted} onClick={() => setPreview(null)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── COLUMN TEMPLATE ── */}
      {tab === "template" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Step 1 — Upload a Sample File" accent={P.gold}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
                Upload any file with your typical column headers. FXFlow will read the headers, auto-predict the mapping, and let you adjust.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Btn onClick={() => templateFileRef.current?.click()} color={P.blue}>Choose File</Btn>
                {templateFile && <span style={{ fontSize: 12, color: P.sub }}>{templateFile.name} — {templateFile.headers.length} columns detected</span>}
                <input ref={templateFileRef} type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files[0]; if (f) loadTemplateFile(f); e.target.value = ""; }} style={{ display: "none" }} />
              </div>
              {parseErr && <div style={{ fontSize: 12, color: P.red }}>{parseErr}</div>}
              {/* Show existing saved template if no new file loaded */}
              {!templateFile && store.importTemplate && (
                <div style={{ fontSize: 12, color: P.muted }}>
                  Current template: <strong style={{ color: P.text }}>{store.importTemplate.name}</strong> · Saved {fdate(store.importTemplate.savedAt)}
                  <button onClick={clearTemplate} style={{ marginLeft: 10, fontSize: 11, color: P.red, background: "transparent", border: `1px solid ${P.red}30`, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Remove</button>
                </div>
              )}
            </div>
          </Card>

          {mapping && (
            <Card noPad title="Step 2 — Review & Adjust Mapping" accent={P.mag}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: P.panel }}>
                      {["Your Column", "Sample Data", "Maps To", "Confidence"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((m, i) => {
                      const samples = (templateFile?.sampleRows || []).map(r => r[m.header]).filter(Boolean).slice(0,2).join(", ");
                      return (
                        <tr key={m.header} style={{ background: i % 2 ? P.panel + "80" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                          {/* Column name */}
                          <td style={{ padding: "10px 16px", fontWeight: 600, color: P.text, whiteSpace: "nowrap" }}>{m.header}</td>
                          {/* Sample values */}
                          <td style={{ padding: "10px 16px", color: P.muted, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{samples || "—"}</td>
                          {/* Mapping dropdown */}
                          <td style={{ padding: "8px 16px" }}>
                            <select value={m.mappedTo}
                              onChange={e => setMapping(prev => prev.map((x, j) => j === i ? { ...x, mappedTo: e.target.value, confidence: "high" } : x))}
                              style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${m.mappedTo === "SKIP" ? P.border : P.gold + "60"}`, background: P.panel, color: m.mappedTo === "SKIP" ? P.muted : P.text, fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: "none", cursor: "pointer" }}>
                              {FX_TARGETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                          </td>
                          {/* Confidence badge */}
                          <td style={{ padding: "10px 16px" }}>
                            {m.mappedTo === "SKIP"
                              ? <span style={{ fontSize: 11, color: P.muted }}>—</span>
                              : (
                                <span style={{ padding: "3px 10px", borderRadius: 10, background: `${confColor[m.confidence]}20`, color: confColor[m.confidence], fontSize: 11, fontWeight: 700 }}>
                                  {confLabel[m.confidence]}
                                </span>
                              )
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 8, alignItems: "center" }}>
                <Btn onClick={saveTemplate} color={P.green}>💾 Save Template</Btn>
                {templateSaved && <span style={{ fontSize: 12, color: P.green }}>✓ Template saved — future uploads will use this mapping.</span>}
              </div>
            </Card>
          )}

          {/* Also allow editing saved template without re-uploading */}
          {!mapping && store.importTemplate?.mapping && (
            <Card noPad title="Current Saved Mapping" accent={P.border}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: P.panel }}>
                      {["Your Column","Maps To","Confidence"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: P.muted, borderBottom: `1px solid ${P.border}`, fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {store.importTemplate.mapping.map((m, i) => (
                      <tr key={m.header} style={{ background: i % 2 ? P.panel + "80" : "transparent", borderBottom: `1px solid ${P.border}30` }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: P.text }}>{m.header}</td>
                        <td style={{ padding: "8px 16px" }}>
                          <select value={m.mappedTo}
                            onChange={e => {
                              const updated = store.importTemplate.mapping.map((x, j) => j === i ? { ...x, mappedTo: e.target.value } : x);
                              const ns = { ...store, importTemplate: { ...store.importTemplate, mapping: updated } };
                              setStore(ns); saveStore(ns);
                            }}
                            style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${P.border}`, background: P.panel, color: P.text, fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: "none", cursor: "pointer" }}>
                            {FX_TARGETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          {m.mappedTo !== "SKIP" && (
                            <span style={{ padding: "3px 10px", borderRadius: 10, background: `${confColor[m.confidence] || P.muted}20`, color: confColor[m.confidence] || P.muted, fontSize: 11, fontWeight: 700 }}>
                              {confLabel[m.confidence] || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── GOOGLE SHEETS ── */}
      {tab === "gsheet" && (
        <Card title="Google Sheets Import" accent={P.teal}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
              Sheet must be published: File → Share → Publish to web → CSV.<br />
              Column mapping will use your saved template (or auto-detect if none set).
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={gsUrl} onChange={e => { setGsUrl(e.target.value); setGsStatus(""); }} placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{ flex: 1, minWidth: 240, padding: "8px 12px", borderRadius: 8, border: `1px solid ${gsStatus.startsWith("error") ? P.red : P.border}`, background: P.panel, color: P.text, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none" }} />
              <Btn onClick={importGSheet} color={P.teal} disabled={gsStatus === "loading"}>{gsStatus === "loading" ? "Importing…" : "Import"}</Btn>
            </div>
            {gsStatus === "ok" && <div style={{ fontSize: 12, color: P.green }}>✓ Imported successfully.</div>}
            {gsStatus.startsWith("error") && <div style={{ fontSize: 12, color: P.red }}>✗ {gsStatus.replace("error:", "")}</div>}
          </div>
        </Card>
      )}

      {/* ── IMPORT HISTORY ── */}
      {tab === "history" && (
        <Card title="Import History" accent={P.border}>
          {history.length === 0 ? <Empty icon="📋" title="No imports yet" sub="History appears here after each import" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map(h => (
                <div key={h.id} style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 13px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 2 }}>{h.filename}</div>
                    <div style={{ fontSize: 11, color: P.muted }}>{fdate(h.importedAt)} · {h.periods} periods · {h.dataType || "monthly"} · {h.importedBy}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {h.snapshot && <Btn small outline color={P.gold} onClick={() => restore(h)}>Restore</Btn>}
                    <Btn small outline color={P.red} onClick={() => removeHistory(h.id)}>✕</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── ENTITIES ─────────────────────────────────────────────────────────────────
function Entities() {
  const { store, setStore } = useStore();
  const { entities, currencies } = store;
  const BLANK = { id: "", name: "", country: "Malaysia", currency: "MYR", type: "Subsidiary", active: true, color: ENT_COLORS[0] };
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  function save() {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    const updated = editing ? entities.map(e => e.id === editing ? { ...form, id: editing } : e) : [...entities, { ...form, id: "E" + uid() }];
    const ns = { ...store, entities: updated };
    setStore(ns); saveStore(ns); setForm(BLANK); setEditing(null); setErr("");
  }
  function remove(id) {
    if (!window.confirm("Remove entity?")) return;
    const ns = { ...store, entities: entities.filter(e => e.id !== id) };
    setStore(ns); saveStore(ns);
  }
  function toggle(id) {
    const ns = { ...store, entities: entities.map(e => e.id === id ? { ...e, active: !e.active } : e) };
    setStore(ns); saveStore(ns);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageTitle title="Entities" sub={`${entities.length} entities`} />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        <Card title={editing ? "Edit Entity" : "Add Entity"} accent={editing ? P.gold : P.teal}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Name *</div><Inp value={form.name} onChange={v => { setForm(f => ({ ...f, name: v })); setErr(""); }} placeholder="e.g. Singapore Ops" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Country</div><Sel value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} style={{ width: "100%" }}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</Sel></div>
              <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Currency</div><Sel value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} style={{ width: "100%" }}>{(currencies || DEFAULT_CURRENCIES).map(c => <option key={c}>{c}</option>)}</Sel></div>
            </div>
            <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Type</div><Sel value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} style={{ width: "100%" }}>{ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}</Sel></div>
            <div><div style={{ fontSize: 10, color: P.muted, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Colour</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ENT_COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: `2px solid ${form.color === c ? "#fff" : "transparent"}`, cursor: "pointer", outline: "none" }} />)}</div>
            </div>
            {err && <div style={{ fontSize: 12, color: P.red }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <Btn onClick={save} full>{editing ? "Save" : "Add Entity"}</Btn>
              {editing && <Btn outline color={P.muted} onClick={() => { setForm(BLANK); setEditing(null); setErr(""); }}>Cancel</Btn>}
            </div>
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entities.length === 0 ? <Empty icon="⊞" title="No entities" sub="Add one using the form" /> : entities.map(e => (
            <div key={e.id} style={{ background: P.card, border: `1px solid ${e.active ? e.color + "35" : P.border}`, borderRadius: 12, padding: "13px 15px", borderLeft: `3px solid ${e.active ? e.color : P.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: e.active ? P.text : P.muted, marginBottom: 2 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: P.muted, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span>{e.id}</span><span>·</span><span>{e.country}</span><span>·</span><Badge label={e.currency} color={ccyColor(e.currency)} /><span>·</span><span>{e.type}</span></div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  <Btn small outline color={e.active ? P.green : P.muted} onClick={() => toggle(e.id)}>{e.active ? "Active" : "Inactive"}</Btn>
                  <Btn small outline color={P.gold} onClick={() => { setForm({ ...e }); setEditing(e.id); setErr(""); }}>Edit</Btn>
                  <Btn small outline color={P.red} onClick={() => remove(e.id)}>✕</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ────────────────────────────────────────────────────────────
function ExportModal({ onClose, aiInsightsText }) {
  const { store } = useStore();
  const ccys = (store.currencies || DEFAULT_CURRENCIES).filter(c => c !== BASE_DEFAULT);
  const rb = useMemo(() => rebase(store.fxRates, ccys, BASE_DEFAULT), [store.fxRates, store.currencies]);

  const [exRates,     setExRates]     = useState(true);
  const [exClosing,   setExClosing]   = useState(true);
  const [exEntities,  setExEntities]  = useState(true);
  const [exAI,        setExAI]        = useState(!!aiInsightsText);
  const [fmt,         setFmt]         = useState("excel");

  // Closing rates summary rows
  const last = rb[rb.length - 1] || {};
  const prev = rb[rb.length - 2] || {};
  function ytdStats(c) {
    const vals = rb.map(r => r[c]).filter(v => v != null);
    if (!vals.length) return { high: null, low: null };
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }

  function doExport() {
    if (fmt === "excel") exportExcel();
    else exportPDF();
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    if (exRates && store.fxRates.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.fxRates), "Raw Rates");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rb), "Rebased per 1 MYR");
    }
    if (exClosing && rb.length) {
      const rows = ccys.map(c => {
        const { high, low } = ytdStats(c);
        const d = pct(prev[c], last[c]);
        return { Currency: `${c}/MYR`, "Closing Rate": last[c] != null ? Number(last[c]).toFixed(4) : "—", Period: last.period || "—", [`vs ${prev.period || "Prev"}`]: d != null ? fpct(d) : "—", "YTD High": high != null ? Number(high).toFixed(4) : "—", "YTD Low": low != null ? Number(low).toFixed(4) : "—" };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Closing Rates");
    }
    if (exEntities && store.entities.length) {
      const rows = store.entities.map(({ id, name, country, currency, type, active }) => ({ ID: id, Name: name, Country: country, Currency: currency, Type: type, Active: active ? "Yes" : "No" }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Entities");
    }
    if (exAI && aiInsightsText) {
      const rows = [{ "AI Insights": aiInsightsText, "Generated": new Date().toLocaleString("en-GB") }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "AI Insights");
    }
    XLSX.writeFile(wb, `FXFlow-Export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    onClose();
  }

  function exportPDF() {
    const rbRows = rb.map(r => `<tr>${["period",...ccys].map(c=>`<td style="padding:5px 10px;text-align:${c==="period"?"left":"right"};border-bottom:1px solid #eee;font-family:monospace">${c==="period"?r.period:(r[c]!=null?Number(r[c]).toFixed(4):"—")}</td>`).join("")}</tr>`).join("");
    const clRows = ccys.map(c => { const {high,low}=ytdStats(c); const d=pct(prev[c],last[c]); return `<tr><td style="padding:5px 10px;border-bottom:1px solid #eee;font-weight:700;color:#B84480">${c}/MYR</td><td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${last[c]!=null?Number(last[c]).toFixed(4):"—"}</td><td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right">${last.period||"—"}</td><td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;color:${d!=null&&d>0?"#22D3A0":d!=null&&d<0?"#F43F5E":"#888"}">${d!=null?fpct(d):"—"}</td><td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;color:#22D3A0;font-family:monospace">${high!=null?Number(high).toFixed(4):"—"}</td><td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;color:#F43F5E;font-family:monospace">${low!=null?Number(low).toFixed(4):"—"}</td></tr>`; }).join("");
    const entRows = store.entities.map(e=>`<tr><td style="padding:5px 10px;border-bottom:1px solid #eee">${e.id}</td><td style="padding:5px 10px;border-bottom:1px solid #eee">${e.name}</td><td style="padding:5px 10px;border-bottom:1px solid #eee">${e.country}</td><td style="padding:5px 10px;border-bottom:1px solid #eee">${e.currency}</td><td style="padding:5px 10px;border-bottom:1px solid #eee">${e.type}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>FXFlow Export</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin:22px 0 8px;color:#555;border-bottom:1px solid #eee;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th{padding:6px 10px;text-align:left;background:#f5f5f5;border-bottom:2px solid #ddd;font-size:10px;text-transform:uppercase;letter-spacing:1px}.meta{font-size:11px;color:#888;margin-bottom:20px}.ai{background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:16px;font-size:13px;line-height:1.8;white-space:pre-wrap}</style></head><body>
      <h1>FXFlow — FX Rate Report</h1>
      <div class="meta">Generated: ${new Date().toLocaleString("en-GB")} · Base: MYR</div>
      ${exClosing&&rb.length?`<h2>Closing Rates — ${last.period||"—"}</h2><table><thead><tr><th>Currency</th><th style="text-align:right">Closing Rate</th><th style="text-align:right">Period</th><th style="text-align:right">vs ${prev.period||"Prev"}</th><th style="text-align:right">YTD High</th><th style="text-align:right">YTD Low</th></tr></thead><tbody>${clRows}</tbody></table>`:""}
      ${exRates&&store.fxRates.length?`<h2>FX Rates (X per 1 MYR)</h2><table><thead><tr>${["Period",...ccys].map(h=>`<th style="text-align:${h==="Period"?"left":"right"}">${h==="Period"?"Period":`${h}/MYR`}</th>`).join("")}</tr></thead><tbody>${rbRows}</tbody></table>`:""}
      ${exEntities&&store.entities.length?`<h2>Entities</h2><table><thead><tr><th>ID</th><th>Name</th><th>Country</th><th>Currency</th><th>Type</th></tr></thead><tbody>${entRows}</tbody></table>`:""}
      ${exAI&&aiInsightsText?`<h2>AI Insights</h2><div class="ai">${aiInsightsText}</div>`:""}
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); }
    onClose();
  }

  const noneSelected = !exRates && !exClosing && !exEntities && !exAI;

  const chk = (val, set, label, disabled) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, color: disabled ? P.muted : P.text, opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={val} onChange={e => !disabled && set(e.target.checked)} disabled={disabled} style={{ width: 15, height: 15 }} />
      {label}
      {disabled && <span style={{ fontSize: 10, color: P.muted }}>(run analysis first)</span>}
    </label>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100 }} />
      {/* Modal */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(420px,90vw)", background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 24, zIndex: 101, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: P.text, fontFamily: "'Outfit',sans-serif" }}>Export</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: P.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* What to include */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Include</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chk(exRates,    setExRates,    "FX Rates (raw + rebased per 1 MYR)")}
            {chk(exClosing,  setExClosing,  "Closing Rates summary")}
            {chk(exEntities, setExEntities, "Entities")}
            {chk(exAI,       setExAI,       "AI Insights", !aiInsightsText)}
          </div>
        </div>

        {/* Format */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: P.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Format</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{id:"excel",label:"📥 Excel (.xlsx)"},{id:"pdf",label:"🖨 PDF (print)"}].map(f => (
              <button key={f.id} onClick={() => setFmt(f.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${fmt === f.id ? P.gold : P.border}`, background: fmt === f.id ? `${P.gold}18` : "transparent", color: fmt === f.id ? P.gold : P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16, display: "flex", gap: 8 }}>
          <Btn onClick={doExport} color={P.gold} disabled={noneSelected} style={{ flex: 1 }}>Export</Btn>
          <Btn outline color={P.muted} onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(() => {
    try { return localStorage.getItem("fxflow_session") || null; } catch (e) { return null; }
  });
  const [store, setStore] = useState(() => loadStore());
  const [page, setPage] = useState("import");
  const [showExport, setShowExport] = useState(false);
  const [aiInsightsText, setAiInsightsText] = useState("");

  function login(u) { setSession(u); try { localStorage.setItem("fxflow_session", u); } catch (e) {} }
  function logout() { setSession(null); try { localStorage.removeItem("fxflow_session"); } catch (e) {} }

  if (!session) return <Login onLogin={login} />;

  return (
    <StoreCtx.Provider value={{ store, setStore }}>
      <div style={{ display: "flex", minHeight: "100vh", background: P.ink }}>
        <Sidebar active={page} onChange={setPage} onLogout={logout} user={session} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Global top bar — Export button */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 30px 0", flexShrink: 0 }}>
            <button onClick={() => setShowExport(true)} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 20px", borderRadius: 8,
              background: `linear-gradient(135deg,${P.gold},${P.mag})`,
              border: "none", color: "#000", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              boxShadow: `0 2px 12px ${P.gold}30`,
            }}>
              <span>↓</span> Export
            </button>
          </div>
          <main style={{ flex: 1, padding: "20px 30px 30px", overflowY: "auto" }}>
            {page === "dashboard" && <Dashboard />}
            {page === "rates"     && <FXRates />}
            {page === "ai"        && <AIInsights onInsightGenerated={setAiInsightsText} />}
            {page === "import"    && <ImportData />}
            {page === "entities"  && <Entities />}
          </main>
        </div>
      </div>
      {showExport && <ExportModal onClose={() => setShowExport(false)} aiInsightsText={aiInsightsText} />}
    </StoreCtx.Provider>
  );
}
