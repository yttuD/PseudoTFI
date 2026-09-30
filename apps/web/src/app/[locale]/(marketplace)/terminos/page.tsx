import React from 'react';
import Link from 'next/link';
import { FileCheck, ArrowLeft, Building, AlertCircle, CreditCard, Scale, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Términos y Condiciones del Servicio | Rendo',
  description: 'Términos y condiciones legales de uso de la plataforma digital y software inmobiliario Rendo.',
};

export default function TerminosPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return (
    <div className="w-full min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navegación y Encabezado */}
        <div className="space-y-4">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <FileCheck className="h-4 w-4" />
            Condiciones de Contratación y Uso
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-foreground">
            Términos y Condiciones del Servicio
          </h1>
          <p className="text-sm text-muted-foreground">
            Vigente para la República Argentina • Sede Operativa: Goya, Corrientes
          </p>
        </div>

        {/* Artículos de los Términos */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-foreground/90">
          
          {/* 1. Naturaleza de la Plataforma */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <Building className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                1. Naturaleza del Servicio (SaaS y Vidriera Digital)
              </h2>
            </div>
            <p>
              <strong>Rendo</strong> es exclusivamente una plataforma tecnológica de Software como Servicio (SaaS) y vidriera digital de anuncios inmobiliarios. Su función principal consiste en proveer herramientas de software para que propietarios, administradores y gestores publiquen sus inmuebles y sistematicen el control operativo de su inventario, disponibilidad y contactos.
            </p>
          </section>

          {/* 2. Deslinde de Responsabilidad Financiera y Cero Comisiones */}
          <section className="bg-card border-2 border-secondary/30 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs bg-secondary/5">
            <div className="flex items-center gap-3 text-secondary">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                2. Deslinde Expreso de Intermediación Financiera e Inmobiliaria
              </h2>
            </div>
            <p className="font-semibold text-foreground">
              Rendo NO es una empresa inmobiliaria, NO actúa como corredor inmobiliario ni comisionista, y NO participa en las negociaciones entre usuarios.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">0% Comisiones sobre Transacciones:</strong> Rendo no cobra ningún tipo de comisión porcentual sobre el valor de los alquileres acordados. El 100% de lo pactado entre las partes pertenece íntegramente al Gestor.
              </li>
              <li>
                <strong className="text-foreground">Sin Retención ni Procesamiento de Fondos:</strong> Rendo nunca retiene, procesa ni custodia dinero derivado de cánones locativos, depósitos en garantía o pagos de señas.
              </li>
              <li>
                <strong className="text-foreground">Contratos Bilaterales Exclusivos:</strong> Toda relación contractual, comercial, pago o reclamo relativo a las condiciones de la locación se rige estrictamente de forma bilateral y directa entre el Gestor y el Inquilino mediante trato personal o WhatsApp, sin solidaridad ni responsabilidad alguna por parte de Rendo.
              </li>
            </ul>
          </section>

          {/* 3. Modelo de Suscripción por Cupo */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <CreditCard className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                3. Modelo de Suscripción por Cupo Fijo
              </h2>
            </div>
            <p>
              El acceso a las funcionalidades de gestión y publicación para Gestores se estructura bajo un modelo de <strong>cupo mensual por unidad activa</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>El Gestor abona un canon mensual fijo de software que le otorga el derecho de mantener publicadas y administradas una cantidad determinada de unidades.</li>
              <li>El pago del cupo de software habilita la visibilidad en el marketplace, la auto-traducción y el acceso al panel operativo privado.</li>
              <li>La falta de pago o vencimiento del período de cupo pausará la visibilidad pública de las unidades hasta su regularización, sin eliminar los datos ni el inventario cargado.</li>
            </ul>
          </section>

          {/* 4. Obligaciones y Declaraciones del Gestor */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                4. Obligaciones del Gestor y Veracidad de la Información
              </h2>
            </div>
            <p>
              Al publicar una unidad en Rendo, el Gestor declara y garantiza bajo juramento:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Ser titular legítimo de la unidad o contar con la debida autorización legal y contractual para comercializarla o administrarla.</li>
              <li>Que las fotografías, descripciones, comodidades, tarifas y coordenadas geográficas cargadas son veraces, exactas y no inducen a engaño a los inquilinos.</li>
              <li>Respetar las leyes y reglamentaciones municipales y provinciales aplicables al tipo de alojamiento u ocupación ofrecida.</li>
            </ol>
            <p className="text-xs text-muted-foreground pt-2">
              Rendo se reserva el derecho de suspender o dar de baja preventivamente cualquier publicación que resulte denunciada por falsedad o que contravenga las presentes normas.
            </p>
          </section>

          {/* 5. Ley Aplicable y Jurisdicción */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <Scale className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                5. Ley Aplicable y Jurisdicción Exclusiva
              </h2>
            </div>
            <p>
              Los presentes Términos y Condiciones se interpretan y rigen de conformidad con las leyes vigentes en la República Argentina.
            </p>
            <p>
              Para cualquier controversia, litigio o divergencia derivada de la validez, interpretación, cumplimiento o resolución de estos términos, las partes se someten en forma expresa e irrevocable a la jurisdicción exclusiva de los <strong>Tribunales Ordinarios con asiento en la Ciudad de Goya, Provincia de Corrientes, República Argentina</strong>, con renuncia formal a cualquier otro fuero o jurisdicción que pudiera corresponder por razones de domicilio presente o futuro.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
