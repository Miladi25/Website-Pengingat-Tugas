import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Topbar() {
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const getUserProfile = async () => {
      // Ambil user yang sedang login
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setEmail(user.email || '')

      // Ambil profile dari tabel profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Gagal mengambil profile:', error)
        return
      }

      setProfile(data)
    }

    getUserProfile()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Gagal logout:', error)
      return
    }

    window.location.href = '/login'
  }

  const displayName =
    profile?.display_name ||
    profile?.username ||
    email.split('@')[0] ||
    'Pengguna'

  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="h-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-6 flex items-center justify-between">

      {/* Kiri */}
      <div>
        <h1 className="text-lg font-semibold text-white">
          Selamat datang, {displayName} 👋
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Semoga harimu produktif.
        </p>
      </div>

      {/* Kanan */}
      <div className="flex items-center gap-4">

        {/* Search */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
            <span className="text-slate-500">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Cari tugas..."
              className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Notification */}
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg">
            🔔
          </span>

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4">

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-400/20 text-sm font-semibold text-violet-400">
              {initial}
            </div>
          )}

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">
              {displayName}
            </p>

            <p className="text-xs text-slate-500">
              {email}
            </p>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="ml-2 rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            Keluar
          </button>

        </div>
      </div>
    </header>
  )
}

export default Topbar