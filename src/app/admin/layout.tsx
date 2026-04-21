'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Kanban, UserCircle,
  BarChart3, Bell, LogOut, Menu, X, Camera, Megaphone, FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
      { href: '/admin/shooting', label: 'Syomka', icon: Camera },
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('Admin')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUserName(session.user.email?.split('@')[0] ?? 'Admin')
      }
      setChecking(false)
    })
  }, [router])

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

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <div className={styles.logoText}>BuildMark</div>
              <div className={styles.logoSub}>Marketing CRM</div>
            </div>
          )}
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(section => (
            <div key={section.section}>
              {sidebarOpen && <div className={styles.navSection}>{section.section}</div>}
              {section.items.map(item => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
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
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{userName.slice(0, 2).toUpperCase()}</div>
            {sidebarOpen && (
              <div className={styles.userDetails}>
                <div className={styles.userName}>{userName}</div>
                <div className={styles.userRole}>Owner</div>
              </div>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbActive}>
                {pathname.includes('dashboard') ? 'Dashboard' :
                 pathname.includes('clients') ? 'Mijozlar' :
                 pathname.includes('tasks') ? 'Vazifalar' :
                 pathname.includes('team') ? 'Komanda' :
                 pathname.includes('reports') ? 'Hisobotlar' :
                 pathname.includes('content') ? 'Kontentlar' :
                 pathname.includes('campaigns') ? 'Kampaniyalar' : 'Admin'}
              </span>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <Bell size={16} color="#888780" />
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
