'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, AlertCircle, Clock, User, X, Calendar, Tag, Users, Layers, Eye, Link, CheckCircle, Play, Square, Pause } from 'lucide-react'
import { getTasks, getWorkflowStages, updateTask, createTask, getClients, getTeamMembers, getTaskComments, createStaffComment, getCurrentUser, startTaskTimer, pauseTaskTimer, resumeTaskTimer, stopTaskTimer } from '@/lib/queries'
import type { TaskComment } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import type { Task, WorkflowStage, Client, Profile } from '@/types'
import { TASK_TYPE_LABELS, ROLE_LABELS } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import lightK from './kanban.module.css'
import darkK from './kanban-dark.module.css'
import { useTheme } from '@/lib/theme-context'

function playSound(type: 'tasdiqlandi' | 'posting_approved') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const note = (freq: number, start: number, dur: number, vol = 0.25) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
    }
    if (type === 'tasdiqlandi') {
      note(523, 0,    0.35)   // C5
      note(659, 0.18, 0.35)   // E5
      note(784, 0.36, 0.55)   // G5
    } else {
      note(880,  0,    0.15, 0.3)   // A5  — posting_check uchun boshqacha ikki pip
      note(1046, 0.22, 0.15, 0.25)  // C6
    }
  } catch {}
}

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  urgent: <AlertCircle size={12} color="#d85a30" />,
  high: <Clock size={12} color="#ba7517" />,
  medium: null, low: null,
}
const PRIORITY_LABELS: Record<string, string> = {
  low: "Past", medium: "O'rta", high: 'Yuqori', urgent: 'Shoshilinch',
}

const STAGE_COLORS: Record<string, string> = {
  gray: '#888780', blue: '#185fa5', teal: '#0f6e56',
  amber: '#854f0b', purple: '#534ab7', green: '#3b6d11',
}
const STAGE_COLORS_DARK: Record<string, string> = {
  gray: '#8A8A8E', blue: '#A78BFA', teal: '#34D399',
  amber: '#FBBF24', purple: '#C4B5FD', green: '#86EFAC',
}

