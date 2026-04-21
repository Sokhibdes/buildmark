'use client'
// src/app/admin/tasks/page.tsx
import { useState, useEffect } from 'react'
import { Plus, AlertCircle, Clock, User } from 'lucide-react'
import { getTasks, getWorkflowStages, updateTask } from '@/lib/queries'
import type { Task, WorkflowStage } from '@/types'
import s from '../admin.module.css'
import k from './kanban.module.css'

const PRIORITY_ICON = {
  urgent: <AlertCircle size={12} color="#d85a30" />,
  high: <Clock size={12} color="#ba7517" />,
  medium: null,
  low: null,
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#b4b2a9',
  in_progress: '#185fa5',
  review: '#854f0b',
  approved: '#0f6e56',
  done: '#3b6d11',
  blocked: '#993c1d',
}

export default function TasksPage() {
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    Promise.all([getWorkflowStages(), getTasks()]).then(([st, tk]) => {
      setStages(st)
      setTasks(tk)
      setLoading(false)
    })
  }, [])

  const tasksByStage = (stageId: string) =>
    tasks.filter(t => t.stage_id === stageId)

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage_id: stageId } : t))
    await updateTask(taskId, { stage_id: stageId })
  }

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Vazifalar — Kanban</div>
          <div className={s.pageSubtitle}>{tasks.length} ta vazifa, {stages.length} ta bosqich</div>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`}>
          <Plus size={14} /> Yangi vazifa
        </button>
      </div>

      {/* Workflow info banner */}
      <div className={k.workflowBanner}>
        <div className={k.wfTitle}>Ish jarayoni bosqichlari</div>
        <div className={k.wfSteps}>
          {stages.map((st, i) => (
            <div key={st.id} className={k.wfStep}>
              <div className={k.wfNum}>{st.order_index}</div>
              <div className={k.wfName}>{st.name}</div>
              {i < stages.length - 1 && <div className={k.wfArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className={k.board}>
        {stages.map(stage => {
          const stageTasks = tasksByStage(stage.id)
          return (
            <div
              key={stage.id}
              className={k.column}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className={k.colHeader}>
                <div className={k.colName}>{stage.name}</div>
                <div className={k.colCount}>{stageTasks.length}</div>
              </div>
              <div className={k.colBody}>
                {stageTasks.map(task => (
                  <div
                    key={task.id}
                    className={`${k.taskCard} ${dragging === task.id ? k.dragging : ''}`}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('taskId', task.id)
                      setDragging(task.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                  >
                    <div className={k.taskHeader}>
                      {PRIORITY_ICON[task.priority]}
                      <span className={k.taskTitle}>{task.title}</span>
                    </div>
                    {(task as any).client && (
                      <div className={k.taskClient}>{(task as any).client.company_name}</div>
                    )}
                    <div className={k.taskFooter}>
                      {task.task_type && (
                        <span className={k.taskType}>{task.task_type}</span>
                      )}
                      {(task as any).assignee && (
                        <div className={k.taskAssignee}>
                          <User size={10} />
                          {(task as any).assignee.full_name.split(' ')[0]}
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
                {stageTasks.length === 0 && (
                  <div className={k.emptyCol}>Bo'sh</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
