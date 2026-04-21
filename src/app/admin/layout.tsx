'use client'
// src/app/admin/layout.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Kanban, UserCircle,
  BarChart3, Bell, LogOut, Menu, X, ChevronDown,
  Camera, Megaphone, FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/queries'
import type { Profile } from '@/types'
import { ROLE_LABELS } from '@/types'
import styles from './admin.module.css'

const NAV_ITEMS = [
  {
    section: 'Asosiy',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/clients', label: 'Mijozlar', icon: Users },
      { href: '/admin/tasks', label: 'Vazifalar', icon: Kanban },
    ]
  },
  {
    section: 'Ishlar',
    items: [
      { href: '/admin/content', label: 'Kontentlar', icon: FileText },
      { href: '/admin/campaigns', label: 'Kampaniyalar', icon: Megaphone },
      { href: '/admin/shooting', label: 'Syomka jadvali', icon: Camera },
    ]
  },
  {
    section: 'Boshqaruv',
    items: [
      { href: '/admin/team', label: 'Komanda', icon: UserCircle },
      { href: '/admin/reports', label: 'Hisobotlar', icon: BarChart3 },
    ]
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications, setNotifications] = useState(3)

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U'

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <div className={styles.logoText}>BuildMark</div>
              <div className={styles.logoSub}>Marketing CRM</div>
            </div>
          )}
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(section => (
            <div key={section.section}>
              {sidebarOpen && (
                <div className={styles.navSection}>{section.section}</div>
              )}
              {section.items.map(item => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon size={16} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {user && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>{initials}</div>
              {sidebarOpen && (
                <div className={styles.userDetails}>
                  <div className={styles.userName}>{user.full_name}</div>
                  <div className={styles.userRole}>{ROLE_LABELS[user.role]}</div>
                </div>
              )}
              <button className={styles.logoutBtn} onClick={handleLogout} title="Chiqish">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.breadcrumb}>
              {pathname.split('/').filter(Boolean).map((segment, i, arr) => (
                <span key={segment}>
                  {i > 0 && <span className={styles.breadcrumbSep}>/</span>}
                  <span className={i === arr.length - 1 ? styles.breadcrumbActive : styles.breadcrumbItem}>
                    {segment === 'admin' ? 'Bosh sahifa' :
                     segment === 'dashboard' ? 'Dashboard' :
                     segment === 'clients' ? 'Mijozlar' :
                     segment === 'tasks' ? 'Vazifalar' :
                     segment === 'team' ? 'Komanda' :
                     segment === 'reports' ? 'Hisobotlar' :
                     segment === 'content' ? 'Kontentlar' :
                     segment === 'campaigns' ? 'Kampaniyalar' :
                     segment === 'shooting' ? 'Syomka' : segment}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className={styles.topbarRight}>
            <button className={styles.notifBtn}>
              <Bell size={16} />
              {notifications > 0 && (
                <span className={styles.notifBadge}>{notifications}</span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
