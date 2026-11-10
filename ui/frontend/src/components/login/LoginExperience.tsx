'use client';

import {ArrowLeft, ArrowRight, Check, Delete, HardHat, ShieldCheck, Sparkles} from 'lucide-react';
import {motion} from 'motion/react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import en from '../../../messages/en.json';
import hi from '../../../messages/hi.json';
import mr from '../../../messages/mr.json';
import gu from '../../../messages/gu.json';
import {LogoMark} from '@/components/brand/LogoMark';
import {LanguageSwitch} from '@/components/ui/LanguageSwitch';
import {users} from '@/data/users';
import type {AppUser, Locale} from '@/types';
import styles from './login.module.css';

const messages = {en, hi, mr, gu};

export function LoginExperience() {
  const [locale, setLocale] = useState<Locale>('en');
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Kolkata">
      <LoginPanel locale={locale} setLocale={setLocale} />
    </NextIntlClientProvider>
  );
}

function LoginPanel({locale, setLocale}: {locale: Locale; setLocale: (locale: Locale) => void}) {
  const t = useTranslations('login');
  const common = useTranslations('common');
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
      <section className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <LogoMark />
        </div>
        <div className={styles.brandStory}>
          <span className={styles.eyebrow}><Sparkles size={15} /> {common('tagline')}</span>
          <h1>{common('appName')}</h1>
          <p>{t('subtitle')}</p>
          <div className={styles.promiseList}>
            <span><Check size={17} /> 152</span>
            <span><Check size={17} /> 5</span>
            <span><ShieldCheck size={17} /> {common('localPreview')}</span>
          </div>
        </div>
        <div className={styles.weave} aria-hidden="true" />
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.loginTopbar}>
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
                {users.map((user, index) => (
                  <button className={styles.userCard} key={user.id} onClick={() => selectUser(user)} type="button">
                    <span className={`${styles.userAvatar} ${styles[`avatar${index + 1}`]}`}>{user.initials}</span>
                    <span className={styles.userInfo}>
                      <strong>{user.name}</strong>
                      <small>{t(user.role)}</small>
                    </span>
                    <ArrowRight size={20} strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button className={styles.backButton} onClick={() => setSelectedUser(null)} type="button">
                <ArrowLeft size={18} /> {t('switchUser')}
              </button>
              <div className={styles.pinIdentity}>
                <span className={styles.pinAvatar}>{selectedUser.initials}</span>
                <span>
                  <strong>{selectedUser.name}</strong>
                  <small>{t(selectedUser.role)}</small>
                </span>
              </div>
              <h2>{t('enterPin', {name: selectedUser.name})}</h2>
              <div className={styles.pinDots} aria-label={t('enterPin', {name: selectedUser.name})}>
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
