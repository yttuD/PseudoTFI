"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'phone' | 'otp' | 'email'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // As instructed: "en modo email OTP mockeado para dev" if necessary, or just use phone if configured.
    // For local dev, phone OTP goes to Inbucket or can be mocked.
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    })

    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/es/dashboard')
    }
    setLoading(false)
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/es/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-center">Iniciar Sesión</h2>
        
        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}

        {step === 'phone' ? (
          <>
            <div className="flex gap-2 mb-4">
              <button className={`flex-1 py-2 rounded ${loginMethod === 'phone' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} onClick={() => setLoginMethod('phone')}>Teléfono</button>
              <button className={`flex-1 py-2 rounded ${loginMethod === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} onClick={() => setLoginMethod('email')}>Email</button>
            </div>
            
            {loginMethod === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Teléfono</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="+541112345678"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Código OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-1">Código OTP</label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="123456"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar y Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
