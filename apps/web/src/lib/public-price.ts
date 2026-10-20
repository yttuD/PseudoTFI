export interface ExchangeRates {
  asOf: string;
  arsPerUsd: number;
  arsPerBrl: number;
  source: 'BCRA';
}

export interface PublicPrice {
  amount: number;
  text: string;
  currency: 'ARS' | 'USD' | 'BRL';
  approximate: boolean;
  asOf?: string;
}

export function publicPrice(modality: { precio: number; precio_usd?: number | null; precio_brl?: number | null }, locale: string, rates?: ExchangeRates | null): PublicPrice | null {
  const ars = Number(modality.precio);
  if (!Number.isFinite(ars) || ars < 0) return null;
  let amount = ars;
  let currency: PublicPrice['currency'] = 'ARS';
  let approximate = false;
  let asOf: string | undefined;
  if (locale === 'en' || locale === 'pt') {
    currency = locale === 'en' ? 'USD' : 'BRL';
    const manual = Number(locale === 'en' ? modality.precio_usd : modality.precio_brl);
    if (manual > 0 && Number.isFinite(manual)) amount = manual;
    else {
      const rate = locale === 'en' ? rates?.arsPerUsd : rates?.arsPerBrl;
      if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
      amount = ars / rate;
      approximate = true;
      asOf = rates?.asOf;
    }
  }
  const language = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-AR';
  return {
    amount,
    text: new Intl.NumberFormat(language, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount),
    currency,
    approximate,
    asOf,
  };
}
