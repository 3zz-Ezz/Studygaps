import { useState, useEffect, useCallback } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TODAY_IDX = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const toMins = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const toTime = (m) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const fmtTime = (t) => { const [h,m] = t.split(":").map(Number); const ap=h>=12?"PM":"AM"; return `${h%12||12}:${String(m).padStart(2,"0")} ${ap}`; };
const uid = () => Math.random().toString(36).slice(2,9);
const DAY_START = 7*60, DAY_END = 23*60;

const CLASS_COLORS = [
  "#6C63FF","#FF8C42","#2DD4A0","#E056C0","#3B9EFF","#F5D76E","#FF6B6B"
];

// ─── storage helpers ─────────────────────────────────────────────────────────
function load(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── components ──────────────────────────────────────────────────────────────
function Badge({ color, label }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

function Modal({ onClose, children, title }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:"#1A1E2E", borderRadius:14, padding:24, width:"100%", maxWidth:440,
        border:"1px solid #2A2D3E", maxHeight:"90vh", overflowY:"auto"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:700, fontSize:16, color:"#E8E9F0"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:12,color:"#9CA3AF",marginBottom:6}}>{label}</div>}
      <input {...props} style={{
        width:"100%", background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8,
        padding:"10px 12px", color:"#E8E9F0", fontSize:14, outline:"none",
        boxSizing:"border-box", ...props.style
      }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:12,color:"#9CA3AF",marginBottom:6}}>{label}</div>}
      <select {...props} style={{
        width:"100%", background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8,
        padding:"10px 12px", color:"#E8E9F0", fontSize:14, outline:"none", boxSizing:"border-box"
      }}>{children}</select>
    </div>
  );
}

function Btn({ children, variant="primary", style={}, ...props }) {
  const base = {
    border:"none", borderRadius:8, padding:"10px 18px", fontWeight:600,
    fontSize:14, cursor:"pointer", transition:"opacity .15s", ...style
  };
  const styles = {
    primary: { background:"#6C63FF", color:"#fff", ...base },
    ghost: { background:"transparent", color:"#9CA3AF", border:"1px solid #2A2D3E", ...base },
    danger: { background:"#FF6B6B22", color:"#FF6B6B", border:"1px solid #FF6B6B44", ...base },
    teal: { background:"#2DD4A022", color:"#2DD4A0", border:"1px solid #2DD4A044", ...base },
  };
  return <button style={styles[variant]} {...props}>{children}</button>;
}

