'use client';

import {AlertCircle, Bell, ClipboardCheck, Eye, Home, LogOut, MessageCircle, ShieldCheck, Sparkles, Users} from 'lucide-react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {AmbientBackdrop} from '@/components/ambient/AmbientBackdrop';
import {ParticleOrb} from '@/components/ambient/ParticleOrb';
import {SiteScene} from '@/components/ambient/SiteScene';
import {AssistantPanel} from '@/components/assistant/AssistantPanel';
import {LogoMark} from '@/components/brand/LogoMark';
import {RemindersPanel} from '@/components/reminders/RemindersPanel';
import {LanguageSwitch} from '@/components/ui/LanguageSwitch';
import {Toaster} from '@/components/ui/Toaster';
import {companies} from '@/data/sample-data';
import {todayTotals} from '@/domain/attendance';
import {reminderBuckets} from '@/domain/reminders';
import {formatTime} from '@/lib/format';
import {useApp} from '@/providers/AppProvider';
import {displayName} from '@/data/users';
import type {UserRole} from '@/types';
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
  const assistantT = useTranslations('assistant');
  const scene = useTranslations('scene');
  const {user, locale, setLocale, hydrated, now, reminders: reminderItems, setRemindersOpen, attendance, workers, openAssistant, assistant} = useApp();
  const buckets = reminderBuckets(reminderItems, now);
  const dueCount = buckets.overdue.length;
  const openCount = dueCount + buckets.today.length;
  const totals = todayTotals(workers, attendance, companies);
  const done = attendance.confirmedCompanyIds.length;

  async function logout() {
    await fetch('/api/auth/logout', {method: 'POST'});
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <AmbientBackdrop />

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
              <Link aria-current={active ? 'page' : undefined} className={active ? styles.navActive : styles.navLink} href={item.href} key={item.href}>
                <span className={styles.navIcon}><Icon size={19} strokeWidth={1.9} /></span>
                <span>{nav(item.key)}</span>
                {showDot && <i aria-label={common('pending')} className={styles.navDot} />}
              </Link>
            );
          })}
        </nav>

        <button className={styles.askButton} onClick={() => openAssistant('type')} type="button">
          <ParticleOrb size={38} state={assistant.open ? 'thinking' : 'idle'} />
          <span>
            <strong>{assistantT('title')}</strong>
            <small>{assistantT('railHint')}</small>
          </span>
        </button>

        {hydrated && (
          <div className={styles.siteCard}>
            <div className={styles.siteHead}>
              <span><i className={styles.liveDot} aria-hidden="true" />{scene('siteTitle')}</span>
              <small>{scene('siteLine', {present: totals.present, done, total: companies.length})}</small>
            </div>
            <SiteScene companies={companies} label={scene('label', {done, total: companies.length})} litIds={attendance.confirmedCompanyIds} variant="compact" />
          </div>
        )}

        <div className={styles.railProfile}>
          <span className={styles.avatar}><ProfileMark role={user.role} initials={user.initials} /></span>
          <span className={styles.profileText}>
            <strong>{displayName(user, login(user.role))}</strong>
            <small>{user.role === 'owner' ? login('owner') : login(`persona.${user.role}.access`)}</small>
          </span>
          <button aria-label={common('logout')} className={styles.logoutButton} onClick={logout} type="button">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <Link className={styles.mobileLogo} href="/home">
            <LogoMark compact size="sm" />
          </Link>
          <div className={styles.tenant}>
            <span>Rajesh Desai</span>
            <small>
              {hydrated && <><span className={styles.liveDot} aria-hidden="true" />{formatTime(now, locale)} · </>}
              {common('localPreview')}
            </small>
          </div>
          <button className={styles.askPill} onClick={() => openAssistant('type')} type="button">
            <Sparkles size={16} /> {assistantT('open')}
          </button>
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
            <ProfileMark role={user.role} initials={user.initials} />
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

      <button aria-label={assistantT('open')} className={styles.globalAsk} onClick={() => openAssistant('type')} type="button">
        <ParticleOrb size={44} state={assistant.open ? 'thinking' : 'idle'} />
      </button>

      {/* On phones the centre button is the assistant (it answers questions too), so "Ask" moves into it. */}
      <nav className={styles.mobileNav}>
        {navItems
          .filter((item) => item.key !== 'ask')
          .map((item) => {
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
      {hydrated && <AssistantPanel />}
      <Toaster />
    </div>
  );
}

/** The owner is a person (initials); Admin and Viewer are roles, shown by what they can do. */
function ProfileMark({role, initials}: {role: UserRole; initials: string}) {
  if (role === 'admin') return <ShieldCheck aria-hidden="true" size={17} strokeWidth={2} />;
  if (role === 'viewer') return <Eye aria-hidden="true" size={17} strokeWidth={2} />;
  return <>{initials}</>;
}
