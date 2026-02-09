import { IconHelp, IconShare, IconChevronDown } from '@/components/ui/Icons'
import { PLATFORM_TITLE } from '@/config/navigation'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.left}>
        <div className={styles.logo} aria-hidden>
          AI
        </div>
        <div className={styles.platform}>
          <span>{PLATFORM_TITLE}</span>
          <span className={styles.chevron} aria-hidden>
            <IconChevronDown size={18} />
          </span>
        </div>
      </div>
      <div className={styles.right}>
        <button type="button" className={styles.iconBtn} aria-label="Help">
          <IconHelp />
        </button>
        <button type="button" className={styles.shareBtn}>
          <IconShare size={18} />
          Share
        </button>
      </div>
    </header>
  )
}
