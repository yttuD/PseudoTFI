import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class TraduccionService {
  async traducir(texto: string, idiomaDestino: 'en' | 'pt'): Promise<string> {
    if (!texto.trim()) return texto;

    const authKey = process.env.DEEPL_AUTH_KEY?.trim();
    if (!authKey) {
      throw new ServiceUnavailableException(
        'La traducción automática no está configurada. Desactivala y completá las traducciones manualmente.',
      );
    }

    const endpoint = authKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${authKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [texto],
          source_lang: 'ES',
          target_lang: idiomaDestino === 'pt' ? 'PT-BR' : 'EN-US',
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo conectar con el servicio de traducción. Intentá de nuevo.');
    }

    if (!response.ok) {
      // Never include provider response bodies or credentials in an API error.
      throw new ServiceUnavailableException('El servicio de traducción no está disponible. Intentá de nuevo.');
    }

    let translated: unknown;
    try {
      const payload: unknown = await response.json();
      translated = (payload as { translations?: { text?: unknown }[] })?.translations?.[0]?.text;
    } catch {
      throw new ServiceUnavailableException('La respuesta del servicio de traducción no es válida.');
    }

    if (typeof translated !== 'string' || !translated.trim()) {
      throw new ServiceUnavailableException('La respuesta del servicio de traducción no es válida.');
    }

    return translated;
  }
}
