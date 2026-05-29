import { useState, useEffect } from "react";

const SUPABASE_URL = "https://fjzrcvuivtpevxzadwfy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqenJjdnVpdnRwZXZ4emFkd2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDg0NDEsImV4cCI6MjA5NTUyNDQ0MX0.lMOCRTaj3xeaTagohksZgZrXa-0PCwUmRZYdGQ7Luq4";
const HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

const STAFF_CODES = {
  "6002197": "Trần Thu Hương", "6011612": "Nguyễn Lệ Thuỷ",
  "6011613": "Vũ Thị Nguyệt Nga", "6011616": "Hàn Lưu Anh Thư",
  "6011611": "Vũ Huyền Trang", "6011784": "Vũ Minh Hùng",
  "6012165": "Nguyễn Thị Hương Thảo", "6012360": "Nguyễn Thị Thuý Hằng",
  "6012020": "Võ Minh Thiện", "6012327": "Huỳnh Thị Nhất Thương",
  "6012526": "Đặng Ngọc Lê Hoàng Oanh", "6012525": "Trần Hoàng Thịnh",
};
const BTC_LOGIN_CODES = ["0000", "1111", "6003450", "6011226", "6008340", "6011402", "6012470"];
const CINEMA_CODE = "6003450";
const ADMIN_CODE = "Nh@u2005";

const WORKSHOP_GROUPS = {
  flower:  { ids: ["workshop_flower_1", "workshop_flower_2"],   maxTotal: 15 },
  perfume: { ids: ["workshop_perfume_1", "workshop_perfume_2"], maxTotal: 20 },
};

const ZONES = [
  { id: "l1_reception",       name: "Tiếp đón L1",        icon: "🏛️", maxCapacity: 8,  hasBusy: false },
  { id: "workshop_flower_1",  name: "Workshop cắm hoa 1",  icon: "🌸", maxCapacity: 6,  hasBusy: true,  group: "flower" },
  { id: "workshop_flower_2",  name: "Workshop cắm hoa 2",  icon: "🌸", maxCapacity: 6,  hasBusy: true,  group: "flower" },
  { id: "workshop_perfume_1", name: "Workshop nước hoa 1", icon: "🌺", maxCapacity: 4,  hasBusy: true,  group: "perfume" },
  { id: "workshop_perfume_2", name: "Workshop nước hoa 2", icon: "🌺", maxCapacity: 4,  hasBusy: true,  group: "perfume" },
  { id: "cinema",             name: "Cinema",              icon: "🎬", maxCapacity: 5,  hasBusy: true  },
  { id: "amenities_l1",       name: "Amenities L1",        icon: "☕", maxCapacity: 6,  hasBusy: false },
  { id: "showroom_1br",       name: "Nhà mẫu 1PN",         icon: "🛏️", maxCapacity: 2,  hasBusy: false },
  { id: "showroom_2br",       name: "Nhà mẫu 2PN",         icon: "🛏️", maxCapacity: 2,  hasBusy: false },
  { id: "showroom_3br",       name: "Nhà mẫu 3PN",         icon: "🛏️", maxCapacity: 2,  hasBusy: false },
  { id: "pool",               name: "Hồ bơi",              icon: "🏊", maxCapacity: 4,  hasBusy: false },
];

const STATUS = {
  available: { bg: "#eaf3de", border: "#97C459", text: "#3B6D11", label: "Còn chỗ" },
  warning:   { bg: "#fffbea", border: "#fac775", text: "#BA7517", label: "Gần đầy" },
  full:      { bg: "#fdecea", border: "#f5a9a8", text: "#e24b4a", label: "Đầy" },
  busy:      { bg: "#e6f1fb", border: "#85B7EB", text: "#185FA5", label: "Đang diễn ra" },
};

function getStatus(current, max, busy) {
  if (busy) return "busy";
  if (current >= max) return "full";
  if (current >= max * 0.75) return "warning";
  return "available";
}
function fmtDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

