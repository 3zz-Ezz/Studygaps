import { useState, useEffect, useCallback } from "react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TODAY_IDX = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`;
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ap}`; };
const uid = () => Math.random().toString(36).slice(2, 9);
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const DAY_START = 7 * 60, DAY_END = 23 * 60;
const CLASS_COLORS = ["#6C63FF","#FF8C42","#2DD4A0","#E056C0","#3B9EFF","#F5D76E","#FF6B6B"];
const MEMBER_COLORS = ["#6C63FF","#2DD4A0","#FF8C42","#E056C0","#3B9EFF","#FF6B6B","#F5D76E"];

// storage
async function sload(key, shared = false) {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function ssave(key, val, shared = false) {
  try { await window.storage.set(key, JSON.stringify(val), shared); } catch {}
}

// ui atoms
function Badge({ color, label }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Modal({ onClose, children, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#1A1E2E", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, border: "1px solid #2A2D3E", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#E8E9F0" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>{label}</div>}
      <input {...props} style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 12px", color: "#E8E9F0", fontSize: 14, outline: "none", boxSizing: "border-box", ...props.style }} />
    </div>
  );
}

function Sel({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>{label}</div>}
      <select {...props} style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 12px", color: "#E8E9F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", style = {}, ...props }) {
  const base = { border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer", ...style };
  const map = {
    primary: { background: "#6C63FF", color: "#fff", ...base },
    ghost: { background: "transparent", color: "#9CA3AF", border: "1px solid #2A2D3E", ...base },
    danger: { background: "#FF6B6B22", color: "#FF6B6B", border: "1px solid #FF6B6B44", ...base },
    teal: { background: "#2DD4A022", color: "#2DD4A0", border: "1px solid #2DD4A044", ...base },
  };
  return <button style={map[variant] || map.primary} {...props}>{children}</button>;
}

function Avatar({ name, color, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "33", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0 }}>
      {name ? name[0].toUpperCase() : "?"}
    </div>
  );
}

function TaskItem({ task, onChange, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1C1F2E" }}>
      <input type="checkbox" checked={task.done} onChange={e => onChange({ ...task, done: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6C63FF" }} />
      <span style={{ flex: 1, fontSize: 14, color: task.done ? "#4B5063" : "#C4C6D4", textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "#4B5063", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

function Timeline({ classes, onGapClick }) {
  const total = DAY_END - DAY_START;
  const pct = (m) => ((m - DAY_START) / total) * 100;
  const sorted = [...classes].sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
  const gaps = [];
  let cursor = DAY_START;
  for (const c of sorted) {
    const cs = toMins(c.startTime), ce = toMins(c.endTime);
    if (cs > cursor + 29) gaps.push({ start: cursor, end: cs });
    cursor = Math.max(cursor, ce);
  }
  if (cursor < DAY_END - 29) gaps.push({ start: cursor, end: DAY_END });
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const ticks = [];
  for (let h = 7; h <= 23; h += 2) ticks.push(h);
  return (
    <div>
      <div style={{ position: "relative", height: 18, marginBottom: 4 }}>
        {ticks.map(h => (
          <span key={h} style={{ position: "absolute", left: `${pct(h * 60)}%`, transform: "translateX(-50%)", fontSize: 10, color: "#4B5063" }}>
            {h % 12 || 12}{h < 12 ? "am" : "pm"}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", height: 44, background: "#0F1117", borderRadius: 8, overflow: "hidden", border: "1px solid #2A2D3E" }}>
        {gaps.map((g, i) => (
          <div key={i} onClick={() => onGapClick && onGapClick(g)}
            style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(g.start)}%`, width: `${pct(g.end) - pct(g.start)}%`, background: "#2DD4A018", borderLeft: "2px solid #2DD4A0", cursor: onGapClick ? "pointer" : "default" }}
            onMouseEnter={e => e.currentTarget.style.background = "#2DD4A030"}
            onMouseLeave={e => e.currentTarget.style.background = "#2DD4A018"}
          />
        ))}
        {sorted.map(c => (
          <div key={c.id}
            style={{ position: "absolute", top: 4, bottom: 4, left: `${pct(toMins(c.startTime))}%`, width: `${pct(toMins(c.endTime)) - pct(toMins(c.startTime))}%`, background: c.color || "#6C63FF", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 10, fontWeight: 700, color: "#fff", padding: "0 4px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</span>
          </div>
        ))}
        {nowMins >= DAY_START && nowMins <= DAY_END && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(nowMins)}%`, width: 2, background: "#FF8C42", zIndex: 10 }}>
            <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#FF8C42" }} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {gaps.map((g, i) => (
          <span key={i} onClick={() => onGapClick && onGapClick(g)}
            style={{ fontSize: 11, color: "#2DD4A0", background: "#2DD4A012", border: "1px solid #2DD4A030", borderRadius: 6, padding: "3px 8px", cursor: onGapClick ? "pointer" : "default" }}>
            {fmtTime(toTime(g.start))} – {fmtTime(toTime(g.end))} ({g.end - g.start}m)
          </span>
        ))}
        {gaps.length === 0 && <span style={{ fontSize: 11, color: "#4B5063" }}>No gaps today</span>}
      </div>
    </div>
  );
}

// ── Group Tab ─────────────────────────────────────────────────────────────────
function GroupTab() {
  const [view, setView] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lobbyTab, setLobbyTab] = useState("create");
  const [createForm, setCreateForm] = useState({ projectName: "", myName: "" });
  const [joinForm, setJoinForm] = useState({ code: "", name: "" });
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ subtask: "", pct: 0, progressNote: "", done: false });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await sload("group_session");
      if (session?.roomCode && session?.memberId) {
        const roomData = await sload(`room:${session.roomCode}`, true);
        if (roomData) { setRoom(roomData); setMyId(session.memberId); setView("room"); }
      }
      setLoading(false);
    })();
  }, []);

  const refreshRoom = useCallback(async (code) => {
    setRefreshing(true);
    const roomData = await sload(`room:${code}`, true);
    if (roomData) setRoom(roomData);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (view !== "room" || !room) return;
    const id = setInterval(() => refreshRoom(room.code), 10000);
    return () => clearInterval(id);
  }, [view, room, refreshRoom]);

  const createRoom = async () => {
    if (!createForm.projectName.trim() || !createForm.myName.trim()) { setError("Fill in all fields"); return; }
    const code = genCode();
    const memberId = uid();
    const newRoom = {
      code, projectName: createForm.projectName.trim(), createdAt: new Date().toISOString(),
      members: [{ id: memberId, name: createForm.myName.trim(), subtask: "", pct: 0, progressNote: "", done: false, color: MEMBER_COLORS[0] }]
    };
    await ssave(`room:${code}`, newRoom, true);
    await ssave("group_session", { roomCode: code, memberId });
    setRoom(newRoom); setMyId(memberId); setView("room"); setError("");
  };

  const joinRoom = async () => {
    const code = joinForm.code.trim().toUpperCase();
    if (!code || !joinForm.name.trim()) { setError("Fill in all fields"); return; }
    const roomData = await sload(`room:${code}`, true);
    if (!roomData) { setError("Room not found. Check the code."); return; }
    const memberId = uid();
    const colorIdx = roomData.members.length % MEMBER_COLORS.length;
    const updated = { ...roomData, members: [...roomData.members, { id: memberId, name: joinForm.name.trim(), subtask: "", pct: 0, progressNote: "", done: false, color: MEMBER_COLORS[colorIdx] }] };
    await ssave(`room:${code}`, updated, true);
    await ssave("group_session", { roomCode: code, memberId });
    setRoom(updated); setMyId(memberId); setView("room"); setError("");
  };

  const leaveRoom = async () => {
    await ssave("group_session", null);
    setRoom(null); setMyId(null); setView("lobby");
  };

  const openEdit = () => {
    const me = room.members.find(m => m.id === myId);
    if (me) setEditForm({ subtask: me.subtask || "", pct: me.pct || 0, progressNote: me.progressNote || "", done: me.done || false });
    setEditModal(true);
  };

  const saveEdit = async () => {
    const updated = { ...room, members: room.members.map(m => m.id === myId ? { ...m, ...editForm } : m) };
    await ssave(`room:${room.code}`, updated, true);
    setRoom(updated); setEditModal(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#4B5063" }}>Loading...</div>;

  if (view === "lobby") return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8E9F0", marginBottom: 6 }}>Group Rooms</div>
      <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Create a private room or join one with a code.</div>
      <div style={{ display: "flex", background: "#1A1E2E", borderRadius: 10, padding: 4, marginBottom: 20, border: "1px solid #2A2D3E" }}>
        {["create", "join"].map(t => (
          <button key={t} onClick={() => { setLobbyTab(t); setError(""); }}
            style={{ flex: 1, background: lobbyTab === t ? "#6C63FF" : "none", border: "none", borderRadius: 8, padding: "8px 0", color: lobbyTab === t ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t === "create" ? "Create Room" : "Join Room"}
          </button>
        ))}
      </div>
      {error && <div style={{ background: "#FF6B6B22", border: "1px solid #FF6B6B44", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FF6B6B", marginBottom: 14 }}>{error}</div>}
      {lobbyTab === "create" ? (
        <div>
          <Field label="Project / Assignment name" placeholder="e.g. Community Impact Report" value={createForm.projectName} onChange={e => setCreateForm(f => ({ ...f, projectName: e.target.value }))} />
          <Field label="Your name" placeholder="e.g. Ezz" value={createForm.myName} onChange={e => setCreateForm(f => ({ ...f, myName: e.target.value }))} />
          <Btn style={{ width: "100%", marginTop: 4 }} onClick={createRoom}>Create Room</Btn>
          <div style={{ fontSize: 11, color: "#4B5063", textAlign: "center", marginTop: 10 }}>A 6-digit code is generated. Share it with your group.</div>
        </div>
      ) : (
        <div>
          <Field label="Room code" placeholder="e.g. A3X9KL" value={joinForm.code} onChange={e => setJoinForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, fontSize: 18 }} />
          <Field label="Your name" placeholder="e.g. Amir" value={joinForm.name} onChange={e => setJoinForm(f => ({ ...f, name: e.target.value }))} />
          <Btn style={{ width: "100%" }} onClick={joinRoom}>Join Room</Btn>
        </div>
      )}
    </div>
  );

  const totalPct = room.members.length ? Math.round(room.members.reduce((a, m) => a + (m.pct || 0), 0) / room.members.length) : 0;

  return (
    <div>
      <div style={{ background: "#1A1E2E", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #2A2D3E" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8E9F0" }}>{room.projectName}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{room.members.length} member{room.members.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={copyCode} style={{ background: copied ? "#2DD4A022" : "#0F1117", border: `1px solid ${copied ? "#2DD4A0" : "#2A2D3E"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: copied ? "#2DD4A0" : "#6C63FF", letterSpacing: 3 }}>{room.code}</span>
            <span style={{ fontSize: 9, color: copied ? "#2DD4A0" : "#4B5063", fontWeight: 600 }}>{copied ? "COPIED!" : "TAP TO COPY"}</span>
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Group Progress</span>
          <span>{totalPct}%</span>
        </div>
        <div style={{ height: 8, background: "#0F1117", borderRadius: 4 }}>
          <div style={{ height: "100%", width: `${totalPct}%`, background: "linear-gradient(90deg,#6C63FF,#2DD4A0)", borderRadius: 4, transition: "width .4s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn variant="teal" style={{ flex: 1, padding: "8px 0", fontSize: 13 }} onClick={() => refreshRoom(room.code)}>
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </Btn>
        <Btn variant="ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={leaveRoom}>Leave</Btn>
      </div>

      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Members</div>

      {room.members.map(m => {
        const isMe = m.id === myId;
        return (
          <div key={m.id} style={{ background: "#1A1E2E", borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${isMe ? (m.color || "#6C63FF") + "44" : "#2A2D3E"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar name={m.name} color={m.color || "#6C63FF"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E9F0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {m.name}
                  {isMe && <Badge color="#6C63FF" label="You" />}
                  {m.done && <Badge color="#2DD4A0" label="Done ✓" />}
                </div>
                <div style={{ fontSize: 12, color: m.subtask ? "#9CA3AF" : "#4B5063", marginTop: 2, fontStyle: m.subtask ? "normal" : "italic" }}>
                  {m.subtask || "No subtask set yet"}
                </div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: m.color || "#6C63FF" }}>{m.pct || 0}%</span>
            </div>
            <div style={{ height: 5, background: "#0F1117", borderRadius: 3, marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${m.pct || 0}%`, background: m.color || "#6C63FF", borderRadius: 3, transition: "width .3s" }} />
            </div>
            {m.progressNote ? (
              <div style={{ padding: "7px 10px", background: "#0F1117", borderRadius: 7, fontSize: 12, color: "#9CA3AF", borderLeft: `2px solid ${m.color || "#6C63FF"}`, marginBottom: isMe ? 8 : 0 }}>
                📌 {m.progressNote}
              </div>
            ) : null}
            {isMe && (
              <Btn variant="ghost" style={{ width: "100%", padding: "7px 0", fontSize: 12, marginTop: 4 }} onClick={openEdit}>
                ✏️ Update my progress
              </Btn>
            )}
          </div>
        );
      })}

      {editModal && (
        <Modal title="Update your progress" onClose={() => setEditModal(false)}>
          <Field label="Your subtask" placeholder="e.g. Write the introduction section" value={editForm.subtask} onChange={e => setEditForm(f => ({ ...f, subtask: e.target.value }))} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Progress — {editForm.pct}%</div>
            <input type="range" min={0} max={100} value={editForm.pct} onChange={e => setEditForm(f => ({ ...f, pct: Number(e.target.value) }))} style={{ width: "100%", accentColor: "#6C63FF" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4B5063", marginTop: 4 }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Where did you stop?</div>
            <textarea value={editForm.progressNote} onChange={e => setEditForm(f => ({ ...f, progressNote: e.target.value }))}
              placeholder="e.g. Finished the intro, starting methodology next..."
              rows={3} style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 12px", color: "#E8E9F0", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={editForm.done} onChange={e => setEditForm(f => ({ ...f, done: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#2DD4A0" }} />
            <span style={{ fontSize: 13, color: "#C4C6D4" }}>Mark my subtask as done</span>
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditModal(false)}>Cancel</Btn>
            <Btn onClick={saveEdit}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [schedule, setSchedule] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [classModal, setClassModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [progressModal, setProgressModal] = useState(null);
  const [gapModal, setGapModal] = useState(null);
  const [cForm, setCForm] = useState({ subject: "", day: "Monday", startTime: "08:00", endTime: "09:00", color: "#6C63FF" });
  const [aForm, setAForm] = useState({ title: "", dueDate: "", estimatedHours: "", notes: "" });
  const [newTask, setNewTask] = useState("");
  const [stopNote, setStopNote] = useState("");

  useEffect(() => {
    (async () => {
      const s = await sload("sched_v1");
      const a = await sload("assign_v1");
      if (s) setSchedule(s);
      if (a) setAssignments(a);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) ssave("sched_v1", schedule); }, [schedule, loaded]);
  useEffect(() => { if (loaded) ssave("assign_v1", assignments); }, [assignments, loaded]);

  const todayIdx = TODAY_IDX();
  const todayClasses = schedule.filter(c => DAYS.indexOf(c.day) === todayIdx).sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
  const pendingAssign = assignments.filter(a => !a.done);

  const addClass = () => {
    if (!cForm.subject.trim()) return;
    setSchedule(s => [...s, { ...cForm, id: uid() }]);
    setCForm({ subject: "", day: "Monday", startTime: "08:00", endTime: "09:00", color: "#6C63FF" });
    setClassModal(false);
  };
  const deleteClass = (id) => setSchedule(s => s.filter(c => c.id !== id));
  const addAssignment = () => {
    if (!aForm.title.trim()) return;
    setAssignments(s => [...s, { ...aForm, id: uid(), subtasks: [], lastStopped: "", done: false }]);
    setAForm({ title: "", dueDate: "", estimatedHours: "", notes: "" });
    setAssignModal(null);
  };
  const updateAssignment = useCallback((id, patch) => setAssignments(s => s.map(a => a.id === id ? { ...a, ...patch } : a)), []);
  const deleteAssignment = (id) => setAssignments(s => s.filter(a => a.id !== id));
  const addSubtask = (id) => {
    if (!newTask.trim()) return;
    setAssignments(s => s.map(a => a.id === id ? { ...a, subtasks: [...a.subtasks, { id: uid(), text: newTask.trim(), done: false }] } : a));
    setNewTask("");
  };
  const updateSubtask = (aid, task) => setAssignments(s => s.map(a => a.id === aid ? { ...a, subtasks: a.subtasks.map(t => t.id === task.id ? task : t) } : a));
  const deleteSubtask = (aid, tid) => setAssignments(s => s.map(a => a.id === aid ? { ...a, subtasks: a.subtasks.filter(t => t.id !== tid) } : a));
  const saveStop = (id) => { updateAssignment(id, { lastStopped: stopNote }); setProgressModal(null); setStopNote(""); };

  if (!loaded) {
    return <div style={{ background: "#0F1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>Loading...</div>;
  }

  const TodayView = () => {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const sorted = [...todayClasses].sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
    const gaps = [];
    let cursor = DAY_START;
    for (const c of sorted) {
      const cs = toMins(c.startTime), ce = toMins(c.endTime);
      if (cs > cursor + 29) gaps.push({ start: cursor, end: cs });
      cursor = Math.max(cursor, ce);
    }
    if (cursor < DAY_END - 29) gaps.push({ start: cursor, end: DAY_END });
    const upcomingGaps = gaps.filter(g => g.end > nowMins);
    const nextClass = sorted.find(c => toMins(c.startTime) > nowMins);
    const inClass = sorted.find(c => toMins(c.startTime) <= nowMins && toMins(c.endTime) > nowMins);

    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#E8E9F0" }}>{DAYS[todayIdx]}</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        {inClass && (
          <div style={{ background: "#6C63FF22", border: "1px solid #6C63FF44", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>📚</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6C63FF" }}>In class: {inClass.subject}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Ends at {fmtTime(inClass.endTime)}</div>
            </div>
          </div>
        )}
        {nextClass && !inClass && (
          <div style={{ background: "#FF8C4222", border: "1px solid #FF8C4244", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FF8C42" }}>Next: {nextClass.subject}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Starts at {fmtTime(nextClass.startTime)}</div>
            </div>
          </div>
        )}
        <div style={{ background: "#1A1E2E", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #2A2D3E" }}>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Today's Timeline</div>
          {todayClasses.length === 0 && schedule.length === 0
            ? <div style={{ fontSize: 13, color: "#4B5063", textAlign: "center", padding: "16px 0" }}>No classes added yet. Go to Schedule.</div>
            : todayClasses.length === 0
            ? <div style={{ fontSize: 13, color: "#4B5063", textAlign: "center", padding: "16px 0" }}>No classes today — full day free!</div>
            : <Timeline classes={todayClasses} onGapClick={setGapModal} />
          }
        </div>
        {upcomingGaps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Free Gaps Ahead</div>
            {upcomingGaps.map((g, i) => {
              const suggestion = pendingAssign[0];
              return (
                <div key={i} onClick={() => setGapModal(g)} style={{ background: "#2DD4A010", border: "1px solid #2DD4A030", borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2DD4A0" }}>{fmtTime(toTime(g.start))} – {fmtTime(toTime(g.end))}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{g.end - g.start} minutes free</div>
                    {suggestion && <div style={{ fontSize: 11, color: "#6C63FF", marginTop: 4 }}>💡 Work on: {suggestion.title}</div>}
                  </div>
                  <span style={{ fontSize: 20 }}>→</span>
                </div>
              );
            })}
          </div>
        )}
        <div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Pending Work</div>
          {pendingAssign.length === 0
            ? <div style={{ fontSize: 13, color: "#4B5063", textAlign: "center", padding: "16px 0" }}>All clear.</div>
            : pendingAssign.slice(0, 4).map(a => {
                const done = a.subtasks.filter(t => t.done).length;
                const total = a.subtasks.length;
                const p = total ? Math.round(done / total * 100) : 0;
                return (
                  <div key={a.id} style={{ background: "#1A1E2E", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #2A2D3E" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E9F0" }}>{a.title}</div>
                        {a.dueDate && <div style={{ fontSize: 11, color: "#FF8C42", marginTop: 2 }}>Due {a.dueDate}</div>}
                        {a.lastStopped && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontStyle: "italic" }}>Stopped: {a.lastStopped}</div>}
                      </div>
                      <Btn variant="ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { setProgressModal(a); setStopNote(a.lastStopped || ""); }}>Update</Btn>
                    </div>
                    {total > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>
                          <span>{done}/{total} done</span><span>{p}%</span>
                        </div>
                        <div style={{ height: 4, background: "#2A2D3E", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${p}%`, background: "#6C63FF", borderRadius: 2, transition: "width .3s" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>
    );
  };

  const ScheduleView = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#E8E9F0" }}>Class Schedule</span>
        <Btn onClick={() => setClassModal(true)}>+ Add Class</Btn>
      </div>
      {DAYS.map((day, di) => {
        const classes = schedule.filter(c => c.day === day).sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
        if (classes.length === 0 && di !== todayIdx) return null;
        return (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: di === todayIdx ? "#6C63FF" : "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              {day} {di === todayIdx && <Badge color="#6C63FF" label="Today" />}
            </div>
            {classes.length === 0
              ? <div style={{ fontSize: 12, color: "#4B5063", padding: "8px 0" }}>No classes</div>
              : classes.map(c => (
                <div key={c.id} style={{ background: "#1A1E2E", borderRadius: 10, padding: "10px 14px", marginBottom: 6, border: "1px solid #2A2D3E", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E9F0" }}>{c.subject}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{fmtTime(c.startTime)} – {fmtTime(c.endTime)}</div>
                  </div>
                  <button onClick={() => deleteClass(c.id)} style={{ background: "none", border: "none", color: "#4B5063", cursor: "pointer", fontSize: 18 }}>×</button>
                </div>
              ))
            }
          </div>
        );
      })}
      {schedule.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#4B5063" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📅</div><div>No classes yet.</div></div>}
    </div>
  );

  const AssignmentsView = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#E8E9F0" }}>Assignments</span>
        <Btn onClick={() => { setAForm({ title: "", dueDate: "", estimatedHours: "", notes: "" }); setAssignModal("new"); }}>+ Add</Btn>
      </div>
      {assignments.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#4B5063" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📝</div><div>No assignments yet.</div></div>}
      {assignments.map(a => {
        const done = a.subtasks.filter(t => t.done).length;
        const total = a.subtasks.length;
        const p = total ? Math.round(done / total * 100) : 0;
        return (
          <div key={a.id} style={{ background: "#1A1E2E", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #2A2D3E", opacity: a.done ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <input type="checkbox" checked={a.done} onChange={e => updateAssignment(a.id, { done: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#6C63FF", cursor: "pointer" }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#E8E9F0", textDecoration: a.done ? "line-through" : "none" }}>{a.title}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 24 }}>
                  {a.dueDate && <Badge color="#FF8C42" label={`Due ${a.dueDate}`} />}
                  {a.estimatedHours && <Badge color="#9CA3AF" label={`~${a.estimatedHours}h`} />}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setAssignModal(a)}>Edit</Btn>
                <Btn variant="danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => deleteAssignment(a.id)}>Del</Btn>
              </div>
            </div>
            {a.lastStopped && <div style={{ marginTop: 10, marginLeft: 24, padding: "8px 12px", background: "#0F1117", borderRadius: 8, fontSize: 12, color: "#9CA3AF", borderLeft: "2px solid #6C63FF" }}>📌 {a.lastStopped}</div>}
            {total > 0 && (
              <div style={{ marginTop: 12, marginLeft: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>
                  <span>Progress</span><span>{done}/{total} — {p}%</span>
                </div>
                <div style={{ height: 4, background: "#2A2D3E", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${p}%`, background: "#6C63FF", borderRadius: 2 }} />
                </div>
                <div style={{ marginTop: 10 }}>
                  {a.subtasks.map(t => <TaskItem key={t.id} task={t} onChange={updated => updateSubtask(a.id, updated)} onDelete={() => deleteSubtask(a.id, t.id)} />)}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginLeft: 24 }}>
              <Btn variant="teal" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { setProgressModal(a); setStopNote(a.lastStopped || ""); }}>📌 Update Progress</Btn>
              <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setAssignModal(a)}>+ Add Task</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );

  const navTabs = [
    { id: "today", label: "Today", icon: "🏠" },
    { id: "schedule", label: "Schedule", icon: "📅" },
    { id: "assignments", label: "Work", icon: "📝" },
    { id: "group", label: "Group", icon: "👥" },
  ];

  return (
    <div style={{ background: "#0F1117", minHeight: "100vh", color: "#E8E9F0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ padding: "20px 20px 0", borderBottom: "1px solid #1A1E2E", position: "sticky", top: 0, background: "#0F1117", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#E8E9F0", letterSpacing: -0.5 }}>StudyGaps</span>
          <span style={{ fontSize: 12, color: "#4B5063" }}>by Ezz</span>
        </div>
        <div style={{ display: "flex" }}>
          {navTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 11, fontWeight: 700, color: tab === t.id ? "#6C63FF" : "#4B5063", borderBottom: tab === t.id ? "2px solid #6C63FF" : "2px solid transparent", transition: "all .15s" }}>
              <span style={{ marginRight: 3 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {tab === "today" && <TodayView />}
        {tab === "schedule" && <ScheduleView />}
        {tab === "assignments" && <AssignmentsView />}
        {tab === "group" && <GroupTab />}
      </div>

      {classModal && (
        <Modal title="Add Class" onClose={() => setClassModal(false)}>
          <Field label="Subject name" placeholder="e.g. PPYF103" value={cForm.subject} onChange={e => setCForm(f => ({ ...f, subject: e.target.value }))} />
          <Sel label="Day" value={cForm.day} onChange={e => setCForm(f => ({ ...f, day: e.target.value }))}>
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Start time" type="time" value={cForm.startTime} onChange={e => setCForm(f => ({ ...f, startTime: e.target.value }))} />
            <Field label="End time" type="time" value={cForm.endTime} onChange={e => setCForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>Color</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CLASS_COLORS.map(c => (
                <div key={c} onClick={() => setCForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", outline: cForm.color === c ? "3px solid #fff" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setClassModal(false)}>Cancel</Btn>
            <Btn onClick={addClass}>Save</Btn>
          </div>
        </Modal>
      )}

      {assignModal && (
        <Modal title={typeof assignModal === "string" ? "New Assignment" : "Edit Assignment"} onClose={() => setAssignModal(null)}>
          {typeof assignModal === "string" ? (
            <>
              <Field label="Assignment title" placeholder="e.g. Community Impact Reflection" value={aForm.title} onChange={e => setAForm(f => ({ ...f, title: e.target.value }))} />
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Due date" type="date" value={aForm.dueDate} onChange={e => setAForm(f => ({ ...f, dueDate: e.target.value }))} />
                <Field label="Est. hours" type="number" placeholder="3" value={aForm.estimatedHours} onChange={e => setAForm(f => ({ ...f, estimatedHours: e.target.value }))} />
              </div>
              <Field label="Notes" placeholder="Any context..." value={aForm.notes} onChange={e => setAForm(f => ({ ...f, notes: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Btn>
                <Btn onClick={addAssignment}>Add</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E9F0", marginBottom: 16 }}>{assignModal.title}</div>
              <div style={{ marginBottom: 8, fontSize: 12, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Subtasks</div>
              {assignModal.subtasks.map(t => (
                <TaskItem key={t.id} task={t} onChange={updated => updateSubtask(assignModal.id, updated)} onDelete={() => deleteSubtask(assignModal.id, t.id)} />
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubtask(assignModal.id)} placeholder="Add a task and press Enter..."
                  style={{ flex: 1, background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 12px", color: "#E8E9F0", fontSize: 13, outline: "none" }} />
                <Btn onClick={() => addSubtask(assignModal.id)}>+</Btn>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={() => setAssignModal(null)}>Done</Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {progressModal && (
        <Modal title="Where did you stop?" onClose={() => setProgressModal(null)}>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 12 }}>{progressModal.title}</div>
          <textarea value={stopNote} onChange={e => setStopNote(e.target.value)} placeholder="e.g. Finished the intro, need to start body section 2..." rows={4}
            style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 12px", color: "#E8E9F0", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => setProgressModal(null)}>Cancel</Btn>
            <Btn onClick={() => saveStop(progressModal.id)}>Save</Btn>
          </div>
        </Modal>
      )}

      {gapModal && (
        <Modal title="Free Gap" onClose={() => setGapModal(null)}>
          <div style={{ background: "#2DD4A010", border: "1px solid #2DD4A030", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#2DD4A0" }}>{fmtTime(toTime(gapModal.start))} – {fmtTime(toTime(gapModal.end))}</div>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{gapModal.end - gapModal.start} minutes available</div>
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>What to work on</div>
          {pendingAssign.length === 0
            ? <div style={{ color: "#4B5063", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No pending assignments!</div>
            : pendingAssign.map(a => {
                const nextTask = a.subtasks.find(t => !t.done);
                const done = a.subtasks.filter(t => t.done).length;
                const total = a.subtasks.length;
                return (
                  <div key={a.id} style={{ background: "#1A1E2E", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #2A2D3E" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E9F0" }}>{a.title}</div>
                    {a.dueDate && <div style={{ fontSize: 11, color: "#FF8C42", marginTop: 2 }}>Due {a.dueDate}</div>}
                    {a.lastStopped && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontStyle: "italic" }}>Last stopped: {a.lastStopped}</div>}
                    {nextTask && <div style={{ marginTop: 8, padding: "6px 10px", background: "#6C63FF15", borderRadius: 6, fontSize: 12, color: "#A99EFF" }}>Next: {nextTask.text}</div>}
                    {total > 0 && <div style={{ marginTop: 8, height: 3, background: "#2A2D3E", borderRadius: 2 }}><div style={{ height: "100%", width: `${Math.round(done / total * 100)}%`, background: "#6C63FF", borderRadius: 2 }} /></div>}
                  </div>
                );
              })
          }
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <Btn onClick={() => setGapModal(null)}>Got it</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
