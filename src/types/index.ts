// =============================================
// Grafuz CRM - TypeScript Types
// =============================================

export type UserRole =
  | 'owner'
  | 'admin'
  | 'content_manager'
  | 'designer'
  | 'targetologist'
  | 'video_editor'
  | 'operator'
  | 'client'

export type ClientPackage = 'starter' | 'standard' | 'premium' | 'full'
export type ClientStatus = 'active' | 'paused' | 'completed' | 'lead'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'approved' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskType = 'content' | 'design' | 'video' | 'targeting' | 'shooting' | 'strategy' | 'report' | 'other'
export type ContentType = 'post' | 'story' | 'reel' | 'video' | 'banner' | 'carousel'
export type Platform = 'instagram' | 'telegram' | 'facebook' | 'tiktok' | 'youtube'
export type ContentStatus = 'draft' | 'in_review' | 'client_approval' | 'approved' | 'scheduled' | 'published' | 'rejected'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type ShootingStatus = 'planned' | 'confirmed' | 'done' | 'cancelled' | 'rescheduled'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at: string
}

export interface Client {
  id: string
  company_name: string
  contact_name: string
  phone?: string
  email?: string
  industry: string
  package: ClientPackage
  status: ClientStatus
  portal_access: boolean
  notes?: string
  logo_url?: string
  fb_ad_account_id?: string
  instagram_url?: string
  telegram_url?: string
  facebook_url?: string
  contract_start?: string
  contract_end?: string
  monthly_post_count: number
  created_at: string
  updated_at: string
  // computed
  tasks?: Task[]
  content_items?: ContentItem[]
}

export interface WorkflowStage {
  id: string
  name: string
  slug: string
  order_index: number
  color: string
  description?: string
  visible_to_client: boolean
  requires_approval: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  client_id?: string
  assigned_to?: string[]
  stage_id?: string
  status: TaskStatus
  priority: TaskPriority
  task_type?: TaskType
  due_date?: string
  completed_at?: string
  visible_to_client: boolean
  client_approved?: boolean
  client_notes?: string
  content_url?: string
  stage_entered_at?: string
  timer_started_at?: string
  timer_paused_at?: string
  timer_stopped_at?: string
  timer_total_paused_ms?: number
  created_by?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  assignee?: Profile
  stage?: WorkflowStage
  creator?: { id: string; full_name: string }
}

export interface ContentItem {
  id: string
  client_id: string
  title: string
  content_type?: ContentType
  platform?: Platform
  caption?: string
  hashtags?: string[]
  file_urls?: string[]
  thumbnail_url?: string
  status: ContentStatus
  scheduled_for?: string
  published_at?: string
  client_approved: boolean
  client_approved_at?: string
  client_feedback?: string
  created_by?: string
  created_at: string
  updated_at: string
  client?: Client
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  platform?: Platform
  objective?: string
  budget_total?: number
  budget_spent: number
  status: CampaignStatus
  start_date?: string
  end_date?: string
  impressions: number
  clicks: number
  conversions: number
  ctr?: number
  cpc?: number
  notes?: string
  facebook_campaign_id?: string
  created_by?: string
  created_at: string
  client?: Client
}

export interface MonthlyReport {
  id: string
  client_id: string
  month: string
  posts_planned: number
  posts_published: number
  total_reach: number
  total_engagement: number
  follower_growth: number
  stories_count: number
  reels_count: number
  ad_spend: number
  leads_count: number
  summary?: string
  recommendations?: string
  is_sent_to_client: boolean
  created_at: string
  client?: Client
}

export interface ShootingSchedule {
  id: string
  client_id: string
  title: string
  location?: string
  scheduled_date: string
  scheduled_time?: string
  duration_hours?: number
  assigned_operator?: string
  status: ShootingStatus
  notes?: string
  created_at: string
  client?: Client
  operator?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body?: string
  type: 'task' | 'approval' | 'report' | 'system' | 'client'
  is_read: boolean
  link?: string
  created_at: string
}

// Dashboard stats uchun
export interface DashboardStats {
  active_clients: number
  total_tasks: number
  overdue_tasks: number
  pending_approvals: number
  this_month_posts: number
  active_campaigns: number
}

// Kanban uchun
export interface KanbanColumn {
  stage: WorkflowStage
  tasks: Task[]
}

// Client portal uchun
export interface ClientPortalData {
  client: Client
  content_items: ContentItem[]
  campaigns: Campaign[]
  latest_report?: MonthlyReport
  pending_approvals: ContentItem[]
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Egasi',
  admin: 'Administrator',
  content_manager: 'Kontent menejeri',
  designer: 'Grafik dizayner',
  targetologist: 'Targetolog',
  video_editor: 'Video montajor',
  operator: 'Operator/Rejissor',
  client: 'Mijoz',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'purple',
  admin: 'blue',
  content_manager: 'teal',
  designer: 'pink',
  targetologist: 'amber',
  video_editor: 'coral',
  operator: 'green',
  client: 'gray',
}

export const PACKAGE_LABELS: Record<ClientPackage, string> = {
  starter: 'Starter (12 post/oy)',
  standard: 'Standart (16 post/oy)',
  premium: 'Premium (30 post/oy)',
  full: 'Full (cheksiz)',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  content: 'Kontent',
  design: 'Dizayn',
  video: 'Video',
  targeting: 'Targeting',
  shooting: 'Syomka',
  strategy: 'Strategiya',
  report: 'Hisobot',
  other: 'Boshqa',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'green',
  medium: 'blue',
  high: 'amber',
  urgent: 'coral',
}
