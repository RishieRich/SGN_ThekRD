'use client';

import {ArrowLeft, ArrowRight, Building2, Crown, Delete, Eye, FileSpreadsheet, HardHat, ShieldCheck, Sparkles, Users} from 'lucide-react';
import {motion} from 'motion/react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AmbientBackdrop} from '@/components/ambient/AmbientBackdrop';
import {ParticleOrb} from '@/components/ambient/ParticleOrb';
import {SiteScene} from '@/components/ambient/SiteScene';
import {LogoMark} from '@/components/brand/LogoMark';
import {companies} from '@/data/sample-data';
import {LanguageSwitch} from '@/components/ui/LanguageSwitch';
import {users} from '@/data/users';
import type {AppUser, Locale, UserRole} from '@/types';
import {loadMessages, messagesFor} from '@/lib/messages';
import styles from './login.module.css';


const roleIcons: Record<UserRole, typeof Crown> = {owner: Crown, admin: ShieldCheck, viewer: Eye};

export function LoginExperience() {
  const [locale, setLocaleState] = useState<Locale>('en');
  const setLocale = (next: Locale) => void loadMessages(next).then(() => setLocaleState(next));
  return (
    <NextIntlClientProvider locale={locale} messages={messagesFor(locale)} timeZone="Asia/Kolkata">
      <LoginPanel locale={locale} setLocale={setLocale} />
    </NextIntlClientProvider>
  );
}

function LoginPanel({locale, setLocale}: {locale: Locale; setLocale: (locale: Locale) => void}) {
  const t = useTranslations('login');
  const common = useTranslations('common');
  const scene = useTranslations('scene');
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitPin(nextPin: string) {
    if (!selectedUser || nextPin.length !== 4 || loading) return;
    setLoading(true);
    setError(false);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({userId: selectedUser.id, pin: nextPin})
    });
    if (response.ok) {
      window.localStorage.setItem('arq-locale', locale);
      router.replace('/home');
      router.refresh();
      return;
    }
    setPin('');
    setError(true);
    setLoading(false);
  }

  function pressKey(key: string) {
    if (loading) return;
    if (key === 'delete') {
      setPin((current) => current.slice(0, -1));
      setError(false);
      return;
    }
    if (pin.length >= 4) return;
    const nextPin = `${pin}${key}`;
    setPin(nextPin);
    setError(false);
    if (nextPin.length === 4) void submitPin(nextPin);
  }

  function selectUser(user: AppUser) {
    setSelectedUser(user);
    setPin('');
    setError(false);
  }

  return (
    <main className={styles.page}>
      <AmbientBackdrop />
      <section className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <LogoMark intro size="lg" />
        </div>
        <div className={styles.brandStory}>
          <motion.div animate={{opacity: 1, scale: 1}} className={styles.brandOrb} initial={{opacity: 0, scale: 0.85}} transition={{duration: 0.9, delay: 0.3}}>
            <ParticleOrb size={168} state="idle" />
          </motion.div>
          <span className={styles.eyebrow}><Sparkles size={15} /> {common('tagline')}</span>
          <h1>
            {common('appName').split(' ').map((word, index) => (
              <motion.span animate={{opacity: 1, y: 0}} initial={{opacity: 0, y: 18}} key={word} transition={{duration: 0.5, delay: 0.45 + index * 0.1, ease: [0.22, 1, 0.36, 1]}}>
                {word}{' '}
              </motion.span>
            ))}
          </h1>
          <p>{t('brandLine')}</p>
          <div className={styles.promiseList}>
            <span><Users size={16} /> {t('promiseWorkers', {count: 152})}</span>
            <span><Building2 size={16} /> {t('promiseCompanies', {count: companies.length})}</span>
            <span><FileSpreadsheet size={16} /> {t('promiseModes')}</span>
            <span><ShieldCheck size={16} /> {common('localPreview')}</span>
          </div>
        </div>
        <div className={styles.brandScene}>
          <SiteScene companies={companies} label={scene('loginLabel')} litIds={companies.slice(0, 3).map((company) => company.id)} />
        </div>
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.loginTopbar}>
          <span className={styles.mobileLogo}><LogoMark intro size="md" /></span>
          <LanguageSwitch label={t('language')} locale={locale} onChange={setLocale} />
        </div>
        <motion.div
          animate={{opacity: 1, y: 0}}
          className={styles.loginCard}
          initial={{opacity: 0, y: 12}}
          transition={{duration: 0.32}}
        >
          {!selectedUser ? (
            <>
              <span className={styles.cardEyebrow}>{t('eyebrow')}</span>
              <h2>{t('title')}</h2>
              <p>{t('subtitle')}</p>
              <div className={styles.userList}>
                {users.map((user, index) => {
                  const Icon = roleIcons[user.role];
                  return (
                    <button className={styles.userCard} key={user.id} onClick={() => selectUser(user)} type="button">
                      <span className={`${styles.userAvatar} ${styles[`avatar${index + 1}`]}`}><Icon size={22} strokeWidth={1.9} /></span>
                      <span className={styles.userInfo}>
                        <span className={styles.roleLine}>
                          <strong>{t(user.role)}</strong>
                          <em data-role={user.role}>{t(`persona.${user.role}.access`)}</em>
                        </span>
                        <small>{t(`persona.${user.role}.hint`)}</small>
                      </span>
                      <ArrowRight size={20} strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button className={styles.backButton} onClick={() => setSelectedUser(null)} type="button">
                <ArrowLeft size={18} /> {t('switchUser')}
              </button>
              <div className={styles.pinIdentity}>
                <span className={styles.pinAvatar} data-role={selectedUser.role}>
                  {(() => {
                    const Icon = roleIcons[selectedUser.role];
                    return <Icon size={22} strokeWidth={1.9} />;
                  })()}
                </span>
                <span>
                  <strong>{t(selectedUser.role)}</strong>
                  <small>{t(`persona.${selectedUser.role}.access`)}</small>
                </span>
              </div>
              <p className={styles.pinScope}>{t(`persona.${selectedUser.role}.hint`)}</p>
              <h2>{t('enterPin', {name: t(selectedUser.role)})}</h2>
              <div className={styles.pinDots} aria-label={t('enterPin', {name: t(selectedUser.role)})}>
                {[0, 1, 2, 3].map((index) => (
                  <span className={index < pin.length ? styles.pinDotFilled : styles.pinDot} key={index} />
                ))}
              </div>
              <p className={error ? styles.pinError : styles.pinHint}>
                {error ? t('wrongPin') : loading ? t('checking') : t('pinHint', {pin: selectedUser.previewPin})}
              </p>
              <div className={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                  <button disabled={loading} key={key} onClick={() => pressKey(key)} type="button">{key}</button>
                ))}
                <span />
                <button disabled={loading} onClick={() => pressKey('0')} type="button">0</button>
                <button aria-label={common('delete')} disabled={loading} onClick={() => pressKey('delete')} type="button">
                  <Delete size={22} />
                </button>
              </div>
            </>
          )}
        </motion.div>
        <div className={styles.safetyNote}>
          <HardHat size={16} />
          <span>{common('tagline')}</span>
        </div>
      </section>
    </main>
  );
}
