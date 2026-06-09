// BarberOS — Firebase + localStorage fallback
const db       = window.__db;
const ref      = window.__ref;
const set      = window.__set;
const get      = window.__get;
const onValue  = window.__onValue;
const update   = window.__update;
const remove   = window.__remove;

const { useState, useEffect } = React;

// ===================== UTILS =====================
const generateId = (existingIds) => {
  let id;
  do { id = Math.floor(10 + Math.random() * 990).toString().padStart(3, "0"); }
  while (existingIds.includes(id));
  return id;
};

const getNow = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 2 * 60 * 60000);
};
const today     = () => getNow().toISOString().slice(0, 10);
const thisMonth = () => getNow().toISOString().slice(0, 7);
const getTime   = () => getNow().toTimeString().slice(0, 5);

const fbGet = async (path) => {
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
};
const fbSet = (path, val) => set(ref(db, path), val);

const PAYMENT_METHODS = [
  { id: "cash",     label: "كاش",          icon: "💵" },
  { id: "vodafone", label: "Vodafone Cash", icon: "📱" },
  { id: "instapay", label: "InstaPay",      icon: "⚡" },
  { id: "visa",     label: "Visa / بطاقة",  icon: "💳" },
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
  .loading-screen { min-height:100vh; background:var(--charcoal); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; }
  .loading-screen h2 { font-family:'Playfair Display',serif; font-size:32px; color:var(--gold); letter-spacing:2px; }
  .loading-screen p { color:rgba(255,255,255,0.5); font-size:14px; }
  .spinner { width:40px; height:40px; border:3px solid rgba(201,168,76,0.2); border-top-color:var(--gold); border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .auth-page { min-height:100vh; background:var(--charcoal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .auth-page::before { content:''; position:absolute; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%); top:-100px; right:-100px; }
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
  .form-group { margin-bottom:18px; }
  .form-group label { display:block; font-size:12px; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .form-group input, .form-group select { width:100%; padding:12px 14px; border:1.5px solid var(--border); border-radius:10px; font-size:14px; font-family:inherit; background:white; color:var(--text); transition:border-color 0.2s; outline:none; }
  .form-group input:focus, .form-group select:focus { border-color:var(--gold); }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 24px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all 0.2s; }
  .btn-primary { background:var(--charcoal); color:var(--gold); }
  .btn-primary:hover { background:var(--charcoal2); transform:translateY(-1px); }
  .btn-gold { background:var(--gold); color:var(--charcoal); }
  .btn-outline { background:transparent; border:1.5px solid var(--border); color:var(--text); }
  .btn-outline:hover { border-color:var(--gold); color:var(--gold); }
  .btn-danger { background:var(--red); color:white; }
  .btn-success { background:var(--green); color:white; }
  .btn-warning { background:#E67E22; color:white; }
  .btn-sm { padding:7px 14px; font-size:12px; border-radius:7px; }
  .btn-full { width:100%; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; }
  .error-msg { background:#fdecea; color:var(--red); padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }
  .success-msg { background:#eafaf1; color:var(--green); padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }
  .layout { display:flex; min-height:100vh; }
  .mobile-header { display:none; position:fixed; top:0; left:0; right:0; height:56px; background:var(--charcoal); z-index:200; align-items:center; padding:0 16px; gap:12px; }
  .mobile-header h2 { font-family:'Playfair Display',serif; font-size:18px; color:var(--gold); flex:1; }
  .hamburger { background:none; border:none; color:rgba(255,255,255,0.7); font-size:22px; cursor:pointer; padding:4px; }
  .sidebar { width:var(--sidebar-w); background:var(--charcoal); color:white; display:flex; flex-direction:column; position:fixed; height:100vh; left:0; top:0; z-index:100; transition:transform 0.3s ease; }
  .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:99; }
  .sidebar-logo { padding:28px 24px 20px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .sidebar-logo h2 { font-family:'Playfair Display',serif; font-size:22px; color:var(--gold); letter-spacing:2px; }
  .sidebar-logo p { font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; }
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
  .sidebar-bottom { padding:16px 24px; border-top:1px solid rgba(255,255,255,0.08); }
  .main { margin-left:var(--sidebar-w); flex:1; padding:32px; min-height:100vh; background:var(--cream); }
  .page-header { margin-bottom:28px; }
  .page-header h1 { font-family:'Playfair Display',serif; font-size:28px; color:var(--charcoal); }
  .page-header p { color:var(--text2); font-size:14px; margin-top:4px; }
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
  .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  table { width:100%; border-collapse:collapse; min-width:500px; }
  thead th { background:var(--cream2); padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text2); font-weight:700; }
  tbody tr { border-bottom:1px solid var(--cream2); transition:background 0.1s; }
  tbody tr:hover { background:var(--cream); }
  tbody td { padding:12px 14px; font-size:14px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; }
  .badge-gold { background:var(--gold-light); color:#8B6914; }
  .badge-green { background:#d5f5e3; color:#1e8449; }
  .badge-red { background:#fadbd8; color:#922b21; }
  .badge-gray { background:var(--cream2); color:var(--text2); }
  .badge-blue { background:#d6eaf8; color:#1a5276; }
  .badge-purple { background:#e8daef; color:#6c3483; }
  .id-badge { display:inline-flex; align-items:center; justify-content:center; width:44px; height:28px; background:var(--charcoal); color:var(--gold); border-radius:6px; font-size:13px; font-weight:700; font-family:monospace; }
  .id-reveal { background:var(--charcoal); border-radius:16px; padding:28px; text-align:center; margin-bottom:20px; }
  .id-reveal-label { color:rgba(255,255,255,0.5); font-size:12px; letter-spacing:3px; text-transform:uppercase; margin-bottom:8px; }
  .id-reveal-number { font-family:'Playfair Display',serif; font-size:64px; color:var(--gold); letter-spacing:8px; line-height:1; }
  .id-reveal-name { color:rgba(255,255,255,0.7); font-size:14px; margin-top:8px; }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999; padding:20px; }
  .modal { background:white; border-radius:20px; padding:32px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); }
  .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .modal-title { font-family:'Playfair Display',serif; font-size:20px; }
  .modal-close { background:none; border:none; font-size:22px; cursor:pointer; color:var(--text2); }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .flex-gap { display:flex; gap:12px; flex-wrap:wrap; }
  .flex-between { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  .mt-16 { margin-top:16px; } .mb-16 { margin-bottom:16px; } .mb-24 { margin-bottom:24px; }
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
  .bar { width:100%; background:var(--gold); border-radius:4px 4px 0 0; min-height:4px; }
  .bar-label { font-size:10px; color:var(--text2); }
  .empty-state { text-align:center; padding:48px 24px; }
  .empty-state .empty-icon { font-size:48px; margin-bottom:12px; }
  .empty-state p { color:var(--text2); font-size:14px; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .chip { padding:6px 14px; border-radius:20px; font-size:13px; background:var(--cream2); cursor:pointer; border:1.5px solid transparent; transition:all 0.15s; }
  .chip.selected { background:var(--gold-light); border-color:var(--gold); color:#7a5c10; font-weight:600; }
  .revenue-total { background:var(--charcoal); color:white; border-radius:14px; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .revenue-total .amount { font-family:'Playfair Display',serif; font-size:32px; color:var(--gold); }
  .log-entry { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--cream2); }
  .log-entry:last-child { border-bottom:none; }
  .client-card { background:white; border:1px solid var(--border); border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; transition:box-shadow 0.15s; flex-wrap:wrap; gap:12px; }
  .client-card:hover { box-shadow:var(--shadow); }
  .client-avatar { width:40px; height:40px; border-radius:50%; background:var(--charcoal); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:16px; font-weight:700; flex-shrink:0; }
  .payment-methods { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; }
  .payment-chip { padding:10px 14px; border-radius:10px; font-size:13px; background:var(--cream2); cursor:pointer; border:1.5px solid transparent; transition:all 0.15s; display:flex; align-items:center; gap:8px; font-weight:500; }
  .payment-chip.selected { background:var(--gold-light); border-color:var(--gold); color:#7a5c10; }
  .datetime-badge { background:rgba(201,168,76,0.1); border:1px solid rgba(201,168,76,0.3); border-radius:10px; padding:8px 14px; font-size:13px; color:var(--gold); font-weight:600; display:inline-flex; align-items:center; gap:6px; }
  .suspended-banner { background:#fdecea; border:1px solid #f5c6cb; color:var(--red); padding:14px 20px; border-radius:12px; text-align:center; font-weight:600; margin-bottom:20px; }
  .service-summary { background:var(--cream2); border-radius:10px; padding:14px 16px; margin-top:8px; }
  .service-summary-row { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; }
  .service-summary-total { display:flex; justify-content:space-between; font-weight:700; font-size:15px; padding-top:8px; margin-top:8px; border-top:1px solid var(--border); color:var(--gold); }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
  .fade-in { animation:fadeIn 0.3s ease; }
  .pop-in { animation:popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275); }
  @media (max-width: 768px) {
    .mobile-header { display:flex; }
    .sidebar { transform:translateX(-100%); z-index:300; }
    .sidebar.open { transform:translateX(0); box-shadow:0 0 40px rgba(0,0,0,0.5); }
    .sidebar-overlay { z-index:299; }
    .sidebar-overlay.open { display:block; }
    .main { margin-left:0 !important; padding:72px 12px 24px; width:100%; max-width:100vw; overflow-x:hidden; }
    .stats-grid { grid-template-columns:1fr 1fr; }
    .grid-2 { grid-template-columns:1fr; }
    .modal { padding:24px 16px; border-radius:20px 20px 0 0; max-width:100vw; }
    .modal-overlay { align-items:flex-end; padding:0; }
    .revenue-total { flex-direction:column; gap:8px; }
    .page-header h1 { font-size:20px; }
    .flex-between { flex-direction:row; }
    .client-card { flex-direction:column; align-items:flex-start; }
    table { min-width:480px; font-size:12px; }
    thead th, tbody td { padding:8px 10px; }
    .card { padding:16px; }
    .card-title { font-size:15px; }
    .stat-value { font-size:20px; }
    .btn { font-size:13px; padding:10px 16px; }
    .btn-sm { padding:6px 10px; font-size:11px; }
    .id-badge { width:36px; height:24px; font-size:11px; }
    .chips { gap:6px; }
    .chip { font-size:12px; padding:5px 10px; }
    .payment-methods { grid-template-columns:1fr 1fr; }
  }
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns:1fr 1fr; }
    .main { padding:68px 10px 20px; }
    .modal { padding:20px 12px; }
    .id-reveal-number { font-size:52px; }
  }
`;

// ===================== APP =====================
function BarberOS() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage]               = useState("dashboard");
  const [msg, setMsg]                 = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const init = async () => {
      const existing = await fbGet("users/superadmin");
      if (!existing) {
        await fbSet("users/superadmin", {
          id: "superadmin", username: "admin", password: "admin123",
          role: "superadmin", name: "Super Admin", active: true
        });
      }
      const saved = localStorage.getItem("barberos_session");
      if (saved) {
        try {
          const sess = JSON.parse(saved);
          const users = await fbGet("users");
          if (users) {
            const user = Object.values(users).find(u => u.id === sess.id && u.username === sess.username);
            if (user && user.active !== false) setCurrentUser(user);
          }
        } catch(e) {}
      }
      setLoading(false);
    };
    init();
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleLogin = (user, remember) => {
    setCurrentUser(user);
    if (remember) localStorage.setItem("barberos_session", JSON.stringify({ id: user.id, username: user.username }));
  };

  const handleLogout = () => {
    localStorage.removeItem("barberos_session");
    setCurrentUser(null);
    setPage("dashboard");
  };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="loading-screen">
        <h2>✂️ BarberOS</h2>
        <div className="spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    </>
  );

  if (!currentUser) return (<><style>{css}</style><AuthPage onLogin={handleLogin} /></>);

  return (
    <>
      <style>{css}</style>
      <div className="app layout fade-in">
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>✂️ BarberOS</h2>
        </div>
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar user={currentUser} page={page} setPage={(p) => { setPage(p); setSidebarOpen(false); }} onLogout={handleLogout} isOpen={sidebarOpen} />
        <main className="main">
          {msg && <div className={msg.type === "error" ? "error-msg" : "success-msg"} style={{ marginBottom: 20 }}>{msg.text}</div>}
          {page === "dashboard"     && <DashboardPage user={currentUser} />}
          {page === "clients"       && <ClientsPage user={currentUser} showMsg={showMsg} />}
          {page === "services"      && <ServicesPage user={currentUser} showMsg={showMsg} />}
          {page === "subscriptions" && <SubscriptionsPage user={currentUser} showMsg={showMsg} />}
          {page === "barbers"       && (currentUser.role === "owner" || currentUser.role === "manager") && <BarbersPage user={currentUser} showMsg={showMsg} />}
          {page === "sessions"      && <SessionsPage user={currentUser} showMsg={showMsg} />}
          {page === "revenue"       && (currentUser.role === "owner" || currentUser.role === "superadmin") && <RevenuePage user={currentUser} />}
          {page === "shops"         && currentUser.role === "superadmin" && <ShopsPage showMsg={showMsg} />}
          {page === "users"         && currentUser.role === "superadmin" && <UsersPage showMsg={showMsg} />}
          {page === "settings"      && <SettingsPage user={currentUser} showMsg={showMsg} />}
        </main>
      </div>
    </>
  );
}

// ===================== AUTH =====================
function AuthPage({ onLogin }) {
  const [tab, setTab]       = useState("login");
  const [form, setForm]     = useState({ username:"", password:"", shopName:"", ownerName:"" });
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const h = (f, v) => setForm(x => ({ ...x, [f]: v }));

  const login = async () => {
    setErr(""); setLoading(true);
    try {
      const users = await fbGet("users");
      if (!users) { setErr("لا يوجد مستخدمين"); setLoading(false); return; }
      const user = Object.values(users).find(u => u.username === form.username && u.password === form.password);
      if (!user) { setErr("اسم المستخدم أو كلمة المرور غلط"); setLoading(false); return; }
      if (user.pending === true) { setErr("حسابك في انتظار موافقة الإدارة ⏳"); setLoading(false); return; }
      if (user.active === false) { setErr("هذا الحساب موقوف. تواصل مع الإدارة."); setLoading(false); return; }
      onLogin(user, remember);
    } catch(e) { setErr("حدث خطأ، حاول تاني"); }
    setLoading(false);
  };

  const signup = async () => {
    setErr(""); setLoading(true);
    if (!form.shopName || !form.username || !form.password || !form.ownerName) { setErr("ارجاء ملء كل الحقول"); setLoading(false); return; }
    try {
      const users = await fbGet("users");
      const userList = users ? Object.values(users) : [];
      if (userList.find(u => u.username === form.username)) { setErr("اسم المستخدم موجود بالفعل"); setLoading(false); return; }
      const shopId = "shop_" + Date.now();
      const userId = "u_" + Date.now();
      await fbSet(`shops/${shopId}`, { id:shopId, name:form.shopName, ownerName:form.ownerName, createdAt:today(), active:false, pending:true });
      const newUser = { id:userId, username:form.username, password:form.password, role:"owner", name:form.ownerName, shopId, active:false, pending:true };
      await fbSet(`users/${userId}`, newUser);
      setTab("login");
      setErr("");
      setForm(x => ({ ...x, username:"", password:"" }));
    } catch(e) { setErr("حدث خطأ، حاول تاني"); }
    setLoading(false);
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
          <button className={`auth-tab ${tab==="login"?"active":""}`} onClick={() => setTab("login")}>تسجيل الدخول</button>
          <button className={`auth-tab ${tab==="signup"?"active":""}`} onClick={() => setTab("signup")}>محل جديد</button>
        </div>
        {err && <div className="error-msg">{err}</div>}
        {tab === "login" ? (
          <>
            <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e=>h("username",e.target.value)} placeholder="username" /></div>
            <div className="form-group"><label>كلمة المرور</label><input type="password" value={form.password} onChange={e=>h("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} /></div>
            <label className="remember-row"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />ابقى متسجل على الجهاز ده</label>
            <button className="btn btn-primary btn-full" onClick={login} disabled={loading}>{loading?"جاري الدخول...":"دخول →"}</button>
          </>
        ) : (
          <>
            <div className="form-group"><label>اسم الصالون</label><input value={form.shopName} onChange={e=>h("shopName",e.target.value)} /></div>
            <div className="form-group"><label>اسم صاحب الصالون</label><input value={form.ownerName} onChange={e=>h("ownerName",e.target.value)} /></div>
            <div className="grid-2">
              <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e=>h("username",e.target.value)} /></div>
              <div className="form-group"><label>كلمة المرور</label><input type="password" value={form.password} onChange={e=>h("password",e.target.value)} /></div>
            </div>
            <label className="remember-row"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />ابقى متسجل على الجهاز ده</label>
            <button className="btn btn-gold btn-full" onClick={signup} disabled={loading}>{loading?"جاري الإنشاء...":"إنشاء الصالون ✂️"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== SIDEBAR =====================
function Sidebar({ user, page, setPage, onLogout, isOpen }) {
  const ownerNav = [
    { id:"dashboard",     icon:"📊", label:"لوحة التحكم" },
    { id:"clients",       icon:"👥", label:"العملاء" },
    { id:"services",      icon:"✂️", label:"الخدمات والأسعار" },
    { id:"subscriptions", icon:"🎫", label:"الاشتراكات" },
    { id:"barbers",       icon:"👤", label:"الحلاقين والمديرين" },
    { id:"sessions",      icon:"📋", label:"سجل الجلسات" },
    { id:"revenue",       icon:"💰", label:"الإيرادات" },
    { id:"settings",      icon:"⚙️", label:"الإعدادات" },
  ];
  const managerNav = [
    { id:"dashboard",     icon:"📊", label:"لوحة التحكم" },
    { id:"clients",       icon:"👥", label:"العملاء" },
    { id:"subscriptions", icon:"🎫", label:"الاشتراكات" },
    { id:"barbers",       icon:"👤", label:"الحلاقين" },
    { id:"sessions",      icon:"📋", label:"سجل الجلسات" },
    { id:"settings",      icon:"⚙️", label:"الإعدادات" },
  ];
  const nav = user.role==="superadmin"
    ? [{id:"dashboard",icon:"📊",label:"لوحة التحكم"},{id:"shops",icon:"🏪",label:"الصالونات"},{id:"users",icon:"👥",label:"إدارة المستخدمين"},{id:"settings",icon:"⚙️",label:"الإعدادات"}]
    : user.role==="owner" ? ownerNav
    : user.role==="manager" ? managerNav
    : [{id:"sessions",icon:"📋",label:"تسجيل جلسة"},{id:"dashboard",icon:"📊",label:"إحصائياتي"},{id:"settings",icon:"⚙️",label:"الإعدادات"}];
  const roleLabel = {superadmin:"Super Admin",owner:"صاحب الصالون",manager:"مدير",barber:"حلاق"}[user.role];

  return (
    <aside className={`sidebar ${isOpen?"open":""}`}>
      <div className="sidebar-logo"><h2>✂️ BarberOS</h2><p>Management System</p></div>
      <div className="sidebar-user">
        <span className={`role-badge role-${user.role}`}>{roleLabel}</span>
        <p>{user.name}</p>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <div key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={() => setPage(item.id)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="btn btn-outline btn-full btn-sm" style={{color:"rgba(255,255,255,0.5)",borderColor:"rgba(255,255,255,0.1)"}} onClick={onLogout}>⎋ تسجيل الخروج</button>
      </div>
    </aside>
  );
}

// ===================== CLIENTS =====================
function ClientsPage({ user, showMsg }) {
  const [clients, setClients] = useState([]);
  const [modal, setModal]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [newClient, setNewClient] = useState({ name:"", phone:"" });
  const [search, setSearch]   = useState("");
  const [justCreated, setJustCreated] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `clients_${user.shopId}`), snap => {
      setClients(snap.exists() ? Object.values(snap.val()) : []);
    });
    return () => unsub();
  }, []);

  const addClient = async () => {
    if (!newClient.name.trim()) { showMsg("ارجاء اكتب اسم العميل","error"); return; }
    const existingIds = clients.map(c=>c.id);
    const id = generateId(existingIds);
    const client = { id, name:newClient.name.trim(), phone:newClient.phone.trim(), createdAt:today() };
    await fbSet(`clients_${user.shopId}/${id}`, client);
    setJustCreated(client);
    setNewClient({name:"",phone:""});
    setModal("created");
    showMsg(`تم تسجيل العميل ✓ — ID: ${id}`);
  };

  const deleteClient = async (id) => {
    if (!window.confirm("هتحذف العميل ده؟")) return;
    await remove(ref(db, `clients_${user.shopId}/${id}`));
    showMsg("تم الحذف");
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.id?.includes(search) || c.phone?.includes(search)
  );

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>العملاء</h1><p>{clients.length} عميل مسجل</p></div>
        <button className="btn btn-primary" onClick={() => { setNewClient({name:"",phone:""}); setModal("add"); }}>+ عميل جديد</button>
      </div>
      <div className="card mb-24">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو ID أو رقم التليفون..." />
        </div>
      </div>
      {filtered.length===0
        ? <EmptyState icon="👥" text={search?"مفيش نتايج":"لا يوجد عملاء بعد"} />
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map(c => {
              const initials = c.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
              return (
                <div key={c.id} className="client-card">
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div className="client-avatar">{initials}</div>
                    <div>
                      <div className="font-bold" style={{fontSize:15}}>{c.name}</div>
                      <div className="text-sm text-muted">{c.phone||"بدون رقم"} · {c.createdAt}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span className="id-badge">{c.id}</span>
                    <button className="btn btn-outline btn-sm" onClick={()=>{setSelected(c);setModal("view");}}>عرض</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>deleteClient(c.id)}>حذف</button>
                  </div>
                </div>
              );
            })}
          </div>}
      {modal==="add" && (
        <Modal title="تسجيل عميل جديد" onClose={()=>setModal(null)}>
          <div className="form-group"><label>اسم العميل</label><input value={newClient.name} onChange={e=>setNewClient(x=>({...x,name:e.target.value}))} autoFocus /></div>
          <div className="form-group"><label>رقم التليفون (اختياري)</label><input value={newClient.phone} onChange={e=>setNewClient(x=>({...x,phone:e.target.value}))} /></div>
          <div className="flex-gap">
            <button className="btn btn-primary" style={{flex:1}} onClick={addClient}>تسجيل وإظهار الـ ID</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
      {modal==="created" && justCreated && (
        <Modal title="" onClose={()=>setModal(null)}>
          <div className="id-reveal pop-in">
            <div className="id-reveal-label">ID العميل</div>
            <div className="id-reveal-number">{justCreated.id}</div>
            <div className="id-reveal-name">{justCreated.name}</div>
          </div>
          <button className="btn btn-primary btn-full" onClick={()=>setModal(null)}>تمام ✓</button>
        </Modal>
      )}
      {modal==="view" && selected && (
        <Modal title="بيانات العميل" onClose={()=>setModal(null)}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <div className="client-avatar" style={{width:56,height:56,fontSize:22}}>
              {selected.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold font-serif" style={{fontSize:20}}>{selected.name}</div>
              <div className="text-sm text-muted">{selected.phone||"بدون رقم"}</div>
            </div>
            <span className="id-badge" style={{marginLeft:"auto"}}>{selected.id}</span>
          </div>
          <button className="btn btn-outline btn-full" onClick={()=>setModal(null)}>إغلاق</button>
        </Modal>
      )}
    </div>
  );
}

// ===================== SERVICES =====================
function ServicesPage({ user, showMsg }) {
  const [services, setServices] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ name:"", price:"", duration:"", editId:null });

  useEffect(() => {
    const unsub = onValue(ref(db, `shops/${user.shopId}/services`), snap => {
      setServices(snap.exists() ? Object.values(snap.val()) : []);
    });
    return () => unsub();
  }, []);

  const save = async () => {
    if (!form.name || !form.price) { showMsg("ارجاء ملء الاسم والسعر","error"); return; }
    const id = form.editId || "srv_" + Date.now();
    await fbSet(`shops/${user.shopId}/services/${id}`, { id, name:form.name, price:Number(form.price), duration:form.duration });
    setModal(null);
    showMsg("تم الحفظ ✓");
  };

  const del = async (id) => {
    await remove(ref(db, `shops/${user.shopId}/services/${id}`));
    showMsg("تم الحذف");
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الخدمات والأسعار</h1></div>
        <button className="btn btn-primary" onClick={()=>{setForm({name:"",price:"",duration:"",editId:null});setModal("form");}}>+ إضافة خدمة</button>
      </div>
      <div className="card">
        {services.length===0 ? <EmptyState icon="✂️" text="لا يوجد خدمات بعد" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>الخدمة</th><th>السعر</th><th>المدة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {services.map((s,i) => (
                  <tr key={s.id}>
                    <td className="text-muted">{i+1}</td>
                    <td className="font-bold">{s.name}</td>
                    <td><span className="badge badge-gold">{s.price} جنيه</span></td>
                    <td className="text-muted">{s.duration||"—"}</td>
                    <td><div className="flex-gap">
                      <button className="btn btn-outline btn-sm" onClick={()=>{setForm({name:s.name,price:s.price,duration:s.duration||"",editId:s.id});setModal("form");}}>تعديل</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}>حذف</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal==="form" && (
        <Modal title={form.editId?"تعديل الخدمة":"إضافة خدمة"} onClose={()=>setModal(null)}>
          <div className="form-group"><label>اسم الخدمة</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div className="grid-2">
            <div className="form-group"><label>السعر</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
            <div className="form-group"><label>المدة</label><input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="30 دقيقة" /></div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={save}>حفظ</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== SUBSCRIPTIONS =====================
const isSubActive = (s) => {
  if (!s) return false;
  if (s.remaining <= 0) return false;
  const expiry = new Date(s.startDate);
  expiry.setDate(expiry.getDate() + (s.durationDays || 30));
  return new Date(today()) <= expiry;
};

const subStatus = (s) => {
  if (s.remaining <= 0) return { label:"استنفذت الجلسات", cls:"badge-red" };
  const expiry = new Date(s.startDate);
  expiry.setDate(expiry.getDate() + (s.durationDays || 30));
  if (new Date(today()) > expiry) return { label:"انتهت المدة", cls:"badge-red" };
  const daysLeft = Math.ceil((expiry - new Date(today())) / 86400000);
  return { label:`نشط — ${daysLeft} يوم`, cls:"badge-green" };
};

function SubscriptionsPage({ user, showMsg }) {
  const [plans, setPlans]     = useState([]);
  const [subs, setSubs]       = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal]     = useState(null);
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState({ clientId:"", planId:"", payStatus:"full", paidAmount:"", paymentMethod:"cash" });
  const [planForm, setPlanForm] = useState({ name:"", price:"", sessions:"", durationDays:"30", editId:null });
  const [visitForm, setVisitForm] = useState({ subId:"", note:"", paid:false, paymentMethod:"cash" });
  const [debtModal, setDebtModal] = useState(null);
  const [debtForm, setDebtForm]   = useState({ amount:"", paymentMethod:"cash" });

  useEffect(() => {
    const u1 = onValue(ref(db,`shops/${user.shopId}/subscriptionPlans`), snap=>setPlans(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,`subs_${user.shopId}`), snap=>setSubs(snap.exists()?Object.values(snap.val()):[]));
    const u3 = onValue(ref(db,`clients_${user.shopId}`), snap=>setClients(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); u3(); };
  }, []);

  const savePlan = async () => {
    if (!planForm.name||!planForm.price||!planForm.sessions||!planForm.durationDays) { showMsg("ارجاء ملء كل الحقول","error"); return; }
    const id = planForm.editId || "plan_"+Date.now();
    await fbSet(`shops/${user.shopId}/subscriptionPlans/${id}`, {
      id, name:planForm.name, price:Number(planForm.price),
      sessions:Number(planForm.sessions), durationDays:Number(planForm.durationDays)
    });
    setModal(null); setPlanForm({name:"",price:"",sessions:"",durationDays:"30",editId:null});
    showMsg("تم حفظ الباقة ✓");
  };

  const addSub = async () => {
    if (!form.planId||!form.clientId) { showMsg("اختار العميل والباقة","error"); return; }
    const plan   = plans.find(p=>p.id===form.planId);
    const client = clients.find(c=>c.id===form.clientId);
    const paid   = form.payStatus==="full" ? plan.price : form.payStatus==="partial" ? Number(form.paidAmount||0) : 0;
    const debt   = plan.price - paid;
    const id = "sub_"+Date.now();
    await fbSet(`subs_${user.shopId}/${id}`, {
      id, clientId:client.id, clientName:client.name, phone:client.phone||"",
      planId:form.planId, planName:plan.name, price:plan.price,
      paidAmount:paid, debtAmount:debt,
      paymentMethod: paid>0 ? form.paymentMethod : null,
      totalSessions:plan.sessions, remaining:plan.sessions,
      durationDays:plan.durationDays||30,
      startDate:today(), createdAt:today()
    });
    if (paid > 0) {
      const sessId = "sess_"+Date.now();
      await fbSet(`sessions_${user.shopId}/${sessId}`, {
        id:sessId, date:today(), time:getTime(),
        serviceNames:`اشتراك — ${plan.name}`,
        barberId:user.id, barberName:user.name,
        amount:paid, paymentMethod:form.paymentMethod,
        clientId:client.id, clientName:client.name,
        isSubscriptionPayment:true
      });
    }
    setModal(null); setForm({clientId:"",planId:"",payStatus:"full",paidAmount:"",paymentMethod:"cash"});
    showMsg(debt>0 ? `تم الاشتراك ✓ — متبقي ${debt} ج دين` : "تم الاشتراك ودفع كامل ✓");
  };

  const payDebt = async () => {
    const amount = Number(debtForm.amount);
    if (!amount || amount <= 0) { showMsg("اكتب المبلغ","error"); return; }
    if (amount > debtModal.debtAmount) { showMsg(`أقصى مبلغ هو ${debtModal.debtAmount} ج`,"error"); return; }
    const newDebt = debtModal.debtAmount - amount;
    const newPaid = (debtModal.paidAmount||0) + amount;
    await update(ref(db,`subs_${user.shopId}/${debtModal.id}`), { debtAmount:newDebt, paidAmount:newPaid });
    const sessId = "sess_"+Date.now();
    await fbSet(`sessions_${user.shopId}/${sessId}`, {
      id:sessId, date:today(), time:getTime(),
      serviceNames:`تسديد دين — ${debtModal.planName}`,
      barberId:user.id, barberName:user.name,
      amount, paymentMethod:debtForm.paymentMethod,
      clientId:debtModal.clientId, clientName:debtModal.clientName,
      isDebtPayment:true
    });
    setDebtModal(null); setDebtForm({amount:"",paymentMethod:"cash"});
    showMsg(newDebt===0 ? "تم تسديد الدين كامل ✓" : `تم تسجيل ${amount} ج — متبقي دين ${newDebt} ج`);
  };

  const registerVisit = async () => {
    if (!visitForm.subId) { showMsg("اختار الاشتراك","error"); return; }
    const sub = subs.find(s=>s.id===visitForm.subId);
    if (!isSubActive(sub)) { showMsg("الاشتراك منتهي","error"); return; }
    await update(ref(db,`subs_${user.shopId}/${sub.id}`), { remaining: sub.remaining - 1 });
    const sessId = "sess_"+Date.now();
    await fbSet(`sessions_${user.shopId}/${sessId}`, {
      id:sessId, date:today(), time:getTime(),
      serviceNames: visitForm.paid ? "زيارة اشتراك (دفع إضافي)" : "زيارة اشتراك",
      barberId:user.id, barberName:user.name,
      amount: visitForm.paid ? (visitForm.extraAmount||0) : 0,
      paymentMethod: visitForm.paid ? visitForm.paymentMethod : "subscription",
      clientNote: visitForm.note,
      clientId:sub.clientId, clientName:sub.clientName,
      subId:sub.id, isSubscriptionVisit:true
    });
    setModal(null); setVisitForm({subId:"",note:"",paid:false,paymentMethod:"cash",extraAmount:""});
    showMsg(`تم تسجيل الزيارة ✓ — متبقي ${sub.remaining-1} جلسة`);
  };

  const activeSubs  = subs.filter(s=>isSubActive(s));
  const filtered    = subs.filter(s=>
    s.clientName?.toLowerCase().includes(search.toLowerCase())||s.clientId?.includes(search)
  ).slice().reverse();

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الاشتراكات</h1></div>
        <div className="flex-gap">
          <button className="btn btn-success btn-sm" onClick={()=>setModal("visit")}>✓ تسجيل زيارة</button>
          <button className="btn btn-outline btn-sm" onClick={()=>{setPlanForm({name:"",price:"",sessions:"",durationDays:"30",editId:null});setModal("plan");}}>+ باقة</button>
          <button className="btn btn-primary" onClick={()=>setModal("add")}>+ اشتراك جديد</button>
        </div>
      </div>

      {plans.length>0 && (
        <div className="card mb-24">
          <div className="card-title">🎫 الباقات</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {plans.map(p=>(
              <div key={p.id} className="card" style={{flex:"0 0 auto",minWidth:140,padding:"14px 18px",textAlign:"center"}}>
                <div className="font-bold">{p.name}</div>
                <div className="font-serif" style={{fontSize:22,color:"var(--gold)"}}>{p.price} ج</div>
                <div className="text-xs text-muted">{p.sessions} جلسة</div>
                <div className="text-xs text-muted">{p.durationDays||30} يوم</div>
                <div className="flex-gap" style={{marginTop:8,justifyContent:"center"}}>
                  <button className="btn btn-outline btn-sm" onClick={()=>{setPlanForm({name:p.name,price:p.price,sessions:p.sessions,durationDays:p.durationDays||30,editId:p.id});setModal("plan");}}>تعديل</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>remove(ref(db,`shops/${user.shopId}/subscriptionPlans/${p.id}`))}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid mb-24" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <StatCard icon="✅" value={activeSubs.length} label="اشتراك نشط" cls="stat-green" />
        <StatCard icon="👥" value={subs.length} label="إجمالي الاشتراكات" cls="stat-gold" />
        <StatCard icon="💰" value={`${subs.reduce((s,x)=>s+x.price,0)} ج`} label="إجمالي الإيراد" cls="stat-blue" />
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{marginBottom:0}}>سجل الاشتراكات</div>
          <div className="search-wrap" style={{width:220}}>
            <span className="search-icon">🔍</span>
            <input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." />
          </div>
        </div>
        {filtered.length===0 ? <EmptyState icon="🎫" text="لا يوجد اشتراكات" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>العميل</th><th>الباقة</th><th>الجلسات</th><th>الدفع</th><th>تاريخ البدء</th><th>الحالة</th></tr></thead>
              <tbody>
                {filtered.map(s=>{
                  const st = subStatus(s);
                  return (
                    <tr key={s.id}>
                      <td><span className="id-badge">{s.clientId}</span></td>
                      <td className="font-bold">{s.clientName}</td>
                      <td>{s.planName}<div className="text-xs text-muted">{s.price} ج · {s.durationDays||30} يوم</div></td>
                      <td>
                        <span className={`font-bold ${s.remaining===0?"text-red":"text-green"}`}>{s.remaining}</span>
                        <span className="text-xs text-muted"> / {s.totalSessions}</span>
                      </td>
                      <td>
                        <span className="badge badge-green">{s.paidAmount||s.price} ج</span>
                        {s.debtAmount>0 && (
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                            <span className="text-xs text-red">دين: {s.debtAmount} ج</span>
                            <button className="btn btn-warning btn-sm" style={{padding:"3px 8px",fontSize:11}} onClick={()=>{setDebtModal(s);setDebtForm({amount:s.debtAmount,paymentMethod:"cash"});}}>
                              سدّد
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="text-muted text-sm">{s.startDate}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {debtModal && (
        <Modal title="تسديد دين" onClose={()=>setDebtModal(null)}>
          <div style={{background:"var(--cream2)",borderRadius:12,padding:"14px 18px",marginBottom:20}}>
            <div className="font-bold">{debtModal.clientName}</div>
            <div className="text-sm text-muted">{debtModal.planName}</div>
            <div style={{marginTop:8,display:"flex",gap:16}}>
              <div><div className="text-xs text-muted">إجمالي الباقة</div><div className="font-bold">{debtModal.price} ج</div></div>
              <div><div className="text-xs text-muted">دفع قبل كده</div><div className="font-bold text-green">{debtModal.paidAmount||0} ج</div></div>
              <div><div className="text-xs text-muted">الدين المتبقي</div><div className="font-bold text-red">{debtModal.debtAmount} ج</div></div>
            </div>
          </div>
          <div className="form-group">
            <label>المبلغ اللي هيدفعه دلوقتي</label>
            <input type="number" value={debtForm.amount} onChange={e=>setDebtForm(f=>({...f,amount:e.target.value}))} max={debtModal.debtAmount} />
            <div className="chips" style={{marginTop:8}}>
              <div className={`chip ${Number(debtForm.amount)===debtModal.debtAmount?"selected":""}`} onClick={()=>setDebtForm(f=>({...f,amount:debtModal.debtAmount}))}>كله — {debtModal.debtAmount} ج</div>
            </div>
          </div>
          <div className="form-group">
            <label>طريقة الدفع</label>
            <div className="payment-methods">
              {PAYMENT_METHODS.map(pm=>(
                <div key={pm.id} className={`payment-chip ${debtForm.paymentMethod===pm.id?"selected":""}`} onClick={()=>setDebtForm(f=>({...f,paymentMethod:pm.id}))}>
                  {pm.icon} {pm.label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={payDebt}>تسجيل الدفع ✓</button>
            <button className="btn btn-outline" onClick={()=>setDebtModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}

      {modal==="visit" && (
        <Modal title="✓ تسجيل زيارة اشتراك" onClose={()=>setModal(null)}>
          <div className="form-group">
            <label>اختار الزبون (الاشتراكات النشطة)</label>
            {activeSubs.length===0
              ? <p className="text-sm text-red">لا يوجد اشتراكات نشطة حالياً</p>
              : <select value={visitForm.subId} onChange={e=>setVisitForm(f=>({...f,subId:e.target.value}))}>
                  <option value="">— اختار —</option>
                  {activeSubs.map(s=><option key={s.id} value={s.id}>#{s.clientId} {s.clientName} — {s.planName} ({s.remaining} جلسة متبقية)</option>)}
                </select>}
          </div>
          <div className="form-group"><label>ملاحظة (اختياري)</label><input value={visitForm.note} onChange={e=>setVisitForm(f=>({...f,note:e.target.value}))} placeholder="مثلاً: قصة + لحية" /></div>
          <div className="form-group">
            <label>دفع إضافي؟</label>
            <div className="chips">
              <div className={`chip ${!visitForm.paid?"selected":""}`} onClick={()=>setVisitForm(f=>({...f,paid:false}))}>لأ — مشترك بالفعل</div>
              <div className={`chip ${visitForm.paid?"selected":""}`} onClick={()=>setVisitForm(f=>({...f,paid:true}))}>أيوه — دفع إضافي</div>
            </div>
          </div>
          {visitForm.paid && (
            <>
              <div className="form-group"><label>المبلغ الإضافي</label><input type="number" value={visitForm.extraAmount||""} onChange={e=>setVisitForm(f=>({...f,extraAmount:Number(e.target.value)}))} /></div>
              <div className="form-group">
                <label>طريقة الدفع</label>
                <div className="payment-methods">
                  {PAYMENT_METHODS.map(pm=>(
                    <div key={pm.id} className={`payment-chip ${visitForm.paymentMethod===pm.id?"selected":""}`} onClick={()=>setVisitForm(f=>({...f,paymentMethod:pm.id}))}>
                      {pm.icon} {pm.label}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="flex-gap mt-16">
            <button className="btn btn-success" style={{flex:1}} onClick={registerVisit} disabled={!visitForm.subId}>تسجيل الزيارة ✓</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}

      {modal==="add" && (
        <Modal title="إضافة اشتراك" onClose={()=>setModal(null)}>
          <div className="form-group">
            <label>العميل</label>
            <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))}>
              <option value="">— اختار عميل —</option>
              {clients.map(c=><option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>الباقة</label>
            {plans.length===0
              ? <p className="text-sm text-red">أضف باقة أولاً</p>
              : <div className="chips">
                  {plans.map(p=>(
                    <div key={p.id} className={`chip ${form.planId===p.id?"selected":""}`} onClick={()=>setForm(f=>({...f,planId:p.id}))}>
                      {p.name} — {p.price}ج ({p.sessions} جلسة / {p.durationDays||30} يوم)
                    </div>
                  ))}
                </div>}
          </div>
          {form.planId && (
            <>
              <div className="form-group">
                <label>حالة الدفع</label>
                <div className="chips">
                  <div className={`chip ${form.payStatus==="full"?"selected":""}`} onClick={()=>setForm(f=>({...f,payStatus:"full",paidAmount:""}))}>
                    💰 دفع كامل — {plans.find(p=>p.id===form.planId)?.price} ج
                  </div>
                  <div className={`chip ${form.payStatus==="partial"?"selected":""}`} onClick={()=>setForm(f=>({...f,payStatus:"partial"}))}>
                    💸 دفع جزئي
                  </div>
                  <div className={`chip ${form.payStatus==="none"?"selected":""}`} onClick={()=>setForm(f=>({...f,payStatus:"none",paidAmount:""}))}>
                    ⏳ لسه مدفعش
                  </div>
                </div>
              </div>
              {form.payStatus==="partial" && (
                <div className="form-group">
                  <label>المبلغ المدفوع</label>
                  <input type="number" value={form.paidAmount} onChange={e=>setForm(f=>({...f,paidAmount:e.target.value}))}
                    placeholder={`من ${plans.find(p=>p.id===form.planId)?.price} ج`} />
                  {form.paidAmount && (
                    <div style={{marginTop:8,padding:"8px 12px",background:"var(--cream2)",borderRadius:8,fontSize:13}}>
                      دفع: <strong>{form.paidAmount} ج</strong> — متبقي: <strong className="text-red">{plans.find(p=>p.id===form.planId)?.price - Number(form.paidAmount)} ج</strong>
                    </div>
                  )}
                </div>
              )}
              {form.payStatus !== "none" && (
                <div className="form-group">
                  <label>طريقة الدفع</label>
                  <div className="payment-methods">
                    {PAYMENT_METHODS.map(pm=>(
                      <div key={pm.id} className={`payment-chip ${form.paymentMethod===pm.id?"selected":""}`} onClick={()=>setForm(f=>({...f,paymentMethod:pm.id}))}>
                        {pm.icon} {pm.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={addSub} disabled={!form.planId||!form.clientId}>تأكيد</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}

      {modal==="plan" && (
        <Modal title={planForm.editId?"تعديل الباقة":"إضافة باقة"} onClose={()=>setModal(null)}>
          <div className="form-group"><label>اسم الباقة</label><input value={planForm.name} onChange={e=>setPlanForm(f=>({...f,name:e.target.value}))} /></div>
          <div className="grid-2">
            <div className="form-group"><label>السعر (جنيه)</label><input type="number" value={planForm.price} onChange={e=>setPlanForm(f=>({...f,price:e.target.value}))} /></div>
            <div className="form-group"><label>عدد الجلسات</label><input type="number" value={planForm.sessions} onChange={e=>setPlanForm(f=>({...f,sessions:e.target.value}))} /></div>
          </div>
          <div className="form-group">
            <label>مدة الاشتراك (أيام)</label>
            <div className="chips">
              {[7,14,30,60,90].map(d=>(
                <div key={d} className={`chip ${planForm.durationDays==d?"selected":""}`} onClick={()=>setPlanForm(f=>({...f,durationDays:d}))}>
                  {d===7?"أسبوع":d===14?"أسبوعين":d===30?"شهر":d===60?"شهرين":"3 شهور"}
                </div>
              ))}
            </div>
            <input type="number" style={{marginTop:8}} value={planForm.durationDays} onChange={e=>setPlanForm(f=>({...f,durationDays:e.target.value}))} placeholder="أو اكتب عدد الأيام يدوياً" />
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-gold" style={{flex:1}} onClick={savePlan}>حفظ</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== BARBERS =====================
function BarbersPage({ user, showMsg }) {
  const [staff, setStaff]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm]     = useState({ name:"", username:"", password:"", role:"barber" });
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const u1 = onValue(ref(db,"users"), snap => {
      if (snap.exists()) setStaff(Object.values(snap.val()).filter(u=>(u.role==="barber"||u.role==="manager")&&u.shopId===user.shopId));
    });
    const u2 = onValue(ref(db,`sessions_${user.shopId}`), snap=>setSessions(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); };
  }, []);

  const saveStaff = async () => {
    if (!form.name||!form.username) { showMsg("ارجاء ملء كل الحقول","error"); return; }
    if (editUser) {
      const upd = { name:form.name, username:form.username, role:form.role };
      if (form.password) upd.password = form.password;
      await update(ref(db,`users/${editUser.id}`), upd);
      showMsg("تم التعديل ✓");
    } else {
      if (!form.password) { showMsg("ارجاء اكتب كلمة مرور","error"); return; }
      const users = await fbGet("users");
      if (users && Object.values(users).find(u=>u.username===form.username)) { showMsg("اسم المستخدم موجود","error"); return; }
      const id = "b_"+Date.now();
      await fbSet(`users/${id}`, { id, username:form.username, password:form.password, role:form.role, name:form.name, shopId:user.shopId, active:true });
      showMsg("تم الإضافة ✓");
    }
    setModal(false); setEditUser(null); setForm({name:"",username:"",password:"",role:"barber"});
  };

  const toggleActive = async (uid, current) => {
    await update(ref(db,`users/${uid}`), { active:!current });
    showMsg(!current?"تم التفعيل ✓":"تم التعطيل");
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>الحلاقين والمديرين</h1></div>
        <button className="btn btn-primary" onClick={()=>{setEditUser(null);setForm({name:"",username:"",password:"",role:"barber"});setModal(true);}}>+ إضافة</button>
      </div>
      <div className="card">
        {staff.length===0 ? <EmptyState icon="👤" text="لا يوجد موظفين" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>اليوم</th><th>الشهر</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {staff.map(b => {
                  const active = b.active!==false;
                  const todayC = sessions.filter(s=>s.barberId===b.id&&s.date===today()).length;
                  const monthC = sessions.filter(s=>s.barberId===b.id&&s.date?.startsWith(thisMonth())).length;
                  return (
                    <tr key={b.id}>
                      <td className="font-bold">{b.name}</td>
                      <td><span className={`badge ${b.role==="manager"?"badge-purple":"badge-blue"}`}>{b.role==="manager"?"مدير":"حلاق"}</span></td>
                      <td className="text-muted">{b.username}</td>
                      <td><span className="badge badge-gold">{todayC}</span></td>
                      <td><span className="badge badge-blue">{monthC}</span></td>
                      <td><span className={`badge ${active?"badge-green":"badge-red"}`}>{active?"نشط":"موقوف"}</span></td>
                      <td><div className="flex-gap">
                        <button className="btn btn-outline btn-sm" onClick={()=>{setEditUser(b);setForm({name:b.name,username:b.username,password:"",role:b.role});setModal(true);}}>تعديل</button>
                        <button className={`btn btn-sm ${active?"btn-warning":"btn-success"}`} onClick={()=>toggleActive(b.id,active)}>{active?"تعطيل":"تفعيل"}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title={editUser?"تعديل الموظف":"إضافة موظف"} onClose={()=>{setModal(false);setEditUser(null);}}>
          <div className="form-group"><label>الاسم الكامل</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div className="form-group">
            <label>الدور</label>
            <div className="chips">
              <div className={`chip ${form.role==="barber"?"selected":""}`} onClick={()=>setForm(f=>({...f,role:"barber"}))}>✂️ حلاق</div>
              <div className={`chip ${form.role==="manager"?"selected":""}`} onClick={()=>setForm(f=>({...f,role:"manager"}))}>📋 مدير</div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label>اسم المستخدم</label><input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} /></div>
            <div className="form-group"><label>كلمة المرور {editUser&&"(فارغة = بدون تغيير)"}</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={saveStaff}>حفظ</button>
            <button className="btn btn-outline" onClick={()=>{setModal(false);setEditUser(null);}}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== SESSIONS =====================
function SessionsPage({ user, showMsg }) {
  const [sessions, setSessions] = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ serviceIds:[], clientNote:"", clientId:"", subId:"", paymentMethod:"cash" });
  const [services, setServices] = useState([]);
  const [clients, setClients]   = useState([]);
  const [subs, setSubs]         = useState([]);
  const [filter, setFilter]     = useState("today");

  useEffect(() => {
    const u1 = onValue(ref(db,`shops/${user.shopId}/services`),   snap=>setServices(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,`clients_${user.shopId}`),          snap=>setClients(snap.exists()?Object.values(snap.val()):[]));
    const u3 = onValue(ref(db,`subs_${user.shopId}`),             snap=>setSubs(snap.exists()?Object.values(snap.val()):[]));
    const u4 = onValue(ref(db,`sessions_${user.shopId}`),         snap=>setSessions(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const selectedServices = services.filter(s=>form.serviceIds.includes(s.id));
  const totalAmount      = selectedServices.reduce((sum,s)=>sum+s.price, 0);
  const clientSubs       = form.clientId ? subs.filter(s=>s.clientId===form.clientId&&s.remaining>0&&isSubActive(s)) : [];
  const toggleService    = (id) => setForm(f=>({ ...f, serviceIds: f.serviceIds.includes(id)?f.serviceIds.filter(x=>x!==id):[...f.serviceIds,id] }));

  const addSession = async () => {
    if (form.serviceIds.length===0) { showMsg("اختار خدمة","error"); return; }
    let amount = totalAmount;
    if (form.subId) {
      const sub = clientSubs.find(s=>s.id===form.subId);
      await update(ref(db,`subs_${user.shopId}/${form.subId}`), { remaining:sub.remaining-1 });
      amount = 0;
    }
    const client = clients.find(c=>c.id===form.clientId);
    const id = "sess_"+Date.now();
    await fbSet(`sessions_${user.shopId}/${id}`, {
      id, date:today(), time:getTime(),
      serviceIds:form.serviceIds,
      serviceNames:selectedServices.map(s=>s.name).join(" + "),
      barberId:user.id, barberName:user.name,
      amount, paymentMethod:form.subId?"subscription":form.paymentMethod,
      clientNote:form.clientNote,
      clientId:form.clientId||null, clientName:client?.name||null
    });
    setModal(false);
    setForm({serviceIds:[],clientNote:"",clientId:"",subId:"",paymentMethod:"cash"});
    showMsg("تم تسجيل الجلسة ✓");
  };

  const filtered = sessions.filter(s => {
    if (filter==="today") return s.date===today();
    if (filter==="month") return s.date?.startsWith(thisMonth());
    return true;
  }).slice().reverse();

  return (
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><h1>سجل الجلسات</h1><div className="datetime-badge" style={{marginTop:6}}>🕐 {today()} — {getTime()}</div></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ تسجيل جلسة</button>
      </div>
      <div className="chips mb-24">
        {["today","month","all"].map(f=>(
          <div key={f} className={`chip ${filter===f?"selected":""}`} onClick={()=>setFilter(f)}>
            {f==="today"?"اليوم":f==="month"?"الشهر":"الكل"}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{marginBottom:0}}>الجلسات <span className="badge badge-gray">{filtered.length}</span></div>
          <span className="font-bold text-gold">إجمالي: {filtered.reduce((s,x)=>s+(x.amount||0),0)} ج</span>
        </div>
        {filtered.length===0 ? <EmptyState icon="📋" text="لا يوجد جلسات" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>التاريخ</th><th>الخدمة</th><th>العميل</th><th>الحلاق</th><th>المبلغ</th><th>الدفع</th></tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{s.date}<div className="text-xs">{s.time}</div></td>
                    <td className="font-bold">{s.serviceNames}</td>
                    <td>{s.clientName?<span className="text-sm">{s.clientName}</span>:<span className="text-muted text-sm">—</span>}</td>
                    <td className="text-muted text-sm">{s.barberName}</td>
                    <td>{s.amount>0?<span className="badge badge-gold">{s.amount} ج</span>:<span className="badge badge-blue">اشتراك</span>}</td>
                    <td><span className="badge badge-gray">{PAYMENT_METHODS.find(p=>p.id===s.paymentMethod)?.label||s.paymentMethod}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title="تسجيل جلسة" onClose={()=>setModal(false)}>
          <div className="form-group">
            <label>الخدمات (ممكن تختار أكتر من واحدة)</label>
            <div className="chips">
              {services.map(s=>(
                <div key={s.id} className={`chip ${form.serviceIds.includes(s.id)?"selected":""}`} onClick={()=>toggleService(s.id)}>
                  {s.name} — {s.price}ج
                </div>
              ))}
            </div>
            {selectedServices.length>0 && (
              <div className="service-summary">
                {selectedServices.map(s=><div key={s.id} className="service-summary-row"><span>{s.name}</span><span>{s.price} ج</span></div>)}
                <div className="service-summary-total"><span>الإجمالي</span><span>{totalAmount} ج</span></div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>العميل (اختياري)</label>
            <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value,subId:""}))}>
              <option value="">— بدون عميل —</option>
              {clients.map(c=><option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
            </select>
          </div>
          {clientSubs.length>0 && (
            <div className="form-group">
              <label>استخدام اشتراك</label>
              <select value={form.subId} onChange={e=>setForm(f=>({...f,subId:e.target.value}))}>
                <option value="">بدون اشتراك</option>
                {clientSubs.map(s=><option key={s.id} value={s.id}>{s.planName} — {s.remaining} جلسة</option>)}
              </select>
            </div>
          )}
          {!form.subId && (
            <div className="form-group">
              <label>طريقة الدفع</label>
              <div className="payment-methods">
                {PAYMENT_METHODS.map(pm=>(
                  <div key={pm.id} className={`payment-chip ${form.paymentMethod===pm.id?"selected":""}`} onClick={()=>setForm(f=>({...f,paymentMethod:pm.id}))}>
                    {pm.icon} {pm.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="form-group"><label>ملاحظة</label><input value={form.clientNote} onChange={e=>setForm(f=>({...f,clientNote:e.target.value}))} /></div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={addSession} disabled={form.serviceIds.length===0}>تسجيل</button>
            <button className="btn btn-outline" onClick={()=>setModal(false)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== REVENUE =====================
function RevenuePage({ user }) {
  const [sessions, setSessions] = useState([]);
  const [subs, setSubs]         = useState([]);

  useEffect(() => {
    const u1 = onValue(ref(db,`sessions_${user.shopId}`), snap=>setSessions(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,`subs_${user.shopId}`),     snap=>setSubs(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); };
  }, []);

  const days = Array.from({length:7},(_,i)=>{ const d=getNow(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(0,10); });
  const dailyRevenue = days.map(d=>({ label:new Date(d).toLocaleDateString("ar-EG",{weekday:"short"}), value:sessions.filter(s=>s.date===d).reduce((sum,s)=>sum+(s.amount||0),0) }));
  const maxVal = Math.max(...dailyRevenue.map(d=>d.value),1);
  const monthSessions = sessions.filter(s=>s.date?.startsWith(thisMonth()));
  const monthRevenue  = monthSessions.reduce((s,x)=>s+(x.amount||0),0);
  const subRevenue    = subs.filter(s=>s.month===thisMonth()).reduce((s,x)=>s+x.price,0);
  const byMethod      = PAYMENT_METHODS.map(pm=>({ ...pm, total:monthSessions.filter(s=>s.paymentMethod===pm.id).reduce((sum,s)=>sum+s.amount,0) })).filter(pm=>pm.total>0);

  return (
    <div className="fade-in">
      <div className="page-header"><h1>الإيرادات</h1><p>{thisMonth()}</p></div>
      <div className="stats-grid">
        <StatCard icon="📅" value={`${monthRevenue} ج`} label="إيراد الجلسات" cls="stat-gold" />
        <StatCard icon="🎫" value={`${subRevenue} ج`} label="إيراد الاشتراكات" cls="stat-blue" />
        <StatCard icon="✂️" value={monthSessions.length} label="جلسة الشهر" cls="stat-green" />
      </div>
      <div className="revenue-total">
        <div><div className="text-sm" style={{opacity:0.6}}>إجمالي الشهر</div><div className="amount">{monthRevenue+subRevenue} جنيه</div></div>
        <div className="text-sm" style={{opacity:0.5}}>{thisMonth()}</div>
      </div>
      <div className="card mb-24">
        <div className="card-title">📈 آخر 7 أيام</div>
        <div className="bar-chart">
          {dailyRevenue.map((d,i)=>(
            <div key={i} className="bar-wrap">
              <div style={{flex:1,display:"flex",alignItems:"flex-end",width:"100%"}}>
                <div className="bar" style={{height:`${(d.value/maxVal)*100}%`,background:i===6?"var(--gold2)":"var(--gold)"}} />
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {byMethod.length>0 && (
        <div className="card">
          <div className="card-title">💳 حسب طريقة الدفع</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {byMethod.map(pm=>(
              <div key={pm.id} className="stat-card stat-gold" style={{flex:"1 1 140px"}}>
                <span className="stat-icon">{pm.icon}</span>
                <div><div className="stat-value">{pm.total} ج</div><div className="stat-label">{pm.label}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== SHOPS (SUPERADMIN) =====================
function ShopsPage({ showMsg }) {
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [expiryModal, setExpiryModal] = useState(null);
  const [expiryDate, setExpiryDate]   = useState("");

  useEffect(() => {
    const u1 = onValue(ref(db,"shops"), snap=>setShops(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,"users"), snap=>setUsers(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); };
  }, []);

  const toggle = async (id, current) => {
    await update(ref(db,`shops/${id}`), { active:!current });
    showMsg("تم التحديث ✓");
  };

  const acceptShop = async (shop) => {
    const shopId = shop.id;
    // فعّل الصالون
    await update(ref(db,`shops/${shopId}`), { active:true, pending:false });
    // فعّل الـ owner بتاعه
    const allUsers = await fbGet("users");
    if (allUsers) {
      const owner = Object.values(allUsers).find(u=>u.shopId===shopId&&u.role==="owner");
      if (owner) await update(ref(db,`users/${owner.id}`), { active:true, pending:false });
    }
    showMsg(`تم قبول "${shop.name}" وتفعيله ✓`);
  };

  const deleteShop = async (shop) => {
    if (!window.confirm(`⚠️ هتمسح "${shop.name}" وكل بياناته نهائياً؟\n\nكل العملاء والجلسات والاشتراكات والموظفين هتتمسح.\n\nمفيش رجعة!`)) return;
    const shopId = shop.id;
    try {
      await Promise.all([
        remove(ref(db, `clients_${shopId}`)),
        remove(ref(db, `sessions_${shopId}`)),
        remove(ref(db, `subs_${shopId}`)),
        remove(ref(db, `shops/${shopId}/services`)),
        remove(ref(db, `shops/${shopId}/subscriptionPlans`)),
        remove(ref(db, `shops/${shopId}`)),
      ]);
      const allUsers = await fbGet("users");
      if (allUsers) {
        const deleteOps = Object.values(allUsers)
          .filter(u => u.shopId === shopId)
          .map(u => remove(ref(db, `users/${u.id}`)));
        await Promise.all(deleteOps);
      }
      showMsg(`تم حذف "${shop.name}" وكل بياناته نهائياً ✓`);
    } catch(e) {
      showMsg("حدث خطأ أثناء الحذف","error");
    }
  };

  const saveExpiry = async () => {
    if (!expiryDate) { showMsg("اختار تاريخ","error"); return; }
    await update(ref(db,`shops/${expiryModal}`), { expiryDate });
    setExpiryModal(null); setExpiryDate("");
    showMsg("تم تحديد تاريخ الانتهاء ✓");
  };

  const shopExpiry = (s) => {
    if (!s.expiryDate) return null;
    const days = Math.ceil((new Date(s.expiryDate) - new Date(today())) / 86400000);
    if (days < 0) return { label:"منتهي", cls:"badge-red" };
    if (days <= 7) return { label:`${days} يوم`, cls:"badge-red" };
    if (days <= 30) return { label:`${days} يوم`, cls:"badge-gold" };
    return { label:`${days} يوم`, cls:"badge-green" };
  };

  return (
    <div className="fade-in">
      <div className="page-header"><h1>إدارة الصالونات</h1><p>{shops.length} صالون</p></div>
      <div className="card">
        {shops.length===0 ? <EmptyState icon="🏪" text="لا يوجد صالونات" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الصالون</th><th>صاحب الصالون</th><th>اسم المستخدم</th><th>الموظفين</th><th>الاشتراك ينتهي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {shops.map(s=>{
                  const owner = users.find(u=>u.role==="owner"&&u.shopId===s.id);
                  const count = users.filter(u=>(u.role==="barber"||u.role==="manager")&&u.shopId===s.id).length;
                  const exp   = shopExpiry(s);
                  return (
                    <tr key={s.id}>
                      <td className="font-bold">✂️ {s.name}</td>
                      <td>{s.ownerName}</td>
                      <td className="text-muted">{owner?.username}</td>
                      <td><span className="badge badge-blue">{count}</span></td>
                      <td>
                        {exp
                          ? <span className={`badge ${exp.cls}`}>{exp.label}</span>
                          : <span className="text-muted text-xs">غير محدد</span>}
                        <button className="btn btn-outline btn-sm" style={{marginRight:6}} onClick={()=>{setExpiryModal(s.id);setExpiryDate(s.expiryDate||"");}}>تحديد</button>
                      </td>
                      <td><span className={`badge ${s.pending?"badge-gold":s.active?"badge-green":"badge-red"}`}>{s.pending?"في انتظار القبول":s.active?"نشط":"موقوف"}</span></td>
                      <td>
                        <div className="flex-gap">
                          {s.pending
                            ? <button className="btn btn-success btn-sm" onClick={()=>acceptShop(s)}>✅ قبول وتفعيل</button>
                            : <button className={`btn btn-sm ${s.active?"btn-warning":"btn-success"}`} onClick={()=>toggle(s.id,s.active)}>{s.active?"إيقاف":"تفعيل"}</button>
                          }
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteShop(s)}>🗑 حذف نهائي</button>
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

      {expiryModal && (
        <Modal title="تحديد تاريخ انتهاء الاشتراك" onClose={()=>setExpiryModal(null)}>
          <div className="form-group">
            <label>تاريخ الانتهاء</label>
            <input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} min={today()} />
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {[30,90,180,365].map(d=>{
              const dt = new Date(today()); dt.setDate(dt.getDate()+d);
              const val = dt.toISOString().slice(0,10);
              return <button key={d} className="btn btn-outline btn-sm" onClick={()=>setExpiryDate(val)}>{d===30?"شهر":d===90?"3 شهور":d===180?"6 شهور":"سنة"}</button>;
            })}
          </div>
          <div className="flex-gap mt-16">
            <button className="btn btn-primary" style={{flex:1}} onClick={saveExpiry}>حفظ</button>
            <button className="btn btn-outline" onClick={()=>setExpiryModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================== USERS (SUPERADMIN) =====================
function UsersPage({ showMsg }) {
  const [users, setUsers]   = useState([]);
  const [shops, setShops]   = useState([]);
  const [search, setSearch] = useState("");
  const [showPass, setShowPass] = useState({});

  useEffect(() => {
    const u1 = onValue(ref(db,"users"), snap=>setUsers(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,"shops"), snap=>setShops(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); };
  }, []);

  const toggleActive = async (u) => {
    if (u.role==="superadmin") { showMsg("لا يمكن تعطيل Super Admin","error"); return; }
    await update(ref(db,`users/${u.id}`), { active:!(u.active!==false) });
    showMsg("تم التحديث ✓");
  };

  const filtered = users.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.username?.toLowerCase().includes(search.toLowerCase()));
  const roleLabel = {superadmin:"Super Admin",owner:"صاحب صالون",manager:"مدير",barber:"حلاق"};

  return (
    <div className="fade-in">
      <div className="page-header"><h1>إدارة المستخدمين</h1><p>{users.length} مستخدم</p></div>
      <div className="card mb-24">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." />
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>الصالون</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {filtered.map(u=>{
                const shopName = u.shopId ? shops.find(s=>s.id===u.shopId)?.name : "—";
                const active = u.active!==false;
                return (
                  <tr key={u.id}>
                    <td className="font-bold">{u.name}</td>
                    <td><span className="badge badge-gray">{roleLabel[u.role]||u.role}</span></td>
                    <td className="text-muted">{u.username}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontFamily:"monospace",fontSize:13}}>{showPass[u.id]?u.password:"••••••"}</span>
                        <button className="btn btn-outline btn-sm" style={{padding:"4px 8px"}} onClick={()=>setShowPass(p=>({...p,[u.id]:!p[u.id]}))}>
                          {showPass[u.id]?"إخفاء":"إظهار"}
                        </button>
                      </div>
                    </td>
                    <td className="text-muted text-sm">{shopName}</td>
                    <td><span className={`badge ${active?"badge-green":"badge-red"}`}>{active?"نشط":"موقوف"}</span></td>
                    <td>{u.role!=="superadmin"&&<button className={`btn btn-sm ${active?"btn-warning":"btn-success"}`} onClick={()=>toggleActive(u)}>{active?"تعطيل":"تفعيل"}</button>}</td>
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
  const [pass, setPass] = useState({ current:"", newPass:"", confirm:"" });
  const changePass = async () => {
    const userData = await fbGet(`users/${user.id}`);
    if (!userData || userData.password !== pass.current) { showMsg("كلمة المرور الحالية غلط","error"); return; }
    if (pass.newPass !== pass.confirm) { showMsg("كلمة المرور مش متطابقة","error"); return; }
    if (pass.newPass.length < 4) { showMsg("كلمة المرور قصيرة جداً","error"); return; }
    await update(ref(db,`users/${user.id}`), { password:pass.newPass });
    setPass({current:"",newPass:"",confirm:""});
    showMsg("تم التغيير ✓");
  };
  return (
    <div className="fade-in">
      <div className="page-header"><h1>الإعدادات</h1></div>
      <div className="card" style={{maxWidth:480}}>
        <div className="card-title">🔐 تغيير كلمة المرور</div>
        <div className="form-group"><label>الحالية</label><input type="password" value={pass.current} onChange={e=>setPass(p=>({...p,current:e.target.value}))} /></div>
        <div className="form-group"><label>الجديدة</label><input type="password" value={pass.newPass} onChange={e=>setPass(p=>({...p,newPass:e.target.value}))} /></div>
        <div className="form-group"><label>تأكيد</label><input type="password" value={pass.confirm} onChange={e=>setPass(p=>({...p,confirm:e.target.value}))} /></div>
        <button className="btn btn-primary" onClick={changePass}>تحديث</button>
      </div>
    </div>
  );
}

// ===================== DASHBOARD =====================
function DashboardPage({ user }) {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients]   = useState([]);
  const [shops, setShops]       = useState([]);

  useEffect(() => {
    if (user.role==="superadmin") {
      const unsub = onValue(ref(db,"shops"), snap=>setShops(snap.exists()?Object.values(snap.val()):[]));
      return () => unsub();
    }
    const u1 = onValue(ref(db,`sessions_${user.shopId}`), snap=>setSessions(snap.exists()?Object.values(snap.val()):[]));
    const u2 = onValue(ref(db,`clients_${user.shopId}`),  snap=>setClients(snap.exists()?Object.values(snap.val()):[]));
    return () => { u1(); u2(); };
  }, []);

  const todaySessions  = sessions.filter(s=>s.date===today());
  const monthSessions  = sessions.filter(s=>s.date?.startsWith(thisMonth()));
  const todayRevenue   = todaySessions.reduce((sum,s)=>sum+(s.amount||0),0);
  const monthRevenue   = monthSessions.reduce((sum,s)=>sum+(s.amount||0),0);

  if (user.role==="barber") {
    const mine = sessions.filter(s=>s.barberId===user.id);
    return (
      <div className="fade-in">
        <div className="page-header"><h1>أهلاً، {user.name}! 👋</h1><div className="datetime-badge" style={{marginTop:8}}>🕐 {today()} — {getTime()}</div></div>
        <div className="stats-grid">
          <StatCard icon="✂️" value={mine.filter(s=>s.date===today()).length} label="حلاقة اليوم" cls="stat-gold" />
          <StatCard icon="📅" value={mine.filter(s=>s.date?.startsWith(thisMonth())).length} label="حلاقة الشهر" cls="stat-blue" />
        </div>
        <div className="card">
          <div className="card-title">آخر جلساتي اليوم</div>
          {mine.filter(s=>s.date===today()).length===0 ? <EmptyState icon="✂️" text="لا يوجد جلسات اليوم" /> :
            mine.filter(s=>s.date===today()).slice().reverse().map((s,i)=>(
              <div key={i} className="log-entry">
                <div><span className="font-bold">{s.serviceNames}</span><div className="text-xs text-muted">{s.clientName||"عميل عادي"} · {s.time}</div></div>
                <span className="badge badge-gray">{s.time}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{user.role==="superadmin"?"لوحة تحكم BarberOS":"لوحة التحكم"}</h1>
        <div className="flex-gap" style={{marginTop:8}}>
          <p className="text-muted text-sm">{new Date().toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          <div className="datetime-badge">🕐 {getTime()}</div>
        </div>
      </div>
      <div className="stats-grid">
        {user.role!=="superadmin" && <>
          <StatCard icon="💵" value={`${todayRevenue} ج`} label="إيرادات اليوم" cls="stat-gold" />
          <StatCard icon="📅" value={`${monthRevenue} ج`} label="إيرادات الشهر" cls="stat-green" />
          <StatCard icon="✂️" value={monthSessions.length} label="جلسة الشهر" cls="stat-blue" />
          <StatCard icon="👥" value={clients.length} label="عميل مسجل" cls="stat-red" />
        </>}
        {user.role==="superadmin" && <StatCard icon="🏪" value={shops.length} label="صالون مسجل" cls="stat-gold" />}
      </div>
      {user.role==="owner" && todaySessions.length>0 && (
        <div className="card">
          <div className="card-title">📋 آخر الجلسات اليوم</div>
          {todaySessions.slice(-5).reverse().map((s,i)=>(
            <div key={i} className="log-entry">
              <div>
                <span className="font-bold">{s.serviceNames}</span>
                {s.clientName&&<span className="text-xs text-muted" style={{marginLeft:8}}>· {s.clientName}</span>}
                <span className="text-xs text-muted" style={{marginLeft:8}}>· {s.barberName} · {s.time}</span>
              </div>
              <span className="badge badge-gold">{s.amount} ج</span>
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
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade-in">
        {title&&<div className="modal-header"><h2 className="modal-title">{title}</h2><button className="modal-close" onClick={onClose}>✕</button></div>}
        {children}
      </div>
    </div>
  );
}
function EmptyState({ icon, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><p>{text}</p></div>;
}

// ===================== MOUNT =====================
const rootEl = document.getElementById("root");
if (rootEl && !rootEl._reactRoot) {
  rootEl._reactRoot = ReactDOM.createRoot(rootEl);
}
rootEl._reactRoot.render(<BarberOS />);
