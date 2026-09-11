import { useState } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'

function Register() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    const cleanUsername = username.trim()
    const cleanDisplayName = displayName.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanUsername) {
      setError('Username wajib diisi.')
      return
    }

    if (!cleanDisplayName) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    if (!cleanEmail) {
      setError('Email wajib diisi.')
      return
    }

    if (password.length < 6) {
      setError(
        'Kata sandi minimal 6 karakter.'
      )
      return
    }

    if (password !== confirmPassword) {
      setError(
        'Konfirmasi kata sandi tidak cocok.'
      )
      return
    }

    setLoading(true)

    try {
      // Cek apakah username sudah digunakan
      const { data: existingUsername, error: usernameError } =
        await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle()

      if (usernameError) {
        console.error(
          'Gagal mengecek username:',
          usernameError
        )
      }

      if (existingUsername) {
        setError(
          'Username sudah digunakan. Silakan pilih username lain.'
        )
        setLoading(false)
        return
      }

      // Daftar ke Supabase Auth
      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanDisplayName,
            role: 'user',
          },
        },
      })

      if (signUpError) {
        console.error(
          'Register error:',
          signUpError
        )

        if (
          signUpError.message
            ?.toLowerCase()
            .includes('already registered')
        ) {
          setError(
            'Email tersebut sudah terdaftar.'
          )
        } else {
          setError(signUpError.message)
        }

        setLoading(false)
        return
      }

      const user = data?.user

      if (!user) {
        setError(
          'Akun gagal dibuat. Silakan coba lagi.'
        )
        setLoading(false)
        return
      }

      /*
       * Jika Supabase langsung memberikan session,
       * buat/update profil.
       *
       * Jika email confirmation aktif dan session belum ada,
       * profil biasanya akan dibuat oleh trigger yang sudah
       * digunakan TaskFlow.
       */
      if (data.session) {
        const { error: profileError } =
          await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                username: cleanUsername,
                display_name: cleanDisplayName,
                role: 'user',
              },
              {
                onConflict: 'id',
              }
            )

        if (profileError) {
          console.error(
            'Gagal membuat profil:',
            profileError
          )
        }
      }

      // Jika email confirmation aktif
      if (!data.session) {
        setSuccess(
          'Akun berhasil dibuat! Silakan cek email untuk melakukan verifikasi, lalu masuk ke TaskFlow.'
        )

        setUsername('')
        setDisplayName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setLoading(false)

        return
      }

      // Jika langsung login setelah daftar
      setSuccess(
        'Akun berhasil dibuat! Mengarahkan ke dashboard...'
      )

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    } catch (err) {
      console.error(
        'Register error:',
        err
      )

      setError(
        'Terjadi kesalahan saat membuat akun. Silakan coba lagi.'
      )

      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-400/20 mb-5">
            <span className="text-2xl text-violet-400">
              ✦
            </span>
          </div>

          <h1 className="text-3xl font-bold">
            TaskFlow
          </h1>

          <p className="mt-2 text-slate-400">
            Buat akun dan mulai kelola tugasmu.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-7">
            <h2 className="text-2xl font-semibold">
              Buat akun 🚀
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Daftar sebagai pengguna TaskFlow.
            </p>
          </div>

          <form
            onSubmit={handleRegister}
            className="space-y-4"
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

            {/* Success */}
            {success && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
              >
                {success}
              </motion.div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Contoh: miladi"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nama lengkap
              </label>

              <input
                type="text"
                value={displayName}
                onChange={(e) =>
                  setDisplayName(e.target.value)
                }
                placeholder="Masukkan nama lengkap"
                required
                autoComplete="name"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

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
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Konfirmasi kata sandi
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Ulangi kata sandi"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-slate-400 transition hover:text-white"
                >
                  {showConfirmPassword
                    ? '🙈'
                    : '👁️'}
                </button>
              </div>
            </div>

            {/* Info Role */}
            <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 px-4 py-3">
              <p className="text-xs text-slate-400">
                🔒 Akun yang dibuat melalui pendaftaran
                otomatis menjadi <span className="text-violet-400 font-semibold">User</span>.
              </p>
            </div>

            {/* Register */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3.5 font-semibold transition hover:-translate-y-0.5 hover:bg-violet-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Membuat akun...'
                : 'Daftar'}
            </button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Sudah punya akun?
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = '/login'
              }}
              className="mt-1 text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              ← Kembali ke login
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

export default Register