'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, AlertCircle, Clock, User, X, Calendar, Tag, Users, Layers, Eye, Link, CheckCircle } from 'lucide-react'
import { getTasks, getWorkflowStages, updateTask, createTask, getClients, getTeamMembers, getTaskComments, createStaffComment, getCurrentUser } from '@/lib/queries'
import type { TaskComment } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import type { Task, WorkflowStage, Client, Profile } from '@/types'
import { TASK_TYPE_LABELS, ROLE_LABELS } from '@/types'
import s from '../admin.module.css'
import k from './kanban.module.css'

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

function elapsed(isoDate?: string): string {
  if (!isoDate) return ''
  const ms = Date.now() - new Date(isoDate).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}k ${h % 24}s`
  if (h > 0) return `${h}s`
  return '<1s'
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5,
          minHeight: 36, padding: '5px 10px',
          border: '1px solid #e8e6df', borderRadius: 7, background: '#fff',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
        }}
      >
        {selectedMembers.length === 0
          ? <span style={{ color: '#a1a1aa' }}>— Tanlang</span>
          : selectedMembers.map(m => (
            <span key={m.id} style={{
              background: '#e6f1fb', color: '#185fa5',
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
          background: '#fff', border: '1px solid #e8e6df', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: 4,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {team.map(member => {
            const isSel = selected.includes(member.id)
            return (
              <div key={member.id} onClick={() => toggle(member.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', cursor: 'pointer',
                background: isSel ? '#f0f7ff' : 'transparent',
              }}>
                <div style={{
                  width: 16, height: 16, flexShrink: 0,
                  border: `2px solid ${isSel ? '#185fa5' : '#d4d2cb'}`,
                  borderRadius: 4, background: isSel ? '#185fa5' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: '#e6f1fb', color: '#185fa5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {member.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#18181b' }}>{member.full_name}</div>
                  <div style={{ fontSize: 10, color: '#a1a1aa' }}>{ROLE_LABELS[member.role]}</div>
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
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [tasks, setTasks]   = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam]     = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const draggingRef = useRef<string | null>(null)
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
  const [currentUserName, setCurrentUserName] = useState('Xodim')

  useEffect(() => {
    Promise.all([getWorkflowStages(), getTasks(), getClients(), getTeamMembers(), getCurrentUser()])
      .then(([st, tk, cl, tm, user]) => {
        setStages(st); setTasks(tk); setClients(cl); setTeam(tm)
        if (user) setCurrentUserName(user.full_name)
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
        () => { if (draggingRef.current) return; getTasks().then(data => setTasks([...data])).catch(() => {}) }
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
      })
      setTasks(prev => [created, ...prev])
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
    setChanged(false); setEditErr(''); setCommentText('')
    getTaskComments(task.id).then(setComments).catch(() => {})
  }

  const handleSendComment = async () => {
    if (!detail || !commentText.trim()) return
    setCommentSaving(true)
    try {
      const c = await createStaffComment(detail.id, commentText.trim(), currentUserName)
      setComments(prev => [...prev, c])
      setCommentText('')
    } catch {}
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
              <div className={k.wfDot} style={{ background: STAGE_COLORS[st.color] ?? '#888' }} />
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
          const color = STAGE_COLORS[stage.color] ?? '#888780'
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
                    <div className={k.taskHeader}>
                      {PRIORITY_ICON[task.priority]}
                      <span className={k.taskTitle}>{task.title}</span>
                    </div>
                    {(task as any).client && <div className={k.taskClient}>{(task as any).client.company_name}</div>}
                    <div className={k.taskFooter}>
                      {task.task_type && <span className={k.taskType}>{TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type}</span>}
                      {isJarayonda(task) && task.stage_entered_at && (
                        <span className={k.taskTimer}><Clock size={9} /> {elapsed(task.stage_entered_at)}</span>
                      )}
                      {isPostingCheck(task) && task.content_url && (
                        <span className={k.taskLink}><Link size={9} /> Havola</span>
                      )}
                      {task.assigned_to && task.assigned_to.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {task.assigned_to.slice(0, 3).map((id, i) => {
                            const m = team.find(t => t.id === id)
                            if (!m) return null
                            return (
                              <div key={id} title={m.full_name} style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#e6f1fb', color: '#185fa5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, fontWeight: 700,
                                marginLeft: i > 0 ? -5 : 0,
                                border: '1.5px solid #fff', flexShrink: 0,
                              }}>
                                {m.full_name.slice(0, 2).toUpperCase()}
                              </div>
                            )
                          })}
                          {task.assigned_to.length > 3 && (
                            <div style={{ fontSize: 9, color: '#888780', marginLeft: 4, fontWeight: 600 }}>
                              +{task.assigned_to.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      {task.due_date && (
                        <div className={`${k.taskDue} ${new Date(task.due_date) < new Date() ? k.taskDueOverdue : ''}`}>
                          {new Date(task.due_date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
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
                  <div style={{ fontSize: 11, color: STAGE_COLORS[stageOf(detail.stage_id)!.color] ?? '#888', marginTop: 2 }}>
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
                {isJarayonda(detail) && detail.stage_entered_at && (
                  <div className={k.timerBadge}>
                    <Clock size={12} /> Jarayonda: {elapsed(detail.stage_entered_at)}
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
                <div style={{ marginTop: 20, borderTop: '1px solid #f0ede6', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Izohlar {comments.length > 0 && `(${comments.length})`}
                  </div>

                  {comments.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#c4c2bb', textAlign: 'center', padding: '16px 0' }}>
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
                            background: c.sender_type === 'client' ? '#fef3c7' : '#dbeafe',
                            color: c.sender_type === 'client' ? '#92400e' : '#1d4ed8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {c.sender_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ maxWidth: '75%' }}>
                            <div style={{
                              background: c.sender_type === 'client' ? '#fffbeb' : '#eff6ff',
                              border: `1px solid ${c.sender_type === 'client' ? '#fde68a' : '#bfdbfe'}`,
                              borderRadius: c.sender_type === 'staff' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
                              padding: '8px 11px', fontSize: 13, color: '#18181b', lineHeight: 1.5,
                            }}>
                              {c.content}
                            </div>
                            <div style={{
                              fontSize: 10, color: '#c4c2bb', marginTop: 3,
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
              <div style={{ borderTop: '1px solid #f0ede6', padding: '12px 22px', background: '#faf9f7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                  Mijozga javob yozish
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() }}}
                    placeholder="Xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)"
                    rows={2}
                    style={{
                      flex: 1, padding: '8px 11px',
                      border: '1.5px solid #e4e2db', borderRadius: 8,
                      fontSize: 13, fontFamily: 'inherit', resize: 'none',
                      outline: 'none', color: '#18181b', lineHeight: 1.5,
                      background: '#fff',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#185fa5'; e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#e4e2db'; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || commentSaving}
                    style={{
                      padding: '0 16px', borderRadius: 8, border: 'none', alignSelf: 'stretch',
                      background: commentText.trim() ? 'linear-gradient(135deg, #185fa5, #1a6bbf)' : '#e4e2db',
                      color: commentText.trim() ? 'white' : '#a1a1aa',
                      fontSize: 12, fontWeight: 600, cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', flexShrink: 0,
                      boxShadow: commentText.trim() ? '0 2px 6px rgba(24,95,165,0.25)' : 'none',
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
