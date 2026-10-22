import { Card, CardContent } from "@/components/ui/card";
import { MapPin, FileCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FavoritoButton } from "./FavoritoButton";
import { Badge } from "@/components/ui/badge";
import { publicPrice, type ExchangeRates } from '@/lib/public-price';
import { categoriaLabel } from '@/lib/categorias';

interface CardUnidadProps {
  unidad: Record<string, unknown>;
  locale: string;
  isFavorito?: boolean;
  isLoggedIn?: boolean;
  token?: string;
  exchangeRates?: ExchangeRates | null;
  priority?: boolean;
}

export function CardUnidad({ unidad, locale, isFavorito = false, isLoggedIn = false, token, exchangeRates, priority = false }: CardUnidadProps) {
  const t = useTranslations('unidad');
  const tDetail = useTranslations('UnitDetail');
  
  const modalidades = Array.isArray(unidad.modalidades_precio) ? unidad.modalidades_precio : [];
  const prices = modalidades.map((m: { precio: number; precio_usd?: number | null; precio_brl?: number | null; unidad_tiempo?: string }) => ({
    price: publicPrice(m, locale, exchangeRates), period: m.unidad_tiempo,
  }));
  const firstPrice = prices.filter((entry) => entry.price !== null)
    .sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0))[0];
  const periodLabel = firstPrice?.period === 'hora' ? (locale === 'en' ? 'hour' : locale === 'pt' ? 'hora' : 'hora')
    : firstPrice?.period === 'mes' ? (locale === 'en' ? 'month' : locale === 'pt' ? 'mês' : 'mes')
    : (locale === 'en' ? 'day' : locale === 'pt' ? 'dia' : 'día');
    
  return (
    <Link href={`/${locale}/unidades/${unidad.id}`} className="block group">
      <Card className="overflow-hidden bg-background border-border/40 hover:border-border transition-all duration-300 cursor-pointer h-full flex flex-col shadow-sm hover:shadow-premium rounded-[1.5rem]">
        <div className="aspect-[4/3] relative bg-muted overflow-hidden">
          {Array.isArray(unidad.fotos) && unidad.fotos.length > 0 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={unidad.fotos[0] as string}
              alt={(unidad.titulo_es as string) || 'Foto de la unidad'}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              width={800}
              height={600}
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs bg-muted">
              {t('sinFotos')}
            </div>
          )}
          
          {/* Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          
          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="bg-background/90 hover:bg-background/90 backdrop-blur-md border-none text-foreground gap-1 shadow-sm">
              <FileCheck className="w-3 h-3" /> {tDetail('publishedUnit')}
            </Badge>
          </div>

          <div className="absolute top-3 right-3">
            <FavoritoButton 
              unidadId={unidad.id as string} 
              initialIsFavorito={isFavorito}
              isLoggedIn={isLoggedIn}
              token={token}
              className="bg-background/50 hover:bg-background/90 backdrop-blur-md border-none text-foreground transition-all shadow-sm"
            />
          </div>
          
          {/* Bottom details on image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {firstPrice && (
              <div className="bg-card/95 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-sm border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1 tracking-wider">{t('desde')}</span>
                <span className="font-bold font-mono text-dorado-600 dark:text-dorado-500">{firstPrice.price?.text}{firstPrice.price?.approximate ? ' aprox.' : ''}</span>
                <span className="text-[10px] text-muted-foreground ml-1">/ {periodLabel}</span>
              </div>
            )}
          </div>
        </div>
        
        <CardContent className="p-4 flex flex-col flex-1 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-mono tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-dorado-600 dark:text-dorado-400" />
            <span className="truncate">{((unidad.zonas as Record<string, unknown>)?.nombre as string) || 'Fuera de zonas predefinidas'} • {categoriaLabel(unidad.categoria as string)}</span>
          </div>
          <h3 className="font-bold text-base md:text-lg line-clamp-2 leading-tight text-balance group-hover:text-dorado-600 dark:group-hover:text-dorado-400 transition-colors">
            {(unidad.titulo || unidad.titulo_es) as string}
          </h3>
        </CardContent>
      </Card>
    </Link>
  );
}
