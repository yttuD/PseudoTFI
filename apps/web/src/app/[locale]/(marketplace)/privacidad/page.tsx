import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, ArrowLeft, FileText, Lock, UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidad y Protección de Datos Personales (Ley 25.326) | Rendo',
  description: 'Política de Privacidad de Rendo conforme a la Ley de Protección de Datos Personales N° 25.326 de la República Argentina y resoluciones de la AAIP.',
};

export default function PrivacidadPage({
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-dorado-500/10 text-dorado-700 dark:text-dorado-300 border border-dorado-500/20">
            <ShieldCheck className="h-4 w-4" />
            Marco Legal Ley 25.326 • República Argentina
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-foreground">
            Política de Privacidad y Protección de Datos Personales
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: Septiembre de 2026 • Goya, Corrientes, Argentina
          </p>
        </div>

        {/* Contenido Estructurado */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-foreground/90">
          
          {/* 1. Responsable del Tratamiento */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <MapPin className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                1. Responsable del Tratamiento
              </h2>
            </div>
            <p>
              La plataforma digital <strong>Rendo</strong> (en adelante, &quot;Rendo&quot; o &quot;la Plataforma&quot;), con sede operativa en la ciudad de <strong>Goya, Provincia de Corrientes, República Argentina</strong>, es responsable del tratamiento y resguardo de los datos personales recolectados a través de su sitio web y servicios asociados.
            </p>
            <p>
              Para cualquier consulta, requerimiento o solicitud relativa a la protección de datos personales, el canal institucional exclusivo es:{' '}
              <a href="mailto:privacidad@rendo.com.ar" className="text-dorado-700 dark:text-dorado-300 hover:underline font-semibold">
                privacidad@rendo.com.ar
              </a>.
            </p>
          </section>

          {/* 2. Datos Recolectados */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <FileText className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                2. Datos Recolectados
              </h2>
            </div>
            <p>
              Rendo procesa exclusivamente los datos necesarios para brindar los servicios de software y facilitar el contacto directo entre las partes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Datos del Gestor / Administrador:</strong> Nombre y apellido o razón social, número de teléfono habilitado para mensajería WhatsApp, correo electrónico y credenciales de acceso seguro.
              </li>
              <li>
                <strong className="text-foreground">Datos de Inquilinos en Agenda Privada:</strong> Datos de contacto registrados voluntariamente por el propio Gestor dentro de su terminal privada (nombre, teléfono, documento de identidad si fuera ingresado para emisión de contratos).
              </li>
              <li>
                <strong className="text-foreground">Geolocalización y Datos de las Unidades:</strong> Ubicación aproximada pública (radio estimado) y ubicación exacta (coordenadas geográficas y dirección), la cual se mantiene estrictamente reservada y solo se hace visible a usuarios autenticados para proteger la privacidad edilicia del Gestor.
              </li>
            </ul>
          </section>

          {/* 3. Finalidad del Tratamiento */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <Lock className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                3. Finalidad del Tratamiento y No Comercialización
              </h2>
            </div>
            <p>
              La recolección y tratamiento de datos responde exclusivamente a:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Facilitar la exhibición de unidades en el marketplace digital de Rendo.</li>
              <li>Posibilitar la comunicación directa y bilateral vía WhatsApp entre visitantes interesados y gestores inmobiliarios.</li>
              <li>Permitir el control operativo de cupos, disponibilidad, contratos y señas dentro del panel privado del Gestor.</li>
            </ol>
            <div className="p-4 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold text-foreground">
              🛡️ <strong>Compromiso ético y legal:</strong> Rendo no vende, no alquila, no cede ni comercializa bases de datos personales bajo ninguna circunstancia a agencias publicitarias ni a terceros ajenos al servicio.
            </div>
          </section>

          {/* 4. Derechos ARCO (Habeas Data - Ley 25.326) */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-primary">
              <UserCheck className="h-5 w-5 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                4. Derechos de los Titulares (Derechos ARCO y Habeas Data)
              </h2>
            </div>
            <p>
              En cumplimiento del <strong>Artículo 14 de la Ley N° 25.326</strong>, todo titular de datos personales tiene la facultad de ejercer en forma gratuita el derecho de <strong>Acceso</strong>, <strong>Rectificación</strong>, <strong>Actualización</strong> y <strong>Supresión</strong> de su información registrada en nuestras bases.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, el titular deberá remitir una comunicación formal con acreditación de identidad al correo{' '}
              <a href="mailto:privacidad@rendo.com.ar" className="text-dorado-700 dark:text-dorado-300 hover:underline font-semibold">
                privacidad@rendo.com.ar
              </a>. Rendo dará curso y responderá a la solicitud dentro de los plazos legales estipulados por la normativa argentina (10 días corridos para informes de acceso y 5 días hábiles para rectificaciones o eliminaciones).
            </p>
          </section>

          {/* 5. Cláusula Reglamentaria Obligatoria - AAIP */}
          <section className="bg-dorado-500/10 border-2 border-dorado-500/30 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-dorado-700 dark:text-dorado-300 font-bold text-base uppercase tracking-wider">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              Organismo de Control Estatal
            </div>
            <blockquote className="italic font-medium text-foreground text-sm sm:text-base border-l-4 border-dorado-500 pl-4 py-1">
              &quot;La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.&quot;
            </blockquote>
            <p className="text-xs text-muted-foreground">
              Sede de la AAIP: Av. Pte. Gral. Julio A. Roca 710, Piso 3°, Ciudad Autónoma de Buenos Aires. Sitio web oficial:{' '}
              <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noreferrer" className="text-dorado-700 dark:text-dorado-300 hover:underline font-semibold">
                argentina.gob.ar/aaip
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
