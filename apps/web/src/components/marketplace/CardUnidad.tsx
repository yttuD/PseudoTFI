import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FavoritoButton } from "./FavoritoButton";

interface CardUnidadProps {
  unidad: Record<string, unknown>;
  locale: string;
  isFavorito?: boolean;
  isLoggedIn?: boolean;
  token?: string;
}

export function CardUnidad({ unidad, locale, isFavorito = false, isLoggedIn = false, token }: CardUnidadProps) {
  const t = useTranslations('unidad');
  
  // Calculate lowest price if modalidades exist
  const modalidades = Array.isArray(unidad.modalidades_precio) ? unidad.modalidades_precio : [];
  const precioMinimo = modalidades.length > 0 
    ? Math.min(...modalidades.map((m: { precio: number }) => m.precio)) 
    : 0;

  return (
    <Link href={`/${locale}/unidades/${unidad.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        <div className="aspect-[4/3] relative bg-muted">
          {Array.isArray(unidad.fotos) && unidad.fotos.length > 0 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={unidad.fotos[0] as string} 
              alt={(unidad.titulo_es as string) || 'Foto de la unidad'} 
              className="object-cover w-full h-full" 
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
              {t('sinFotos')}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <FavoritoButton 
              unidadId={unidad.id as string} 
              initialIsFavorito={isFavorito}
              isLoggedIn={isLoggedIn}
              token={token}
              className="bg-white/80 hover:bg-white backdrop-blur-sm"
            />
          </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            <span>{(unidad.zonas as Record<string, unknown>)?.nombre as string} · {unidad.categoria as string}</span>
          </div>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 flex-1">{unidad.titulo_es as string}</h3>
          
          {precioMinimo > 0 && (
            <p className="text-primary font-bold">{t('desde')} ${precioMinimo}/{t('mes')}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
