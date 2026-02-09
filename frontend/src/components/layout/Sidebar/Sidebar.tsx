import { NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '@/config/navigation'
import { NavIcon } from '@/components/ui/Icons'
import type { SystemStatus } from '@/types'
import styles from './Sidebar.module.css'

interface SidebarProps {
  systemStatus?: SystemStatus
}

const defaultStatus: SystemStatus = {
  operational: true,
  lastUpdated: '23:14:35',
}

export function Sidebar({ systemStatus = defaultStatus }: SidebarProps) {
  const status = systemStatus
  const location = useLocation()

  return (
    <aside className={styles.sidebar} role="navigation" aria-label="Main navigation">
      <div className={styles.brand}>
        <div className={styles.brandTitle}>
          <span className={styles.brandIcon} aria-hidden>
            <IconCamera />
          </span>
          VisionGuard
        </div>
        <div className={styles.brandSubtitle}>Asset Intelligence</div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isParentActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          return (
            <div key={item.id} className={styles.navItemWrap}>
              <NavLink
                to={item.path}
                className={() =>
                  [styles.navLink, isParentActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
                }
                end={!item.subItems?.length}
              >
                <span className={styles.navIcon} aria-hidden>
                  <NavIcon icon={item.icon} />
                </span>
                {item.label}
              </NavLink>
              {item.subItems?.length && isParentActive && (
                <div className={styles.subNav}>
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.id}
                      to={sub.path}
                      className={({ isActive }) =>
                        [styles.subNavLink, isActive ? styles.subNavLinkActive : ''].filter(Boolean).join(' ')
                      }
                      end={sub.path === item.path}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.status}>
          <span className={styles.statusDot} aria-hidden />
          <span className={styles.statusLabel}>
            {status.operational ? 'System Operational' : 'System Degraded'}
          </span>
        </div>
        <div className={styles.lastUpdated}>Last updated: {status.lastUpdated}</div>
      </footer>
    </aside>
  )
}

function IconCamera() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