function Timeline({ classes, onGapClick }) {
  const total = DAY_END - DAY_START;
  const pct = (m) => ((m - DAY_START) / total) * 100;

  const sorted = [...classes].sort((a,b)=>toMins(a.startTime)-toMins(b.startTime));
  const gaps = [];
  let cursor = DAY_START;
  for (const c of sorted) {
    const cs = toMins(c.startTime), ce = toMins(c.endTime);
    if (cs > cursor + 29) gaps.push({ start: cursor, end: cs });
    cursor = Math.max(cursor, ce);
  }
  if (cursor < DAY_END - 29) gaps.push({ start: cursor, end: DAY_END });

  const nowMins = (() => { const n=new Date(); return n.getHours()*60+n.getMinutes(); })();
  const nowPct = pct(nowMins);
  const hourTicks = [];
  for (let h = 7; h <= 23; h += 2) hourTicks.push(h);

  return (
    <div>
      <div style={{position:"relative",height:18,marginBottom:4}}>
        {hourTicks.map(h => (
          <span key={h} style={{
            position:"absolute", left:`${pct(h*60)}%`, transform:"translateX(-50%)",
            fontSize:10, color:"#4B5063"
          }}>{h%12||12}{h<12?"am":"pm"}</span>
        ))}
      </div>
      <div style={{
        position:"relative", height:44, background:"#0F1117",
        borderRadius:8, overflow:"hidden", border:"1px solid #2A2D3E"
      }}>
        {gaps.map((g,i) => (
          <div key={i} onClick={() => onGapClick && onGapClick(g)}
            title={`Free: ${fmtTime(toTime(g.start))} – ${fmtTime(toTime(g.end))} (${g.end-g.start} min)`}
            style={{
              position:"absolute", top:0, bottom:0,
              left:`${pct(g.start)}%`, width:`${pct(g.end)-pct(g.start)}%`,
              background:"#2DD4A018", borderLeft:"2px solid #2DD4A0",
              cursor: onGapClick ? "pointer" : "default",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="#2DD4A030"}
            onMouseLeave={e=>e.currentTarget.style.background="#2DD4A018"}
          />
        ))}
        {sorted.map((c) => (
          <div key={c.id} title={`${c.subject}: ${fmtTime(c.startTime)} – ${fmtTime(c.endTime)}`}
            style={{
              position:"absolute", top:4, bottom:4,
              left:`${pct(toMins(c.startTime))}%`,
              width:`${pct(toMins(c.endTime))-pct(toMins(c.startTime))}%`,
              background: c.color || "#6C63FF",
              borderRadius:5, display:"flex", alignItems:"center",
              justifyContent:"center", overflow:"hidden",
              fontSize:10, fontWeight:700, color:"#fff", padding:"0 4px"
            }}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.subject}</span>
          </div>
        ))}
        {nowMins >= DAY_START && nowMins <= DAY_END && (
          <div style={{
            position:"absolute", top:0, bottom:0, left:`${nowPct}%`,
            width:2, background:"#FF8C42", zIndex:10
          }}>
            <div style={{
              position:"absolute", top:-6, left:"50%", transform:"translateX(-50%)",
              width:8, height:8, borderRadius:"50%", background:"#FF8C42"
            }} />
          </div>
        )}
      </div>
      <div style={{marginTop:8, display:"flex", gap:6, flexWrap:"wrap"}}>
        {gaps.map((g,i) => (
          <span key={i} style={{
            fontSize:11, color:"#2DD4A0",
            background:"#2DD4A012", border:"1px solid #2DD4A030",
            borderRadius:6, padding:"3px 8px", cursor: onGapClick?"pointer":"default"
          }} onClick={() => onGapClick && onGapClick(g)}>
            {fmtTime(toTime(g.start))} – {fmtTime(toTime(g.end))} ({g.end-g.start}m)
          </span>
        ))}
        {gaps.length === 0 && <span style={{fontSize:11,color:"#4B5063"}}>No gaps today</span>}
      </div>
    </div>
  );
}

