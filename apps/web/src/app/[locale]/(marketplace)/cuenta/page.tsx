'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Profile = { id: string; full_name: string; phone: string | null; rol: string; cupo_maximo: number };

export default function CuentaPage() {
  const locale = useLocale();
  const t = useTranslations('Profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const client = createClient();
    client.auth.getUser().then(async ({ data, error: authError }) => {
      if (!mounted) return;
      if (authError || !data.user) {
        setError(t('loginRequired'));
        setLoading(false);
        return;
      }
      setEmail(data.user.email || '');
      const { data: row, error: profileError } = await client.from('users')
        .select('id,full_name,phone,rol,cupo_maximo')
        .eq('id', data.user.id)
        .single();
      if (!mounted) return;
      if (profileError || !row) setError(t('loadError'));
      else {
        setProfile(row as Profile);
        setFullName(row.full_name || '');
        setPhone(row.phone || '');
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        setError(t('loadError'));
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || saving) return;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError(t('nameRequired'));
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const client = createClient();
      // A successful empty UPDATE is possible under RLS; require the returned
      // owner row before displaying a confirmation or updating local state.
      const { data: saved, error: updateError } = await client.from('users')
        .update({ full_name: trimmedName, phone: phone.trim() || null })
        .eq('id', profile.id)
        .select('id,full_name,phone')
        .single();
      if (updateError || !saved || saved.id !== profile.id) {
        setError(t('saveError'));
        return;
      }
      setProfile({ ...profile, full_name: saved.full_name, phone: saved.phone });
      setFullName(saved.full_name || '');
      setPhone(saved.phone || '');
      setMessage(t('saved'));
      window.dispatchEvent(new Event('rendo:profile-updated'));
    } catch {
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-dorado-700 dark:text-dorado-300">{t('account')}</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('intro')}</p>
      </div>
      {loading ? <p role="status" className="text-sm text-muted-foreground">{t('loading')}</p> : error && !profile ? (
        <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-sm">
          <p>{error}</p>
          <Link href={`/${locale}/auth/login?next=/${locale}/cuenta`} className="mt-3 inline-flex text-primary underline">{t('logIn')}</Link>
        </div>
      ) : profile && (
        <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{t('accountType')} </span>
            <strong className="capitalize">{profile.rol === 'buscador' ? t('searcher') : profile.rol === 'gestor' ? t('manager') : t('delegate')}</strong>
            {profile.rol === 'gestor' && <span className="block mt-1 text-xs text-muted-foreground">{t('betaQuota', { count: profile.cupo_maximo })}</span>}
          </div>
          <label className="block text-sm font-medium">{t('fullName')}
            <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={120} className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-background px-3 text-foreground" />
          </label>
          <label className="block text-sm font-medium">{t('email')}
            <input type="email" value={email} readOnly className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-muted px-3 text-muted-foreground" />
            <span className="mt-1 block text-xs text-muted-foreground">{t('emailReadOnly')}</span>
          </label>
          <label className="block text-sm font-medium">{t('phone')}
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-background px-3 text-foreground" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? t('saving') : t('save')}</button>
        </form>
      )}
    </div>
  );
}
