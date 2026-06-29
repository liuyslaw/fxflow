import { useState, useMemo, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ── PALETTE ───────────────────────────────────────────────────────
const P = {
  ink:"#0b0b0d", ink2:"#111116", card:"#16161c", panel:"#1b1b22",
  border:"#2a2a35", text:"#ddd5c8", muted:"#6e6660", sub:"#9e978f",
  gold:"#FAA819", mag:"#B84480", blue:"#4a9fd4", teal:"#2ab5a5",
  green:"#22D3A0", red:"#F43F5E", orange:"#FB923C", purple:"#7C3AED",
};

// ── CONSTANTS ─────────────────────────────────────────────────────
const STORAGE_KEY = "fxflow_v1";
const GROQ_MODEL  = "llama-3.3-70b-versatile";
const CREDS       = { user:"admin", pass:"FXFlow2025!" };

const ALL_CCYS = [
  { code:"USD", label:"US Dollar",          color:P.blue,    group:"uob"   },
  { code:"EUR", label:"Euro",               color:"#4CAF50", group:"uob"   },
  { code:"GBP", label:"British Pound",      color:P.purple,  group:"uob"   },
  { code:"SGD", label:"Singapore Dollar",   color:P.gold,    group:"uob"   },
  { code:"AUD", label:"Australian Dollar",  color:P.teal,    group:"uob"   },
  { code:"CNY", label:"Chinese Yuan",       color:P.red,     group:"xrate" },
  { code:"JPY", label:"Japanese Yen",       color:P.orange,  group:"xrate" },
  { code:"IDR", label:"Indonesian Rupiah",  color:"#9C27B0", group:"xrate" },
  { code:"PHP", label:"Philippine Peso",    color:P.mag,     group:"xrate" },
  { code:"CHF", label:"Swiss Franc",        color:"#00BCD4", group:"xrate" },
  { code:"VND", label:"Vietnamese Dong",    color:"#8BC34A", group:"xrate" },
];
const UOB_ORDER   = ["USD","EUR","GBP","SGD","AUD"];
const ALL_CODES   = ALL_CCYS.map(c=>c.code);

function ccyColor(c){ return ALL_CCYS.find(x=>x.code===c)?.color || P.muted; }
function ccyLabel(c){ return ALL_CCYS.find(x=>x.code===c)?.label || c; }

const SUBSIDIARIES = [
  { id:"MY", name:"Malaysia",    currency:"MYR", flag:"🇲🇾" },
  { id:"SG", name:"Singapore",   currency:"SGD", flag:"🇸🇬" },
  { id:"VN", name:"Vietnam",     currency:"VND", flag:"🇻🇳" },
  { id:"PH", name:"Philippines", currency:"PHP", flag:"🇵🇭" },
];

// ── SAMPLE DATA (from client file Apr 2026) ───────────────────────
const SAMPLE = [
  { date:"2026-03-17", USD:4.052, EUR:4.639, GBP:5.332, SGD:3.138, AUD:2.775, CNY:0.589, JPY:2.538, IDR:0.000238, PHP:0.06669, CHF:null, VND:null },
  { date:"2026-03-18", USD:4.038, EUR:4.672, GBP:5.346, SGD:3.146, AUD:2.801, CNY:0.589, JPY:2.548, IDR:0.000238, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-19", USD:4.032, EUR:4.672, GBP:5.361, SGD:3.145, AUD:2.794, CNY:0.590, JPY:2.545, IDR:0.000237, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-20", USD:4.050, EUR:4.674, GBP:5.357, SGD:3.150, AUD:2.808, CNY:0.591, JPY:2.550, IDR:0.000237, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-24", USD:4.045, EUR:4.657, GBP:5.339, SGD:3.150, AUD:2.795, CNY:0.590, JPY:2.547, IDR:0.000237, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-25", USD:4.045, EUR:4.667, GBP:5.352, SGD:3.150, AUD:2.803, CNY:0.591, JPY:2.537, IDR:0.000237, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-26", USD:4.014, EUR:4.685, GBP:5.372, SGD:3.147, AUD:2.837, CNY:0.588, JPY:2.534, IDR:0.000235, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-27", USD:3.999, EUR:4.661, GBP:5.355, SGD:3.140, AUD:2.818, CNY:0.589, JPY:2.524, IDR:0.000234, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-28", USD:3.987, EUR:4.660, GBP:5.351, SGD:3.134, AUD:2.824, CNY:0.587, JPY:2.509, IDR:0.000233, PHP:null,    CHF:null, VND:null },
  { date:"2026-03-31", USD:3.988, EUR:4.657, GBP:5.339, SGD:3.126, AUD:2.807, CNY:0.587, JPY:2.501, IDR:0.000232, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-01", USD:3.969, EUR:4.668, GBP:5.360, SGD:3.119, AUD:2.817, CNY:0.584, JPY:2.497, IDR:0.000232, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-02", USD:3.959, EUR:4.668, GBP:5.371, SGD:3.117, AUD:2.825, CNY:0.584, JPY:2.496, IDR:0.000232, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-03", USD:3.962, EUR:4.677, GBP:5.375, SGD:3.122, AUD:2.846, CNY:0.584, JPY:2.501, IDR:0.000230, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-04", USD:3.973, EUR:4.679, GBP:5.370, SGD:3.124, AUD:2.848, CNY:0.585, JPY:2.500, IDR:0.000231, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-07", USD:3.968, EUR:4.664, GBP:5.352, SGD:3.122, AUD:2.840, CNY:0.585, JPY:2.500, IDR:0.000231, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-08", USD:3.959, EUR:4.664, GBP:5.352, SGD:3.119, AUD:2.843, CNY:0.584, JPY:2.495, IDR:0.000231, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-09", USD:3.968, EUR:4.661, GBP:5.362, SGD:3.120, AUD:2.845, CNY:0.585, JPY:2.496, IDR:0.000231, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-10", USD:3.973, EUR:4.650, GBP:5.362, SGD:3.118, AUD:2.848, CNY:0.585, JPY:2.496, IDR:0.000230, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-11", USD:3.982, EUR:4.653, GBP:5.361, SGD:3.119, AUD:2.844, CNY:0.586, JPY:2.498, IDR:0.000230, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-14", USD:3.968, EUR:4.649, GBP:5.367, SGD:3.111, AUD:2.847, CNY:0.584, JPY:2.505, IDR:0.000230, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-15", USD:3.964, EUR:4.647, GBP:5.365, SGD:3.115, AUD:2.855, CNY:0.584, JPY:2.492, IDR:0.000229, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-16", USD:3.963, EUR:4.642, GBP:5.357, SGD:3.108, AUD:2.852, CNY:0.583, JPY:2.488, IDR:0.000229, PHP:null,    CHF:null, VND:null },
  { date:"2026-04-17", USD:3.973, EUR:4.642, GBP:5.358, SGD:3.107, AUD:2.835, CNY:0.584, JPY:2.485, IDR:0.000228, PHP:null,    CHF:null, VND:null },
];

// ── STORE ─────────────────────────────────────────────────────────
function freshStore(){
  return { rates:[...SAMPLE], xrateOrder:["CNY","JPY","IDR","PHP","CHF","VND"] };
}
function loadStore(){
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    if (!Array.isArray(s.rates)||!s.rates.length) return freshStore();
    if (!Array.isArray(s.xrateOrder)) s.xrateOrder = ["CNY","JPY","IDR","PHP","CHF","VND"];
    return s;
  } catch { return freshStore(); }
}
function persist(s){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(s)); }catch{} }

