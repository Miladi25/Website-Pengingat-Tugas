import { useState } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (loginError) {
        setError('Email atau kata sandi salah.')
        setLoading(false)
        return
      }

      const user = data?.user

      if (!user) {
        setError('Data pengguna tidak ditemukan.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

      if (profileError) {
        console.error(
          'Gagal mengambil role pengguna:',
          profileError
        )

        await supabase.auth.signOut()

        setError(
          'Profil pengguna tidak ditemukan. Hubungi administrator.'
        )

        setLoading(false)
        return
      }

      if (profile.role === 'admin') {
        window.location.href = '/admin'
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Login error:', err)

      setError(
        'Terjadi kesalahan saat masuk. Silakan coba lagi.'
      )

      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-400/20 mb-5">
            <span className="text-2xl text-violet-400">
              ✦
            </span>
          </div>

          <h1 className="text-3xl font-bold">
            TaskFlow
          </h1>

          <p className="mt-2 text-slate-400">
            Kelola tugasmu dengan lebih teratur.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">
              Selamat datang kembali 👋
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Masuk untuk melanjutkan aktivitasmu.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Error */}
            {error && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Masukkan email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kata sandi
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-slate-400 transition hover:text-white"
                >
                  {showPassword
                    ? '🙈'
                    : '👁️'}
                </button>
              </div>
            </div>

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3.5 font-semibold transition hover:-translate-y-0.5 hover:bg-violet-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Sedang masuk...'
                : 'Masuk'}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Belum punya akun?
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = '/register'
              }}
              className="mt-1 text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Daftar sekarang →
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          TaskFlow • Manajemen tugas yang lebih teratur
        </p>
      </motion.div>
    </main>
  )
}

export default Login