function TaskItem({ task, onChange, onDelete }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, padding:"8px 0",
      borderBottom:"1px solid #1C1F2E"
    }}>
      <input type="checkbox" checked={task.done} onChange={e=>onChange({...task,done:e.target.checked})}
        style={{width:16,height:16,cursor:"pointer",accentColor:"#6C63FF"}} />
      <span style={{
        flex:1, fontSize:14, color: task.done ? "#4B5063" : "#C4C6D4",
        textDecoration: task.done ? "line-through" : "none"
      }}>{task.text}</span>
      <button onClick={onDelete} style={{background:"none",border:"none",color:"#4B5063",cursor:"pointer",fontSize:16}}>×</button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("today");
  const [schedule, setSchedule] = useState(() => load("sched_v1") || []);
  const [assignments, setAssignments] = useState(() => load("assign_v1") || []);

  const [classModal, setClassModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [progressModal, setProgressModal] = useState(null);
  const [gapModal, setGapModal] = useState(null);

  const [cForm, setCForm] = useState({ subject:"", day:"Monday", startTime:"08:00", endTime:"09:00", color:"#6C63FF" });
  const [aForm, setAForm] = useState({ title:"", dueDate:"", estimatedHours:"", notes:"" });
  const [newTask, setNewTask] = useState("");
  const [stopNote, setStopNote] = useState("");

  useEffect(() => { save("sched_v1", schedule); }, [schedule]);
  useEffect(() => { save("assign_v1", assignments); }, [assignments]);

  const todayIdx = TODAY_IDX();
  const todayClasses = schedule.filter(c => DAYS.indexOf(c.day) === todayIdx)
    .sort((a,b) => toMins(a.startTime) - toMins(b.startTime));

  const addClass = () => {
    if (!cForm.subject.trim()) return;
    setSchedule(s => [...s, { ...cForm, id: uid() }]);
    setCForm({ subject:"", day:"Monday", startTime:"08:00", endTime:"09:00", color:"#6C63FF" });
    setClassModal(false);
  };
  const deleteClass = (id) => setSchedule(s => s.filter(c => c.id !== id));

  const addAssignment = () => {
    if (!aForm.title.trim()) return;
    setAssignments(s => [...s, { ...aForm, id: uid(), subtasks: [], lastStopped: "", done: false }]);
    setAForm({ title:"", dueDate:"", estimatedHours:"", notes:"" });
    setAssignModal(null);
  };
  const updateAssignment = useCallback((id, patch) => {
    setAssignments(s => s.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);
  const deleteAssignment = (id) => setAssignments(s => s.filter(a => a.id !== id));
  const addSubtask = (id) => {
    if (!newTask.trim()) return;
    setAssignments(s => s.map(a => a.id === id
      ? { ...a, subtasks: [...a.subtasks, { id: uid(), text: newTask.trim(), done: false }] } : a));
    setNewTask("");
  };
  const updateSubtask = (assignId, task) => {
    setAssignments(s => s.map(a => a.id === assignId
      ? { ...a, subtasks: a.subtasks.map(t => t.id === task.id ? task : t) } : a));
  };
  const deleteSubtask = (assignId, taskId) => {
    setAssignments(s => s.map(a => a.id === assignId
      ? { ...a, subtasks: a.subtasks.filter(t => t.id !== taskId) } : a));
  };
  const saveStop = (id) => {
    updateAssignment(id, { lastStopped: stopNote });
    setProgressModal(null);
    setStopNote("");
  };

  const pendingAssign = assignments.filter(a => !a.done);

  const TodayView = () => {
    const nowMins = new Date().getHours()*60 + new Date().getMinutes();
    const sorted = [...todayClasses].sort((a,b)=>toMins(a.startTime)-toMins(b.startTime));
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
        <div style={{marginBottom:20}}>
          <div style={{fontSize:22, fontWeight:800, color:"#E8E9F0"}}>{DAYS[todayIdx]}</div>
          <div style={{fontSize:13, color:"#9CA3AF", marginTop:2}}>
            {new Date().toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>

        {inClass && (
          <div style={{background:"#6C63FF22",border:"1px solid #6C63FF44",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>📚</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#6C63FF"}}>In class: {inClass.subject}</div>
              <div style={{fontSize:12,color:"#9CA3AF"}}>Ends at {fmtTime(inClass.endTime)}</div>
            </div>
          </div>
        )}
        {nextClass && !inClass && (
          <div style={{background:"#FF8C4222",border:"1px solid #FF8C4244",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>⏰</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#FF8C42"}}>Next: {nextClass.subject}</div>
              <div style={{fontSize:12,color:"#9CA3AF"}}>Starts at {fmtTime(nextClass.startTime)}</div>
            </div>
          </div>
        )}

        <div style={{background:"#1A1E2E",borderRadius:12,padding:16,marginBottom:20,border:"1px solid #2A2D3E"}}>
          <div style={{fontSize:12,color:"#9CA3AF",marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Today's Timeline</div>
          {todayClasses.length === 0 && schedule.length === 0
            ? <div style={{fontSize:13,color:"#4B5063",textAlign:"center",padding:"16px 0"}}>No classes added yet. Go to Schedule to add your timetable.</div>
            : todayClasses.length === 0
            ? <div style={{fontSize:13,color:"#4B5063",textAlign:"center",padding:"16px 0"}}>No classes today — full day free!</div>
            : <Timeline classes={todayClasses} onGapClick={setGapModal} />
          }
        </div>

        {upcomingGaps.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:"#9CA3AF",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Free Gaps Ahead</div>
            {upcomingGaps.map((g,i) => {
              const dur = g.end - g.start;
              const suggestion = pendingAssign.find(a => !a.done);
              return (
                <div key={i} onClick={() => setGapModal(g)}
                  style={{background:"#2DD4A010",border:"1px solid #2DD4A030",borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#2DD4A0"}}>{fmtTime(toTime(g.start))} – {fmtTime(toTime(g.end))}</div>
                    <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{dur} minutes free</div>
                    {suggestion && <div style={{fontSize:11,color:"#6C63FF",marginTop:4}}>💡 Work on: {suggestion.title}</div>}
                  </div>
                  <span style={{fontSize:20}}>→</span>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div style={{fontSize:12,color:"#9CA3AF",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Pending Work</div>
          {pendingAssign.length === 0
            ? <div style={{fontSize:13,color:"#4B5063",textAlign:"center",padding:"16px 0"}}>All clear — nothing pending.</div>
            : pendingAssign.slice(0,4).map(a => {
                const done = a.subtasks.filter(t=>t.done).length;
                const total = a.subtasks.length;
                const pct = total ? Math.round(done/total*100) : 0;
                return (
                  <div key={a.id} style={{background:"#1A1E2E",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid #2A2D3E"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#E8E9F0"}}>{a.title}</div>
                        {a.dueDate && <div style={{fontSize:11,color:"#FF8C42",marginTop:2}}>Due {a.dueDate}</div>}
                        {a.lastStopped && <div style={{fontSize:11,color:"#9CA3AF",marginTop:4,fontStyle:"italic"}}>Stopped at: {a.lastStopped}</div>}
                      </div>
                      <Btn variant="ghost" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{setProgressModal(a);setStopNote(a.lastStopped||"");}}>Update</Btn>
                    </div>
                    {total > 0 && (
                      <div style={{marginTop:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#9CA3AF",marginBottom:4}}>
                          <span>{done}/{total} tasks done</span><span>{pct}%</span>
                        </div>
                        <div style={{height:4,background:"#2A2D3E",borderRadius:2}}>
                          <div style={{height:"100%",width:`${pct}%`,background:"#6C63FF",borderRadius:2,transition:"width .3s"}} />
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <span style={{fontSize:18,fontWeight:800,color:"#E8E9F0"}}>Class Schedule</span>
        <Btn onClick={()=>setClassModal(true)}>+ Add Class</Btn>
      </div>
      {DAYS.map((day,di) => {
        const classes = schedule.filter(c=>c.day===day).sort((a,b)=>toMins(a.startTime)-toMins(b.startTime));
        if (classes.length === 0 && di !== todayIdx) return null;
        return (
          <div key={day} style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:di===todayIdx?"#6C63FF":"#9CA3AF",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
              {day} {di===todayIdx && <Badge color="#6C63FF" label="Today" />}
            </div>
            {classes.length === 0
              ? <div style={{fontSize:12,color:"#4B5063",padding:"8px 0"}}>No classes</div>
              : classes.map(c => (
                <div key={c.id} style={{background:"#1A1E2E",borderRadius:10,padding:"10px 14px",marginBottom:6,border:"1px solid #2A2D3E",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:c.color,flexShrink:0}} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#E8E9F0"}}>{c.subject}</div>
                    <div style={{fontSize:12,color:"#9CA3AF"}}>{fmtTime(c.startTime)} – {fmtTime(c.endTime)}</div>
                  </div>
                  <button onClick={()=>deleteClass(c.id)} style={{background:"none",border:"none",color:"#4B5063",cursor:"pointer",fontSize:18}}>×</button>
                </div>
              ))
            }
          </div>
        );
      })}
      {schedule.length === 0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:"#4B5063"}}>
          <div style={{fontSize:32,marginBottom:8}}>📅</div>
          <div>No classes yet. Add your timetable!</div>
        </div>
      )}
    </div>
  );

  const AssignmentsView = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <span style={{fontSize:18,fontWeight:800,color:"#E8E9F0"}}>Assignments</span>
        <Btn onClick={()=>{setAForm({title:"",dueDate:"",estimatedHours:"",notes:""});setAssignModal("new");}}>+ Add</Btn>
      </div>
      {assignments.length === 0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:"#4B5063"}}>
          <div style={{fontSize:32,marginBottom:8}}>📝</div>
          <div>No assignments yet.</div>
        </div>
      )}
      {assignments.map(a => {
        const done = a.subtasks.filter(t=>t.done).length;
        const total = a.subtasks.length;
        const pct = total ? Math.round(done/total*100) : 0;
        return (
          <div key={a.id} style={{background:"#1A1E2E",borderRadius:12,padding:16,marginBottom:12,border:"1px solid #2A2D3E",opacity:a.done?0.6:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <input type="checkbox" checked={a.done} onChange={e=>updateAssignment(a.id,{done:e.target.checked})}
                    style={{width:16,height:16,accentColor:"#6C63FF",cursor:"pointer"}} />
                  <span style={{fontSize:15,fontWeight:700,color:"#E8E9F0",textDecoration:a.done?"line-through":"none"}}>{a.title}</span>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginLeft:24}}>
                  {a.dueDate && <Badge color="#FF8C42" label={`Due ${a.dueDate}`} />}
                  {a.estimatedHours && <Badge color="#9CA3AF" label={`~${a.estimatedHours}h`} />}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="ghost" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setAssignModal(a)}>Edit</Btn>
                <Btn variant="danger" style={{padding:"4px 10px",fontSize:12}} onClick={()=>deleteAssignment(a.id)}>Del</Btn>
              </div>
            </div>
            {a.lastStopped && (
              <div style={{marginTop:10,marginLeft:24,padding:"8px 12px",background:"#0F1117",borderRadius:8,fontSize:12,color:"#9CA3AF",borderLeft:"2px solid #6C63FF"}}>
                📌 Stopped at: <span style={{color:"#C4C6D4"}}>{a.lastStopped}</span>
              </div>
            )}
            {total > 0 && (
              <div style={{marginTop:12,marginLeft:24}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#9CA3AF",marginBottom:4}}>
                  <span>Progress</span><span>{done}/{total} — {pct}%</span>
                </div>
                <div style={{height:4,background:"#2A2D3E",borderRadius:2}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"#6C63FF",borderRadius:2}} />
                </div>
                <div style={{marginTop:10}}>
                  {a.subtasks.map(t => (
                    <TaskItem key={t.id} task={t}
                      onChange={updated => updateSubtask(a.id, updated)}
                      onDelete={() => deleteSubtask(a.id, t.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:12,marginLeft:24}}>
              <Btn variant="teal" style={{padding:"6px 12px",fontSize:12}} onClick={()=>{setProgressModal(a);setStopNote(a.lastStopped||"");}}>📌 Update Progress</Btn>
              <Btn variant="ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setAssignModal(a)}>+ Add Task</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );

  const navTabs = [
    { id:"today", label:"Today", icon:"🏠" },
    { id:"schedule", label:"Schedule", icon:"📅" },
    { id:"assignments", label:"Work", icon:"📝" },
  ];

  return (
    <div style={{background:"#0F1117",minHeight:"100vh",color:"#E8E9F0",fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 0",borderBottom:"1px solid #1A1E2E",position:"sticky",top:0,background:"#0F1117",zIndex:50,paddingBottom:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:14}}>
          <span style={{fontSize:20,fontWeight:900,color:"#E8E9F0",letterSpacing:-0.5}}>StudyGaps</span>
          <span style={{fontSize:12,color:"#4B5063"}}>by Ezz</span>
        </div>
        <div style={{display:"flex",gap:0}}>
          {navTabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 0",fontSize:12,fontWeight:700,
              color:tab===t.id?"#6C63FF":"#4B5063",
              borderBottom:tab===t.id?"2px solid #6C63FF":"2px solid transparent",transition:"all .15s"
            }}>
              <span style={{marginRight:4}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:20}}>
        {tab==="today" && <TodayView />}
        {tab==="schedule" && <ScheduleView />}
        {tab==="assignments" && <AssignmentsView />}
      </div>

      {classModal && (
        <Modal title="Add Class" onClose={()=>setClassModal(false)}>
          <Input label="Subject name" placeholder="e.g. PPYF103" value={cForm.subject} onChange={e=>setCForm(f=>({...f,subject:e.target.value}))} />
          <Select label="Day" value={cForm.day} onChange={e=>setCForm(f=>({...f,day:e.target.value}))}>
            {DAYS.map(d=><option key={d}>{d}</option>)}
          </Select>
          <div style={{display:"flex",gap:10}}>
            <Input label="Start time" type="time" value={cForm.startTime} onChange={e=>setCForm(f=>({...f,startTime:e.target.value}))} />
            <Input label="End time" type="time" value={cForm.endTime} onChange={e=>setCForm(f=>({...f,endTime:e.target.value}))} />
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#9CA3AF",marginBottom:8}}>Color</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {CLASS_COLORS.map(c=>(
                <div key={c} onClick={()=>setCForm(f=>({...f,color:c}))}
                  style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",outline:cForm.color===c?"3px solid #fff":"none",outlineOffset:2}} />
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={()=>setClassModal(false)}>Cancel</Btn>
            <Btn onClick={addClass}>Save</Btn>
          </div>
        </Modal>
      )}

      {assignModal && (
        <Modal title={typeof assignModal==="string" ? "New Assignment" : "Edit Assignment"} onClose={()=>setAssignModal(null)}>
          {typeof assignModal === "string" ? (
            <>
              <Input label="Assignment title" placeholder="e.g. Community Impact Reflection" value={aForm.title} onChange={e=>setAForm(f=>({...f,title:e.target.value}))} />
              <div style={{display:"flex",gap:10}}>
                <Input label="Due date" type="date" value={aForm.dueDate} onChange={e=>setAForm(f=>({...f,dueDate:e.target.value}))} />
                <Input label="Est. hours" type="number" placeholder="3" value={aForm.estimatedHours} onChange={e=>setAForm(f=>({...f,estimatedHours:e.target.value}))} />
              </div>
              <Input label="Notes (optional)" placeholder="Any context..." value={aForm.notes} onChange={e=>setAForm(f=>({...f,notes:e.target.value}))} />
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <Btn variant="ghost" onClick={()=>setAssignModal(null)}>Cancel</Btn>
                <Btn onClick={addAssignment}>Add</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{fontSize:14,fontWeight:700,color:"#E8E9F0",marginBottom:16}}>{assignModal.title}</div>
              <div style={{marginBottom:8,fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Subtasks / To-Do</div>
              {assignModal.subtasks.map(t => (
                <TaskItem key={t.id} task={t}
                  onChange={updated => updateSubtask(assignModal.id, updated)}
                  onDelete={() => deleteSubtask(assignModal.id, t.id)}
                />
              ))}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <input value={newTask} onChange={e=>setNewTask(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addSubtask(assignModal.id)}
                  placeholder="Add a task and press Enter..."
                  style={{flex:1,background:"#0F1117",border:"1px solid #2A2D3E",borderRadius:8,padding:"10px 12px",color:"#E8E9F0",fontSize:13,outline:"none"}} />
                <Btn onClick={()=>addSubtask(assignModal.id)}>+</Btn>
              </div>
              <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
                <Btn onClick={()=>setAssignModal(null)}>Done</Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {progressModal && (
        <Modal title="Where did you stop?" onClose={()=>setProgressModal(null)}>
          <div style={{fontSize:13,color:"#9CA3AF",marginBottom:12}}>{progressModal.title}</div>
          <textarea value={stopNote} onChange={e=>setStopNote(e.target.value)}
            placeholder="e.g. Finished the intro paragraph, need to start body section 2..."
            rows={4}
            style={{width:"100%",background:"#0F1117",border:"1px solid #2A2D3E",borderRadius:8,padding:"10px 12px",color:"#E8E9F0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}
          />
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
            <Btn variant="ghost" onClick={()=>setProgressModal(null)}>Cancel</Btn>
            <Btn onClick={()=>saveStop(progressModal.id)}>Save Progress</Btn>
          </div>
        </Modal>
      )}

      {gapModal && (
        <Modal title="Free Gap" onClose={()=>setGapModal(null)}>
          <div style={{background:"#2DD4A010",border:"1px solid #2DD4A030",borderRadius:10,padding:14,marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#2DD4A0"}}>{fmtTime(toTime(gapModal.start))} – {fmtTime(toTime(gapModal.end))}</div>
            <div style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{gapModal.end - gapModal.start} minutes available</div>
          </div>
          <div style={{fontSize:12,color:"#9CA3AF",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>What to work on</div>
          {pendingAssign.length === 0
            ? <div style={{color:"#4B5063",fontSize:13,textAlign:"center",padding:"20px 0"}}>No pending assignments!</div>
            : pendingAssign.map(a => {
                const nextTask = a.subtasks.find(t=>!t.done);
                const done = a.subtasks.filter(t=>t.done).length;
                const total = a.subtasks.length;
                return (
                  <div key={a.id} style={{background:"#1A1E2E",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid #2A2D3E"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#E8E9F0"}}>{a.title}</div>
                    {a.dueDate && <div style={{fontSize:11,color:"#FF8C42",marginTop:2}}>Due {a.dueDate}</div>}
                    {a.lastStopped && <div style={{fontSize:11,color:"#9CA3AF",marginTop:4,fontStyle:"italic"}}>Last stopped: {a.lastStopped}</div>}
                    {nextTask && <div style={{marginTop:8,padding:"6px 10px",background:"#6C63FF15",borderRadius:6,fontSize:12,color:"#A99EFF"}}>Next task: {nextTask.text}</div>}
                    {total > 0 && <div style={{marginTop:8,height:3,background:"#2A2D3E",borderRadius:2}}><div style={{height:"100%",width:`${Math.round(done/total*100)}%`,background:"#6C63FF",borderRadius:2}} /></div>}
                  </div>
                );
              })
          }
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
            <Btn onClick={()=>setGapModal(null)}>Got it</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