// ── UTILS ─────────────────────────────────────────────────────────
function today(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){ if(!d) return"—"; return new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function dayName(d){ return new Date(d+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short"}); }
function f4(n,dp=4){ if(n==null||isNaN(n)) return"—"; if(Math.abs(n)<0.001) return Number(n).toFixed(6); return Number(n).toFixed(dp); }
function fpct(n){ if(n==null) return"—"; return`${n>=0?"+":""}${Number(n).toFixed(2)}%`; }
function pct(a,b){ if(!a||!b) return null; return((b-a)/a)*100; }
function arrAvg(arr){ const v=arr.filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; }
function arrMin(arr){ const v=arr.filter(x=>x!=null); return v.length?Math.min(...v):null; }
function arrMax(arr){ const v=arr.filter(x=>x!=null); return v.length?Math.max(...v):null; }

function getWeeks(rates){
  const sorted=[...rates].sort((a,b)=>a.date.localeCompare(b.date));
  const map={};
  sorted.forEach(r=>{
    const dt=new Date(r.date+"T00:00:00");
    const day=dt.getDay();
    const diff=day===0?-6:1-day;
    const mon=new Date(dt); mon.setDate(dt.getDate()+diff);
    const key=mon.toISOString().slice(0,10);
    if(!map[key]) map[key]=[];
    map[key].push(r);
  });
  return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
}

// ── PRIMITIVES ────────────────────────────────────────────────────
function Card({title,accent,noPad,children,style={}}){
  return(
    <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden",...(accent?{borderTop:`2px solid ${accent}`}:{}),...style}}>
      {title&&<div style={{padding:"11px 16px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",gap:8}}>
        {accent&&<div style={{width:3,height:14,borderRadius:2,background:accent,flexShrink:0}}/>}
        <span style={{fontSize:11,fontWeight:600,color:P.sub,letterSpacing:1.4,textTransform:"uppercase"}}>{title}</span>
      </div>}
      <div style={noPad?{}:{padding:16}}>{children}</div>
    </div>
  );
}
function Btn({children,onClick,color,outline,small,disabled,full,style={}}){
  const bg=outline?"transparent":(color||P.gold);
  const needWhite=[P.red,P.green,P.teal,P.blue,P.mag,P.orange,P.purple].includes(color);
  const cl=outline?(color||P.muted):needWhite?"#fff":"#000";
  return(
    <button onClick={onClick} disabled={!!disabled} style={{
      padding:small?"4px 12px":"8px 18px",borderRadius:8,
      border:`1px solid ${outline?(color||P.border):bg}`,
      background:bg,color:outline?(color||P.muted):cl,
      fontSize:small?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit",opacity:disabled?0.5:1,whiteSpace:"nowrap",
      width:full?"100%":undefined,...style
    }}>{children}</button>
  );
}
function Sel({value,onChange,children,style={}}){
  return(
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      padding:"7px 12px",borderRadius:8,border:`1px solid ${P.border}`,
      background:P.panel,color:P.text,fontSize:13,fontFamily:"inherit",
      outline:"none",cursor:"pointer",...style
    }}>{children}</select>
  );
}
function PTitle({title,sub}){
  return(
    <div style={{marginBottom:20}}>
      <div style={{fontSize:26,fontWeight:700,color:P.text,lineHeight:1.1}}>{title}</div>
      {sub&&<div style={{fontSize:12,color:P.muted,marginTop:4}}>{sub}</div>}
    </div>
  );
}
function Empty({icon,title,sub}){
  return(
    <div style={{textAlign:"center",padding:"32px 20px",color:P.muted}}>
      <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:13,fontWeight:600,color:P.sub,marginBottom:3}}>{title}</div>
      {sub&&<div style={{fontSize:11}}>{sub}</div>}
    </div>
  );
}
function Tabs({tabs,active,onChange}){
  return(
    <div style={{display:"flex",gap:2,background:P.ink2,borderRadius:10,padding:3,flexWrap:"wrap",marginBottom:16}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          padding:"6px 14px",borderRadius:8,border:"none",
          background:active===t.id?P.card:"transparent",
          color:active===t.id?P.gold:P.muted,
          fontSize:12,fontWeight:active===t.id?600:400,
          cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────
function Login({onLogin}){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  function go(){
    if(!u.trim()||!p){setErr("Enter username and password.");return;}
    setBusy(true);
    setTimeout(()=>{ if(u.trim()===CREDS.user&&p===CREDS.pass){onLogin(u.trim());}else{setErr("Incorrect credentials.");setBusy(false);} },500);
  }
  return(
    <div style={{minHeight:"100vh",background:P.ink,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{position:"fixed",top:-150,left:"50%",transform:"translateX(-50%)",width:500,height:500,borderRadius:"50%",background:`radial-gradient(ellipse,${P.mag}14 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:360,position:"relative"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:44,fontWeight:700,background:`linear-gradient(135deg,${P.gold},${P.mag})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>FXFlow</div>
          <div style={{fontSize:11,color:P.muted,letterSpacing:2.5,textTransform:"uppercase",marginTop:6}}>FX Rate Management</div>
        </div>
        <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:14,padding:26}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:10,color:P.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Username</div>
              <input value={u} onChange={e=>{setU(e.target.value);setErr("");}} placeholder="admin" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:P.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Password</div>
              <input type="password" value={p} onChange={e=>{setP(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${err?P.red:P.border}`,background:P.panel,color:P.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            </div>
            {err&&<div style={{fontSize:12,color:P.red}}>{err}</div>}
            <button onClick={go} disabled={busy} style={{padding:"10px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${P.gold},${P.mag})`,color:"#000",fontSize:14,fontWeight:700,cursor:busy?"not-allowed":"pointer",opacity:busy?0.7:1,fontFamily:"inherit",marginTop:2}}>{busy?"Signing in…":"Sign in"}</button>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:10,color:P.muted}}>FXFlow v3.0</div>
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────
const NAV=[
  {id:"entry",  icon:"✎", label:"Daily Entry"},
  {id:"daily",  icon:"◫", label:"Daily Rates"},
  {id:"weekly", icon:"⊟", label:"Weekly View"},
  {id:"monthly",icon:"⊞", label:"Monthly Report"},
  {id:"compare",icon:"⇄", label:"Rate Comparison"},
  {id:"quo",    icon:"⊕", label:"FX Calculator"},
  {id:"ai",     icon:"✦", label:"AI Insights"},
];
function Sidebar({active,onChange,onLogout,user}){
  return(
    <div style={{width:200,minHeight:"100vh",background:P.ink2,borderRight:`1px solid ${P.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${P.border}`}}>
        <div style={{fontSize:22,fontWeight:700,background:`linear-gradient(135deg,${P.gold},${P.mag})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FXFlow</div>
        <div style={{fontSize:9,color:P.muted,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>FX Rate Management</div>
      </div>
      <nav style={{flex:1,padding:"10px 8px"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>onChange(n.id)} style={{
            width:"100%",display:"flex",alignItems:"center",gap:9,
            padding:"9px 11px",borderRadius:8,border:"none",marginBottom:2,
            background:active===n.id?`${P.gold}14`:"transparent",
            color:active===n.id?P.gold:P.muted,
            fontSize:12,fontWeight:active===n.id?600:400,
            cursor:"pointer",fontFamily:"inherit",textAlign:"left",
            borderLeft:`2px solid ${active===n.id?P.gold:"transparent"}`,
          }}>
            <span style={{fontSize:13,width:16,textAlign:"center"}}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${P.border}`}}>
        <div style={{fontSize:10,color:P.muted}}>Signed in as</div>
        <div style={{fontSize:12,color:P.sub,fontWeight:500,marginBottom:8,marginTop:2}}>{user}</div>
        <button onClick={onLogout} style={{width:"100%",padding:"6px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
      </div>
    </div>
  );
}

// ── DAILY ENTRY ───────────────────────────────────────────────────
function DailyEntry({store,setStore}){
  const {rates,xrateOrder}=store;
  const [tab,setTab]=useState("uob");
  const [uobText,setUobText]=useState("");
  const [xText,setXText]=useState("");
  const [uobRes,setUobRes]=useState(null);
  const [xRes,setXRes]=useState(null);
  const [draftOrder,setDraftOrder]=useState([...xrateOrder]);
  const [saved,setSaved]=useState("");

  function parseUOB(){
    const lines=uobText.trim().split("\n").map(l=>l.trim()).filter(Boolean);
    if(lines.length<5){setUobRes({err:`Need 5 values (USD,EUR,GBP,SGD,AUD), got ${lines.length}`});return;}
    const vals=lines.slice(0,5).map(parseFloat);
    if(vals.some(isNaN)){setUobRes({err:"Non-numeric value found."});return;}
    const entry={};UOB_ORDER.forEach((c,i)=>entry[c]=vals[i]);
    setUobRes({entry});
  }
  function parseX(){
    const lines=xText.trim().split("\n").map(l=>l.trim()).filter(Boolean);
    if(lines.length<xrateOrder.length){setXRes({err:`Need ${xrateOrder.length} values, got ${lines.length}`});return;}
    const vals=lines.slice(0,xrateOrder.length).map(parseFloat);
    if(vals.some(isNaN)){setXRes({err:"Non-numeric value found."});return;}
    const entry={};xrateOrder.forEach((c,i)=>entry[c]=vals[i]);
    setXRes({entry});
  }
  function saveToday(){
    const d=today();
    const existing=rates.find(r=>r.date===d)||{date:d};
    const merged={...existing};
    if(uobRes?.entry) Object.assign(merged,uobRes.entry);
    if(xRes?.entry)   Object.assign(merged,xRes.entry);
    const updated=[...rates.filter(r=>r.date!==d),merged].sort((a,b)=>a.date.localeCompare(b.date));
    const ns={...store,rates:updated};setStore(ns);persist(ns);
    setSaved("✓ Saved");setUobText("");setXText("");setUobRes(null);setXRes(null);
    setTimeout(()=>setSaved(""),2500);
  }
  function saveOrder(){
    const ns={...store,xrateOrder:draftOrder};setStore(ns);persist(ns);setTab("uob");
  }
  function moveOrder(i,dir){const o=[...draftOrder];const j=i+dir;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];setDraftOrder(o);}

  const todayEntry=rates.find(r=>r.date===today());
  const taStyle={width:"100%",height:130,padding:"10px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:14,fontFamily:"'DM Mono',monospace",outline:"none",resize:"vertical",lineHeight:1.9};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <PTitle title="Daily Entry" sub={`${fmtDate(today())} · ${dayName(today())}`}/>
        {saved&&<span style={{color:P.green,fontWeight:700,fontSize:14}}>{saved}</span>}
      </div>
      {todayEntry&&<div style={{padding:"10px 14px",background:`${P.green}12`,border:`1px solid ${P.green}30`,borderRadius:10,fontSize:12,color:P.green}}>✓ Rates already entered for today — new paste will merge with existing.</div>}

      <Tabs tabs={[{id:"uob",label:"UOB Email"},{id:"xrate",label:"x-rates.com"},{id:"config",label:"⚙ Sequence"}]} active={tab} onChange={setTab}/>

      {tab==="uob"&&(
        <Card title="Paste UOB Rates" accent={P.blue}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{minWidth:180}}>
              <div style={{fontSize:10,color:P.muted,marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>Fixed order</div>
              {UOB_ORDER.map((c,i)=>(
                <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:ccyColor(c),display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:700}}>{i+1}</span>
                  <span style={{color:ccyColor(c),fontWeight:700,fontSize:13}}>{c}/MYR</span>
                  <span style={{color:P.muted,fontSize:11}}>{ccyLabel(c)}</span>
                </div>
              ))}
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:10,color:P.muted,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Paste numbers (one per line)</div>
              <textarea value={uobText} onChange={e=>{setUobText(e.target.value);setUobRes(null);}} placeholder={"4.052\n4.639\n5.332\n3.138\n2.775"} style={{...taStyle,border:`1px solid ${uobRes?.err?P.red:P.border}`}}/>
              <Btn onClick={parseUOB} color={P.blue} style={{marginTop:8}}>Parse</Btn>
            </div>
          </div>
          {uobRes?.err&&<div style={{marginTop:10,fontSize:12,color:P.red,background:`${P.red}10`,border:`1px solid ${P.red}30`,borderRadius:8,padding:"8px 12px"}}>✗ {uobRes.err}</div>}
          {uobRes?.entry&&(
            <div style={{marginTop:10,background:P.panel,borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:11,color:P.green,marginBottom:8,fontWeight:600}}>✓ Parsed</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {UOB_ORDER.map(c=>(<div key={c} style={{textAlign:"center"}}><div style={{fontSize:10,color:ccyColor(c),fontWeight:700,marginBottom:2}}>{c}/MYR</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:14,color:P.text,fontWeight:700}}>{f4(uobRes.entry[c])}</div></div>))}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab==="xrate"&&(
        <Card title="Paste x-rates.com Values" accent={P.teal}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{minWidth:180}}>
              <div style={{fontSize:10,color:P.muted,marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>Your sequence</div>
              {xrateOrder.map((c,i)=>(
                <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:ccyColor(c),display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:700}}>{i+1}</span>
                  <span style={{color:ccyColor(c),fontWeight:700,fontSize:13}}>{c}/MYR</span>
                  <span style={{color:P.muted,fontSize:11}}>{ccyLabel(c)}</span>
                </div>
              ))}
              <button onClick={()=>setTab("config")} style={{marginTop:8,fontSize:11,color:P.gold,background:"transparent",border:`1px solid ${P.gold}40`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>Edit sequence</button>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:10,color:P.muted,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Paste numbers (one per line)</div>
              <textarea value={xText} onChange={e=>{setXText(e.target.value);setXRes(null);}} placeholder={"0.589\n2.538\n0.000238\n0.06669\n5.311\n27674"} style={{...taStyle,height:160,border:`1px solid ${xRes?.err?P.red:P.border}`}}/>
              <Btn onClick={parseX} color={P.teal} style={{marginTop:8}}>Parse</Btn>
            </div>
          </div>
          {xRes?.err&&<div style={{marginTop:10,fontSize:12,color:P.red,background:`${P.red}10`,border:`1px solid ${P.red}30`,borderRadius:8,padding:"8px 12px"}}>✗ {xRes.err}</div>}
          {xRes?.entry&&(
            <div style={{marginTop:10,background:P.panel,borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:11,color:P.green,marginBottom:8,fontWeight:600}}>✓ Parsed</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {xrateOrder.map(c=>(<div key={c} style={{textAlign:"center"}}><div style={{fontSize:10,color:ccyColor(c),fontWeight:700,marginBottom:2}}>{c}/MYR</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:14,color:P.text,fontWeight:700}}>{f4(xRes.entry[c])}</div></div>))}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab==="config"&&(
        <Card title="Configure x-rates Paste Sequence" accent={P.gold}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:P.muted}}>Set the order to match how you copy values from x-rates.com. Do this once — saved permanently.</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {draftOrder.map((c,i)=>(
                <div key={c} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:P.panel,borderRadius:8,border:`1px solid ${P.border}`}}>
                  <span style={{width:20,height:20,borderRadius:"50%",background:ccyColor(c),display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:700,flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:13,color:ccyColor(c),fontWeight:700,width:36}}>{c}</span>
                  <span style={{fontSize:12,color:P.muted,flex:1}}>{ccyLabel(c)}</span>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>moveOrder(i,-1)} disabled={i===0} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:5,color:P.muted,cursor:"pointer",padding:"2px 7px",fontSize:11}}>↑</button>
                    <button onClick={()=>moveOrder(i,1)} disabled={i===draftOrder.length-1} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:5,color:P.muted,cursor:"pointer",padding:"2px 7px",fontSize:11}}>↓</button>
                    <button onClick={()=>setDraftOrder(draftOrder.filter(x=>x!==c))} style={{background:"transparent",border:`1px solid ${P.red}40`,borderRadius:5,color:P.red,cursor:"pointer",padding:"2px 7px",fontSize:11}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:12,color:P.muted}}>Add:</span>
              {ALL_CCYS.filter(c=>c.group==="xrate"&&!draftOrder.includes(c.code)).map(c=>(
                <button key={c.code} onClick={()=>setDraftOrder([...draftOrder,c.code])} style={{padding:"3px 10px",borderRadius:8,border:`1px solid ${c.color}50`,background:`${c.color}15`,color:c.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{c.code}</button>
              ))}
            </div>
            <Btn onClick={saveOrder} color={P.green}>Save Sequence</Btn>
          </div>
        </Card>
      )}

      {(uobRes?.entry||xRes?.entry)&&(
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <Btn onClick={saveToday} color={P.gold} style={{padding:"10px 28px",fontSize:14}}>💾 Save Today ({fmtDate(today())})</Btn>
        </div>
      )}
    </div>
  );
}

// ── DAILY RATES ───────────────────────────────────────────────────
function DailyRates({store}){
  const {rates}=store;
  const sorted=[...rates].sort((a,b)=>b.date.localeCompare(a.date));
  const [sel,setSel]=useState(["USD","EUR","GBP","SGD","AUD"]);
  function tog(c){setSel(s=>s.includes(c)?s.filter(x=>x!==c):[...s,c]);}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PTitle title="Daily Rates" sub={`${rates.length} trading days · rates vs MYR`}/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {ALL_CCYS.map(c=>{const on=sel.includes(c.code);return(<button key={c.code} onClick={()=>tog(c.code)} style={{padding:"3px 10px",borderRadius:12,border:`1px solid ${on?c.color:P.border}`,background:on?`${c.color}20`:"transparent",color:on?c.color:P.muted,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>{c.code}</button>);})}
      </div>
      <Card noPad title={`${sel.length} currencies`} accent={P.gold}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:P.panel}}>
              <th style={{padding:"9px 14px",textAlign:"left",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>Date</th>
              <th style={{padding:"9px 8px",textAlign:"left",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,letterSpacing:1,textTransform:"uppercase"}}>Day</th>
              {sel.map(c=><th key={c} style={{padding:"9px 12px",textAlign:"right",color:ccyColor(c),borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:600,letterSpacing:1,whiteSpace:"nowrap"}}>{c}/MYR</th>)}
            </tr></thead>
            <tbody>
              {sorted.map((r,i)=>(
                <tr key={r.date} style={{background:i%2?P.panel+"80":"transparent",borderBottom:`1px solid ${P.border}30`}}>
                  <td style={{padding:"8px 14px",color:P.sub,whiteSpace:"nowrap",fontWeight:500}}>{fmtDate(r.date)}</td>
                  <td style={{padding:"8px 8px",color:P.muted,fontSize:11}}>{dayName(r.date)}</td>
                  {sel.map(c=><td key={c} style={{padding:"8px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:12,color:r[c]!=null?P.text:P.muted}}>{f4(r[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── WEEKLY VIEW ───────────────────────────────────────────────────
function WeeklyView({store}){
  const {rates}=store;
  const weeks=getWeeks(rates);
  const [wi,setWi]=useState(Math.max(0,weeks.length-1));
  const DAYS=["Mon","Tue","Wed","Thu","Fri"];
  const TRACKED=ALL_CODES;
  const weekData=weeks[wi]?.[1]||[];
  function byDay(d){return weekData.find(r=>dayName(r.date)===d);}
  const wk=weeks[wi];
  const wkLabel=wk?`${fmtDate(wk[1][0]?.date)} – ${fmtDate(wk[1][wk[1].length-1]?.date)}`:"—";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <PTitle title="Weekly View" sub="Currencies as rows · Mon–Fri as columns · Avg = accounting rate"/>
        <Sel value={wi} onChange={v=>setWi(Number(v))} style={{minWidth:300}}>
          {weeks.map(([key,days],i)=><option key={key} value={i}>{fmtDate(days[0]?.date)} – {fmtDate(days[days.length-1]?.date)}</option>)}
        </Sel>
      </div>
      <Card noPad title={`Week: ${wkLabel} · ${weekData.length} days`} accent={P.gold}>
        {weekData.length===0?<Empty icon="📋" title="No data for this week"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:P.panel}}>
                <th style={{padding:"9px 14px",textAlign:"left",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:600,letterSpacing:1}}>Currency</th>
                {DAYS.map(d=>{const row=byDay(d);return(<th key={d} style={{padding:"9px 12px",textAlign:"right",color:row?P.sub:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:600,letterSpacing:1}}>
                  <div>{d}</div>{row&&<div style={{fontSize:9,color:P.muted,fontWeight:400,marginTop:1}}>{row.date.slice(8)}/{row.date.slice(5,7)}</div>}
                </th>);})}
                <th style={{padding:"9px 10px",textAlign:"right",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,letterSpacing:1,borderLeft:`1px solid ${P.border}`,background:P.panel+"90"}}>Min</th>
                <th style={{padding:"9px 10px",textAlign:"right",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,letterSpacing:1,background:P.panel+"90"}}>Max</th>
                <th style={{padding:"9px 10px",textAlign:"right",color:P.gold,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:700,letterSpacing:1,background:P.panel+"90"}}>Avg</th>
                <th style={{padding:"9px 10px",textAlign:"right",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,letterSpacing:1,background:P.panel+"90"}}>Wk Chg</th>
              </tr></thead>
              <tbody>
                {TRACKED.filter(c=>weekData.some(r=>r[c]!=null)).map((c,i)=>{
                  const vals=weekData.map(r=>r[c]).filter(x=>x!=null);
                  const mn=arrMin(vals),mx=arrMax(vals),avg=arrAvg(vals),chg=vals.length>=2?pct(vals[0],vals[vals.length-1]):null;
                  return(<tr key={c} style={{background:i%2?P.panel+"80":"transparent",borderBottom:`1px solid ${P.border}30`}}>
                    <td style={{padding:"9px 14px"}}><span style={{color:ccyColor(c),fontWeight:700}}>{c}/MYR</span></td>
                    {DAYS.map(d=>{const row=byDay(d);const v=row?.[c];const isMn=v!=null&&mn!=null&&Math.abs(v-mn)<0.000001;const isMx=v!=null&&mx!=null&&Math.abs(v-mx)<0.000001;
                      return<td key={d} style={{padding:"9px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:12,color:isMn?P.red:isMx?P.green:v!=null?P.text:P.muted,fontWeight:isMn||isMx?700:400}}>{f4(v)}</td>;
                    })}
                    <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.red,fontWeight:600,borderLeft:`1px solid ${P.border}`,background:P.panel+"40"}}>{f4(mn)}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.green,fontWeight:600,background:P.panel+"40"}}>{f4(mx)}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.gold,fontWeight:700,background:P.panel+"40"}}>{f4(avg)}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",fontWeight:600,color:chg==null?P.muted:chg>0?P.green:P.red,background:P.panel+"40"}}>{fpct(chg)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{padding:"6px 14px 10px",fontSize:10,color:P.muted}}><span style={{color:P.green,fontWeight:700}}>Green</span> = week high · <span style={{color:P.red,fontWeight:700}}>Red</span> = week low · <span style={{color:P.gold,fontWeight:700}}>Avg</span> = accounting rate</div>
      </Card>
    </div>
  );
}

// ── MONTHLY REPORT ────────────────────────────────────────────────
function MonthlyReport({store}){
  const {rates}=store;
  const months=useMemo(()=>{
    const ms={};rates.forEach(r=>{const m=r.date.slice(0,7);if(!ms[m])ms[m]=[];ms[m].push(r);});
    return Object.entries(ms).sort((a,b)=>b[0].localeCompare(a[0]));
  },[rates]);
  const [mi,setMi]=useState(0);
  const monthData=months[mi]?.[1]||[];
  const sorted=[...monthData].sort((a,b)=>b.date.localeCompare(a.date));
  function mLabel(k){const [y,m]=k.split("-");return new Date(y,m-1,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"});}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <PTitle title="Monthly Report" sub="Management view — currencies as rows, dates as columns"/>
        <Sel value={mi} onChange={v=>setMi(Number(v))} style={{minWidth:180}}>
          {months.map(([k],i)=><option key={k} value={i}>{mLabel(k)}</option>)}
        </Sel>
      </div>
      <Card noPad title={`${months[mi]?mLabel(months[mi][0]):"—"} · ${sorted.length} trading days`} accent={P.mag}>
        {sorted.length===0?<Empty icon="📋" title="No data"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:P.panel}}>
                <th style={{padding:"8px 14px",textAlign:"left",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap",position:"sticky",left:0,background:P.panel,zIndex:1}}>Exchange Rate</th>
                {sorted.map(r=><th key={r.date} style={{padding:"8px 10px",textAlign:"right",color:P.sub,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:500,whiteSpace:"nowrap",minWidth:64}}>
                  <div style={{color:P.muted,fontSize:9}}>{dayName(r.date)}</div>
                  <div>{r.date.slice(8)}/{r.date.slice(5,7)}</div>
                </th>)}
                <th style={{padding:"8px 10px",textAlign:"right",color:P.gold,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:700,borderLeft:`1px solid ${P.border}`,background:P.panel+"90",whiteSpace:"nowrap"}}>Avg</th>
                <th style={{padding:"8px 10px",textAlign:"right",color:P.green,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:700,background:P.panel+"90",whiteSpace:"nowrap"}}>High</th>
                <th style={{padding:"8px 10px",textAlign:"right",color:P.red,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:700,background:P.panel+"90",whiteSpace:"nowrap"}}>Low</th>
              </tr></thead>
              <tbody>
                {ALL_CODES.filter(c=>monthData.some(r=>r[c]!=null)).map((c,i)=>{
                  const vals=monthData.map(r=>r[c]).filter(x=>x!=null);
                  const avg=arrAvg(vals),mn=arrMin(vals),mx=arrMax(vals);
                  return(<tr key={c} style={{background:i%2?P.panel+"80":"transparent",borderBottom:`1px solid ${P.border}30`}}>
                    <td style={{padding:"8px 14px",fontWeight:700,color:ccyColor(c),whiteSpace:"nowrap",position:"sticky",left:0,background:i%2?P.panel:"#16161c",zIndex:1}}>{c}/MYR</td>
                    {sorted.map(r=>{const v=r[c];const isHi=v!=null&&mx!=null&&Math.abs(v-mx)<0.000001;const isLo=v!=null&&mn!=null&&Math.abs(v-mn)<0.000001;
                      return<td key={r.date} style={{padding:"8px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:11,color:isHi?P.green:isLo?P.red:v!=null?P.text:P.muted,fontWeight:isHi||isLo?700:400}}>{f4(v)}</td>;
                    })}
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.gold,fontWeight:700,borderLeft:`1px solid ${P.border}`,background:P.panel+"40"}}>{f4(avg)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.green,fontWeight:600,background:P.panel+"40"}}>{f4(mx)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.red,fontWeight:600,background:P.panel+"40"}}>{f4(mn)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── RATE COMPARISON ───────────────────────────────────────────────
function RateComparison({store}){
  const {rates}=store;
  const [base,setBase]=useState("MYR");
  const [sel,setSel]=useState(["USD","EUR","SGD"]);
  const [from,setFrom]=useState(rates[Math.max(0,rates.length-30)]?.date||"");
  const [to,setTo]=useState(rates[rates.length-1]?.date||"");
  function tog(c){setSel(s=>s.includes(c)?s.filter(x=>x!==c):[...s,c]);}
  const filtered=rates.filter(r=>r.date>=from&&r.date<=to);
  const rebased=filtered.map(r=>{
    const o={date:r.date};
    if(base==="MYR"){ALL_CODES.forEach(c=>{o[c]=r[c];});}
    else{
      const bv=r[base];
      if(!bv) return o;
      ALL_CODES.filter(c=>c!==base).forEach(c=>{
        if(c==="MYR") o[c]=bv!=null?1/bv:null;
        else if(r[c]!=null) o[c]=r[c]/bv;
      });
    }
    return o;
  });
  const last=rebased[rebased.length-1]||{};
  const prev=rebased[rebased.length-2]||{};
  const foreign=ALL_CODES.filter(c=>c!==base);
  function stats(c){
    const v=rebased.map(r=>r[c]).filter(x=>x!=null);
    if(!v.length) return null;
    const avg=arrAvg(v),mn=arrMin(v),mx=arrMax(v),chg=pct(v[0],v[v.length-1]);
    const sd=Math.sqrt(v.reduce((a,b)=>a+(b-avg)**2,0)/v.length);
    return{avg,mn,mx,chg,sd};
  }
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PTitle title="Rate Comparison" sub="Compare any currencies over any period"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",padding:"12px 16px",background:P.card,border:`1px solid ${P.border}`,borderRadius:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:P.muted,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>Base</span>
          <Sel value={base} onChange={v=>{setBase(v);setSel(ALL_CODES.filter(c=>c!==v).slice(0,3));}} style={{minWidth:80}}>
            {["MYR","USD","SGD","EUR","GBP"].map(c=><option key={c}>{c}</option>)}
          </Sel>
        </div>
        <div style={{width:1,height:24,background:P.border}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:P.muted,textTransform:"uppercase"}}>From</span>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:P.muted,textTransform:"uppercase"}}>To</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <span style={{fontSize:11,color:P.muted}}>{filtered.length} days</span>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {foreign.map(c=>{const on=sel.includes(c);return(<button key={c} onClick={()=>tog(c)} style={{padding:"3px 10px",borderRadius:12,border:`1px solid ${on?ccyColor(c):P.border}`,background:on?`${ccyColor(c)}20`:"transparent",color:on?ccyColor(c):P.muted,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>{c}</button>);})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:10}}>
        {sel.map(c=>{const v=last[c],pv=prev[c],d=pct(pv,v);return(<div key={c} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"12px 14px",borderLeft:`3px solid ${ccyColor(c)}`}}><div style={{fontSize:10,fontWeight:600,color:P.muted,letterSpacing:1.4,textTransform:"uppercase",marginBottom:5}}>{c}/{base}</div><div style={{fontSize:22,fontWeight:700,color:ccyColor(c),lineHeight:1}}>{f4(v)}</div>{d!=null&&<div style={{fontSize:11,color:d>0?P.green:P.red,marginTop:4}}>{fpct(d)} vs prior</div>}</div>);})}
      </div>
      <Card title={`Trend — X per 1 ${base}`} accent={P.gold}>
        {rebased.length===0?<Empty icon="📈" title="No data in range"/>:(
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rebased} margin={{top:4,right:8,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border}/>
              <XAxis dataKey="date" tick={{fill:P.muted,fontSize:9}} tickLine={false} tickFormatter={d=>d.slice(5)}/>
              <YAxis tick={{fill:P.muted,fontSize:9}} tickLine={false} width={56}/>
              <Tooltip contentStyle={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:8,fontSize:11}} formatter={(v,n)=>[f4(v),`${n}/${base}`]} labelFormatter={d=>fmtDate(d)}/>
              <Legend formatter={v=><span style={{color:ccyColor(v),fontSize:11}}>{v}/{base}</span>}/>
              {sel.map(c=><Line key={c} type="monotone" dataKey={c} stroke={ccyColor(c)} strokeWidth={2} dot={false} activeDot={{r:4}}/>)}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card noPad title={`Statistics · ${filtered.length} days · base ${base}`} accent={P.blue}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:P.panel}}>
              {["Currency","Latest","Avg","Min","Max","Period Chg","Volatility σ"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:h==="Currency"?"left":"right",color:P.muted,borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sel.map((c,i)=>{const st=stats(c);if(!st)return null;return(<tr key={c} style={{background:i%2?P.panel+"80":"transparent",borderBottom:`1px solid ${P.border}30`}}>
                <td style={{padding:"9px 14px"}}><span style={{color:ccyColor(c),fontWeight:700}}>{c}/{base}</span></td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{f4(last[c])}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.gold,fontWeight:600}}>{f4(st.avg)}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.red}}>{f4(st.mn)}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.green}}>{f4(st.mx)}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontWeight:700,color:st.chg==null?P.muted:st.chg>0?P.green:P.red}}>{fpct(st.chg)}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:P.muted}}>{f4(st.sd,5)}</td>
              </tr>);})}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── FX CALCULATOR ─────────────────────────────────────────────────
function FXCalculator({store}){
  const {rates}=store;
  const latest=rates[rates.length-1]||{};
  const [subsi,setSubsi]=useState("MY");
  const [purchCcy,setPurchCcy]=useState("USD");
  const [amt,setAmt]=useState("1000");
  const [mgn,setMgn]=useState("20");
  const sub=SUBSIDIARIES.find(s=>s.id===subsi);
  const localCcy=sub.currency;
  function getRate(from,to){
    if(from===to) return 1;
    if(to==="MYR") return latest[from]||null;
    if(from==="MYR") return latest[to]?1/latest[to]:null;
    const fv=latest[from],tv=latest[to];
    return(fv&&tv)?fv/tv:null;
  }
  const rate=getRate(purchCcy,localCcy);
  const a=parseFloat(amt)||0;
  const m=parseFloat(mgn)||0;
  const purchLocal=rate?a*rate:null;
  const sellPrice=purchLocal?purchLocal/(1-m/100):null;
  const gpAmt=sellPrice&&purchLocal?sellPrice-purchLocal:null;
  const avail=ALL_CODES.filter(c=>c!==localCcy&&(c==="MYR"||latest[c]!=null));
  const fmt2=(n,ccy)=>{if(!n) return"—";return`${ccy} ${n.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PTitle title="FX Calculator" sub="Quotation pricing tool — all subsidiaries"/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {SUBSIDIARIES.map(s=><button key={s.id} onClick={()=>{setSubsi(s.id);setPurchCcy("USD");}} style={{padding:"8px 16px",borderRadius:10,border:`1px solid ${subsi===s.id?P.gold:P.border}`,background:subsi===s.id?`${P.gold}18`:"transparent",color:subsi===s.id?P.gold:P.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{s.flag} {s.name}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title={`Purchase → Quote in ${localCcy}`} accent={P.gold}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><div style={{fontSize:10,color:P.muted,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Purchase Currency</div><Sel value={purchCcy} onChange={setPurchCcy} style={{width:"100%"}}>{avail.map(c=><option key={c}>{c}</option>)}</Sel></div>
            <div><div style={{fontSize:10,color:P.muted,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Purchase Amount ({purchCcy})</div>
              <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:16,fontFamily:"'DM Mono',monospace",outline:"none",fontWeight:700}}/>
            </div>
            <div><div style={{fontSize:10,color:P.muted,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>GP Margin (%)</div>
              <input type="number" value={mgn} onChange={e=>setMgn(e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:16,fontFamily:"'DM Mono',monospace",outline:"none",fontWeight:700}}/>
            </div>
            <div style={{padding:"10px 14px",background:P.panel,borderRadius:8,fontSize:12,color:P.muted}}>
              Rate: <span style={{color:P.gold,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{rate?`1 ${purchCcy} = ${f4(rate,4)} ${localCcy}`:"Not available"}</span>
              <div style={{fontSize:10,marginTop:3}}>Source: {fmtDate(latest.date)}</div>
            </div>
          </div>
        </Card>
        <Card title="Quotation Result" accent={P.green}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{padding:"14px",background:P.panel,borderRadius:10,border:`1px solid ${P.border}`}}>
              <div style={{fontSize:11,color:P.muted,marginBottom:4,letterSpacing:1,textTransform:"uppercase"}}>Purchase in {localCcy}</div>
              <div style={{fontSize:26,fontWeight:700,color:P.text}}>{fmt2(purchLocal,localCcy)}</div>
              <div style={{fontSize:11,color:P.muted,marginTop:3}}>{a.toLocaleString()} {purchCcy} × {rate?f4(rate,4):"?"}</div>
            </div>
            <div style={{padding:"14px",background:`${P.gold}12`,borderRadius:10,border:`1px solid ${P.gold}40`}}>
              <div style={{fontSize:11,color:P.gold,marginBottom:4,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>Selling Price ({m}% GP)</div>
              <div style={{fontSize:30,fontWeight:700,color:P.gold}}>{fmt2(sellPrice,localCcy)}</div>
              <div style={{fontSize:11,color:P.muted,marginTop:3}}>{purchLocal?`${localCcy} ${purchLocal.toFixed(2)}`:"?"} ÷ {(1-m/100).toFixed(2)}</div>
            </div>
            {gpAmt&&<div style={{padding:"12px 14px",background:`${P.green}10`,borderRadius:8,border:`1px solid ${P.green}30`}}>
              <div style={{fontSize:11,color:P.green,marginBottom:2}}>GP Amount</div>
              <div style={{fontSize:18,fontWeight:700,color:P.green}}>{fmt2(gpAmt,localCcy)}</div>
            </div>}
          </div>
        </Card>
      </div>
      <Card title={`Latest Rates Reference — ${fmtDate(latest.date)}`} accent={P.border}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {ALL_CCYS.filter(c=>latest[c.code]!=null).map(c=>(
            <div key={c.code} style={{padding:"6px 12px",background:P.panel,borderRadius:8,border:`1px solid ${c.color}30`}}>
              <div style={{fontSize:10,color:c.color,fontWeight:700}}>{c.code}/MYR</div>
              <div style={{fontSize:13,fontFamily:"'DM Mono',monospace",color:P.text,fontWeight:600}}>{f4(latest[c.code])}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── AI INSIGHTS ───────────────────────────────────────────────────
function AIInsights({store}){
  const {rates}=store;
  const [analysis,setAnalysis]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [chatBusy,setChatBusy]=useState(false);
  const [apiKey,setApiKey]=useState(()=>{ try{ return localStorage.getItem("fxflow_groq_key")||""; }catch{ return""; } });
  const [showKey,setShowKey]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  function saveKey(k){ setApiKey(k); try{ localStorage.setItem("fxflow_groq_key",k); }catch{} }

  const latest=rates[rates.length-1]||{};
  const prev=rates[rates.length-2]||{};
  function summary(){
    return[
      `FX data: ${rates.length} trading days (${fmtDate(rates[0]?.date)} to ${fmtDate(latest.date)}).`,
      `Latest rates vs MYR:`,
      ...ALL_CCYS.filter(c=>latest[c.code]!=null).map(c=>`  ${c.code}: ${f4(latest[c.code])} (prev: ${f4(prev[c.code])}, chg: ${fpct(pct(prev[c.code],latest[c.code]))})`),
      `\nLast 5 days: USD/MYR`,
      ...rates.slice(-5).map(r=>`  ${fmtDate(r.date)}: USD=${f4(r.USD)} EUR=${f4(r.EUR)} SGD=${f4(r.SGD)} GBP=${f4(r.GBP)}`),
    ].join("\n");
  }
  async function callGroq(messages){
    if(!apiKey) throw new Error("Groq API key not set. Enter your key above.");
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({model:GROQ_MODEL,messages,max_tokens:700,temperature:0.4}),
    });
    if(!r.ok) throw new Error(`Groq error ${r.status} — check your API key.`);
    return(await r.json()).choices?.[0]?.message?.content||"No response.";
  }
  async function runAuto(){
    setLoading(true);setErr("");setAnalysis("");
    try{ const t=await callGroq([
      {role:"system",content:"You are an FX analyst for a Malaysian company with subsidiaries in Singapore, Philippines and Vietnam. Write plain English for finance managers. Cover: MYR strength/weakness, biggest movers, notable volatility, 1-2 practical implications. Under 250 words."},
      {role:"user",content:`Analyse:\n\n${summary()}`},
    ]); setAnalysis(t); }catch(e){ setErr(e.message); }
    setLoading(false);
  }
  async function sendChat(){
    const msg=input.trim();if(!msg)return;
    const nm=[...msgs,{role:"user",text:msg}];setMsgs(nm);setInput("");setChatBusy(true);
    try{
      const r=await callGroq([
        {role:"system",content:`FX analyst assistant for a Malaysian company.\n\nData:\n${summary()}`},
        ...nm.map(m=>({role:m.role,content:m.text})),
      ]);setMsgs(p=>[...p,{role:"assistant",text:r}]);
    }catch(e){setMsgs(p=>[...p,{role:"assistant",text:`Error: ${e.message}`}]);}
    setChatBusy(false);
  }
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PTitle title="AI Insights" sub="Powered by Groq · llama-3.3-70b"/>
      <Card title="API Key" accent={P.border}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,color:P.muted}}>Enter your Groq API key. Stored in your browser only — never sent anywhere except Groq.</div>
          <div style={{display:"flex",gap:8}}>
            <input type={showKey?"text":"password"} value={apiKey} onChange={e=>saveKey(e.target.value)} placeholder="gsk_..." style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${apiKey?P.green:P.border}`,background:P.panel,color:P.text,fontSize:13,fontFamily:"'DM Mono',monospace",outline:"none"}}/>
            <button onClick={()=>setShowKey(v=>!v)} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{showKey?"Hide":"Show"}</button>
          </div>
          {apiKey&&<div style={{fontSize:11,color:P.green}}>✓ Key set</div>}
        </div>
      </Card>
      <Card title="Auto Analysis" accent={P.gold}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:P.muted}}>Instant plain-English summary of your FX data.</div>
          <button onClick={runAuto} disabled={loading} style={{padding:"9px 20px",borderRadius:8,background:`linear-gradient(135deg,${P.gold},${P.mag})`,border:"none",color:"#000",fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:"inherit",alignSelf:"flex-start"}}>{loading?"Analysing…":"✦ Analyse My FX Data"}</button>
          {err&&<div style={{fontSize:12,color:P.red,background:`${P.red}10`,border:`1px solid ${P.red}30`,borderRadius:8,padding:"10px 14px"}}>{err}</div>}
          {analysis&&<div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:10,padding:14,fontSize:13,color:P.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{analysis}</div>}
        </div>
      </Card>
      <Card title="Ask a Question" accent={P.mag}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {msgs.length>0&&(
            <div style={{maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"80%",padding:"9px 13px",borderRadius:12,fontSize:13,lineHeight:1.7,background:m.role==="user"?`${P.gold}20`:P.panel,color:m.role==="user"?P.gold:P.text,border:`1px solid ${m.role==="user"?P.gold+"40":P.border}`,whiteSpace:"pre-wrap"}}>{m.text}</div>
                </div>
              ))}
              {chatBusy&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"9px 13px",borderRadius:12,background:P.panel,border:`1px solid ${P.border}`,color:P.muted,fontSize:13}}>Thinking…</div></div>}
              <div ref={endRef}/>
            </div>
          )}
          {msgs.length===0&&<div style={{fontSize:12,color:P.muted}}>Ask anything: "Is MYR strengthening?" · "What rate should I use for SGD this week?" · "Which currency moved most this month?"</div>}
          <div style={{display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}} placeholder="Ask about your FX data…" disabled={chatBusy} style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${P.border}`,background:P.panel,color:P.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            <button onClick={sendChat} disabled={chatBusy||!input.trim()} style={{padding:"8px 18px",borderRadius:8,background:P.mag,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:chatBusy||!input.trim()?0.5:1}}>Send</button>
          </div>
          {msgs.length>0&&<button onClick={()=>setMsgs([])} style={{alignSelf:"flex-start",background:"transparent",border:"none",color:P.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
        </div>
      </Card>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(()=>{ try{ return localStorage.getItem("fxflow_session")||null; }catch{ return null; } });
  const [store,setStore]=useState(()=>loadStore());
  const [page,setPage]=useState("entry");
  function login(u){ setSession(u); try{ localStorage.setItem("fxflow_session",u); }catch{} }
  function logout(){ setSession(null); try{ localStorage.removeItem("fxflow_session"); }catch{} }
  if(!session) return <Login onLogin={login}/>;
  return(
    <div style={{display:"flex",minHeight:"100vh",background:P.ink}}>
      <Sidebar active={page} onChange={setPage} onLogout={logout} user={session}/>
      <main style={{flex:1,padding:"24px 28px",overflowY:"auto",minWidth:0}}>
        {page==="entry"   && <DailyEntry   store={store} setStore={setStore}/>}
        {page==="daily"   && <DailyRates   store={store}/>}
        {page==="weekly"  && <WeeklyView   store={store}/>}
        {page==="monthly" && <MonthlyReport store={store}/>}
        {page==="compare" && <RateComparison store={store}/>}
        {page==="quo"     && <FXCalculator store={store}/>}
        {page==="ai"      && <AIInsights   store={store}/>}
      </main>
    </div>
  );
}
