'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Profile = { id: string; full_name: string; phone: string | null; rol: string; cupo_maximo: number };

export default function CuentaPage() {
  const locale = useLocale();
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
        setError('Iniciá sesión para ver tu cuenta.');
        setLoading(false);
        return;
      }
      setEmail(data.user.email || '');
      const { data: row, error: profileError } = await client.from('users')
        .select('id,full_name,phone,rol,cupo_maximo')
        .eq('id', data.user.id)
        .single();
      if (!mounted) return;
      if (profileError || !row) setError('No pudimos cargar tu perfil. Intentá actualizar la página.');
      else {
        setProfile(row as Profile);
        setFullName(row.full_name || '');
        setPhone(row.phone || '');
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        setError('No pudimos cargar tu perfil. Intentá nuevamente.');
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    setMessage('');
    const client = createClient();
    const { error: updateError } = await client.from('users')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', profile.id);
    if (updateError) setError('No pudimos guardar tus datos. Intentá nuevamente.');
    else {
      setMessage('Datos guardados.');
      window.dispatchEvent(new Event('rendo:profile-updated'));
    }
    setSaving(false);
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-dorado-700 dark:text-dorado-300">Tu cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Mi perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">Consultá y actualizá tus datos de contacto.</p>
      </div>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Cargando perfil...</p> : error && !profile ? (
        <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-sm">
          <p>{error}</p>
          <Link href={`/${locale}/auth/login?next=/${locale}/cuenta`} className="mt-3 inline-flex text-primary underline">Iniciar sesión</Link>
        </div>
      ) : profile && (
        <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Tipo de cuenta: </span>
            <strong className="capitalize">{profile.rol === 'buscador' ? 'Buscador' : profile.rol}</strong>
            {profile.rol === 'gestor' && <span className="block mt-1 text-xs text-muted-foreground">Cupo beta: {profile.cupo_maximo} unidades sin costo.</span>}
          </div>
          <label className="block text-sm font-medium">Nombre completo
            <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={120} className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-background px-3 text-foreground" />
          </label>
          <label className="block text-sm font-medium">Correo electrónico
            <input type="email" value={email} readOnly className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-muted px-3 text-muted-foreground" />
            <span className="mt-1 block text-xs text-muted-foreground">El correo no se cambia desde este formulario.</span>
          </label>
          <label className="block text-sm font-medium">Teléfono
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="mt-1.5 block w-full min-h-11 rounded-xl border border-border bg-background px-3 text-foreground" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
      )}
    </main>
  );
}
