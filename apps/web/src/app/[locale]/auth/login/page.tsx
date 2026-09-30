"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isTestAdapterEnabled } from "@/lib/test-adapter";
import { AuthLayout } from "@/components/ui/auth-layout";
import { SignupFormContainer, LabelInputContainer } from "@/components/ui/signup-form";
import { ClerkOtpInput } from "@/components/ui/clerk-otp";
import { Phone, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || searchParams.get('redirect');
  const portalParam = searchParams.get('portal'); // 'gestor' | 'marketplace'
  const roleParam = searchParams.get('role');
  const supabase = createClient();
  const allowDevAuth = isTestAdapterEnabled();
  const isClosedBeta = process.env.NEXT_PUBLIC_RENDO_BETA_MODE === 'true';

  const isGestorPortal = portalParam === 'gestor';

  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("email");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getRedirectUrl = () => {
    // 1. Si existe nextParam válido que comience con '/'
    if (nextParam && nextParam.startsWith('/')) {
      if (nextParam.startsWith(`/${locale}`)) return nextParam;
      return `/${locale}${nextParam}`;
    }

    // 2. Si portal es 'gestor'
    if (portalParam === 'gestor') {
      return `/${locale}/dashboard`;
    }

    // 3. Si portal es 'marketplace' o no está definido
    return `/${locale}/unidades`;
  };

  const setDevSessionCookies = (devSession: { access_token: string; token_type: string; expires_in: number; user: unknown }) => {
    const cookieVal = `base64-${btoa(JSON.stringify(devSession))}`;
    document.cookie = `sb-127-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `sb-localhost-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `sb-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
  };

  const getLocalAccount = (userEmail: string) => {
    try {
      const existingRaw = localStorage.getItem('rendo_local_accounts');
      if (!existingRaw) return null;
      const accounts = JSON.parse(existingRaw);
      return accounts.find((acc: { email: string }) => acc.email.toLowerCase() === userEmail.toLowerCase()) || null;
    } catch {
      return null;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        if (allowDevAuth && (otpError.message.includes('fetch') || otpError.message.includes('Failed to fetch'))) {
          setStep("otp");
        } else {
          setError(otpError.message);
        }
      } else {
        setStep("otp");
      }
    } catch {
      if (allowDevAuth) setStep("otp");
      else setError('No pudimos enviar el código. Intentá de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || token.length < 6) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (verifyError) {
        if (allowDevAuth && (verifyError.message.includes('fetch') || verifyError.message.includes('Failed to fetch') || token === '123456')) {
          const cleanPhone = phone.replace(/\D/g, '');
          let userId = '11111111-1111-1111-1111-111111111111';
          let userRole = roleParam || 'gestor';
          let userEmail = 'gestor@Rendo.com.ar';

          if (cleanPhone.includes('778899') || roleParam === 'delegado') {
            userId = '33333333-3333-3333-3333-333333333333';
            userRole = 'delegado';
            userEmail = 'delegado@Rendo.com.ar';
          } else if (cleanPhone.includes('445566') || roleParam === 'buscador') {
            userId = '22222222-2222-2222-2222-222222222222';
            userRole = 'buscador';
            userEmail = 'buscador@Rendo.com.ar';
          }

          const devSession = {
            access_token: `dev-token-${userRole}-${userId}`,
            token_type: 'bearer',
            expires_in: 2592000,
            user: {
              id: userId,
              phone,
              email: userEmail,
              user_metadata: {
                role: userRole,
                rol: userRole,
                workspace_id: '11111111-1111-1111-1111-111111111111',
                nombre_completo: userRole === 'gestor' ? 'Gestor Demo Rendo' : userRole === 'buscador' ? 'Buscador Demo' : 'Delegado Demo',
              },
            },
          };
          setDevSessionCookies(devSession);
          setSuccessMessage('¡Ingreso exitoso! Redirigiendo a tu panel...');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 600);
          return;
        }
        setError(verifyError.message);
      } else {
        setSuccessMessage('¡Ingreso exitoso! Redirigiendo...');
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 600);
      }
    } catch {
      if (!allowDevAuth) {
        setError('No pudimos verificar el código. Intentá de nuevo más tarde.');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      let userId = '11111111-1111-1111-1111-111111111111';
      let userRole = roleParam || 'gestor';
      let userEmail = 'gestor@Rendo.com.ar';

      if (cleanPhone.includes('778899') || roleParam === 'delegado') {
        userId = '33333333-3333-3333-3333-333333333333';
        userRole = 'delegado';
        userEmail = 'delegado@Rendo.com.ar';
      } else if (cleanPhone.includes('445566') || roleParam === 'buscador') {
        userId = '22222222-2222-2222-2222-222222222222';
        userRole = 'buscador';
        userEmail = 'buscador@Rendo.com.ar';
      }

      const devSession = {
        access_token: `dev-token-${userRole}-${userId}`,
        token_type: 'bearer',
        expires_in: 2592000,
        user: {
          id: userId,
          phone,
          email: userEmail,
          user_metadata: {
            role: userRole,
            rol: userRole,
            workspace_id: '11111111-1111-1111-1111-111111111111',
            nombre_completo: userRole === 'gestor' ? 'Gestor Demo Rendo' : userRole === 'buscador' ? 'Buscador Demo' : 'Delegado Demo',
          },
        },
      };
      setDevSessionCookies(devSession);
      setSuccessMessage('¡Ingreso exitoso! Redirigiendo a tu panel...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificar si es una cuenta registrada localmente en el navegador
    const localAccount = allowDevAuth ? getLocalAccount(cleanEmail) : null;
    if (localAccount) {
      if (localAccount.password && localAccount.password !== password) {
        setError('Contraseña incorrecta. Por favor verifícala.');
        setLoading(false);
        return;
      }
      const devSession = {
        access_token: `dev-token-${localAccount.role}-${localAccount.id}`,
        token_type: 'bearer',
        expires_in: 2592000,
        user: {
          id: localAccount.id,
          email: cleanEmail,
          user_metadata: {
            role: localAccount.role,
            rol: localAccount.role,
            workspace_id: '11111111-1111-1111-1111-111111111111',
            nombre_completo: localAccount.full_name || 'Usuario Rendo',
          },
        },
      };
      setDevSessionCookies(devSession);
      setSuccessMessage('¡Ingreso exitoso! Redirigiendo...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
      return;
    }

    // 2. Si no es cuenta local, resolver rol y llamar a Supabase
    let userId = '11111111-1111-1111-1111-111111111111';
    let userRole = 'gestor';

    if (cleanEmail.includes('delegado')) {
      userId = '33333333-3333-3333-3333-333333333333';
      userRole = 'delegado';
    } else if (cleanEmail.includes('buscador') || roleParam === 'buscador') {
      userId = '22222222-2222-2222-2222-222222222222';
      userRole = 'buscador';
    } else {
      userId = '11111111-1111-1111-1111-111111111111';
      userRole = 'gestor';
    }

    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const timeoutPromise = new Promise<{ data?: unknown; error: Error | { message: string } | null }>((resolve) =>
        setTimeout(() => resolve({ error: { message: 'Network timeout (Supabase local offline)' } }), allowDevAuth ? 800 : 8000)
      );

      const result = await Promise.race([signInPromise, timeoutPromise]);
      const loginError = result?.error;

      if (loginError) {
        const isNetworkOrTimeout =
          loginError.message.includes('Network') ||
          loginError.message.includes('fetch') ||
          loginError.message.includes('Failed to fetch') ||
          loginError.message.includes('offline');

        if (allowDevAuth && isNetworkOrTimeout) {
          // Modo local / resiliente
          const devSession = {
            access_token: `dev-token-${userRole}-${userId}`,
            token_type: 'bearer',
            expires_in: 2592000,
            user: {
              id: userId,
              email: cleanEmail,
              user_metadata: {
                role: userRole,
                rol: userRole,
                workspace_id: '11111111-1111-1111-1111-111111111111',
                nombre_completo: userRole === 'gestor' ? 'Gestor Demo Rendo' : userRole === 'buscador' ? 'Buscador Demo' : 'Delegado Demo',
              },
            },
          };
          setDevSessionCookies(devSession);
          setSuccessMessage('¡Ingreso exitoso! Redirigiendo...');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 600);
          return;
        }

        if (isNetworkOrTimeout) {
          setError('No pudimos conectarnos para iniciar sesión. Intentá de nuevo más tarde.');
          return;
        }

        // Supabase está activo pero reportó error
        if (loginError.message.toLowerCase().includes('email not confirmed')) {
          setError('Tu correo electrónico aún no ha sido confirmado. Por favor revisa tu bandeja de entrada.');
        } else if (loginError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Correo electrónico o contraseña incorrectos.');
        } else {
          setError(loginError.message);
        }
        setLoading(false);
        return;
      }

      // Login exitoso con Supabase
      setSuccessMessage('¡Ingreso exitoso! Redirigiendo...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
    } catch {
      if (!allowDevAuth) {
        setError('No pudimos iniciar sesión. Intentá de nuevo más tarde.');
        return;
      }
      const devSession = {
        access_token: `dev-token-${userRole}-${userId}`,
        token_type: 'bearer',
        expires_in: 2592000,
        user: {
          id: userId,
          email: cleanEmail,
          user_metadata: {
            role: userRole,
            rol: userRole,
            workspace_id: '11111111-1111-1111-1111-111111111111',
            nombre_completo: userRole === 'gestor' ? 'Gestor Demo Rendo' : userRole === 'buscador' ? 'Buscador Demo' : 'Delegado Demo',
          },
        },
      };
      setDevSessionCookies(devSession);
      setSuccessMessage('¡Ingreso exitoso! Redirigiendo...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isGestorPortal
    ? "Rendo Gestor :: Acceso Operativo"
    : "Te damos la bienvenida a Rendo";

  const pageSubtitle = isGestorPortal
    ? isClosedBeta
      ? "Ingresá a tu terminal para probar la gestión de unidades y alquileres. Los cobros y comprobantes están deshabilitados."
      : "Ingresá a tu terminal para administrar unidades, alquileres y facturación."
    : "Iniciá sesión para ver ubicaciones exactas, contactar gestores por WhatsApp y guardar favoritos.";

  const trustBadge = isGestorPortal
    ? "Terminal Operativo Seguro"
    : "Marketplace Inmobiliario Directo";

  return (
    <AuthLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      trustBadgeText={trustBadge}
      locale={locale}
    >
      <SignupFormContainer>
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <span className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Method Toggle Buttons */}
        {step === "phone" && !isClosedBeta && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setLoginMethod("phone")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 min-h-[44px] text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                loginMethod === "phone"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{t("metodoTelefono")}</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("email")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 min-h-[44px] text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                loginMethod === "email"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{t("metodoEmail")}</span>
            </button>
          </div>
        )}

        {step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-medium text-foreground">{t("codigoOtp")}</span>
              <p className="text-[11px] text-muted-foreground">{t("ingreseCodigo")}</p>
            </div>

            <ClerkOtpInput
              length={6}
              value={token}
              onChange={setToken}
              onComplete={(code) => {
                setToken(code);
              }}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || token.length < 6}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-hidden transition-all disabled:opacity-50"
            >
              <span>{loading ? t("verificando") : t("verificarOtp")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setToken("");
                }}
                className="text-xs text-primary hover:underline min-h-[44px] inline-flex items-center justify-center"
              >
                Volver a ingresar teléfono
              </button>
            </div>
          </form>
        ) : loginMethod === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <LabelInputContainer>
              <label htmlFor="phone" className="text-xs font-medium text-foreground">
                {t("telefono")}
              </label>
              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("telefonoPlaceholder")}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </LabelInputContainer>

            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-hidden transition-all disabled:opacity-50"
            >
              <span>{loading ? t("enviando") : t("enviarOtp")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <LabelInputContainer>
              <label htmlFor="email" className="text-xs font-medium text-foreground">
                {t("email")}
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </LabelInputContainer>

            <LabelInputContainer>
              <label htmlFor="password" className="text-xs font-medium text-foreground">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </LabelInputContainer>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all disabled:opacity-50"
            >
              <span>{loading ? t("ingresando") : t("ingresar")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-border/60 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("noTenesCuenta")}{" "}
            <Link
              href={`/${locale}/auth/registro?${new URLSearchParams({
                ...(portalParam ? { portal: portalParam } : {}),
                ...(nextParam ? { next: nextParam } : {}),
              }).toString()}`}
              className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
            >
              {t("registro")}
            </Link>
          </p>

          <div className="pt-2 border-t border-border/40">
            {isGestorPortal ? (
              <p className="text-xs text-muted-foreground">
                ¿Buscás alquilar una Unidad?{" "}
                <Link
                  href={`/${locale}/auth/login?portal=marketplace${
                    nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
                  }`}
                  className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
                >
                  Ingresá como inquilino aquí
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                ¿Sos Gestor inmobiliario?{" "}
                <Link
                  href={`/${locale}/auth/login?portal=gestor${
                    nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
                  }`}
                  className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
                >
                  Accedé al portal de gestores aquí
                </Link>
              </p>
            )}
          </div>
        </div>
      </SignupFormContainer>
    </AuthLayout>
  );
}
