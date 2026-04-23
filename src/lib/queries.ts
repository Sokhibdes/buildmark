// src/lib/queries.ts
// Barcha Supabase so'rovlari shu yerda

import { createClient } from './supabase/client'
import type {
  Client, Task, ContentItem, Campaign,
  MonthlyReport, DashboardStats, WorkflowStage, Profile
} from '@/types'

// =============================================
// DASHBOARD
// =============================================
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  const [clients, tasks, content, campaigns] = await Promise.all([
    supabase.from('clients').select('id, status').eq('status', 'active'),
    supabase.from('tasks').select('id, status, due_date').neq('status', 'done'),
    supabase.from('content_items').select('id, status').eq('status', 'client_approval'),
    supabase.from('campaigns').select('id, status').eq('status', 'active'),
  ])

  const today = new Date().toISOString().split('T')[0]
  const overdue = tasks.data?.filter(t =>
    t.due_date && t.due_date < today && t.status !== 'done'
  ).length ?? 0

  return {
    active_clients: clients.data?.length ?? 0,
    total_tasks: tasks.data?.length ?? 0,
    overdue_tasks: overdue,
    pending_approvals: content.data?.length ?? 0,
    this_month_posts: 0,
    active_campaigns: campaigns.data?.length ?? 0,
  }
}

// =============================================
// KANBAN STATS (Dashboard uchun)
// =============================================
export interface KanbanStats {
  active_clients: number
  jarayonda_count: number
  kontentplan_count: number
  bajarildi_count: number
  overdue_count: number
}

export async function getKanbanStats(from: string, to: string): Promise<KanbanStats> {
  const supabase = createClient()

  const { data: stages } = await supabase.from('workflow_stages').select('id, slug, name')
  const sid = (slug: string) => stages?.find(s => s.slug === slug)?.id ?? null
  const toEnd = to + 'T23:59:59.999Z'

  const byStage = (slug: string) => {
    const id = sid(slug)
    if (!id) return Promise.resolve({ count: 0 })
    return supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('stage_id', id).gte('created_at', from).lte('created_at', toEnd)
  }

  // Kontent plan stageni slug yoki nom orqali topamiz
  const contentPlanStage = stages?.find(s =>
    s.slug.toLowerCase().includes('kontent') ||
    s.slug.toLowerCase().includes('content') ||
    s.name.toLowerCase().includes('kontent')
  )
  const contentPlanId = contentPlanStage?.id ?? null
  console.log('[KanbanStats] stages:', stages?.map(s => `${s.name}(${s.slug})`).join(', '))
  console.log('[KanbanStats] contentPlanStage:', contentPlanStage)

  const [clients, jarayonda, kontentplan, bajarildi, overdue] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    byStage('jarayonda'),
    contentPlanId
      ? supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('stage_id', contentPlanId)
      : Promise.resolve({ count: 0 }),
    byStage('bajarildi'),
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'done')
      .gte('created_at', from).lte('created_at', toEnd),
  ])

  return {
    active_clients: clients.count ?? 0,
    jarayonda_count: jarayonda.count ?? 0,
    kontentplan_count: kontentplan.count ?? 0,
    bajarildi_count: bajarildi.count ?? 0,
    overdue_count: overdue.count ?? 0,
  }
}

export async function getTasksByStageSlug(slug: string, from: string, to: string): Promise<Task[]> {
  const supabase = createClient()
  const { data: stage } = await supabase.from('workflow_stages').select('id').eq('slug', slug).single()
  if (!stage) return []
  const { data } = await supabase
    .from('tasks')
    .select('*, client:clients(id, company_name), creator:profiles!created_by(id, full_name)')
    .eq('stage_id', stage.id)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59.999Z')
    .order('created_at', { ascending: false })
    .limit(15)
  return data ?? []
}

// =============================================
// CLIENTS
// =============================================
export async function getClients(): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClientsByEmail(email: string): Promise<Client[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email)
    .order('company_name')
  return data ?? []
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const clients = await getClientsByEmail(email)
  return clients[0] ?? null
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createClient_db(client: Partial<Client>): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()
  if (error) throw error
  log('created', 'client', data.id, data.company_name, { package: data.package, status: data.status })
  return data
}

export async function deleteClient(id: string, companyName?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
  log('deleted', 'client', id, companyName)
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  log('updated', 'client', data.id, data.company_name)
  return data
}

