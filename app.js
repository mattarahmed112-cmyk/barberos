import { useState, useEffect, useRef } from "react";

// ===================== UTILS =====================
const generateId = (existingIds) => {
  let id;
  do { id = Math.floor(10 + Math.random() * 990).toString().padStart(3, "0"); }
  while (existingIds.includes(id));
  return id;
};

const getNow = () => {
  const now = new Date();
  // Cairo timezone offset: UTC+2 (or UTC+3 in summer, but we'll use a stable approach)
  const cairoOffset = 2 * 60; // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cairo = new Date(utc + cairoOffset * 60000);
  return cairo;
};
const today = () => getNow().toISOString().slice(0, 10);
const thisMonth = () => getNow().toISOString().slice(0, 7);
const getTime = () => getNow().toTimeString().slice(0, 5);

const storage = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k),
};

const initData = () => {
  if (!storage.get("barberos_init")) {
    storage.set("users", [{ id: "superadmin", username: "admin", password: "admin123", role: "superadmin", name: "Super Admin" }]);
    storage.set("shops", []);
    storage.set("barberos_init", true);
  }
};

const PAYMENT_METHODS = [
  { id: "cash", label: "كاش", icon: "💵" },
  { id: "vodafone", label: "Vodafone Cash", icon: "📱" },
  { id: "instapay", label: "InstaPay", icon: "⚡" },
  { id: "visa", label: "Visa / بطاقة", icon: "💳" },
];

