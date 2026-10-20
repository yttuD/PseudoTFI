'use client';

import { useEffect } from 'react';

export function TrackUnidadView({ unidadId }: { unidadId: string }) {
  useEffect(() => {
    if (!unidadId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
    fetch(`${apiUrl}/marketplace/unidades/${unidadId}/vista`, {
      method: 'POST',
    }).catch(() => {});
  }, [unidadId]);

  return null;
}