// =============================================
// TASKS
// =============================================
export async function getTasks(filters?: {
  clientId?: string
  assignedTo?: string
  status?: string
  stageId?: string
}): Promise<Task[]> {
  const supabase = createClient()
  let query = supabase
    .from('tasks')
    .select(`
      *,
      client:clients(id, company_name, logo_url),
      stage:workflow_stages(id, name, slug, color),
      creator:profiles!created_by(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.assignedTo) query = query.contains('assigned_to', [filters.assignedTo])
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.stageId) query = query.eq('stage_id', filters.stageId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  log('created', 'task', data.id, data.title, { priority: data.priority, task_type: data.task_type })
  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const supabase = createClient()
  const payload: any = { ...updates }
  if ('stage_id' in updates) {
    payload.stage_entered_at = new Date().toISOString()
    payload.timer_started_at = null
    payload.timer_paused_at = null
    payload.timer_stopped_at = null
    payload.timer_total_paused_ms = 0
  }
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  const action = 'stage_id' in updates ? 'assigned' : 'updated'
  log(action, 'task', data.id, data.title)
  return data
}

export async function startTaskTimer(id: string): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ timer_started_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  log('started', 'task', data.id, data.title)
  return data
}

export async function pauseTaskTimer(id: string): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ timer_paused_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resumeTaskTimer(id: string, pausedAt: string, currentTotalPausedMs: number): Promise<Task> {
  const supabase = createClient()
  const additionalMs = Date.now() - new Date(pausedAt).getTime()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      timer_paused_at: null,
      timer_total_paused_ms: currentTotalPausedMs + additionalMs,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function stopTaskTimer(id: string): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ timer_stopped_at: new Date().toISOString(), timer_paused_at: null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  log('stopped', 'task', data.id, data.title)
  return data
}

export async function getClientVisibleTasks(clientId: string): Promise<Task[]> {
  const supabase = createClient()
  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id, slug, requires_approval, visible_to_client')
    .eq('visible_to_client', true)
  if (!stages?.length) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*, stage:workflow_stages(id, name, slug, color, visible_to_client, requires_approval)')
    .eq('client_id', clientId)
    .in('stage_id', stages.map(s => s.id))
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function approveClientTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { data: stage } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('slug', 'tasdiqlandi')
    .single()
  if (!stage) throw new Error('Tasdiqlandi bosqichi topilmadi')
  const { error } = await supabase
    .from('tasks')
    .update({ stage_id: stage.id, stage_entered_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw error
  log('approved', 'task', taskId)
}

export async function approvePostingCheck(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ client_approved: true })
    .eq('id', taskId)
  if (error) throw error
}

export async function getClientAllTasks(clientId: string): Promise<Task[]> {
  const supabase = createClient()
  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id, slug, name, color, visible_to_client, requires_approval, order_index')
  if (!stages?.length) return []
  const visibleIds = stages.filter(s => s.visible_to_client).map(s => s.id)
  const { data, error } = await supabase
    .from('tasks')
    .select('*, stage:workflow_stages(id, name, slug, color, visible_to_client, requires_approval, order_index)')
    .eq('client_id', clientId)
    .in('stage_id', visibleIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClientApprovedPlansCount(clientId: string): Promise<number> {
  const supabase = createClient()
  const { data: stage } = await supabase
    .from('workflow_stages').select('id').eq('slug', 'tasdiqlandi').single()
  if (!stage) return 0
  const { count } = await supabase
    .from('tasks').select('*', { count: 'exact', head: true })
    .eq('client_id', clientId).eq('stage_id', stage.id)
  return count ?? 0
}

export async function deleteTask(id: string, title?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
  log('deleted', 'task', id, title)
}

// =============================================
// WORKFLOW STAGES
// =============================================
export async function getWorkflowStages(): Promise<WorkflowStage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_stages')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data ?? []
}

// =============================================
// CONTENT
// =============================================
export async function getContentItems(clientId?: string): Promise<ContentItem[]> {
  const supabase = createClient()
  let query = supabase
    .from('content_items')
    .select(`*, client:clients(id, company_name)`)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function approveContent(id: string, approved: boolean, feedback?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_items')
    .update({
      client_approved: approved,
      client_approved_at: approved ? new Date().toISOString() : null,
      client_feedback: feedback,
      status: approved ? 'approved' : 'rejected',
    })
    .eq('id', id)
  if (error) throw error
  log(approved ? 'approved' : 'rejected', 'content', id)
}

// =============================================
// CAMPAIGNS
// =============================================
export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('campaigns').insert(data).select('*, client:clients(id, company_name, logo_url)').single()
  if (error) throw error
  log('created', 'campaign', created.id, created.name)
  return created
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('campaigns').update(data).eq('id', id).select('*, client:clients(id, company_name, logo_url)').single()
  if (error) throw error
  log('updated', 'campaign', updated.id, updated.name)
  return updated
}

export async function deleteCampaign(id: string, name?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) throw error
  log('deleted', 'campaign', id, name)
}

export async function getCampaigns(clientId?: string): Promise<Campaign[]> {
  const supabase = createClient()
  let query = supabase
    .from('campaigns')
    .select(`*, client:clients(id, company_name, logo_url)`)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// =============================================
// REPORTS
// =============================================
export async function getMonthlyReports(clientId?: string): Promise<MonthlyReport[]> {
  const supabase = createClient()
  let query = supabase
    .from('monthly_reports')
    .select(`*, client:clients(id, company_name)`)
    .order('month', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// =============================================
// TEAM / PROFILES
// =============================================
export async function uploadClientLogo(clientId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `clients/${clientId}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  await supabase.from('clients').update({ logo_url: url }).eq('id', clientId)
  return url
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  return url
}

export async function getTeamMembers(): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'client')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}

