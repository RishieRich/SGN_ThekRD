'use client';

import {AlertCircle, Bell, ClipboardCheck, Home, LogOut, MessageCircle, Mic, Users} from 'lucide-react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {LogoMark} from '@/components/brand/LogoMark';
import {RemindersPanel} from '@/components/reminders/RemindersPanel';
import {LanguageSwitch} from '@/components/ui/LanguageSwitch';
import {Toaster} from '@/components/ui/Toaster';
import {reminderBuckets} from '@/domain/reminders';
import {formatTime} from '@/lib/format';
import {useApp} from '@/providers/AppProvider';
import styles from './shell.module.css';

const navItems = [
  {href: '/home', key: 'home', icon: Home},
  {href: '/hajri', key: 'hajri', icon: ClipboardCheck},
  {href: '/kaamgar', key: 'workers', icon: Users},
  {href: '/masle', key: 'issues', icon: AlertCircle},
  {href: '/pucho', key: 'ask', icon: MessageCircle}
] as const;

function PageSkeleton() {
  return (
    <div aria-hidden="true" className={styles.skeleton}>
      <span className={styles.skeletonTitle} />
      <span className={styles.skeletonLine} />
      <div className={styles.skeletonGrid}>
        <span /><span /><span /><span />
      </div>
    </div>
  );
}

export function AppShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const login = useTranslations('login');
  const reminders = useTranslations('reminders');
  const {user, locale, setLocale, hydrated, now, reminders: reminderItems, setRemindersOpen, attendance} = useApp();
  const buckets = reminderBuckets(reminderItems, now);
  const dueCount = buckets.overdue.length;
  const openCount = dueCount + buckets.today.length;

  async function logout() {
    await fetch('/api/auth/logout', {method: 'POST'});
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <Link className={styles.desktopLogo} href="/home">
          <LogoMark />
        </Link>
        <nav className={styles.desktopNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            const showDot = item.href === '/hajri' && hydrated && !attendance.allConfirmed;
            return (
              <Link className={active ? styles.navActive : styles.navLink} href={item.href} key={item.href}>
                <Icon size={21} strokeWidth={1.75} />
                <span>{nav(item.key)}</span>
                {showDot && <i aria-label={common('pending')} className={styles.navDot} />}
              </Link>
            );
          })}
        </nav>
        <div className={styles.railProfile}>
          <span className={styles.avatar}>{user.initials}</span>
          <span className={styles.profileText}>
            <strong>{user.name}</strong>
            <small>{login(user.role)}</small>
          </span>
          <button aria-label={common('logout')} className={styles.logoutButton} onClick={logout} type="button">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <Link className={styles.mobileLogo} href="/home">
            <LogoMark compact />
          </Link>
          <div className={styles.tenant}>
            <span>Rajesh Desai</span>
            <small>
              {hydrated && <><span className={styles.liveDot} aria-hidden="true" />{formatTime(now, locale)} · </>}
              {common('localPreview')}
            </small>
          </div>
          <button
            aria-label={reminders('bellLabel', {count: openCount})}
            className={styles.bell}
            data-due={dueCount > 0 ? 'true' : undefined}
            onClick={() => setRemindersOpen(true)}
            type="button"
          >
            <Bell size={19} />
            {hydrated && openCount > 0 && <span className={styles.bellCount}>{openCount}</span>}
          </button>
          <LanguageSwitch label={login('language')} locale={locale} onChange={setLocale} />
          <button aria-label={common('logout')} className={styles.mobileAvatar} onClick={logout} type="button">
            {user.initials}
          </button>
        </header>

        <div className={styles.sampleRibbon}>
          <span className={styles.sampleDot} />
          <strong>{common('sampleData')}</strong>
          <span>{common('sampleNotice')}</span>
          <button type="button">{common('removeSample')}</button>
        </div>

        <main className={styles.content}>{hydrated ? children : <PageSkeleton />}</main>
      </div>

      {pathname !== '/pucho' && (
        <Link aria-label={nav('ask')} className={styles.globalMic} href="/pucho">
          <Mic size={23} strokeWidth={1.9} />
        </Link>
      )}

      <nav className={styles.mobileNav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link className={active ? styles.mobileNavActive : styles.mobileNavLink} href={item.href} key={item.href}>
              <Icon size={21} strokeWidth={active ? 2.1 : 1.75} />
              <span>{nav(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {hydrated && <RemindersPanel />}
      <Toaster />
    </div>
  );
}