function elapsed(isoDate?: string): string {
  if (!isoDate) return ''
  const ms = Date.now() - new Date(isoDate).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}k ${h % 24}s`
  if (h > 0) return `${h}s`
  return '<1s'
}

function elapsedTimer(startedAt: string, totalPausedMs = 0, asOf?: string): string {
  const endMs = asOf ? new Date(asOf).getTime() : Date.now()
  const ms = Math.max(0, endMs - new Date(startedAt).getTime() - totalPausedMs)
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(startedAt: string, stoppedAt: string, totalPausedMs = 0): string {
  return elapsedTimer(startedAt, totalPausedMs, stoppedAt)
}

function TimerDisplay({ startedAt, totalPausedMs = 0 }: { startedAt: string; totalPausedMs?: number }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{elapsedTimer(startedAt, totalPausedMs)}</>
}

type FormData = {
  title: string; description: string; task_type: string
  priority: string; client_id: string; assigned_to: string[]
  stage_id: string; due_date: string; content_url: string
}
const EMPTY: FormData = {
  title: '', description: '', task_type: '', priority: 'medium',
  client_id: '', assigned_to: [], stage_id: '', due_date: '', content_url: '',
}

function AssigneeSelect({ selected, team, onChange }: {
  selected: string[]
  team: Profile[]
  onChange: (ids: string[]) => void
}) {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  const selectedMembers = team.filter(m => selected.includes(m.id))

  const isDark = theme === 'dark'
  const C = {
    border:       isDark ? '#3A3A3C' : '#e8e6df',
    bg:           isDark ? '#1C1C1E' : '#fff',
    placeholder:  isDark ? '#6A6A6E' : '#a1a1aa',
    chipBg:       isDark ? '#1E1533' : '#e6f1fb',
    chipColor:    isDark ? '#A78BFA' : '#185fa5',
    dropBg:       isDark ? '#1C1C1E' : '#fff',
    rowHover:     isDark ? '#242428' : '#f0f7ff',
    cbBorderSel:  isDark ? '#7B5CF6' : '#185fa5',
    cbBorderIdle: isDark ? '#48484A' : '#d4d2cb',
    cbBgSel:      isDark ? '#7B5CF6' : '#185fa5',
    avatarBg:     isDark ? '#1E1533' : '#e6f1fb',
    avatarColor:  isDark ? '#A78BFA' : '#185fa5',
    nameColor:    isDark ? '#E5E5E7' : '#18181b',
    roleColor:    isDark ? '#6A6A6E' : '#a1a1aa',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5,
          minHeight: 36, padding: '5px 10px',
          border: `1px solid ${C.border}`, borderRadius: 7, background: C.bg,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
        }}
      >
        {selectedMembers.length === 0
          ? <span style={{ color: C.placeholder }}>— Tanlang</span>
          : selectedMembers.map(m => (
            <span key={m.id} style={{
              background: C.chipBg, color: C.chipColor,
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
            }}>
              {m.full_name.split(' ')[0]}
            </span>
          ))
        }
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: C.dropBg, border: `1px solid ${C.border}`, borderRadius: 8,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
          marginTop: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {team.map(member => {
            const isSel = selected.includes(member.id)
            return (
              <div key={member.id} onClick={() => toggle(member.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', cursor: 'pointer',
                background: isSel ? C.rowHover : 'transparent',
              }}>
                <div style={{
                  width: 16, height: 16, flexShrink: 0,
                  border: `2px solid ${isSel ? C.cbBorderSel : C.cbBorderIdle}`,
                  borderRadius: 4, background: isSel ? C.cbBgSel : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: C.avatarBg, color: C.avatarColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {member.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.nameColor }}>{member.full_name}</div>
                  <div style={{ fontSize: 10, color: C.roleColor }}>{ROLE_LABELS[member.role]}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const k = theme === 'dark' ? darkK : lightK
  const stageColors = theme === 'dark' ? STAGE_COLORS_DARK : STAGE_COLORS
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [tasks, setTasks]   = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam]     = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const draggingRef  = useRef<string | null>(null)
  const stagesRef    = useRef<WorkflowStage[]>([])
  const prevTasksRef = useRef<Task[]>([])
  const ownChangesRef = useRef<Set<string>>(new Set())
  const [dragging, setDragging] = useState<string | null>(null)

  const [showNew, setShowNew] = useState(false)
  const [form, setForm]       = useState<FormData>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState('')

  const [detail, setDetail]       = useState<Task | null>(null)
  const [edit, setEdit]           = useState<FormData>(EMPTY)
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr]     = useState('')
  const [changed, setChanged]     = useState(false)
  const [comments, setComments]   = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [commentErr, setCommentErr] = useState('')
  const [currentUserName, setCurrentUserName] = useState('Xodim')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getWorkflowStages(), getTasks(), getClients(), getTeamMembers(), getCurrentUser()])
      .then(([st, tk, cl, tm, user]) => {
        setStages(st);  stagesRef.current = st
        setTasks(tk);  prevTasksRef.current = tk
        setClients(cl); setTeam(tm)
        if (user) { setCurrentUserName(user.full_name); setCurrentUserId(user.id) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('kanban-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          if (draggingRef.current) return
          getTasks().then(newData => {
            const prev   = prevTasksRef.current
            const stgs   = stagesRef.current
            const tasdiglandiId  = stgs.find(s => s.slug === 'tasdiqlandi')?.id
            const postingCheckId = stgs.find(s => s.slug === 'posting_check')?.id

            if (prev.length > 0 && stgs.length > 0) {
              newData.forEach(nt => {
                const pt = prev.find(t => t.id === nt.id)
                if (!pt) return
                // Tasdiqlandi bosqichiga o'tish
                if (tasdiglandiId && nt.stage_id === tasdiglandiId && pt.stage_id !== tasdiglandiId
                    && !ownChangesRef.current.has(nt.id)) {
                  playSound('tasdiqlandi')
                }
                // Posting Check — mijoz tasdiqladi
                if (postingCheckId && nt.stage_id === postingCheckId && nt.client_approved && !pt.client_approved) {
                  playSound('posting_approved')
                }
              })
            }

            prevTasksRef.current = newData
            setTasks([...newData])
          }).catch(() => {})
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const byStage = (id: string) => tasks.filter(t => t.stage_id === id)

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    setDragging(null)
    draggingRef.current = null
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage_id: stageId } : t))
    const targetSlug = stagesRef.current.find(s => s.id === stageId)?.slug
    if (targetSlug === 'tasdiqlandi') {
      ownChangesRef.current.add(taskId)
      playSound('tasdiqlandi')
      setTimeout(() => ownChangesRef.current.delete(taskId), 3000)
    }
    await updateTask(taskId, { stage_id: stageId })
  }

  const openNew = () => { setForm({ ...EMPTY, stage_id: stages[0]?.id ?? '' }); setFormErr(''); setShowNew(true) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormErr('Sarlavha kiritilishi shart'); return }
    setSaving(true); setFormErr('')
    try {
      const created = await createTask({
        title: form.title.trim(), description: form.description || undefined,
        task_type: (form.task_type as any) || undefined, priority: (form.priority as any) || 'medium',
        client_id: form.client_id || undefined,
        assigned_to: form.assigned_to.length > 0 ? form.assigned_to : undefined,
        stage_id: form.stage_id || undefined, due_date: form.due_date || undefined,
        content_url: form.content_url || undefined, status: 'todo', visible_to_client: false,
        created_by: currentUserId ?? undefined,
      })
      const createdWithMeta: any = {
        ...created,
        client: clients.find(c => c.id === form.client_id) ?? null,
        creator: currentUserId ? { id: currentUserId, full_name: currentUserName } : null,
      }
      setTasks(prev => [createdWithMeta, ...prev])
      setShowNew(false)
    } catch (err: any) { setFormErr(err?.message ?? 'Saqlashda xatolik') }
    finally { setSaving(false) }
  }

  const openDetail = (task: Task) => {
    if (draggingRef.current) return
    setDetail(task)
    setEdit({
      title: task.title, description: task.description ?? '', task_type: task.task_type ?? '',
      priority: task.priority, client_id: task.client_id ?? '', assigned_to: task.assigned_to ?? [],
      stage_id: task.stage_id ?? '', due_date: task.due_date?.slice(0, 10) ?? '',
      content_url: task.content_url ?? '',
    })
    setChanged(false); setEditErr(''); setCommentText(''); setCommentErr('')
    getTaskComments(task.id).then(setComments).catch(err => console.error('Comments load error:', err))
  }

  const handleSendComment = async () => {
    if (!detail || !commentText.trim()) return
    setCommentSaving(true)
    setCommentErr('')
    try {
      const c = await createStaffComment(detail.id, commentText.trim(), currentUserName)
      setComments(prev => [...prev, c])
      setCommentText('')
    } catch (err: any) {
      console.error('Comment send error:', err)
      setCommentErr(err?.message ?? 'Xabar yuborishda xatolik')
    }
    finally { setCommentSaving(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail || !edit.title.trim()) { setEditErr('Sarlavha kiritilishi shart'); return }
    setEditSaving(true); setEditErr('')
    try {
      const updated = await updateTask(detail.id, {
        title: edit.title.trim(), description: edit.description || undefined,
        task_type: (edit.task_type as any) || undefined, priority: edit.priority as any,
        client_id: edit.client_id || undefined,
        assigned_to: edit.assigned_to.length > 0 ? edit.assigned_to : undefined,
        stage_id: edit.stage_id || undefined, due_date: edit.due_date || undefined,
        content_url: edit.content_url || undefined,
      })
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
      setDetail(prev => prev ? { ...prev, ...updated } : null)
      setChanged(false)
    } catch { setEditErr('Saqlashda xatolik') }
    finally { setEditSaving(false) }
  }

  const stageOf  = (id?: string) => stages.find(s => s.id === id)
  const isPostingCheck = (task: Task) => stageOf(task.stage_id)?.slug === 'posting_check'
  const isJarayonda    = (task: Task) => stageOf(task.stage_id)?.slug === 'jarayonda'

  const handleStartTimer = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await startTaskTimer(taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      setDetail(prev => prev?.id === taskId ? { ...prev, ...updated } : prev)
    } catch {}
  }

  const handleStopTimer = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await stopTaskTimer(taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      setDetail(prev => prev?.id === taskId ? { ...prev, ...updated } : prev)
    } catch {}
  }

  const handlePauseTimer = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await pauseTaskTimer(taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      setDetail(prev => prev?.id === taskId ? { ...prev, ...updated } : prev)
    } catch {}
  }

  const handleResumeTimer = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const src = tasks.find(t => t.id === taskId) ?? (detail?.id === taskId ? detail : null)
    if (!src?.timer_paused_at) return
    try {
      const updated = await resumeTaskTimer(taskId, src.timer_paused_at, src.timer_total_paused_ms ?? 0)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      setDetail(prev => prev?.id === taskId ? { ...prev, ...updated } : prev)
    } catch {}
  }

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  const FormFields = ({ f, set }: { f: FormData; set: (fn: (p: FormData) => FormData) => void }) => (
    <>
      <div className={s.formGroup}>
        <label className={s.label}>Sarlavha *</label>
        <input className={s.input} placeholder="Vazifa nomi" value={f.title} autoFocus
          onChange={e => set(p => ({ ...p, title: e.target.value }))} />
      </div>
      <div className={s.grid2}>
        <div className={s.formGroup}>
          <label className={s.label}>Turi</label>
          <select className={s.select} value={f.task_type} onChange={e => set(p => ({ ...p, task_type: e.target.value }))}>
            <option value="">— Tanlang</option>
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>Muhimlik</label>
          <select className={s.select} value={f.priority} onChange={e => set(p => ({ ...p, priority: e.target.value }))}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className={s.grid2}>
        <div className={s.formGroup}>
          <label className={s.label}>Mijoz</label>
          <select className={s.select} value={f.client_id} onChange={e => set(p => ({ ...p, client_id: e.target.value }))}>
            <option value="">— Tanlang</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>Mas'ul xodimlar</label>
          <AssigneeSelect
            selected={f.assigned_to}
            team={team}
            onChange={ids => set(p => ({ ...p, assigned_to: ids }))}
          />
        </div>
      </div>
      <div className={s.grid2}>
        <div className={s.formGroup}>
          <label className={s.label}>Bosqich</label>
          <select className={s.select} value={f.stage_id} onChange={e => set(p => ({ ...p, stage_id: e.target.value }))}>
            <option value="">— Tanlang</option>
            {stages.map(st => <option key={st.id} value={st.id}>{st.name}{st.visible_to_client ? ' 👁' : ''}</option>)}
          </select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>Muddat</label>
          <input type="date" className={s.input} value={f.due_date} onChange={e => set(p => ({ ...p, due_date: e.target.value }))} />
        </div>
      </div>
      <div className={s.formGroup}>
        <label className={s.label}>Kontent havolasi (Posting Check uchun)</label>
        <input className={s.input} placeholder="https://..." value={f.content_url}
          onChange={e => set(p => ({ ...p, content_url: e.target.value }))} />
      </div>
      <div className={s.formGroup}>
        <label className={s.label}>Tavsif</label>
        <textarea className={s.textarea} placeholder="Qo'shimcha ma'lumot..." value={f.description}
          onChange={e => set(p => ({ ...p, description: e.target.value }))} />
      </div>
    </>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Vazifalar — Kanban</div>
          <div className={s.pageSubtitle}>{tasks.length} ta vazifa · {stages.length} ta bosqich</div>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={openNew}>
          <Plus size={14} /> Yangi vazifa
        </button>
      </div>

      {/* Workflow banner */}
      <div className={k.workflowBanner}>
        <div className={k.wfTitle}>Ish jarayoni bosqichlari</div>
        <div className={k.wfSteps}>
          {stages.map((st, i) => (
            <div key={st.id} className={k.wfStep}>
              <div className={k.wfDot} style={{ background: stageColors[st.color] ?? '#888' }} />
              <div className={k.wfName}>
                {st.name}
                {st.visible_to_client && <Eye size={10} style={{ marginLeft: 4, color: '#185fa5', verticalAlign: 'middle' }} />}
              </div>
              {i < stages.length - 1 && <div className={k.wfArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className={k.board}>
        {stages.map(stage => {
          const stageTasks = byStage(stage.id)
          const color = stageColors[stage.color] ?? '#888780'
          return (
            <div key={stage.id} className={k.column}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className={k.colHeader} style={{ borderTop: `2px solid ${color}` }}>
                <div className={k.colName}>
                  {stage.name}
                  {stage.visible_to_client && <Eye size={10} style={{ marginLeft: 5, color: '#185fa5' }} />}
                </div>
                <div className={k.colCount}>{stageTasks.length}</div>
              </div>
              <div className={k.colBody}>
                {stageTasks.map(task => (
                  <div key={task.id}
                    className={`${k.taskCard} ${dragging === task.id ? k.dragging : ''}`}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('taskId', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                      draggingRef.current = task.id
                      requestAnimationFrame(() => setDragging(task.id))
                    }}
                    onDragEnd={() => {
                      draggingRef.current = null
                      setDragging(null)
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, stage.id)}
                    onClick={() => openDetail(task)}
                  >
                    {task.client_approved && stageOf(task.stage_id)?.slug === 'posting_check' && (
                      <div className={k.clientApprovedBadge}>
                        <CheckCircle size={11} /> Mijoz tasdiqladi
                      </div>
                    )}

                    {/* Client label */}
                    {(task as any).client && (
                      <div className={k.taskClientRow}>
                        <span className={k.taskClientLabel}>Client</span>
                        <span className={k.taskClientName}>{(task as any).client.company_name}</span>
                      </div>
                    )}

                    {/* Title + priority icon */}
                    <div className={k.taskHeader}>
                      {PRIORITY_ICON[task.priority]}
                      <span className={k.taskTitle}>{task.title}</span>
                    </div>

                    {/* ID + Date + Creator */}
                    <div className={k.taskMetaRow}>
                      <span className={k.taskIdBadge}>#{task.id.slice(0, 7).toUpperCase()}</span>
                      {task.due_date && (
                        <span className={`${k.taskDateBadge} ${new Date(task.due_date) < new Date() ? k.taskDateOverdue : ''}`}>
                          <Calendar size={9} />
                          {new Date(task.due_date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {(task as any).creator && (
                        <span className={k.taskCreator}>
                          <User size={9} />
                          {(task as any).creator.full_name.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Pill tags */}
                    <div className={k.taskTags}>
                      {task.task_type && (
                        <span className={k.tag}>{TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type}</span>
                      )}
                      {isJarayonda(task) && !task.timer_started_at && (
                        <button className={k.tagTimerStart} onClick={(e) => handleStartTimer(task.id, e)}>
                          <Play size={9} /> Boshlash
                        </button>
                      )}
                      {isJarayonda(task) && task.timer_started_at && !task.timer_stopped_at && !task.timer_paused_at && (
                        <>
                          <span className={k.tagTimer}>
                            <Clock size={9} /> <TimerDisplay startedAt={task.timer_started_at} totalPausedMs={task.timer_total_paused_ms ?? 0} />
                          </span>
                          <button className={k.tagPauseBtn} onClick={(e) => handlePauseTimer(task.id, e)} title="Pauza">
                            <Pause size={8} />
                          </button>
                          <button className={k.tagStopBtn} onClick={(e) => handleStopTimer(task.id, e)} title="Tugatish">
                            <Square size={8} />
                          </button>
                        </>
                      )}
                      {isJarayonda(task) && task.timer_started_at && !task.timer_stopped_at && task.timer_paused_at && (
                        <>
                          <span className={k.tagTimerPaused}>
                            <Pause size={9} /> {elapsedTimer(task.timer_started_at, task.timer_total_paused_ms ?? 0, task.timer_paused_at)}
                          </span>
                          <button className={k.tagResumeBtn} onClick={(e) => handleResumeTimer(task.id, e)} title="Davom etish">
                            <Play size={8} />
                          </button>
                          <button className={k.tagStopBtn} onClick={(e) => handleStopTimer(task.id, e)} title="Tugatish">
                            <Square size={8} />
                          </button>
                        </>
                      )}
                      {isJarayonda(task) && task.timer_started_at && task.timer_stopped_at && (
                        <span className={k.tagTimerDone}>
                          <CheckCircle size={9} /> {formatDuration(task.timer_started_at, task.timer_stopped_at, task.timer_total_paused_ms ?? 0)}
                        </span>
                      )}
                      {isPostingCheck(task) && task.content_url && (
                        <span className={k.tagLink}><Link size={9} /> Havola</span>
                      )}
                      <div style={{ flex: 1 }} />
                      {task.assigned_to && task.assigned_to.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {task.assigned_to.slice(0, 3).map((id, i) => {
                            const m = team.find(t => t.id === id)
                            if (!m) return null
                            const isDarkMode = theme === 'dark'
                            return (
                              <div key={id} title={m.full_name} style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: isDarkMode ? '#1E1533' : '#e6f1fb',
                                color: isDarkMode ? '#A78BFA' : '#185fa5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, fontWeight: 700,
                                marginLeft: i > 0 ? -5 : 0,
                                border: isDarkMode ? '1.5px solid #2C2C2E' : '1.5px solid #fff',
                                flexShrink: 0,
                              }}>
                                {m.full_name.slice(0, 2).toUpperCase()}
                              </div>
                            )
                          })}
                          {task.assigned_to.length > 3 && (
                            <div style={{ fontSize: 9, color: theme === 'dark' ? '#6A6A6E' : '#888780', marginLeft: 4, fontWeight: 600 }}>
                              +{task.assigned_to.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stageTasks.length === 0 && <div className={k.emptyCol}>Bo'sh</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Yangi vazifa modali */}
      {showNew && (
        <div className={k.overlay} onClick={() => setShowNew(false)}>
          <div className={k.modal} onClick={e => e.stopPropagation()}>
            <div className={k.modalHeader}>
              <div className={k.modalTitle}>Yangi vazifa</div>
              <button className={k.modalClose} onClick={() => setShowNew(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className={k.modalBody}>
                <FormFields f={form} set={setForm} />
                {formErr && <div className={k.formError}>{formErr}</div>}
              </div>
              <div className={k.modalFooter}>
                <button type="button" className={s.btn} onClick={() => setShowNew(false)}>Bekor qilish</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modali */}
      {detail && (
        <div className={k.overlay} onClick={() => setDetail(null)}>
          <div className={k.modal} style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className={k.modalHeader}>
              <div>
                <div className={k.modalTitle}>{detail.title}</div>
                {stageOf(detail.stage_id) && (
                  <div style={{ fontSize: 11, color: stageColors[stageOf(detail.stage_id)!.color] ?? '#888', marginTop: 2 }}>
                    {stageOf(detail.stage_id)!.name}
                  </div>
                )}
              </div>
              <button className={k.modalClose} onClick={() => setDetail(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className={k.modalBody}>
                <div className={k.detailMeta}>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><Tag size={12} /> Turi</div>
                    <select className={k.detailSelect} value={edit.task_type}
                      onChange={e => { setEdit(p => ({ ...p, task_type: e.target.value })); setChanged(true) }}>
                      <option value="">—</option>
                      {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><AlertCircle size={12} /> Muhimlik</div>
                    <select className={k.detailSelect} value={edit.priority}
                      onChange={e => { setEdit(p => ({ ...p, priority: e.target.value })); setChanged(true) }}>
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><Layers size={12} /> Bosqich</div>
                    <select className={k.detailSelect} value={edit.stage_id}
                      onChange={e => { setEdit(p => ({ ...p, stage_id: e.target.value })); setChanged(true) }}>
                      <option value="">—</option>
                      {stages.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><Users size={12} /> Mijoz</div>
                    <select className={k.detailSelect} value={edit.client_id}
                      onChange={e => { setEdit(p => ({ ...p, client_id: e.target.value })); setChanged(true) }}>
                      <option value="">—</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className={k.detailRow} style={{ alignItems: 'flex-start' }}>
                    <div className={k.detailRowLabel} style={{ paddingTop: 8 }}><User size={12} /> Mas'ul</div>
                    <div style={{ flex: 1 }}>
                      <AssigneeSelect
                        selected={edit.assigned_to}
                        team={team}
                        onChange={ids => { setEdit(p => ({ ...p, assigned_to: ids })); setChanged(true) }}
                      />
                    </div>
                  </div>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><Calendar size={12} /> Muddat</div>
                    <input type="date" className={k.detailInput} value={edit.due_date}
                      onChange={e => { setEdit(p => ({ ...p, due_date: e.target.value })); setChanged(true) }} />
                  </div>
                  <div className={k.detailRow}>
                    <div className={k.detailRowLabel}><Link size={12} /> Havola</div>
                    <input className={k.detailInput} placeholder="https://..." value={edit.content_url}
                      onChange={e => { setEdit(p => ({ ...p, content_url: e.target.value })); setChanged(true) }} />
                  </div>
                </div>

                {detail.client_approved && stageOf(detail.stage_id)?.slug === 'posting_check' && (
                  <div className={k.clientApprovedBanner}>
                    <CheckCircle size={14} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Mijoz tasdiqladi</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Endi vazifani "Bajarildi"ga o'tkazishingiz mumkin</div>
                    </div>
                  </div>
                )}
                {isJarayonda(detail) && !detail.timer_started_at && (
                  <button type="button" className={k.timerStartBtn} onClick={(e) => handleStartTimer(detail.id, e)}>
                    <Play size={14} /> Timerni boshlash
                  </button>
                )}
                {isJarayonda(detail) && detail.timer_started_at && !detail.timer_stopped_at && !detail.timer_paused_at && (
                  <div style={{ display: 'flex', gap: 8, margin: '10px 0 4px', alignItems: 'stretch' }}>
                    <div className={k.timerBadge} style={{ flex: 1, margin: 0 }}>
                      <Clock size={12} /> Ish vaqti: <TimerDisplay startedAt={detail.timer_started_at} totalPausedMs={detail.timer_total_paused_ms ?? 0} />
                    </div>
                    <button type="button" className={k.timerPauseBtn} onClick={(e) => handlePauseTimer(detail.id, e)}>
                      <Pause size={13} /> Pauza
                    </button>
                    <button type="button" className={k.timerStopBtn} onClick={(e) => handleStopTimer(detail.id, e)}>
                      <Square size={13} />
                    </button>
                  </div>
                )}
                {isJarayonda(detail) && detail.timer_started_at && !detail.timer_stopped_at && detail.timer_paused_at && (
                  <div style={{ display: 'flex', gap: 8, margin: '10px 0 4px', alignItems: 'stretch' }}>
                    <div className={k.timerPausedBadge} style={{ flex: 1, margin: 0 }}>
                      <Pause size={12} /> Pauza · {elapsedTimer(detail.timer_started_at, detail.timer_total_paused_ms ?? 0, detail.timer_paused_at)}
                    </div>
                    <button type="button" className={k.timerResumeBtn} onClick={(e) => handleResumeTimer(detail.id, e)}>
                      <Play size={13} /> Davom
                    </button>
                    <button type="button" className={k.timerStopBtn} onClick={(e) => handleStopTimer(detail.id, e)}>
                      <Square size={13} />
                    </button>
                  </div>
                )}
                {isJarayonda(detail) && detail.timer_started_at && detail.timer_stopped_at && (
                  <div className={k.timerDoneBadge}>
                    <CheckCircle size={12} /> Ish vaqti: {formatDuration(detail.timer_started_at, detail.timer_stopped_at, detail.timer_total_paused_ms ?? 0)} — saqlandi
                  </div>
                )}

                <div className={s.formGroup} style={{ marginTop: 14 }}>
                  <label className={s.label}>Sarlavha *</label>
                  <input className={s.input} value={edit.title}
                    onChange={e => { setEdit(p => ({ ...p, title: e.target.value })); setChanged(true) }} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.label}>Tavsif</label>
                  <textarea className={s.textarea} style={{ minHeight: 90 }} placeholder="Tavsif yo'q..."
                    value={edit.description}
                    onChange={e => { setEdit(p => ({ ...p, description: e.target.value })); setChanged(true) }} />
                </div>
                <div className={k.detailCreated}>
                  Yaratilgan: {new Date(detail.created_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                {/* Izohlar */}
                <div style={{ marginTop: 20, borderTop: `1px solid ${theme === 'dark' ? '#2C2C2E' : '#f0ede6'}`, paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme === 'dark' ? '#8A8A8E' : '#52525b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Izohlar {comments.length > 0 && `(${comments.length})`}
                  </div>

                  {comments.length === 0 ? (
                    <div style={{ fontSize: 12, color: theme === 'dark' ? '#48484A' : '#c4c2bb', textAlign: 'center', padding: '16px 0' }}>
                      Hali izoh yo&apos;q
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
                      {comments.map(c => (
                        <div key={c.id} style={{
                          display: 'flex', gap: 10, flexDirection: c.sender_type === 'staff' ? 'row-reverse' : 'row',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: c.sender_type === 'client'
                              ? (theme === 'dark' ? '#2D1A00' : '#fef3c7')
                              : (theme === 'dark' ? '#1A2744' : '#dbeafe'),
                            color: c.sender_type === 'client'
                              ? (theme === 'dark' ? '#FBBF24' : '#92400e')
                              : (theme === 'dark' ? '#93C5FD' : '#1d4ed8'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {c.sender_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ maxWidth: '75%' }}>
                            <div style={{
                              background: c.sender_type === 'client'
                                ? (theme === 'dark' ? '#1A0E00' : '#fffbeb')
                                : (theme === 'dark' ? '#0D1929' : '#eff6ff'),
                              border: `1px solid ${c.sender_type === 'client'
                                ? (theme === 'dark' ? '#3D2800' : '#fde68a')
                                : (theme === 'dark' ? '#1E3A5F' : '#bfdbfe')}`,
                              borderRadius: c.sender_type === 'staff' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
                              padding: '8px 11px', fontSize: 13,
                              color: theme === 'dark' ? '#E5E5E7' : '#18181b', lineHeight: 1.5,
                            }}>
                              {c.content}
                            </div>
                            <div style={{
                              fontSize: 10, color: theme === 'dark' ? '#48484A' : '#c4c2bb', marginTop: 3,
                              textAlign: c.sender_type === 'staff' ? 'right' : 'left',
                            }}>
                              {c.sender_name} · {new Date(c.created_at).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {editErr && <div className={k.formError}>{editErr}</div>}
              </div>
              <div style={{ borderTop: `1px solid ${theme === 'dark' ? '#2C2C2E' : '#f0ede6'}`, padding: '12px 22px', background: theme === 'dark' ? '#141414' : '#faf9f7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme === 'dark' ? '#6A6A6E' : '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                  Mijozga javob yozish
                </div>
                {commentErr && (
                  <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px', marginBottom: 8 }}>
                    ⚠ {commentErr}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() }}}
                    placeholder="Xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)"
                    rows={2}
                    style={{
                      flex: 1, padding: '8px 11px',
                      border: `1.5px solid ${theme === 'dark' ? '#3A3A3C' : '#e4e2db'}`, borderRadius: 8,
                      fontSize: 13, fontFamily: 'inherit', resize: 'none',
                      outline: 'none', color: theme === 'dark' ? '#E5E5E7' : '#18181b', lineHeight: 1.5,
                      background: theme === 'dark' ? '#1C1C1E' : '#fff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || commentSaving}
                    style={{
                      padding: '0 16px', borderRadius: 8, border: 'none', alignSelf: 'stretch',
                      background: commentText.trim()
                        ? theme === 'dark' ? 'linear-gradient(135deg, #6D28D9, #7B5CF6)' : 'linear-gradient(135deg, #185fa5, #1a6bbf)'
                        : theme === 'dark' ? '#2C2C2E' : '#e4e2db',
                      color: commentText.trim() ? 'white' : theme === 'dark' ? '#6A6A6E' : '#a1a1aa',
                      fontSize: 12, fontWeight: 600, cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    {commentSaving ? '...' : 'Yuborish'}
                  </button>
                </div>
              </div>

              <div className={k.modalFooter}>
                <button type="button" className={s.btn} onClick={() => setDetail(null)}>Yopish</button>
                {changed && (
                  <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={editSaving}>
                    {editSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