// =============================================
// CLIENT PORTAL (token orqali kirish)
// =============================================
export async function getClientByToken(token: string): Promise<Client | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_tokens')
    .select('client_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', data.client_id)
    .single()
  return client ?? null
}

export async function generatePortalToken(clientId: string): Promise<string> {
  const supabase = createClient()
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const { error } = await supabase
    .from('client_tokens')
    .upsert({ client_id: clientId, token }, { onConflict: 'client_id' })
  if (error) throw error
  return token
}

export async function getPortalToken(clientId: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('client_tokens')
    .select('token')
    .eq('client_id', clientId)
    .single()
  return data?.token ?? null
}

export async function getClientContentCounts(clientId: string): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('content_items')
    .select('status')
    .eq('client_id', clientId)
  const counts: Record<string, number> = {}
  data?.forEach(item => {
    counts[item.status] = (counts[item.status] ?? 0) + 1
  })
  return counts
}

export async function getClientPortalData(clientId: string) {
  const supabase = createClient()

  const [content, campaigns, reports] = await Promise.all([
    supabase
      .from('content_items')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['client_approval', 'approved', 'published', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('monthly_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('month', { ascending: false })
      .limit(3),
  ])

  return {
    content_items: content.data ?? [],
    campaigns: campaigns.data ?? [],
    reports: reports.data ?? [],
    pending_approvals: content.data?.filter(c => c.status === 'client_approval') ?? [],
  }
}

// =============================================
// NOTIFICATIONS
// =============================================
// =============================================
// TASK COMMENTS
// =============================================
export interface TaskComment {
  id: string
  task_id: string
  sender_type: 'client' | 'staff'
  sender_name: string
  content: string
  created_at: string
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createStaffComment(taskId: string, content: string, staffName: string): Promise<TaskComment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, sender_type: 'staff', sender_name: staffName, content })
    .select()
    .single()
  if (error) throw error
  return data
}

// =============================================
// ACTIVITY LOGS
// =============================================
export async function logActivity(params: {
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id?: string
  entity_name?: string
  details?: Record<string, any>
}) {
  const supabase = createClient()
  await supabase.from('activity_logs').insert(params)
}

async function getCurrentUserInfo(): Promise<{ id: string; name: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  return { id: user.id, name: data?.full_name ?? user.email ?? 'Noma\'lum' }
}

async function log(action: string, entity_type: string, entity_id?: string, entity_name?: string, details?: Record<string, any>) {
  const u = await getCurrentUserInfo()
  if (!u) return
  await logActivity({ user_id: u.id, user_name: u.name, action, entity_type, entity_id, entity_name, details })
}

export interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: Record<string, any> | null
  created_at: string
}

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getNotifications(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

export async function markNotificationRead(id: string) {
  const supabase = createClient()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}
