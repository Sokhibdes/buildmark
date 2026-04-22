'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Kanban, UserCircle,
  BarChart3, Bell, LogOut, Menu, X, Camera, Megaphone, FileText, Activity,
  Sun, Moon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import lightStyles from './admin.module.css'
import darkStyles from './admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

const BASE_NAV: { section: string; items: { href: string; label: string; icon: any; adminOnly?: boolean }[] }[] = [
  {
    section: 'Asosiy',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/clients', label: 'Mijozlar', icon: Users, adminOnly: true },
      { href: '/admin/tasks', label: 'Vazifalar', icon: Kanban },
    ]
  },
  {
    section: 'Ishlar',
    items: [
      { href: '/admin/content', label: 'Kontentlar', icon: FileText },
      { href: '/admin/campaigns', label: 'Kampaniyalar', icon: Megaphone },
      { href: '/admin/shooting', label: 'Syomka', icon: Camera },
    ]
  },
  {
    section: 'Boshqaruv',
    items: [
      { href: '/admin/team', label: 'Komanda', icon: UserCircle, adminOnly: true },
      { href: '/admin/reports', label: 'Hisobotlar', icon: BarChart3 },
      { href: '/admin/activity', label: 'Faollik', icon: Activity, adminOnly: true },
    ]
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const styles = theme === 'dark' ? darkStyles : lightStyles
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('Admin')
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return
        if (!session) { router.push('/login'); return }
        setUserName(session.user.email?.split('@')[0] ?? 'Admin')
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', session.user.id)
          .single()
        if (cancelled) return
        if (profile) {
          setUserName(profile.full_name)
          setUserRole(profile.role as UserRole)
          setUserAvatar(profile.avatar_url ?? null)
        }
      })
      .catch(() => { if (!cancelled) router.push('/login') })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [router])

  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const NAV_ITEMS = BASE_NAV.map(section => ({
    ...section,
    items: section.items.filter(item => !item.adminOnly || isAdmin),
  }))

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#888780' }}>
        Yuklanmoqda...
      </div>
    )
  }

  const pageLabel =
    pathname.includes('dashboard') ? 'Dashboard' :
    pathname.includes('clients') ? 'Mijozlar' :
    pathname.includes('tasks') ? 'Vazifalar' :
    pathname.includes('team') ? 'Komanda' :
    pathname.includes('reports') ? 'Hisobotlar' :
    pathname.includes('content') ? 'Kontentlar' :
    pathname.includes('campaigns') ? 'Kampaniyalar' :
    pathname.includes('shooting') ? 'Syomka' :
    pathname.includes('activity') ? 'Faollik jurnali' : 'Admin'

  return (
    <div className={styles.layout}>
      {mobileSidebarOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${sidebarExpanded ? styles.sidebarExpanded : ''} ${mobileSidebarOpen ? (styles as any).sidebarOpen : (styles as any).sidebarClosed}`}>

        {/* Sidebar header: logo + brand text + hamburger */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo} title="Grafuz CRM">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {sidebarExpanded && (
            <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <div className={styles.logoText}>Grafuz</div>
              <div className={styles.logoSub}>Marketing CRM</div>
            </div>
          )}
          <button className={styles.menuBtn} onClick={() => setSidebarExpanded(v => !v)} title="Menu">
            {sidebarExpanded ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(section => (
            <div key={section.section} style={{ width: '100%' }}>
              <div className={styles.navSection}>{section.section}</div>
              {section.items.map(item => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    title={!sidebarExpanded ? item.label : undefined}
                  >
                    <Icon size={16} />
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button className={styles.navItem} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className={styles.navItem} title="Chiqish" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
          <div className={styles.userRow}>
            {userAvatar ? (
              <div className={styles.userAvatarSmall} title={userName}>
                <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className={styles.userAvatarSmall} title={`${userName} · ${userRole ? ROLE_LABELS[userRole] : 'Admin'}`}>
                {userName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className={styles.userInfoRow}>
              <div className={styles.userNameText}>{userName}</div>
              <div className={styles.userRoleText}>{userRole ? ROLE_LABELS[userRole] : 'Admin'}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={`${styles.mobileSidebarToggle} ${styles.notifBtn}`}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbActive}>{pageLabel}</span>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <button className={styles.notifBtn} title="Bildirishnomalar">
              <Bell size={17} />
            </button>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
