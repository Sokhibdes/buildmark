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
  return data
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
      stage:workflow_stages(id, name, slug, color)
    `)
    .order('created_at', { ascending: false })

  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
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
  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
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
}

// =============================================
// CAMPAIGNS
// =============================================
export async function getCampaigns(clientId?: string): Promise<Campaign[]> {
  const supabase = createClient()
  let query = supabase
    .from('campaigns')
    .select(`*, client:clients(id, company_name)`)
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
    .select('client_id, expires_at, clients(*)')
    .eq('token', token)
    .single()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return (data as any).clients as Client
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