// ===================== STYLES =====================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #FAF7F2; --cream2: #F2EDE4; --charcoal: #1C1C1E; --charcoal2: #2C2C2E;
    --gold: #C9A84C; --gold2: #E8C96A; --gold-light: #F5E6B8;
    --red: #C0392B; --green: #27AE60; --blue: #2980B9;
    --text: #1C1C1E; --text2: #6B6B6B; --border: #DDD5C8;
    --shadow: 0 2px 12px rgba(0,0,0,0.08); --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
    --sidebar-w: 260px;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); }
  .app { min-height: 100vh; }

  /* AUTH */
  .auth-page { min-height:100vh; background:var(--charcoal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .auth-page::before { content:''; position:absolute; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%); top:-100px; right:-100px; }
  .auth-page::after { content:''; position:absolute; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%); bottom:-50px; left:-50px; }
  .auth-box { background:var(--cream); border-radius:20px; padding:48px 40px; width:420px; max-width:calc(100vw - 32px); box-shadow:0 24px 80px rgba(0,0,0,0.4); position:relative; z-index:1; }
  .auth-logo { text-align:center; margin-bottom:32px; }
  .auth-logo-icon { font-size:48px; display:block; margin-bottom:8px; }
  .auth-logo h1 { font-family:'Playfair Display',serif; font-size:32px; color:var(--charcoal); letter-spacing:2px; }
  .auth-logo p { color:var(--gold); font-size:13px; letter-spacing:3px; text-transform:uppercase; margin-top:4px; }
  .auth-tabs { display:flex; margin-bottom:28px; border-radius:10px; overflow:hidden; border:1px solid var(--border); }
  .auth-tab { flex:1; padding:10px; text-align:center; cursor:pointer; background:white; font-size:14px; font-weight:500; color:var(--text2); transition:all 0.2s; border:none; font-family:inherit; }
  .auth-tab.active { background:var(--charcoal); color:var(--gold); }
  .remember-row { display:flex; align-items:center; gap:8px; margin-bottom:16px; font-size:13px; color:var(--text2); cursor:pointer; }
  .remember-row input { width:16px; height:16px; cursor:pointer; accent-color:var(--gold); }

  /* FORMS */
  .form-group { margin-bottom:18px; }
  .form-group label { display:block; font-size:12px; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .form-group input, .form-group select, .form-group textarea { width:100%; padding:12px 14px; border:1.5px solid var(--border); border-radius:10px; font-size:14px; font-family:inherit; background:white; color:var(--text); transition:border-color 0.2s; outline:none; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color:var(--gold); }
  .form-group textarea { resize:vertical; min-height:80px; }

  /* BUTTONS */
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 24px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all 0.2s; }
  .btn-primary { background:var(--charcoal); color:var(--gold); }
  .btn-primary:hover { background:var(--charcoal2); transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.2); }
  .btn-gold { background:var(--gold); color:var(--charcoal); }
  .btn-gold:hover { background:var(--gold2); }
  .btn-outline { background:transparent; border:1.5px solid var(--border); color:var(--text); }
  .btn-outline:hover { border-color:var(--gold); color:var(--gold); }
  .btn-danger { background:var(--red); color:white; }
  .btn-success { background:var(--green); color:white; }
  .btn-warning { background:#E67E22; color:white; }
  .btn-sm { padding:7px 14px; font-size:12px; border-radius:7px; }
  .btn-full { width:100%; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; }

  .error-msg { background:#fdecea; color:var(--red); padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }
  .success-msg { background:#eafaf1; color:var(--green); padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }

  /* LAYOUT */
  .layout { display:flex; min-height:100vh; }

  /* MOBILE HEADER */
  .mobile-header { display:none; position:fixed; top:0; left:0; right:0; height:56px; background:var(--charcoal); z-index:200; align-items:center; padding:0 16px; gap:12px; }
  .mobile-header h2 { font-family:'Playfair Display',serif; font-size:18px; color:var(--gold); flex:1; }
  .hamburger { background:none; border:none; color:rgba(255,255,255,0.7); font-size:22px; cursor:pointer; padding:4px; }

  /* SIDEBAR */
  .sidebar { width:var(--sidebar-w); background:var(--charcoal); color:white; display:flex; flex-direction:column; position:fixed; height:100vh; left:0; top:0; z-index:100; transition:transform 0.3s ease; }
  .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:99; }
  .sidebar-logo { padding:28px 24px 20px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .sidebar-logo h2 { font-family:'Playfair Display',serif; font-size:22px; color:var(--gold); letter-spacing:2px; }
  .sidebar-logo p { font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; letter-spacing:1px; }
  .sidebar-user { padding:16px 24px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .sidebar-user .role-badge { display:inline-block; padding:3px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; }
  .role-superadmin { background:rgba(201,168,76,0.2); color:var(--gold); }
  .role-owner { background:rgba(41,128,185,0.2); color:#5dade2; }
  .role-manager { background:rgba(142,68,173,0.2); color:#af7ac5; }
  .role-barber { background:rgba(39,174,96,0.2); color:#58d68d; }
  .sidebar-nav { flex:1; padding:16px 0; overflow-y:auto; }
  .nav-item { display:flex; align-items:center; gap:12px; padding:11px 24px; cursor:pointer; transition:all 0.15s; font-size:14px; color:rgba(255,255,255,0.65); border-left:3px solid transparent; }
  .nav-item:hover { background:rgba(255,255,255,0.05); color:white; }
  .nav-item.active { background:rgba(201,168,76,0.1); color:var(--gold); border-left-color:var(--gold); }
  .nav-item span:first-child { font-size:18px; }
  .sidebar-bottom { padding:16px 24px; border-top:1px solid rgba(255,255,255,0.08); }
  .main { margin-left:var(--sidebar-w); flex:1; padding:32px; min-height:100vh; background:var(--cream); }
  .page-header { margin-bottom:28px; }
  .page-header h1 { font-family:'Playfair Display',serif; font-size:28px; color:var(--charcoal); }
  .page-header p { color:var(--text2); font-size:14px; margin-top:4px; }

  /* CARDS */
  .card { background:white; border-radius:16px; padding:24px; box-shadow:var(--shadow); border:1px solid var(--border); }
  .card-title { font-family:'Playfair Display',serif; font-size:17px; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
  .stats-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
  .stat-card { background:white; border-radius:14px; padding:20px 24px; border:1px solid var(--border); box-shadow:var(--shadow); display:flex; align-items:center; gap:16px; }
  .stat-icon { font-size:32px; }
  .stat-value { font-family:'Playfair Display',serif; font-size:26px; font-weight:700; color:var(--charcoal); }
  .stat-label { font-size:12px; color:var(--text2); margin-top:2px; text-transform:uppercase; letter-spacing:1px; }
  .stat-gold { border-left:4px solid var(--gold); }
  .stat-green { border-left:4px solid var(--green); }
  .stat-blue { border-left:4px solid var(--blue); }
  .stat-red { border-left:4px solid var(--red); }

  /* TABLE */
  .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  table { width:100%; border-collapse:collapse; min-width:500px; }
  thead th { background:var(--cream2); padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text2); font-weight:700; }
  tbody tr { border-bottom:1px solid var(--cream2); transition:background 0.1s; }
  tbody tr:hover { background:var(--cream); }
  tbody td { padding:12px 14px; font-size:14px; }
  thead th:first-child, tbody td:first-child { padding-left:20px; }

  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
  .badge-gold { background:var(--gold-light); color:#8B6914; }
  .badge-green { background:#d5f5e3; color:#1e8449; }
  .badge-red { background:#fadbd8; color:#922b21; }
  .badge-gray { background:var(--cream2); color:var(--text2); }
  .badge-blue { background:#d6eaf8; color:#1a5276; }
  .badge-purple { background:#e8daef; color:#6c3483; }

  .id-badge { display:inline-flex; align-items:center; justify-content:center; width:44px; height:28px; background:var(--charcoal); color:var(--gold); border-radius:6px; font-size:13px; font-weight:700; font-family:monospace; letter-spacing:1px; }

  /* CLIENT ID POPUP */
  .id-reveal { background:var(--charcoal); border-radius:16px; padding:28px; text-align:center; margin-bottom:20px; }
  .id-reveal-label { color:rgba(255,255,255,0.5); font-size:12px; letter-spacing:3px; text-transform:uppercase; margin-bottom:8px; }
  .id-reveal-number { font-family:'Playfair Display',serif; font-size:64px; color:var(--gold); letter-spacing:8px; line-height:1; }
  .id-reveal-name { color:rgba(255,255,255,0.7); font-size:14px; margin-top:8px; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999; padding:20px; }
  .modal { background:white; border-radius:20px; padding:32px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); }
  .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .modal-title { font-family:'Playfair Display',serif; font-size:20px; }
  .modal-close { background:none; border:none; font-size:22px; cursor:pointer; color:var(--text2); }

  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .flex-gap { display:flex; gap:12px; flex-wrap:wrap; }
  .flex-between { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  .mt-16 { margin-top:16px; } .mt-24 { margin-top:24px; } .mb-16 { margin-bottom:16px; } .mb-24 { margin-bottom:24px; }
  .text-center { text-align:center; } .text-sm { font-size:13px; } .text-xs { font-size:12px; }
  .text-muted { color:var(--text2); } .text-gold { color:var(--gold); } .text-green { color:var(--green); } .text-red { color:var(--red); }
  .font-bold { font-weight:700; } .font-serif { font-family:'Playfair Display',serif; }
  .divider { height:1px; background:var(--cream2); margin:20px 0; }

  .search-input { width:100%; padding:10px 14px 10px 36px; border:1.5px solid var(--border); border-radius:10px; font-size:14px; font-family:inherit; outline:none; background:white; }
  .search-input:focus { border-color:var(--gold); }
  .search-wrap { position:relative; }
  .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text2); font-size:15px; pointer-events:none; }

  .bar-chart { display:flex; align-items:flex-end; gap:6px; height:120px; }
  .bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
  .bar { width:100%; background:var(--gold); border-radius:4px 4px 0 0; min-height:4px; transition:height 0.3s; }
  .bar-label { font-size:10px; color:var(--text2); }

  .empty-state { text-align:center; padding:48px 24px; }
  .empty-state .empty-icon { font-size:48px; margin-bottom:12px; }
  .empty-state p { color:var(--text2); font-size:14px; }

  .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .chip { padding:6px 14px; border-radius:20px; font-size:13px; background:var(--cream2); cursor:pointer; border:1.5px solid transparent; transition:all 0.15s; }
  .chip.selected { background:var(--gold-light); border-color:var(--gold); color:#7a5c10; font-weight:600; }

  .revenue-total { background:var(--charcoal); color:white; border-radius:14px; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; }
  .revenue-total .amount { font-family:'Playfair Display',serif; font-size:32px; color:var(--gold); }

  .log-entry { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--cream2); }
  .log-entry:last-child { border-bottom:none; }

  .client-card { background:white; border:1px solid var(--border); border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; transition:box-shadow 0.15s; flex-wrap:wrap; gap:12px; }
  .client-card:hover { box-shadow:var(--shadow); }
  .client-avatar { width:40px; height:40px; border-radius:50%; background:var(--charcoal); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:16px; font-weight:700; flex-shrink:0; }

  /* PAYMENT METHODS */
  .payment-methods { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; }
  .payment-chip { padding:10px 14px; border-radius:10px; font-size:13px; background:var(--cream2); cursor:pointer; border:1.5px solid transparent; transition:all 0.15s; display:flex; align-items:center; gap:8px; font-weight:500; }
  .payment-chip.selected { background:var(--gold-light); border-color:var(--gold); color:#7a5c10; }

  /* DATETIME DISPLAY */
  .datetime-badge { background:rgba(201,168,76,0.1); border:1px solid rgba(201,168,76,0.3); border-radius:10px; padding:8px 14px; font-size:13px; color:var(--gold); font-weight:600; display:inline-flex; align-items:center; gap:6px; }

  /* SUSPENDED OVERLAY */
  .suspended-banner { background:#fdecea; border:1px solid #f5c6cb; color:var(--red); padding:14px 20px; border-radius:12px; text-align:center; font-weight:600; margin-bottom:20px; }

  /* MULTI-SERVICE SUMMARY */
  .service-summary { background:var(--cream2); border-radius:10px; padding:14px 16px; margin-top:8px; }
  .service-summary-row { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; }
  .service-summary-total { display:flex; justify-content:space-between; font-weight:700; font-size:15px; padding-top:8px; margin-top:8px; border-top:1px solid var(--border); color:var(--gold); }

  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
  .fade-in { animation:fadeIn 0.3s ease; }
  .pop-in { animation:popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275); }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .mobile-header { display:flex; }
    .sidebar { transform:translateX(-100%); top:0; }
    .sidebar.open { transform:translateX(0); box-shadow:0 0 40px rgba(0,0,0,0.5); }
    .sidebar-overlay.open { display:block; }
    .main { margin-left:0; padding:80px 16px 24px; }
    .auth-box { padding:32px 24px; }
    .stats-grid { grid-template-columns:1fr 1fr; }
    .grid-2 { grid-template-columns:1fr; }
    .payment-methods { grid-template-columns:1fr 1fr; }
    .page-header h1 { font-size:22px; }
    .flex-between { flex-direction:column; align-items:flex-start; }
    .flex-between .flex-gap { width:100%; }
    .flex-between .btn { width:100%; justify-content:center; }
    .modal { padding:24px 16px; max-width:100%; margin:0; border-radius:20px 20px 0 0; }
    .modal-overlay { align-items:flex-end; padding:0; }
    table { min-width:600px; }
    .id-reveal-number { font-size:48px; }
    .revenue-total { flex-direction:column; gap:8px; }
    .revenue-total .amount { font-size:26px; }
  }
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns:1fr; }
    .client-card { flex-direction:column; align-items:flex-start; }
  }
`;

// ===================== APP =====================
export default function BarberOS() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [msg, setMsg] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initData();
    // Auto-login from remembered session
    const saved = storage.get("barberos_session");
    if (saved) {
      const users = storage.get("users") || [];
      const user = users.find(u => u.id === saved.id && u.username === saved.username);
      if (user) setCurrentUser(user);
    }
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleLogin = (user, remember) => {
    setCurrentUser(user);
    if (remember) storage.set("barberos_session", { id: user.id, username: user.username });
  };

  const handleLogout = () => {
    storage.remove("barberos_session");
    setCurrentUser(null);
    setPage("dashboard");
  };

  const getShop = () => {
    if (!currentUser || currentUser.role === "superadmin") return null;
    return (storage.get("shops") || []).find(s => s.id === currentUser.shopId);
  };

  // Check if shop is suspended
  const shop = getShop();
  const isSuspended = shop && shop.active === false && currentUser?.role !== "superadmin";

  if (!currentUser) return (<><style>{css}</style><AuthPage onLogin={handleLogin} /></>);

  return (
    <>
      <style>{css}</style>
      <div className="app layout fade-in">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>✂️ BarberOS</h2>
        </div>
        {/* Sidebar overlay */}
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar user={currentUser} page={page} setPage={(p) => { setPage(p); setSidebarOpen(false); }} onLogout={handleLogout} isOpen={sidebarOpen} />
        <main className="main">
          {isSuspended && <div className="suspended-banner">⛔ هذا الصالون موقوف. تواصل مع الإدارة.</div>}
          {msg && <div className={msg.type === "error" ? "error-msg" : "success-msg"} style={{ marginBottom: 20 }}>{msg.text}</div>}
          {!isSuspended && <>
            {page === "dashboard"      && <DashboardPage user={currentUser} shop={shop} />}
            {page === "clients"        && <ClientsPage user={currentUser} shop={shop} showMsg={showMsg} />}
            {page === "services"       && <ServicesPage user={currentUser} shop={shop} showMsg={showMsg} />}
            {page === "subscriptions"  && <SubscriptionsPage user={currentUser} shop={shop} showMsg={showMsg} />}
            {page === "barbers"        && (currentUser.role === "owner" || currentUser.role === "manager") && <BarbersPage user={currentUser} shop={shop} showMsg={showMsg} />}
            {page === "sessions"       && <SessionsPage user={currentUser} shop={shop} showMsg={showMsg} />}
            {page === "revenue"        && (currentUser.role === "owner" || currentUser.role === "superadmin") && <RevenuePage user={currentUser} shop={shop} />}
            {page === "shops"          && currentUser.role === "superadmin" && <ShopsPage showMsg={showMsg} />}
            {page === "users"          && currentUser.role === "superadmin" && <UsersPage showMsg={showMsg} />}
            {page === "settings"       && <SettingsPage user={currentUser} showMsg={showMsg} />}
          </>}
        </main>
      </div>
    </>
  );
}

// ===================== AUTH =====================
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", shopName: "", ownerName: "" });
  const [err, setErr] = useState("");
  const [remember, setRemember] = useState(true);
  const h = (f, v) => setForm(x => ({ ...x, [f]: v }));

  const login = () => {
    setErr("");
    const user = (storage.get("users") || []).find(u => u.username === form.username && u.password === form.password);
    if (!user) { setErr("اسم المستخدم أو كلمة المرور غلط"); return; }
    onLogin(user, remember);
  };

  const signup = () => {
    setErr("");
    if (!form.shopName || !form.username || !form.password || !form.ownerName) { setErr("ارجاء ملء كل الحقول"); return; }
    const users = storage.get("users") || [];
    if (users.find(u => u.username === form.username)) { setErr("اسم المستخدم موجود بالفعل"); return; }
    const shopId = "shop_" + Date.now();
    const newShop = { id: shopId, name: form.shopName, ownerName: form.ownerName, createdAt: today(), services: [], subscriptionPlans: [], active: true };
    const newUser = { id: "u_" + Date.now(), username: form.username, password: form.password, role: "owner", name: form.ownerName, shopId, active: true };
    storage.set("users", [...users, newUser]);
    storage.set("shops", [...(storage.get("shops") || []), newShop]);
    onLogin(newUser, remember);
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <span className="auth-logo-icon">✂️</span>
          <h1>BarberOS</h1>
          <p>Barbershop Management</p>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>تسجيل الدخول</button>
          <button className={`auth-tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>محل جديد</button>
        </div>
        {err && <div className="error-msg">{err}</div>}
        {tab === "login" ? (
          <>
            <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e => h("username", e.target.value)} placeholder="username" autoComplete="username" /></div>
            <div className="form-group"><label>كلمة المرور</label><input type="password" value={form.password} onChange={e => h("password", e.target.value)} onKeyDown={e => e.key === "Enter" && login()} autoComplete="current-password" /></div>
            <label className="remember-row">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              ابقى متسجل على الجهاز ده
            </label>
            <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={login}>دخول →</button>
          </>
        ) : (
          <>
            <div className="form-group"><label>اسم الصالون</label><input value={form.shopName} onChange={e => h("shopName", e.target.value)} placeholder="مثلاً: صالون النجم" /></div>
            <div className="form-group"><label>اسم صاحب الصالون</label><input value={form.ownerName} onChange={e => h("ownerName", e.target.value)} /></div>
            <div className="grid-2">
              <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e => h("username", e.target.value)} /></div>
              <div className="form-group"><label>كلمة المرور</label><input type="password" value={form.password} onChange={e => h("password", e.target.value)} /></div>
            </div>
            <label className="remember-row">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              ابقى متسجل على الجهاز ده
            </label>
            <button className="btn btn-gold btn-full" onClick={signup}>إنشاء الصالون ✂️</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== SIDEBAR =====================
function Sidebar({ user, page, setPage, onLogout, isOpen }) {
  const ownerNav = [
    { id: "dashboard", icon: "📊", label: "لوحة التحكم" },
    { id: "clients", icon: "👥", label: "العملاء" },
    { id: "services", icon: "✂️", label: "الخدمات والأسعار" },
    { id: "subscriptions", icon: "🎫", label: "الاشتراكات" },
    { id: "barbers", icon: "👤", label: "الحلاقين والمديرين" },
    { id: "sessions", icon: "📋", label: "سجل الجلسات" },
    { id: "revenue", icon: "💰", label: "الإيرادات" },
    { id: "settings", icon: "⚙️", label: "الإعدادات" },
  ];
  const managerNav = [
    { id: "dashboard", icon: "📊", label: "لوحة التحكم" },
    { id: "clients", icon: "👥", label: "العملاء" },
    { id: "subscriptions", icon: "🎫", label: "الاشتراكات" },
    { id: "barbers", icon: "👤", label: "الحلاقين" },
    { id: "sessions", icon: "📋", label: "سجل الجلسات" },
    { id: "settings", icon: "⚙️", label: "الإعدادات" },
  ];
  const nav = user.role === "superadmin"
    ? [{ id: "dashboard", icon: "📊", label: "لوحة التحكم" }, { id: "shops", icon: "🏪", label: "الصالونات" }, { id: "users", icon: "👥", label: "إدارة المستخدمين" }, { id: "settings", icon: "⚙️", label: "الإعدادات" }]
    : user.role === "owner" ? ownerNav
    : user.role === "manager" ? managerNav
    : [{ id: "sessions", icon: "📋", label: "تسجيل جلسة" }, { id: "dashboard", icon: "📊", label: "إحصائياتي" }, { id: "settings", icon: "⚙️", label: "الإعدادات" }];

  const roleLabel = { superadmin: "Super Admin", owner: "صاحب الصالون", manager: "مدير", barber: "حلاق" }[user.role];

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-logo"><h2>✂️ BarberOS</h2><p>Management System</p></div>
      <div className="sidebar-user">
        <span className={`role-badge role-${user.role}`}>{roleLabel}</span>
        <p>{user.name}</p>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="btn btn-outline btn-full btn-sm" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.1)" }} onClick={onLogout}>⎋ تسجيل الخروج</button>
      </div>
    </aside>
  );
}

// ===================== CLIENTS PAGE =====================
function ClientsPage({ user, shop, showMsg }) {
  const key = `clients_${user.shopId}`;
  const [clients, setClients] = useState(storage.get(key) || []);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [search, setSearch] = useState("");
  const [justCreated, setJustCreated] = useState(null);

  const saveClients = (updated) => { storage.set(key, updated); setClients(updated); };

  const addClient = () => {
    if (!newClient.name.trim()) { showMsg("ارجاء اكتب اسم العميل", "error"); return; }
    const existingIds = clients.map(c => c.id);
    const id = generateId(existingIds);
    const client = { id, name: newClient.name.trim(), phone: newClient.phone.trim(), createdAt: today(), notes: "" };
    saveClients([...clients, client]);
    setJustCreated(client);
    setNewClient({ name: "", phone: "" });
    setModal("created");
    showMsg(`تم تسجيل العميل ✓ — ID: ${id}`);
  };

  const deleteClient = (id) => {
    if (!window.confirm("هتحذف العميل ده؟")) return;
    saveClients(clients.filter(c => c.id !== id));
    showMsg("تم الحذف");
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.includes(search) ||
    (c.phone && c.phone.includes(search))
  );

  const getSessions = (clientId) => (storage.get(`sessions_${user.shopId}`) || []).filter(s => s.clientId === clientId);
  const getSubs = (clientId) => (storage.get(`subs_${user.shopId}`) || []).filter(s => s.clientId === clientId);

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>العملاء</h1><p>{clients.length} عميل مسجل في صالون {shop?.name}</p></div>
        <button className="btn btn-primary" onClick={() => { setNewClient({ name: "", phone: "" }); setModal("add"); }}>+ عميل جديد</button>
      </div>

      <div className="card mb-24">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو ID أو رقم التليفون..." />
        </div>
      </div>

      {filtered.length === 0
        ? <EmptyState icon="👥" text={search ? "مفيش نتايج للبحث ده" : "لا يوجد عملاء بعد. أضف أول عميل!"} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(c => {
              const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              const sessions = getSessions(c.id);
              const activeSub = getSubs(c.id).find(s => s.month === thisMonth() && s.remaining > 0);
              return (
                <div key={c.id} className="client-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div className="client-avatar">{initials}</div>
                    <div>
                      <div className="font-bold" style={{ fontSize: 15 }}>{c.name}</div>
                      <div className="text-sm text-muted">{c.phone || "بدون رقم"} · منضم {c.createdAt}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {activeSub && <span className="badge badge-green">{activeSub.remaining} جلسة متبقية</span>}
                    <span className="badge badge-gray">{sessions.length} جلسة</span>
                    <span className="id-badge">{c.id}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelected(c); setModal("view"); }}>عرض</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteClient(c.id)}>حذف</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {modal === "add" && (
        <Modal title="تسجيل عميل جديد" onClose={() => setModal(null)}>
          <div className="form-group"><label>اسم العميل</label><input value={newClient.name} onChange={e => setNewClient(x => ({ ...x, name: e.target.value }))} placeholder="الاسم الكامل" autoFocus /></div>
          <div className="form-group"><label>رقم التليفون (اختياري)</label><input value={newClient.phone} onChange={e => setNewClient(x => ({ ...x, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
          <p className="text-sm text-muted mb-16">بعد الإضافة هيظهرلك الـ ID بتاعه فوراً ✓</p>
          <div className="flex-gap">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={addClient}>تسجيل وإظهار الـ ID</button>
            <button className="btn btn-outline" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}

      {modal === "created" && justCreated && (
        <Modal title="" onClose={() => setModal(null)}>
          <div className="id-reveal pop-in">
            <div className="id-reveal-label">ID العميل</div>
            <div className="id-reveal-number">{justCreated.id}</div>
            <div className="id-reveal-name">{justCreated.name}</div>
          </div>
          <p className="text-center text-sm text-muted mb-16">احتفظ بهذا الـ ID أو اديه للعميل — هتستخدمه للبحث السريع</p>
          <button className="btn btn-primary btn-full" onClick={() => setModal(null)}>تمام ✓</button>
        </Modal>
      )}

      {modal === "view" && selected && (
        <ClientViewModal client={selected} shopId={user.shopId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ClientViewModal({ client, shopId, onClose }) {
  const sessions = (storage.get(`sessions_${shopId}`) || []).filter(s => s.clientId === client.id);
  const subs = (storage.get(`subs_${shopId}`) || []).filter(s => s.clientId === client.id);
  const totalSpent = sessions.reduce((sum, s) => sum + (s.amount || 0), 0) + subs.reduce((sum, s) => sum + (s.price || 0), 0);
  const activeSub = subs.find(s => s.month === thisMonth() && s.remaining > 0);

  return (
    <Modal title="بيانات العميل" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div className="client-avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
          {client.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-bold font-serif" style={{ fontSize: 20 }}>{client.name}</div>
          <div className="text-sm text-muted">{client.phone || "بدون رقم تليفون"}</div>
        </div>
        <span className="id-badge" style={{ marginLeft: "auto", fontSize: 18, width: 56, height: 36 }}>{client.id}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
          <div className="font-serif" style={{ fontSize: 22, color: "var(--gold)" }}>{sessions.length}</div>
          <div className="text-xs text-muted">جلسة كلها</div>
        </div>
        <div className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
          <div className="font-serif" style={{ fontSize: 22, color: "var(--green)" }}>{totalSpent} ج</div>
          <div className="text-xs text-muted">إجمالي الإنفاق</div>
        </div>
        <div className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
          <div className="font-serif" style={{ fontSize: 22, color: "var(--blue)" }}>{subs.length}</div>
          <div className="text-xs text-muted">اشتراكات</div>
        </div>
      </div>
      {activeSub && (
        <div style={{ background: "var(--cream2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div className="font-bold text-sm">اشتراك نشط — {activeSub.planName}</div><div className="text-xs text-muted">{activeSub.month}</div></div>
          <div style={{ textAlign: "right" }}><span className="font-serif" style={{ fontSize: 24, color: "var(--green)" }}>{activeSub.remaining}</span><div className="text-xs text-muted">جلسة متبقية</div></div>
        </div>
      )}
      {sessions.length > 0 && (
        <>
          <div className="card-title" style={{ fontSize: 15 }}>آخر الجلسات</div>
          {sessions.slice(-5).reverse().map((s, i) => (
            <div key={i} className="log-entry">
              <div>
                <span className="font-bold text-sm">{s.serviceNames || s.serviceName}</span>
                <div className="text-xs text-muted">{s.date} {s.time || ""} · {s.barberName}</div>
                {s.paymentMethod && <span className="badge badge-gray" style={{ fontSize: 10, marginTop: 4 }}>{PAYMENT_METHODS.find(p => p.id === s.paymentMethod)?.label || s.paymentMethod}</span>}
              </div>
              {s.amount > 0 ? <span className="badge badge-gold">{s.amount} ج</span> : <span className="badge badge-blue">اشتراك</span>}
            </div>
          ))}
        </>
      )}
      <button className="btn btn-outline btn-full mt-16" onClick={onClose}>إغلاق</button>
    </Modal>
  );
}

// ===================== SERVICES =====================
function ServicesPage({ user, shop, showMsg }) {
  const [services, setServices] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", duration: "", editId: null });

  useEffect(() => {
    const s = (storage.get("shops") || []).find(x => x.id === user.shopId);
    setServices(s?.services || []);
  }, []);

  const save = () => {
    if (!form.name || !form.price) { showMsg("ارجاء ملء الاسم والسعر", "error"); return; }
    const shops = storage.get("shops") || [];
    const idx = shops.findIndex(x => x.id === user.shopId);
    const entry = { id: form.editId || "srv_" + Date.now(), name: form.name, price: Number(form.price), duration: form.duration };
    const updated = form.editId ? services.map(s => s.id === form.editId ? entry : s) : [...services, entry];
    shops[idx].services = updated;
    storage.set("shops", shops);
    setServices(updated);
    setModal(null);
    showMsg("تم الحفظ ✓");
  };

  const del = (id) => {
    const shops = storage.get("shops") || [];
    const idx = shops.findIndex(x => x.id === user.shopId);
    const updated = services.filter(s => s.id !== id);
    shops[idx].services = updated;
    storage.set("shops", shops);
    setServices(updated);
    showMsg("تم الحذف");
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الخدمات والأسعار</h1><p>خدمات صالون {shop?.name}</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ name: "", price: "", duration: "", editId: null }); setModal("form"); }}>+ إضافة خدمة</button>
      </div>
      <div className="card">
        {services.length === 0 ? <EmptyState icon="✂️" text="لا يوجد خدمات بعد. أضف خدمة الآن!" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>اسم الخدمة</th><th>السعر</th><th>المدة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="font-bold">{s.name}</td>
                    <td><span className="badge badge-gold">{s.price} جنيه</span></td>
                    <td className="text-muted">{s.duration || "—"}</td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-outline btn-sm" onClick={() => { setForm({ name: s.name, price: s.price, duration: s.duration || "", editId: s.id }); setModal("form"); }}>تعديل</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal === "form" && (
        <Modal title={form.editId ? "تعديل الخدمة" : "إضافة خدمة جديدة"} onClose={() => setModal(null)}>
          <div className="form-group"><label>اسم الخدمة</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثلاً: قصة شعر" /></div>
          <div className="grid-2">
            <div className="form-group"><label>السعر (جنيه)</label><input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="form-group"><label>المدة (اختياري)</label><input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30 دقيقة" /></div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>حفظ</button>
            <button className="btn btn-outline" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== SUBSCRIPTIONS =====================
function SubscriptionsPage({ user, shop, showMsg }) {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ clientId: "", planId: "" });
  const [planForm, setPlanForm] = useState({ name: "", price: "", sessions: "", editId: null });

  useEffect(() => {
    const s = (storage.get("shops") || []).find(x => x.id === user.shopId);
    setPlans(s?.subscriptionPlans || []);
    setSubs(storage.get(`subs_${user.shopId}`) || []);
    setClients(storage.get(`clients_${user.shopId}`) || []);
  }, []);

  const savePlan = () => {
    if (!planForm.name || !planForm.price || !planForm.sessions) { showMsg("ارجاء ملء كل الحقول", "error"); return; }
    const shops = storage.get("shops") || [];
    const idx = shops.findIndex(x => x.id === user.shopId);
    const entry = { id: planForm.editId || "plan_" + Date.now(), name: planForm.name, price: Number(planForm.price), sessions: Number(planForm.sessions) };
    const updated = planForm.editId ? plans.map(p => p.id === planForm.editId ? entry : p) : [...plans, entry];
    shops[idx].subscriptionPlans = updated;
    storage.set("shops", shops);
    setPlans(updated);
    setModal(null); setPlanForm({ name: "", price: "", sessions: "", editId: null });
    showMsg("تم حفظ الباقة ✓");
  };

  const delPlan = (id) => {
    const shops = storage.get("shops") || [];
    const idx = shops.findIndex(x => x.id === user.shopId);
    const updated = plans.filter(p => p.id !== id);
    shops[idx].subscriptionPlans = updated;
    storage.set("shops", shops);
    setPlans(updated);
    showMsg("تم حذف الباقة");
  };

  const addSub = () => {
    if (!form.planId) { showMsg("اختار الباقة", "error"); return; }
    if (!form.clientId) { showMsg("اختار العميل أو أضفه أولاً", "error"); return; }
    const plan = plans.find(p => p.id === form.planId);
    const client = clients.find(c => c.id === form.clientId);
    const existingIds = subs.map(s => s.id);
    const id = generateId(existingIds);
    const newSub = { id, clientId: client.id, clientName: client.name, phone: client.phone, planId: form.planId, planName: plan.name, price: plan.price, totalSessions: plan.sessions, remaining: plan.sessions, month: thisMonth(), createdAt: today() };
    const updated = [...subs, newSub];
    storage.set(`subs_${user.shopId}`, updated);
    setSubs(updated);
    setModal(null); setForm({ clientId: "", planId: "" });
    showMsg(`تم الاشتراك ✓ | ID العميل: ${client.id}`);
  };

  const filtered = subs.filter(s =>
    s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    s.id.includes(search) || s.clientId?.includes(search) || s.phone?.includes(search)
  ).slice().reverse();

  const thisMonthSubs = subs.filter(s => s.month === thisMonth());

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الاشتراكات الشهرية</h1></div>
        <div className="flex-gap">
          <button className="btn btn-outline btn-sm" onClick={() => { setPlanForm({ name: "", price: "", sessions: "", editId: null }); setModal("plan"); }}>+ باقة</button>
          <button className="btn btn-primary" onClick={() => setModal("add")}>+ اشتراك جديد</button>
        </div>
      </div>
      {plans.length > 0 && (
        <div className="card mb-24">
          <div className="card-title">🎫 الباقات المتاحة</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {plans.map(p => (
              <div key={p.id} className="card" style={{ flex: "0 0 auto", minWidth: 150, padding: "14px 18px", textAlign: "center", position: "relative" }}>
                <div className="font-bold">{p.name}</div>
                <div className="font-serif" style={{ fontSize: 22, color: "var(--gold)" }}>{p.price} ج</div>
                <div className="text-xs text-muted">{p.sessions} جلسة / شهر</div>
                <div className="flex-gap" style={{ marginTop: 10, justifyContent: "center" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setPlanForm({ name: p.name, price: p.price, sessions: p.sessions, editId: p.id }); setModal("plan"); }}>تعديل</button>
                  <button className="btn btn-danger btn-sm" onClick={() => delPlan(p.id)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="stats-grid mb-24" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <StatCard icon="👥" value={thisMonthSubs.length} label="اشتراك الشهر" cls="stat-gold" />
        <StatCard icon="✅" value={thisMonthSubs.filter(s => s.remaining > 0).length} label="نشط" cls="stat-green" />
        <StatCard icon="💰" value={`${thisMonthSubs.reduce((s, x) => s + x.price, 0)} ج`} label="إيراد الاشتراكات" cls="stat-blue" />
      </div>
      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{ marginBottom: 0 }}>سجل الاشتراكات</div>
          <div className="search-wrap" style={{ width: 240 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو ID..." />
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="🎫" text="لا يوجد اشتراكات بعد" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID العميل</th><th>العميل</th><th>الباقة</th><th>المتبقي</th><th>الشهر</th></tr></thead>
              <tbody>
                {filtered.map(s => {
                  const expired = s.month !== thisMonth();
                  return (
                    <tr key={s.id}>
                      <td><span className="id-badge">{s.clientId}</span></td>
                      <td className="font-bold">{s.clientName}<div className="text-xs text-muted">{s.phone}</div></td>
                      <td>{s.planName}<div className="text-xs text-muted">{s.price} جنيه</div></td>
                      <td>
                        <span className={`font-bold ${s.remaining === 0 ? "text-red" : "text-green"}`}>{s.remaining}</span>
                        <span className="text-muted text-xs"> / {s.totalSessions}</span>
                        {expired && <span className="badge badge-red" style={{ marginLeft: 6 }}>منتهي</span>}
                      </td>
                      <td className="text-muted">{s.month}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === "add" && (
        <Modal title="إضافة اشتراك جديد" onClose={() => setModal(null)}>
          <div className="form-group">
            <label>اختار العميل</label>
            {clients.length === 0
              ? <p className="text-sm text-red">لا يوجد عملاء. اضف عميل من صفحة العملاء أولاً.</p>
              : <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="">— اختار عميل —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
                </select>}
          </div>
          <div className="form-group">
            <label>الباقة</label>
            {plans.length === 0
              ? <p className="text-sm text-red">لا يوجد باقات. أضف باقة أولاً.</p>
              : <div className="chips">
                  {plans.map(p => (
                    <div key={p.id} className={`chip ${form.planId === p.id ? "selected" : ""}`} onClick={() => setForm(f => ({ ...f, planId: p.id }))}>
                      {p.name} — {p.price}ج ({p.sessions} جلسات)
                    </div>
                  ))}
                </div>}
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={addSub} disabled={!form.planId || !form.clientId}>تأكيد</button>
            <button className="btn btn-outline" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
      {modal === "plan" && (
        <Modal title={planForm.editId ? "تعديل الباقة" : "إضافة باقة"} onClose={() => setModal(null)}>
          <div className="form-group"><label>اسم الباقة</label><input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="مثلاً: الباقة الشهرية" /></div>
          <div className="grid-2">
            <div className="form-group"><label>السعر (جنيه)</label><input type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="form-group"><label>عدد الجلسات</label><input type="number" value={planForm.sessions} onChange={e => setPlanForm(f => ({ ...f, sessions: e.target.value }))} /></div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-gold" style={{ flex: 1 }} onClick={savePlan}>حفظ الباقة</button>
            <button className="btn btn-outline" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== BARBERS =====================
function BarbersPage({ user, shop, showMsg }) {
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "barber" });

  const loadStaff = () => {
    setStaff((storage.get("users") || []).filter(u => (u.role === "barber" || u.role === "manager") && u.shopId === user.shopId));
  };

  useEffect(() => { loadStaff(); }, []);

  const saveStaff = () => {
    if (!form.name || !form.username) { showMsg("ارجاء ملء كل الحقول", "error"); return; }
    const users = storage.get("users") || [];
    if (editUser) {
      const idx = users.findIndex(u => u.id === editUser.id);
      users[idx] = { ...users[idx], name: form.name, username: form.username, role: form.role, ...(form.password ? { password: form.password } : {}) };
      storage.set("users", users);
      showMsg("تم التعديل ✓");
    } else {
      if (!form.password) { showMsg("ارجاء اكتب كلمة مرور", "error"); return; }
      if (users.find(u => u.username === form.username)) { showMsg("اسم المستخدم موجود", "error"); return; }
      const nb = { id: "b_" + Date.now(), username: form.username, password: form.password, role: form.role, name: form.name, shopId: user.shopId, active: true };
      storage.set("users", [...users, nb]);
      showMsg("تم الإضافة ✓");
    }
    loadStaff();
    setModal(false); setEditUser(null); setForm({ name: "", username: "", password: "", role: "barber" });
  };

  const toggleActive = (uid) => {
    const users = storage.get("users") || [];
    const idx = users.findIndex(u => u.id === uid);
    users[idx].active = !users[idx].active;
    storage.set("users", users);
    loadStaff();
    showMsg(users[idx].active ? "تم تفعيل الحساب ✓" : "تم تعطيل الحساب");
  };

  const allSessions = storage.get(`sessions_${user.shopId}`) || [];

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الحلاقين والمديرين</h1></div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setForm({ name: "", username: "", password: "", role: "barber" }); setModal(true); }}>+ إضافة</button>
      </div>
      <div className="card">
        {staff.length === 0 ? <EmptyState icon="👤" text="لا يوجد موظفين مسجلين بعد" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>اليوم</th><th>الشهر</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {staff.map(b => {
                  const todayC = allSessions.filter(s => s.barberId === b.id && s.date === today()).length;
                  const monthC = allSessions.filter(s => s.barberId === b.id && s.date?.startsWith(thisMonth())).length;
                  const active = b.active !== false;
                  return (
                    <tr key={b.id}>
                      <td className="font-bold">{b.role === "manager" ? "📋" : "✂️"} {b.name}</td>
                      <td><span className={`badge ${b.role === "manager" ? "badge-purple" : "badge-blue"}`}>{b.role === "manager" ? "مدير" : "حلاق"}</span></td>
                      <td className="text-muted">{b.username}</td>
                      <td><span className="badge badge-gold">{todayC}</span></td>
                      <td><span className="badge badge-blue">{monthC}</span></td>
                      <td><span className={`badge ${active ? "badge-green" : "badge-red"}`}>{active ? "نشط" : "موقوف"}</span></td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditUser(b); setForm({ name: b.name, username: b.username, password: "", role: b.role }); setModal(true); }}>تعديل</button>
                          <button className={`btn btn-sm ${active ? "btn-warning" : "btn-success"}`} onClick={() => toggleActive(b.id)}>{active ? "تعطيل" : "تفعيل"}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title={editUser ? "تعديل بيانات الموظف" : "إضافة موظف جديد"} onClose={() => { setModal(false); setEditUser(null); }}>
          <div className="form-group"><label>الاسم الكامل</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-group">
            <label>الدور</label>
            <div className="chips">
              <div className={`chip ${form.role === "barber" ? "selected" : ""}`} onClick={() => setForm(f => ({ ...f, role: "barber" }))}>✂️ حلاق</div>
              <div className={`chip ${form.role === "manager" ? "selected" : ""}`} onClick={() => setForm(f => ({ ...f, role: "manager" }))}>📋 مدير (بدون مالية)</div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div className="form-group"><label>كلمة المرور {editUser && "(اتركها فارغة لعدم التغيير)"}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveStaff}>حفظ</button>
            <button className="btn btn-outline" onClick={() => { setModal(false); setEditUser(null); }}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== SESSIONS =====================
function SessionsPage({ user, shop, showMsg }) {
  const [sessions, setSessions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ serviceIds: [], clientNote: "", clientId: "", subId: "", paymentMethod: "cash" });
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState("today");

  useEffect(() => {
    const s = (storage.get("shops") || []).find(x => x.id === user.shopId);
    setServices(s?.services || []);
    setClients(storage.get(`clients_${user.shopId}`) || []);
    setSubs(storage.get(`subs_${user.shopId}`) || []);
    setSessions(storage.get(`sessions_${user.shopId}`) || []);
  }, []);

  const selectedServices = services.filter(s => form.serviceIds.includes(s.id));
  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const clientSubs = form.clientId ? subs.filter(s => s.clientId === form.clientId && s.month === thisMonth() && s.remaining > 0) : [];

  const toggleService = (id) => {
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(x => x !== id) : [...f.serviceIds, id]
    }));
  };

  const addSession = () => {
    if (form.serviceIds.length === 0) { showMsg("اختار خدمة واحدة على الأقل", "error"); return; }
    let amount = totalAmount;
    let note = form.clientNote;
    const nowTime = getTime();

    if (form.subId) {
      const updated = subs.map(s => s.id === form.subId && s.remaining > 0 ? { ...s, remaining: s.remaining - 1 } : s);
      storage.set(`subs_${user.shopId}`, updated);
      setSubs(updated);
      amount = 0;
    }

    const client = clients.find(c => c.id === form.clientId);
    const ns = {
      id: "sess_" + Date.now(),
      date: today(),
      time: nowTime,
      serviceIds: form.serviceIds,
      serviceName: selectedServices[0]?.name,
      serviceNames: selectedServices.map(s => s.name).join(" + "),
      barberId: user.id,
      barberName: user.name,
      amount,
      paymentMethod: form.subId ? "subscription" : form.paymentMethod,
      clientNote: note,
      clientId: form.clientId || null,
      clientName: client?.name || null,
      subId: form.subId || null
    };
    const updated = [...sessions, ns];
    storage.set(`sessions_${user.shopId}`, updated);
    setSessions(updated);
    setModal(false);
    setForm({ serviceIds: [], clientNote: "", clientId: "", subId: "", paymentMethod: "cash" });
    showMsg("تم تسجيل الجلسة ✓");
  };

  const filtered = sessions.filter(s => {
    if (filter === "today") return s.date === today();
    if (filter === "month") return s.date?.startsWith(thisMonth());
    return true;
  }).slice().reverse();

  const pmLabel = (pm) => {
    if (pm === "subscription") return <span className="badge badge-blue">اشتراك</span>;
    const found = PAYMENT_METHODS.find(p => p.id === pm);
    return found ? <span className="badge badge-gray">{found.icon} {found.label}</span> : null;
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div>
          <h1>سجل الجلسات</h1>
          <div className="datetime-badge" style={{ marginTop: 6 }}>🕐 {today()} — {getTime()}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ تسجيل جلسة</button>
      </div>
      <div className="chips mb-24">
        {["today", "month", "all"].map(f => (
          <div key={f} className={`chip ${filter === f ? "selected" : ""}`} onClick={() => setFilter(f)}>
            {f === "today" ? "اليوم" : f === "month" ? "الشهر" : "الكل"}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{ marginBottom: 0 }}>الجلسات <span className="badge badge-gray">{filtered.length}</span></div>
          <span className="font-bold text-gold">إجمالي: {filtered.reduce((s, x) => s + (x.amount || 0), 0)} جنيه</span>
        </div>
        {filtered.length === 0 ? <EmptyState icon="📋" text="لا يوجد جلسات" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>التاريخ / الوقت</th><th>الخدمة</th><th>العميل</th><th>الحلاق</th><th>المبلغ</th><th>الدفع</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{s.date}<div className="text-xs">{s.time || ""}</div></td>
                    <td className="font-bold" style={{ maxWidth: 160 }}>{s.serviceNames || s.serviceName}</td>
                    <td>{s.clientName ? <><span className="id-badge" style={{ fontSize: 11, width: 36, height: 22 }}>{s.clientId}</span> <span className="text-sm">{s.clientName}</span></> : <span className="text-muted text-sm">—</span>}</td>
                    <td className="text-muted text-sm">{s.barberName}</td>
                    <td>{s.amount > 0 ? <span className="badge badge-gold">{s.amount} ج</span> : <span className="badge badge-blue">اشتراك</span>}</td>
                    <td>{pmLabel(s.paymentMethod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title="تسجيل جلسة" onClose={() => setModal(false)}>
          <div className="form-group">
            <label>الخدمات (ممكن تختار أكتر من واحدة)</label>
            <div className="chips">
              {services.map(s => (
                <div key={s.id} className={`chip ${form.serviceIds.includes(s.id) ? "selected" : ""}`} onClick={() => toggleService(s.id)}>
                  {s.name} — {s.price}ج
                </div>
              ))}
            </div>
            {selectedServices.length > 0 && (
              <div className="service-summary">
                {selectedServices.map(s => (
                  <div key={s.id} className="service-summary-row"><span>{s.name}</span><span>{s.price} ج</span></div>
                ))}
                <div className="service-summary-total"><span>الإجمالي</span><span>{totalAmount} ج</span></div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>العميل (اختياري)</label>
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value, subId: "" }))}>
              <option value="">— بدون عميل مسجل —</option>
              {clients.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
            </select>
          </div>
          {clientSubs.length > 0 && (
            <div className="form-group">
              <label>استخدام اشتراك</label>
              <select value={form.subId} onChange={e => setForm(f => ({ ...f, subId: e.target.value }))}>
                <option value="">بدون اشتراك (يدفع نقداً)</option>
                {clientSubs.map(s => <option key={s.id} value={s.id}>{s.planName} — {s.remaining} جلسة متبقية</option>)}
              </select>
            </div>
          )}
          {!form.subId && (
            <div className="form-group">
              <label>طريقة الدفع</label>
              <div className="payment-methods">
                {PAYMENT_METHODS.map(pm => (
                  <div key={pm.id} className={`payment-chip ${form.paymentMethod === pm.id ? "selected" : ""}`} onClick={() => setForm(f => ({ ...f, paymentMethod: pm.id }))}>
                    {pm.icon} {pm.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="form-group"><label>ملاحظة</label><input value={form.clientNote} onChange={e => setForm(f => ({ ...f, clientNote: e.target.value }))} placeholder="مثلاً: قصة + لحية" /></div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={addSession} disabled={form.serviceIds.length === 0}>تسجيل</button>
            <button className="btn btn-outline" onClick={() => setModal(false)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== REVENUE =====================
function RevenuePage({ user, shop }) {
  const sessions = storage.get(`sessions_${user.shopId}`) || [];
  const subs = storage.get(`subs_${user.shopId}`) || [];
  const days = Array.from({ length: 7 }, (_, i) => { const d = getNow(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const dailyRevenue = days.map(d => ({
    label: new Date(d).toLocaleDateString("ar-EG", { weekday: "short" }),
    value: sessions.filter(s => s.date === d).reduce((sum, s) => sum + (s.amount || 0), 0)
  }));
  const maxVal = Math.max(...dailyRevenue.map(d => d.value), 1);
  const monthSessions = sessions.filter(s => s.date?.startsWith(thisMonth()));
  const monthRevenue = monthSessions.reduce((s, x) => s + (x.amount || 0), 0);
  const subRevenue = subs.filter(s => s.month === thisMonth()).reduce((s, x) => s + x.price, 0);

  // Revenue by payment method
  const byMethod = PAYMENT_METHODS.map(pm => ({
    ...pm,
    total: monthSessions.filter(s => s.paymentMethod === pm.id).reduce((sum, s) => sum + s.amount, 0)
  })).filter(pm => pm.total > 0);

  // Revenue by week
  const weeks = [0, 1, 2, 3].map(w => {
    const start = new Date(getNow().getFullYear(), getNow().getMonth(), 1 + w * 7);
    const end = new Date(getNow().getFullYear(), getNow().getMonth(), Math.min(7 + w * 7, 31));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    return {
      label: `أسبوع ${w + 1}`,
      value: monthSessions.filter(s => s.date >= startStr && s.date <= endStr).reduce((sum, s) => sum + s.amount, 0)
    };
  });

  return (
    <div className="fade-in">
      <div className="page-header"><h1>الإيرادات</h1><p>تقرير مالي — {thisMonth()}</p></div>
      <div className="stats-grid">
        <StatCard icon="📅" value={`${monthRevenue} ج`} label="إيراد الجلسات" cls="stat-gold" />
        <StatCard icon="🎫" value={`${subRevenue} ج`} label="إيراد الاشتراكات" cls="stat-blue" />
        <StatCard icon="✂️" value={monthSessions.length} label="جلسة الشهر" cls="stat-green" />
      </div>
      <div className="revenue-total mb-24">
        <div><div className="text-sm" style={{ opacity: 0.6 }}>إجمالي الشهر</div><div className="amount">{monthRevenue + subRevenue} جنيه</div></div>
        <div className="text-sm" style={{ opacity: 0.5 }}>{thisMonth()}</div>
      </div>
      <div className="card mb-24">
        <div className="card-title">📈 إيرادات آخر 7 أيام</div>
        <div className="bar-chart">
          {dailyRevenue.map((d, i) => (
            <div key={i} className="bar-wrap">
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div className="bar" style={{ height: `${(d.value / maxVal) * 100}%`, background: i === 6 ? "var(--gold2)" : "var(--gold)" }} />
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {byMethod.length > 0 && (
        <div className="card mb-24">
          <div className="card-title">💳 الإيرادات حسب طريقة الدفع</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {byMethod.map(pm => (
              <div key={pm.id} className="stat-card stat-gold" style={{ flex: "1 1 140px" }}>
                <span className="stat-icon">{pm.icon}</span>
                <div><div className="stat-value">{pm.total} ج</div><div className="stat-label">{pm.label}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-title">📅 إيرادات الشهر أسبوعياً</div>
        <div className="bar-chart">
          {weeks.map((w, i) => (
            <div key={i} className="bar-wrap">
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div className="bar" style={{ height: `${(w.value / Math.max(...weeks.map(x => x.value), 1)) * 100}%` }} />
              </div>
              <span className="bar-label">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== SHOPS (SUPERADMIN) =====================
function ShopsPage({ showMsg }) {
  const [shops, setShops] = useState(storage.get("shops") || []);
  const users = storage.get("users") || [];
  const toggle = (id) => {
    const updated = shops.map(s => s.id === id ? { ...s, active: !s.active } : s);
    storage.set("shops", updated);
    setShops(updated);
    showMsg("تم التحديث ✓");
  };
  return (
    <div className="fade-in">
      <div className="page-header"><h1>إدارة الصالونات</h1><p>{shops.length} صالون مسجل</p></div>
      <div className="card">
        {shops.length === 0 ? <EmptyState icon="🏪" text="لا يوجد صالونات بعد" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الصالون</th><th>صاحب الصالون</th><th>اسم المستخدم</th><th>الحلاقين</th><th>تاريخ الإنشاء</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                {shops.map(s => {
                  const owner = users.find(u => u.role === "owner" && u.shopId === s.id);
                  const barberCount = users.filter(u => (u.role === "barber" || u.role === "manager") && u.shopId === s.id).length;
                  return (
                    <tr key={s.id}>
                      <td className="font-bold">✂️ {s.name}</td>
                      <td>{s.ownerName}</td>
                      <td className="text-muted">{owner?.username}</td>
                      <td><span className="badge badge-blue">{barberCount}</span></td>
                      <td className="text-muted text-sm">{s.createdAt}</td>
                      <td><span className={`badge ${s.active ? "badge-green" : "badge-red"}`}>{s.active ? "نشط" : "موقوف"}</span></td>
                      <td><button className={`btn btn-sm ${s.active ? "btn-danger" : "btn-success"}`} onClick={() => toggle(s.id)}>{s.active ? "إيقاف" : "تفعيل"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== USERS PAGE (SUPERADMIN) =====================
function UsersPage({ showMsg }) {
  const [users, setUsers] = useState(storage.get("users") || []);
  const [search, setSearch] = useState("");
  const [showPass, setShowPass] = useState({});

  const reload = () => setUsers(storage.get("users") || []);

  const toggleActive = (id) => {
    const all = storage.get("users") || [];
    const idx = all.findIndex(u => u.id === id);
    if (all[idx].role === "superadmin") { showMsg("لا يمكن تعطيل Super Admin", "error"); return; }
    all[idx].active = !(all[idx].active !== false);
    storage.set("users", all);
    reload();
    showMsg("تم التحديث ✓");
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.includes(search)
  );

  const roleLabel = { superadmin: "Super Admin", owner: "صاحب صالون", manager: "مدير", barber: "حلاق" };
  const shops = storage.get("shops") || [];

  return (
    <div className="fade-in">
      <div className="page-header"><h1>إدارة المستخدمين</h1><p>كل الحسابات في النظام — {users.length} مستخدم</p></div>
      <div className="card mb-24">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو اسم المستخدم..." />
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>الصالون</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {filtered.map(u => {
                const shopName = u.shopId ? shops.find(s => s.id === u.shopId)?.name : "—";
                const active = u.active !== false;
                const shown = showPass[u.id];
                return (
                  <tr key={u.id}>
                    <td className="font-bold">{u.name}</td>
                    <td><span className={`badge role-${u.role}`} style={{ background: "transparent", border: "1px solid currentColor" }}>{roleLabel[u.role] || u.role}</span></td>
                    <td className="text-muted">{u.username}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="text-sm" style={{ fontFamily: "monospace" }}>{shown ? u.password : "••••••"}</span>
                        <button className="btn btn-outline btn-sm" style={{ padding: "4px 8px" }} onClick={() => setShowPass(p => ({ ...p, [u.id]: !p[u.id] }))}>
                          {shown ? "إخفاء" : "إظهار"}
                        </button>
                      </div>
                    </td>
                    <td className="text-muted text-sm">{shopName}</td>
                    <td><span className={`badge ${active ? "badge-green" : "badge-red"}`}>{active ? "نشط" : "موقوف"}</span></td>
                    <td>
                      {u.role !== "superadmin" && (
                        <button className={`btn btn-sm ${active ? "btn-warning" : "btn-success"}`} onClick={() => toggleActive(u.id)}>
                          {active ? "تعطيل" : "تفعيل"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================== SETTINGS =====================
function SettingsPage({ user, showMsg }) {
  const [pass, setPass] = useState({ current: "", newPass: "", confirm: "" });
  const changePass = () => {
    const users = storage.get("users") || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (users[idx].password !== pass.current) { showMsg("كلمة المرور الحالية غلط", "error"); return; }
    if (pass.newPass !== pass.confirm) { showMsg("كلمة المرور مش متطابقة", "error"); return; }
    if (pass.newPass.length < 4) { showMsg("كلمة المرور قصيرة جداً", "error"); return; }
    users[idx].password = pass.newPass;
    storage.set("users", users);
    // Update session if saved
    const session = storage.get("barberos_session");
    if (session) storage.set("barberos_session", { ...session });
    setPass({ current: "", newPass: "", confirm: "" });
    showMsg("تم التغيير ✓");
  };
  return (
    <div className="fade-in">
      <div className="page-header"><h1>الإعدادات</h1></div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-title">🔐 تغيير كلمة المرور</div>
        <div className="form-group"><label>الحالية</label><input type="password" value={pass.current} onChange={e => setPass(p => ({ ...p, current: e.target.value }))} /></div>
        <div className="form-group"><label>الجديدة</label><input type="password" value={pass.newPass} onChange={e => setPass(p => ({ ...p, newPass: e.target.value }))} /></div>
        <div className="form-group"><label>تأكيد</label><input type="password" value={pass.confirm} onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} /></div>
        <button className="btn btn-primary" onClick={changePass}>تحديث</button>
      </div>
    </div>
  );
}

// ===================== DASHBOARD =====================
function DashboardPage({ user, shop }) {
  const allSessions = user.role === "superadmin"
    ? (storage.get("shops") || []).flatMap(s => storage.get(`sessions_${s.id}`) || [])
    : (storage.get(`sessions_${user.shopId}`) || []);
  const todaySessions = allSessions.filter(s => s.date === today());
  const monthSessions = allSessions.filter(s => s.date?.startsWith(thisMonth()));
  const todayRevenue = todaySessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const monthRevenue = monthSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const shops = storage.get("shops") || [];
  const clients = user.shopId ? (storage.get(`clients_${user.shopId}`) || []) : [];
  const subs = user.shopId ? (storage.get(`subs_${user.shopId}`) || []) : [];

  if (user.role === "barber") {
    const mine = allSessions.filter(s => s.barberId === user.id);
    return (
      <div className="fade-in">
        <div className="page-header"><h1>أهلاً، {user.name}! 👋</h1>
          <div className="datetime-badge" style={{ marginTop: 8 }}>🕐 {today()} — {getTime()}</div>
        </div>
        <div className="stats-grid">
          <StatCard icon="✂️" value={mine.filter(s => s.date === today()).length} label="حلاقة اليوم" cls="stat-gold" />
          <StatCard icon="📅" value={mine.filter(s => s.date?.startsWith(thisMonth())).length} label="حلاقة الشهر" cls="stat-blue" />
        </div>
        <div className="card">
          <div className="card-title">آخر جلساتي اليوم</div>
          {mine.filter(s => s.date === today()).length === 0 ? <EmptyState icon="✂️" text="لا يوجد جلسات اليوم بعد" /> :
            mine.filter(s => s.date === today()).slice().reverse().map((s, i) => (
              <div key={i} className="log-entry">
                <div><span className="font-bold">{s.serviceNames || s.serviceName}</span><div className="text-xs text-muted">{s.clientName || "عميل عادي"} · {s.time || ""}</div></div>
                <span className="badge badge-gold">{s.amount} ج</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{user.role === "superadmin" ? "لوحة تحكم BarberOS" : `صالون ${shop?.name || ""}`}</h1>
        <div className="flex-gap" style={{ marginTop: 8 }}>
          <p className="text-muted text-sm">{new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <div className="datetime-badge">🕐 {getTime()}</div>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard icon="💵" value={`${todayRevenue} ج`} label="إيرادات اليوم" cls="stat-gold" />
        <StatCard icon="📅" value={`${monthRevenue} ج`} label="إيرادات الشهر" cls="stat-green" />
        <StatCard icon="✂️" value={monthSessions.length} label="جلسة الشهر" cls="stat-blue" />
        {user.role === "superadmin"
          ? <StatCard icon="🏪" value={shops.length} label="صالون" cls="stat-red" />
          : <StatCard icon="👥" value={clients.length} label="عميل مسجل" cls="stat-red" />}
      </div>
      {user.role === "owner" && (
        <div className="card">
          <div className="card-title">📋 آخر الجلسات اليوم</div>
          {todaySessions.length === 0 ? <EmptyState icon="✂️" text="لا يوجد جلسات اليوم بعد" /> :
            todaySessions.slice(-5).reverse().map((s, i) => (
              <div key={i} className="log-entry">
                <div>
                  <span className="font-bold">{s.serviceNames || s.serviceName}</span>
                  {s.clientName && <span className="text-xs text-muted" style={{ marginLeft: 8 }}>#{s.clientId} {s.clientName}</span>}
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>· {s.barberName} · {s.time || ""}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.amount > 0 ? <span className="badge badge-gold">{s.amount} ج</span> : <span className="badge badge-blue">اشتراك</span>}
                  {s.paymentMethod && s.paymentMethod !== "subscription" && <span className="badge badge-gray">{PAYMENT_METHODS.find(p => p.id === s.paymentMethod)?.icon}</span>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ===================== SHARED =====================
function StatCard({ icon, value, label, cls }) {
  return (
    <div className={`stat-card ${cls}`}>
      <span className="stat-icon">{icon}</span>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        {title && <div className="modal-header"><h2 className="modal-title">{title}</h2><button className="modal-close" onClick={onClose}>✕</button></div>}
        {children}
      </div>
    </div>
  );
}
function EmptyState({ icon, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><p>{text}</p></div>;
}