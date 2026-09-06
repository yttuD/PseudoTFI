import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/gestor/Sidebar';

export default async function GestorLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: userData } = await supabase
    .from('users')
    .select('rol')
    .eq('id', user.id)
    .single();

  const rol = userData?.rol || 'gestor';

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar locale={locale} rol={rol} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/10">
        {children}
      </main>
    </div>
  );
}
