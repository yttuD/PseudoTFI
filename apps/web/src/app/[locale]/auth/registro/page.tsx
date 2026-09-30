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

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || searchParams.get('redirect');
  const portalParam = searchParams.get('portal'); // 'gestor' | 'marketplace'
  const intentParam = searchParams.get('intent');
  const roleParam = searchParams.get('role');
  const supabase = createClient();
  const allowDevAuth = isTestAdapterEnabled();
  const isClosedBeta = process.env.NEXT_PUBLIC_RENDO_BETA_MODE === 'true';

  const isGestorPortal = portalParam === 'gestor' || intentParam === 'gestor';

  const [registerMethod, setRegisterMethod] = useState<"phone" | "email">("email");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [fullName, setFullName] = useState("");
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

  const saveLocalAccount = (userAccount: { id: string; email: string; password?: string; full_name: string; role: string }) => {
    try {
      const existingRaw = localStorage.getItem('rendo_local_accounts');
      const accounts = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = accounts.filter((acc: { email: string }) => acc.email.toLowerCase() !== userAccount.email.toLowerCase());
      filtered.push(userAccount);
      localStorage.setItem('rendo_local_accounts', JSON.stringify(filtered));
    } catch {}
  };

  const setDevSessionCookies = (devSession: { access_token: string; token_type: string; expires_in: number; user: unknown }) => {
    const cookieVal = `base64-${btoa(JSON.stringify(devSession))}`;
    document.cookie = `sb-127-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `sb-localhost-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `sb-auth-token=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const isBuscador =
      roleParam === 'buscador' ||
      portalParam === 'marketplace';
    const assignedRole = isBuscador ? 'buscador' : (isGestorPortal ? 'gestor' : 'buscador');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: {
            full_name: fullName || 'Usuario',
            role: assignedRole,
          },
        },
      });

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

    const isBuscador =
      roleParam === 'buscador' ||
      portalParam === 'marketplace';
    const assignedRole = isBuscador ? 'buscador' : (isGestorPortal ? 'gestor' : 'buscador');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (verifyError) {
        if (allowDevAuth && (verifyError.message.includes('fetch') || verifyError.message.includes('Failed to fetch') || token === '123456')) {
          const devSession = {
            access_token: 'dev-access-token',
            token_type: 'bearer',
            expires_in: 2592000,
            user: {
              id: 'test-' + Date.now(),
              phone,
              user_metadata: { full_name: fullName || 'Usuario', role: assignedRole },
            },
          };
          setDevSessionCookies(devSession);
          setSuccessMessage('¡Verificación exitosa! Redirigiendo a tu panel...');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 600);
          return;
        }
        setError(verifyError.message);
      } else {
        setSuccessMessage('¡Verificación exitosa! Redirigiendo a tu panel...');
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 600);
      }
    } catch {
      if (!allowDevAuth) {
        setError('No pudimos verificar el código. Intentá de nuevo más tarde.');
        return;
      }
      const devSession = {
        access_token: 'dev-access-token',
        token_type: 'bearer',
        expires_in: 2592000,
        user: {
          id: 'test-' + Date.now(),
          phone,
          user_metadata: { full_name: fullName || 'Usuario', role: assignedRole },
        },
      };
      setDevSessionCookies(devSession);
      setSuccessMessage('¡Verificación exitosa! Redirigiendo a tu panel...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    const isBuscador =
      roleParam === 'buscador' ||
      portalParam === 'marketplace';
    const assignedRole = isBuscador ? 'buscador' : (isGestorPortal ? 'gestor' : 'buscador');
    const resolvedName = fullName || cleanEmail.split('@')[0];

    try {
      const signUpPromise = supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: resolvedName,
            role: assignedRole,
          },
        },
      });

      const timeoutPromise = new Promise<{ data?: { user: unknown; session: unknown }; error: Error | { message: string } | null }>((resolve) =>
        setTimeout(() => resolve({ error: { message: 'Network timeout (Supabase local offline)' } }), allowDevAuth ? 800 : 8000)
      );

      const result = await Promise.race([signUpPromise, timeoutPromise]);
      const regError = result?.error;
      const regData = 'data' in result ? result.data : null;

      // Si Supabase responde pero requiere confirmación de email (sin sesión directa)
      if (regData?.user && !regData.session && !regError) {
        setSuccessMessage(`¡Cuenta creada con éxito! Hemos enviado un correo de confirmación a ${cleanEmail}. Por favor revisá tu casilla.`);
        setLoading(false);
        return;
      }

      // Si hay error de red o timeout (Docker / Supabase offline), usar sesión local resiliente y persistir
      if (regError) {
        const isNetworkOrTimeout =
          regError.message.includes('Network') ||
          regError.message.includes('fetch') ||
          regError.message.includes('Failed to fetch') ||
          regError.message.includes('offline');

        if (allowDevAuth && isNetworkOrTimeout) {
          const generatedId = 'user-' + Date.now();
          saveLocalAccount({
            id: generatedId,
            email: cleanEmail,
            password,
            full_name: resolvedName,
            role: assignedRole,
          });

          const devSession = {
            access_token: `dev-token-${assignedRole}-${generatedId}`,
            token_type: 'bearer',
            expires_in: 2592000,
            user: {
              id: generatedId,
              email: cleanEmail,
              user_metadata: { full_name: resolvedName, role: assignedRole, rol: assignedRole },
            },
          };
          setDevSessionCookies(devSession);
          setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al panel...');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 800);
          return;
        }

        if (isNetworkOrTimeout) {
          setError('No pudimos conectarnos para completar el registro. Intentá de nuevo más tarde.');
          return;
        }

        // Error real de Supabase (ej: usuario ya registrado, contraseña débil)
        setError(regError.message);
        setLoading(false);
        return;
      }

      // Registro exitoso con sesión activa de Supabase
      setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 600);
    } catch {
      if (!allowDevAuth) {
        setError('No pudimos completar el registro. Intentá de nuevo más tarde.');
        return;
      }
      const generatedId = 'user-' + Date.now();
      saveLocalAccount({
        id: generatedId,
        email: cleanEmail,
        password,
        full_name: resolvedName,
        role: assignedRole,
      });

      const devSession = {
        access_token: `dev-token-${assignedRole}-${generatedId}`,
        token_type: 'bearer',
        expires_in: 2592000,
        user: {
          id: generatedId,
          email: cleanEmail,
          user_metadata: { full_name: resolvedName, role: assignedRole, rol: assignedRole },
        },
      };
      setDevSessionCookies(devSession);
      setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al panel...');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isGestorPortal
    ? "Rendo Gestor :: Alta de Operador"
    : "Creá tu cuenta en Rendo";

  const pageSubtitle = isGestorPortal
    ? isClosedBeta
      ? "Registrate para probar hasta 10 unidades sin costo. Los cobros y comprobantes están deshabilitados."
      : "Registrate para administrar tus unidades, alquileres y facturación sin comisiones."
    : "Iniciá tu cuenta para ver ubicaciones exactas, contactar gestores por WhatsApp y guardar favoritos.";

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
              onClick={() => setRegisterMethod("phone")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 min-h-[44px] text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                registerMethod === "phone"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{t("metodoTelefono")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterMethod("email")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 min-h-[44px] text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                registerMethod === "email"
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
                Volver a ingresar datos
              </button>
            </div>
          </form>
        ) : registerMethod === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <LabelInputContainer>
              <label htmlFor="fullName" className="text-xs font-medium text-foreground">
                {t("nombreCompleto")}
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  name="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("nombreCompletoPlaceholder")}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </LabelInputContainer>

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
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-hidden transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? t("enviando") : t("enviarOtp")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <LabelInputContainer>
              <label htmlFor="fullName" className="text-xs font-medium text-foreground">
                {t("nombreCompleto")}
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  name="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("nombreCompletoPlaceholder")}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </LabelInputContainer>

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
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? t("registrando") : t("registrarse")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-border/60 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("yaTenesCuenta")}{" "}
            <Link
              href={`/${locale}/auth/login?${new URLSearchParams({
                ...(portalParam ? { portal: portalParam } : {}),
                ...(nextParam ? { next: nextParam } : {}),
              }).toString()}`}
              className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
            >
              {t("iniciarSesion")}
            </Link>
          </p>

          <div className="pt-2 border-t border-border/40">
            {isGestorPortal ? (
              <p className="text-xs text-muted-foreground">
                ¿Buscás alquilar una Unidad?{" "}
                <Link
                  href={`/${locale}/auth/registro?portal=marketplace${
                    nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
                  }`}
                  className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
                >
                  Registrate como inquilino aquí
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                ¿Sos Gestor inmobiliario?{" "}
                <Link
                  href={`/${locale}/auth/registro?portal=gestor${
                    nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
                  }`}
                  className="font-semibold text-azul-900 dark:text-dorado-300 hover:underline"
                >
                  Creá tu cuenta de Gestor aquí
                </Link>
              </p>
            )}
          </div>
        </div>
      </SignupFormContainer>
    </AuthLayout>
  );
}
