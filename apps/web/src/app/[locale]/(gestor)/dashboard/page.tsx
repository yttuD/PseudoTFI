import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return <div>No autenticado</div>;
  }

  const fetchOptions = {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' as RequestCache,
  };

  const [cupoRes, alquileresRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cupo`, fetchOptions),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres?limit=1000`, fetchOptions),
  ]);

  const cupo = cupoRes.ok ? await cupoRes.json() : null;
  const alquileresJson = alquileresRes.ok ? await alquileresRes.json() : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alquileres: any[] = alquileresJson.data || [];

  if (!cupo) {
    return <div>Error al cargar datos del dashboard</div>;
  }

  // Subscription logic
  const now = new Date();
  const subscriptionEndsAt = cupo.suscripcion_expira_en ? new Date(cupo.suscripcion_expira_en) : null;
  const msInDay = 1000 * 60 * 60 * 24;
  
  let trialDaysRemaining = 0;
  if (subscriptionEndsAt) {
    trialDaysRemaining = Math.ceil((subscriptionEndsAt.getTime() - now.getTime()) / msInDay);
  }

  const activeAlquileresCount = alquileres.filter(a => a.estado === 'activo').length;
  
  const cupoUsado = cupo.cupo_usado || 0;
  const cupoMaximo = cupo.cupo_maximo || 1; // prevent div by 0
  const progressValue = Math.min(100, Math.round((cupoUsado / cupoMaximo) * 100));
  const cupoDisponible = cupo.cupo_disponible;

  const showWarningAlert = subscriptionEndsAt && trialDaysRemaining <= 7 && trialDaysRemaining >= 0;
  const showCriticalAlert = subscriptionEndsAt && trialDaysRemaining < 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Resumen de tu actividad y estado de la cuenta.
        </p>
      </div>

      {showCriticalAlert && (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-semibold">Suscripción vencida</h4>
            <p className="text-sm mt-1">
              Tu plan ha vencido. Por favor, renová tu cupo para seguir operando tus unidades.
            </p>
            <Link href="/es/facturacion" className="inline-block mt-2 text-sm font-medium underline underline-offset-4">
              Ir a Facturación
            </Link>
          </div>
        </div>
      )}

      {showWarningAlert && (
        <div className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-semibold">Suscripción próxima a vencer</h4>
            <p className="text-sm mt-1">
              Tu plan vence en {trialDaysRemaining} {trialDaysRemaining === 1 ? 'día' : 'días'}. Renovalo a tiempo para que tus unidades sigan publicadas.
            </p>
            <Link href="/es/facturacion" className="inline-block mt-2 text-sm font-medium underline underline-offset-4">
              Renovar ahora
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Publicadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cupoUsado} / {cupo.cupo_maximo}
            </div>
            <Progress value={progressValue} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupo Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cupoDisponible === 0 ? 'text-red-500' : 'text-green-600'}`}>
              {cupoDisponible}
            </div>
            <p className="text-xs text-muted-foreground mt-1">unidades restantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alquileres Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlquileresCount}</div>
            <p className="text-xs text-muted-foreground mt-1">contratos en curso</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {subscriptionEndsAt ? (trialDaysRemaining < 0 ? 'Vencido' : 'Activo') : 'Sin Plan'}
            </div>
            {subscriptionEndsAt && trialDaysRemaining >= 0 && (
              <p className="text-xs text-muted-foreground mt-1">vence en {trialDaysRemaining} días</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
