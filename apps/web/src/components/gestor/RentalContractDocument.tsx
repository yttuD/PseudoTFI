'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getClientAuthToken } from '@/lib/supabase/client-token';

interface Props {
  rentalId: string;
  storedPath?: string | null;
  token: string;
  canManage: boolean;
}

export function RentalContractDocument({ rentalId, storedPath, token, canManage }: Props) {
  const router = useRouter();
  const [path, setPath] = useState(storedPath || '');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const privatePath = path.startsWith(`${rentalId}/`) && !path.includes('..') ? path : null;
  const hasLegacyUrl = Boolean(path && !privatePath);

  const viewContract = async () => {
    if (!privatePath) return;
    setBusy(true);
    setSignedUrl(null);
    setError(null);
    try {
      const { data, error: storageError } = await createClient().storage
        .from('contratos').createSignedUrl(privatePath, 60);
      if (storageError || !data?.signedUrl) throw new Error('No se pudo habilitar la lectura privada.');
      setSignedUrl(data.signedUrl);
    } catch {
      setError('No pudimos abrir el documento. Verificá tu sesión y permisos.');
    } finally {
      setBusy(false);
    }
  };

  const uploadContract = async (file: File | undefined) => {
    if (!file || !canManage || busy) return;
    setError(null);
    setSuccess(null);
    setSignedUrl(null);
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setError('Seleccioná un archivo PDF válido.');
      return;
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setError('El PDF debe tener entre 1 byte y 10 MB.');
      return;
    }
    if (privatePath || hasLegacyUrl) {
      setError('Ya existe una referencia contractual. No se permite sobrescribirla desde este control.');
      return;
    }

    setBusy(true);
    const client = createClient();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const newPath = `${rentalId}/${crypto.randomUUID()}_${filename}`;
    let uploaded = false;
    try {
      const { error: uploadError, data } = await client.storage.from('contratos')
        .upload(newPath, file, { upsert: false, cacheControl: '3600' });
      if (uploadError || data?.path !== newPath) {
        throw new Error('No se pudo subir el documento privado.');
      }
      uploaded = true;

      const session = await client.auth.getSession();
      const authToken = session.data.session?.access_token || getClientAuthToken(token);
      if (!authToken) throw new Error('La sesión no está disponible.');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres/${rentalId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_url: newPath }),
      });
      if (!response.ok) throw new Error('No se pudo vincular el documento con el alquiler.');

      setPath(newPath);
      setSuccess('PDF adjuntado al alquiler correctamente.');
      router.refresh();
    } catch {
      if (uploaded) {
        // Best effort: prevent leaving an orphan when the protected API update fails.
        await client.storage.from('contratos').remove([newPath]).catch(() => undefined);
      }
      setError('No se pudo adjuntar el PDF. El alquiler original se conserva; reintentá desde esta lista.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs" data-testid="alquiler-contrato-documento">
      {privatePath ? (
        <>
          <button type="button" className="text-left underline underline-offset-2 disabled:opacity-50" disabled={busy}
            onClick={viewContract}>Ver PDF privado</button>
          {signedUrl && <a href={signedUrl} target="_blank" rel="noopener noreferrer"
            className="underline text-primary">Abrir documento (enlace temporal)</a>}
        </>
      ) : hasLegacyUrl ? (
        <span className="text-amber-700 dark:text-amber-300">Documento anterior: requiere revisión de acceso privado.</span>
      ) : canManage ? (
        <label className="flex flex-col gap-1">
          <span>Adjuntar contrato PDF (máx. 10 MB)</span>
          <input aria-label="Adjuntar contrato PDF" type="file" accept=".pdf,application/pdf"
            disabled={busy} onChange={async e => {
              const file = e.target.files?.[0];
              await uploadContract(file);
              e.target.value = '';
            }}
            className="w-full max-w-52 text-xs file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1" />
        </label>
      ) : (
        <span className="text-muted-foreground">Sin PDF adjunto</span>
      )}
      {busy && <span role="status">Procesando documento...</span>}
      {error && <span role="alert" className="text-destructive">{error}</span>}
      {success && <span role="status" className="text-emerald-700 dark:text-emerald-300">{success}</span>}
    </div>
  );
}