async function dbLoadZones() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/zones?select=*`, { headers: HEADERS });
  return res.json();
}
async function dbUpdateZone(id, fields) {
  await fetch(`${SUPABASE_URL}/rest/v1/zones?id=eq.${id}`, { method: "PATCH", headers: { ...HEADERS, "Prefer": "return=minimal" }, body: JSON.stringify(fields) });
}
async function dbInsertLog(entry) {
  await fetch(`${SUPABASE_URL}/rest/v1/zone_logs`, { method: "POST", headers: { ...HEADERS, "Prefer": "return=minimal" }, body: JSON.stringify(entry) });
}
async function dbLoadLogs() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/zone_logs?select=*&order=created_at.desc&limit=100`, { headers: HEADERS });
  return res.json();
}
async function dbClearLogs() {
  await fetch(`${SUPABASE_URL}/rest/v1/zone_logs?id=gte.0`, { method: "DELETE", headers: { ...HEADERS, "Prefer": "return=minimal" } });
}
async function dbResetZones() {
  for (const z of ZONES) {
    await fetch(`${SUPABASE_URL}/rest/v1/zones?id=eq.${z.id}`, {
      method: "PATCH", headers: { ...HEADERS, "Prefer": "return=minimal" },
      body: JSON.stringify({ current_count: 0, total_visited: 0, is_busy: false, started_at: null })
    });
  }
}

