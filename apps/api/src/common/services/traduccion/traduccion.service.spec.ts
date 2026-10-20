import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TraduccionService } from './traduccion.service.js';

describe('TraduccionService / DeepL', () => {
  const originalKey = process.env.DEEPL_AUTH_KEY;
  const originalFetch = globalThis.fetch;
  const service = new TraduccionService();

  beforeEach(() => {
    process.env.DEEPL_AUTH_KEY = 'test-key:fx';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.DEEPL_AUTH_KEY;
    else process.env.DEEPL_AUTH_KEY = originalKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it.each([
    ['en', 'EN-US', 'House for rent'],
    ['pt', 'PT-BR', 'Casa para alugar'],
  ] as const)('traduce español a %s con el destino correcto', async (lang, target, result) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ text: result }] }),
    });
    globalThis.fetch = fetchMock;

    await expect(service.traducir('Casa en alquiler', lang)).resolves.toBe(result);
    expect(fetchMock).toHaveBeenCalledWith('https://api-free.deepl.com/v2/translate',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'DeepL-Auth-Key test-key:fx' }),
        body: JSON.stringify({ text: ['Casa en alquiler'], source_lang: 'ES', target_lang: target }),
      }));
  });

  it('no inventa traducciones cuando falta la clave', async () => {
    delete process.env.DEEPL_AUTH_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    await expect(service.traducir('Casa en alquiler', 'en')).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no guarda como traducción una respuesta vacía o fallo del proveedor', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ translations: [] }) });
    await expect(service.traducir('Casa', 'pt')).rejects.toMatchObject({ status: 503 });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 456 });
    await expect(service.traducir('Casa', 'pt')).rejects.toMatchObject({ status: 503 });
  });
});
