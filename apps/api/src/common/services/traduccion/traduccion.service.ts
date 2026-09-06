import { Injectable } from '@nestjs/common';

@Injectable()
export class TraduccionService {
  /**
   * Mock service for auto-translation
   * In a real scenario, this would call DeepL or Google Translate API
   */
  async traducir(texto: string, idiomaDestino: 'en' | 'pt'): Promise<string> {
    if (!texto) return texto;
    const prefijo = idiomaDestino.toUpperCase();
    return `[${prefijo}] ${texto}`;
  }
}