function TimerLarge({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return (
    <div style={{ textAlign: "center", margin: "8px 0", padding: "10px 0", background: "#e6f1fb", borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: "#185FA5", fontWeight: 600, marginBottom: 2 }}>⏱️ Đang diễn ra</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#185FA5", letterSpacing: 2 }}>{fmtDuration(elapsed)}</div>
    </div>
  );
}

function TimerSmall({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span style={{ fontSize: 12, color: "#185FA5", fontFamily: "monospace", fontWeight: 700, background: "#e6f1fb", borderRadius: 8, padding: "2px 8px" }}>⏱️ {fmtDuration(elapsed)}</span>;
}

function PinDialog({ title, onConfirm, onCancel, mode }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    if (mode === "cinema") {
      if (pin !== CINEMA_CODE) { setErr("Mã không đúng."); return; }
      onConfirm(`Cinema-${CINEMA_CODE}`);
    } else if (mode === "admin") {
      if (pin !== ADMIN_CODE) { setErr("Mã không đúng."); return; }
      onConfirm(ADMIN_CODE);
    } else {
      if (!STAFF_CODES[pin]) { setErr("Mã không đúng."); return; }
      onConfirm(`${pin} - ${STAFF_CODES[pin]}`);
    }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 300, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 4, whiteSpace: "pre-line" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Nhập mã xác nhận</div>
        <input type="password" value={pin} onChange={e => { setPin(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && submit()} placeholder="Nhập mã..."
          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `2px solid ${err ? "#e24b4a" : "#dde4f0"}`, fontSize: 16, textAlign: "center", letterSpacing: 4, boxSizing: "border-box", outline: "none", marginBottom: 8 }} autoFocus />
        {err && <div style={{ color: "#e24b4a", fontSize: 12, marginBottom: 8 }}>⚠️ {err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", border: "1px solid #ddd", borderRadius: 8, background: "#f5f5f5", cursor: "pointer", fontSize: 14 }}>Hủy</button>
          <button onClick={submit} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: "#185FA5", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 300, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>❓</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 20, whiteSpace: "pre-line" }}>{title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px 0", border: "1px solid #ddd", borderRadius: 8, background: "#f5f5f5", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Không</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px 0", border: "none", borderRadius: 8, background: "#e24b4a", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Có</button>
        </div>
      </div>
    </div>
  );
}

function BtcLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    if (BTC_LOGIN_CODES.includes(pin)) { onLogin(pin); }
    else { setErr("Mã không hợp lệ."); }
  }
  return (
    <div style={{ maxWidth: 320, margin: "60px auto", padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.1)", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>Đăng nhập BTC</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Nhập mã được BTC cung cấp</div>
      <input type="password" value={pin} onChange={e => { setPin(e.target.value); setErr(""); }}
        onKeyDown={e => e.key === "Enter" && submit()} placeholder="Nhập mã..."
        style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: `2px solid ${err ? "#e24b4a" : "#dde4f0"}`, fontSize: 16, textAlign: "center", letterSpacing: 4, boxSizing: "border-box", outline: "none", marginBottom: 8 }} autoFocus />
      {err && <div style={{ color: "#e24b4a", fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
      <button onClick={submit} style={{ width: "100%", padding: "13px 0", background: "#185FA5", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 16 }}>Vào</button>
    </div>
  );
}

function StaffView({ zones, onAction, btcCode, onLogout }) {
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [count, setCount] = useState(1);
  const [dialog, setDialog] = useState(null);

  const zoneDef = ZONES.find(z => z.id === zoneId);
  const zone = zones.find(z => z.id === zoneId) || { current_count: 0, total_visited: 0, is_busy: false, started_at: null };

  const group = zoneDef.group ? WORKSHOP_GROUPS[zoneDef.group] : null;
  const groupTotal = group ? group.ids.reduce((acc, id) => {
    const z = zones.find(r => r.id === id);
    return acc + (z ? z.total_visited : 0);
  }, 0) : 0;
  const groupRemaining = group ? group.maxTotal - groupTotal : Infinity;

  const status = getStatus(zone.current_count, zoneDef.maxCapacity, zone.is_busy);
  const col = STATUS[status];
  const pct = Math.min(100, Math.round((zone.current_count / zoneDef.maxCapacity) * 100));
  const remaining = zoneDef.maxCapacity - zone.current_count;
  const maxIn = Math.min(remaining, groupRemaining);
  const canIn = !zone.is_busy && maxIn > 0;

  function askIn() {
    setDialog({ type: "pin_in", msg: `Ghi nhận ${count} khách VÀO\n"${zoneDef.name}"?` });
  }
  function askOut() {
    setDialog({ type: "confirm_out", msg: `Xác nhận trừ ${count} khách ra\n"${zoneDef.name}"?` });
  }
  function askBusy() {
    if (zone.is_busy) {
      setDialog({ type: "confirm_end", msg: `Kết thúc session "${zoneDef.name}"?\nSố người sẽ về 0.` });
    } else {
      setDialog({ type: "pin_busy", msg: `Bắt đầu session\n"${zoneDef.name}"?` });
    }
  }

  async function handleConfirm(staffCode) {
    const d = dialog;
    setDialog(null);
    setCount(1);
    if (d.type === "pin_in") {
      await onAction(zoneId, "in", count, staffCode, zone);
    } else if (d.type === "confirm_out") {
      await onAction(zoneId, "out", count, `BTC-${btcCode}`, zone);
    } else if (d.type === "pin_busy") {
      await onAction(zoneId, "busy", count, staffCode, zone);
    } else if (d.type === "confirm_end") {
      await onAction(zoneId, "end_session", count, `BTC-${btcCode}`, zone);
    }
  }

  return (
    <div>
      {dialog && (dialog.type === "confirm_out" || dialog.type === "confirm_end") && (
        <ConfirmDialog title={dialog.msg} onConfirm={() => handleConfirm(null)} onCancel={() => setDialog(null)} />
      )}
      {dialog && dialog.type === "pin_in" && (
        <PinDialog title={dialog.msg} mode="staff" onConfirm={handleConfirm} onCancel={() => setDialog(null)} />
      )}
      {dialog && dialog.type === "pin_busy" && (
        <PinDialog title={dialog.msg} mode="cinema" onConfirm={handleConfirm} onCancel={() => setDialog(null)} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, background: "#e6f1fb", borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ fontSize: 13, color: "#185FA5", fontWeight: 600 }}>🔐 Mã: {btcCode}</div>
        <button onClick={onLogout} style={{ padding: "5px 12px", border: "1px solid #85B7EB", borderRadius: 8, background: "#fff", color: "#185FA5", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Đăng xuất</button>
      </div>

      <select value={zoneId} onChange={e => { setZoneId(e.target.value); setCount(1); }}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 15, background: "#fff", marginBottom: 14, fontWeight: 600 }}>
        {ZONES.map(z => <option key={z.id} value={z.id}>{z.icon} {z.name}</option>)}
      </select>

      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `2px solid ${col.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e" }}>{zoneDef.icon} {zoneDef.name}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>Tối đa: {zoneDef.maxCapacity}{group ? ` · Còn nhóm: ${groupRemaining}` : ""}</div>
          </div>
          <div style={{ background: col.bg, color: col.text, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, border: `1px solid ${col.border}` }}>{col.label}</div>
        </div>

        {zone.is_busy && zone.started_at && <TimerLarge startedAt={zone.started_at} />}

        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: col.text, lineHeight: 1 }}>{zone.current_count}</div>
          <div style={{ fontSize: 14, color: "#aaa", marginTop: 4 }}>/ {zoneDef.maxCapacity} người</div>
          {group && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Tổng nhóm: {groupTotal} / {group.maxTotal} lượt</div>}
        </div>

        <div style={{ background: "#f0f0f0", borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ width: `${pct}%`, background: status === "full" ? "#e24b4a" : status === "warning" ? "#fac775" : status === "busy" ? "#185FA5" : "#3B6D11", height: "100%", borderRadius: 99, transition: "width 0.3s" }} />
        </div>

        {zoneDef.hasBusy && (
          <button onClick={askBusy}
            style={{ width: "100%", padding: "11px 0", marginBottom: 12, border: "none", borderRadius: 10, background: zone.is_busy ? "#e24b4a" : "#185FA5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {zone.is_busy ? "⏹️ Kết thúc session (→ về 0)" : "▶️ Bắt đầu session"}
          </button>
        )}

        {!zone.is_busy && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8, textAlign: "center" }}>Số khách</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <button onClick={() => setCount(c => Math.max(1, c - 1))} style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #ddd", background: "#f5f5f5", fontSize: 20, cursor: "pointer", fontWeight: 700 }}>−</button>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#185FA5", minWidth: 40, textAlign: "center" }}>{count}</span>
                <button onClick={() => setCount(c => Math.min(Math.max(maxIn, 1), c + 1))} style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #ddd", background: "#f5f5f5", fontSize: 20, cursor: "pointer", fontWeight: 700 }}>+</button>
              </div>
              {zone.current_count > 0 && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <button onClick={() => setCount(zone.current_count)}
                    style={{ padding: "4px 14px", border: "1px solid #e24b4a", borderRadius: 20, background: "#fff", color: "#e24b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Chọn tất cả ({zone.current_count})
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={askIn} disabled={!canIn}
                style={{ padding: "18px 0", border: "none", borderRadius: 12, background: canIn ? "#3B6D11" : "#e0e0e0", color: "#fff", fontSize: 24, cursor: canIn ? "pointer" : "not-allowed", fontWeight: 900 }}>
                <div>+{count}</div><div style={{ fontSize: 12, marginTop: 4 }}>Khách vào</div>
              </button>
              <button onClick={askOut} disabled={zone.current_count === 0}
                style={{ padding: "18px 0", border: "none", borderRadius: 12, background: zone.current_count > 0 ? "#e24b4a" : "#e0e0e0", color: "#fff", fontSize: 24, cursor: zone.current_count > 0 ? "pointer" : "not-allowed", fontWeight: 900 }}>
                <div>−{count}</div><div style={{ fontSize: 12, marginTop: 4 }}>Khách ra</div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ zones }) {
  const counts = { available: 0, warning: 0, full: 0, busy: 0 };
  ZONES.forEach(z => {
    const d = zones.find(r => r.id === z.id) || { current_count: 0, is_busy: false };
    counts[getStatus(d.current_count, z.maxCapacity, d.is_busy)]++;
  });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {Object.entries(STATUS).map(([key, col]) => (
          <div key={key} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: col.text }}>{counts[key]}</div>
            <div style={{ fontSize: 12, color: col.text, fontWeight: 600 }}>{col.label}</div>
          </div>
        ))}
      </div>
      {Object.entries(WORKSHOP_GROUPS).map(([key, g]) => {
        const total = g.ids.reduce((acc, id) => { const z = zones.find(r => r.id === id); return acc + (z ? z.total_visited : 0); }, 0);
        const pct = Math.min(100, Math.round((total / g.maxTotal) * 100));
        const label = key === "flower" ? "🌸 Workshop cắm hoa (tổng)" : "🌺 Workshop nước hoa (tổng)";
        return (
          <div key={key} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: "1.5px solid #dde4f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
              <span style={{ fontSize: 13, color: "#185FA5", fontWeight: 700 }}>{total} / {g.maxTotal} lượt</span>
            </div>
            <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: pct >= 100 ? "#e24b4a" : "#185FA5", height: "100%", borderRadius: 99 }} />
            </div>
          </div>
        );
      })}
      {ZONES.map(z => {
        const d = zones.find(r => r.id === z.id) || { current_count: 0, total_visited: 0, is_busy: false, started_at: null };
        const status = getStatus(d.current_count, z.maxCapacity, d.is_busy);
        const col = STATUS[status];
        const pct = Math.min(100, Math.round((d.current_count / z.maxCapacity) * 100));
        return (
          <div key={z.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: `2px solid ${col.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{z.icon} {z.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {d.is_busy && d.started_at && <TimerSmall startedAt={d.started_at} />}
                <span style={{ fontSize: 22, fontWeight: 900, color: col.text }}>{d.current_count}</span>
                <span style={{ fontSize: 12, color: "#aaa" }}>/ {z.maxCapacity}</span>
                <span style={{ background: col.bg, color: col.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${col.border}` }}>{col.label}</span>
              </div>
            </div>
            <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: status === "full" ? "#e24b4a" : status === "warning" ? "#fac775" : status === "busy" ? "#185FA5" : "#3B6D11", height: "100%", borderRadius: 99 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ logs, onClear }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div>
      {showConfirm && (
        <PinDialog title={`Xóa toàn bộ lịch sử\nvà reset tất cả zone?`} mode="admin"
          onConfirm={() => { onClear(); setShowConfirm(false); }}
          onCancel={() => setShowConfirm(false)} />
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowConfirm(true)} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#e24b4a", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          🗑️ Xóa lịch sử & Reset zone
        </button>
      </div>
      {logs.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>Chưa có lịch sử ghi nhận</div>
        : logs.map((log, i) => {
          const zone = ZONES.find(z => z.id === log.zone_id);
          const isIn = log.action === "in";
          const isOut = log.action === "out" || log.action === "end_session";
          return (
            <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid #e8e8e8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: isIn ? "#3B6D11" : isOut ? "#e24b4a" : "#185FA5" }}>
                    {isIn ? `+${log.count} vào` : log.action === "end_session" ? "⏹️ Kết thúc (→0)" : isOut ? `−${log.count} ra` : log.action === "busy_on" ? "▶️ Bắt đầu" : "⏹️ Kết thúc"}
                  </span>
                  <span style={{ fontSize: 13, color: "#555", marginLeft: 8 }}>{zone ? `${zone.icon} ${zone.name}` : log.zone_id}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {log.staff_code && <span style={{ fontSize: 11, color: "#555", background: "#eaf3de", borderRadius: 8, padding: "2px 8px" }}>NV: {log.staff_code}</span>}
                  {log.btc_code && <span style={{ fontSize: 11, color: "#aaa", background: "#f5f5f5", borderRadius: 8, padding: "2px 8px" }}>BTC: {log.btc_code}</span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{new Date(log.created_at).toLocaleString("vi-VN")}</div>
            </div>
          );
        })
      }
    </div>
  );
}

export default function App() {
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("staff");
  const [btcCode, setBtcCode] = useState(null);

  async function load() {
    const [z, l] = await Promise.all([dbLoadZones(), dbLoadLogs()]);
    setZones(Array.isArray(z) ? z : []);
    setLogs(Array.isArray(l) ? l : []);
    setLoading(false);
  }

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  async function handleAction(zoneId, type, count, staffCode, zoneData, currentBtcCode) {
    let fields = {};
    let action = type;
    if (type === "in") {
      fields = { current_count: zoneData.current_count + count, total_visited: zoneData.total_visited + count };
    } else if (type === "out") {
      fields = { current_count: Math.max(0, zoneData.current_count - count) };
    } else if (type === "end_session") {
      fields = { current_count: 0, is_busy: false, started_at: null };
      action = "end_session";
    } else if (type === "busy") {
      const turningOn = !zoneData.is_busy;
      fields = { is_busy: turningOn, started_at: turningOn ? new Date().toISOString() : null };
      action = turningOn ? "busy_on" : "busy_off";
    }
    await dbUpdateZone(zoneId, fields);
    await dbInsertLog({
      zone_id: zoneId,
      action,
      count: (type === "busy" || type === "end_session") ? null : count,
      staff_code: staffCode,
      btc_code: `BTC-${currentBtcCode}`
    });
    await load();
  }

  async function handleClear() {
    await Promise.all([dbClearLogs(), dbResetZones()]);
    await load();
  }

  const tabs = [
    { key: "staff",   label: "👤 Nhân viên" },
    { key: "admin",   label: "📊 Dashboard" },
    { key: "history", label: "📋 Lịch sử" },
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 12px", fontFamily: "sans-serif", background: "#f4f6fb", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>🗺️ Zone Tracking</div>
        {!loading && <button onClick={load} style={{ marginTop: 6, padding: "4px 14px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12 }}>🔄 Làm mới</button>}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#e8e8e8", borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: tab === t.key ? 700 : 400, background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#185FA5" : "#555", fontSize: 12, boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>{t.label}</button>
        ))}
      </div>

      {loading
        ? <div style={{ textAlign: "center", padding: 60, color: "#888" }}>⏳ Đang tải...</div>
        : <>
            {tab === "staff" && (
              btcCode
                ? <StaffView zones={zones} onAction={handleAction} btcCode={btcCode} onLogout={() => setBtcCode(null)} />
                : <BtcLogin onLogin={setBtcCode} />
            )}
            {tab === "admin"   && <AdminDashboard zones={zones} />}
            {tab === "history" && <HistoryTab logs={logs} onClear={handleClear} />}
          </>
      }
    </div>
  );
}
