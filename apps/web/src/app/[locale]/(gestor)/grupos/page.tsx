import { redirect } from 'next/navigation';

export default function GruposRedirectPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || 'es';
  redirect(`/${locale}/mis-unidades`);
}
