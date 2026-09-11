import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'

function AdminDashboard() {
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')

  const [showAddUser, setShowAddUser] =
    useState(false)

  const [showEditUser, setShowEditUser] =
    useState(false)

  const [showPasswordModal, setShowPasswordModal] =
    useState(false)

  const [showDeleteModal, setShowDeleteModal] =
    useState(false)

  const [selectedUser, setSelectedUser] =
    useState(null)

  const [creatingUser, setCreatingUser] =
    useState(false)

  const [savingUser, setSavingUser] =
    useState(false)

  const [resettingPassword, setResettingPassword] =
    useState(false)

  const [deletingUser, setDeletingUser] =
    useState(false)

  const [changingStatus, setChangingStatus] =
    useState(false)

  const [newPassword, setNewPassword] =
    useState('')

  const [form, setForm] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    role: 'user',
  })

  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    email: '',
    role: 'user',
  })

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => {
      setSuccess('')
    }, 4000)

    return () => clearTimeout(timer)
  }, [success])

  async function checkAdmin() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        window.location.href = '/login'
        return
      }

      const {
        data: currentProfile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (
        profileError ||
        !currentProfile
      ) {
        throw new Error(
          'Profile admin tidak ditemukan.'
        )
      }

      if (
        currentProfile.role !== 'admin'
      ) {
        window.location.href = '/dashboard'
        return
      }

      setProfile(currentProfile)

      await fetchDashboard()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal memuat Admin Dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function callUserFunction(
    body
  ) {
    const {
      data,
      error: functionError,
    } =
      await supabase.functions.invoke(
        'create-user',
        {
          body,
        }
      )

    if (functionError) {
      throw new Error(
        functionError.message ||
          'Gagal menghubungi server.'
      )
    }

    if (
      !data ||
      data.success !== true
    ) {
      throw new Error(
        data?.error ??
          'Operasi gagal.'
      )
    }

    return data
  }

  async function fetchDashboard() {
    setRefreshing(true)

    try {
      // User sekarang diambil dari Auth
      // melalui Edge Function
      const userResult =
        await callUserFunction({
          action: 'list',
        })

      const [
        tasksResult,
      ] =
        await Promise.all([
          supabase
            .from('tasks')
            .select(
              `
                *,
                categories (
                  id,
                  name
                ),
                projects (
                  id,
                  name
                )
              `
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),
        ])

      if (tasksResult.error) {
        throw new Error(
          `Gagal mengambil tugas: ${tasksResult.error.message}`
        )
      }

      setUsers(
        userResult.users ?? []
      )

      setTasks(
        tasksResult.data ?? []
      )
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal mengambil data dashboard.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  function openAddUser() {
    setError('')
    setSuccess('')

    setForm({
      username: '',
      display_name: '',
      email: '',
      password: '',
      role: 'user',
    })

    setShowAddUser(true)
  }

  function closeAddUser() {
    if (creatingUser) return

    setShowAddUser(false)
  }

  async function handleCreateUser(
    event
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const username =
      form.username.trim()

    const displayName =
      form.display_name.trim()

    const email =
      form.email.trim().toLowerCase()

    if (!displayName) {
      setError(
        'Nama lengkap wajib diisi.'
      )
      return
    }

    if (!email) {
      setError(
        'Email wajib diisi.'
      )
      return
    }

    if (
      form.password.length < 6
    ) {
      setError(
        'Password minimal 6 karakter.'
      )
      return
    }

    setCreatingUser(true)

    try {
      await callUserFunction({
        action: 'create',
        username:
          username || null,
        display_name:
          displayName,
        email,
        password:
          form.password,
        role:
          form.role ===
          'admin'
            ? 'admin'
            : 'user',
      })

      setShowAddUser(false)

      setSuccess(
        `User ${displayName} berhasil ditambahkan.`
      )

      await fetchDashboard()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal membuat user.'
      )
    } finally {
      setCreatingUser(false)
    }
  }

  function openEditUser(user) {
    setSelectedUser(user)

    setEditForm({
      username:
        user.username ?? '',
      display_name:
        user.display_name ?? '',
      email:
        user.email ?? '',
      role:
        user.role ===
        'admin'
          ? 'admin'
          : 'user',
    })

    setError('')
    setSuccess('')
    setShowEditUser(true)
  }

  async function handleEditUser(
    event
  ) {
    event.preventDefault()

    if (!selectedUser) return

    setSavingUser(true)
    setError('')
    setSuccess('')

    try {
      await callUserFunction({
        action: 'edit',
        user_id:
          selectedUser.id,
        username:
          editForm.username.trim(),
        display_name:
          editForm.display_name.trim(),
        email:
          editForm.email
            .trim()
            .toLowerCase(),
        role:
          editForm.role ===
          'admin'
            ? 'admin'
            : 'user',
      })

      setShowEditUser(false)
      setSelectedUser(null)

      setSuccess(
        'Data user berhasil diperbarui.'
      )

      await fetchDashboard()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal memperbarui user.'
      )
    } finally {
      setSavingUser(false)
    }
  }

  function openPasswordModal(user) {
    setSelectedUser(user)
    setNewPassword('')
    setError('')
    setSuccess('')
    setShowPasswordModal(true)
  }

  async function handleResetPassword(
    event
  ) {
    event.preventDefault()

    if (!selectedUser) return

    if (
      newPassword.length < 6
    ) {
      setError(
        'Password minimal 6 karakter.'
      )
      return
    }

    setResettingPassword(true)
    setError('')
    setSuccess('')

    try {
      await callUserFunction({
        action:
          'reset_password',
        user_id:
          selectedUser.id,
        password:
          newPassword,
      })

      setShowPasswordModal(false)
      setSelectedUser(null)
      setNewPassword('')

      setSuccess(
        `Password ${getUserName(selectedUser)} berhasil diubah.`
      )
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal mengubah password.'
      )
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleToggleUser(
    user
  ) {
    if (
      user.id ===
      profile?.id
    ) {
      setError(
        'Kamu tidak dapat menonaktifkan akunmu sendiri.'
      )
      return
    }

    setChangingStatus(true)
    setError('')
    setSuccess('')

    try {
      await callUserFunction({
        action:
          user.is_banned
            ? 'enable'
            : 'disable',
        user_id:
          user.id,
      })

      setSuccess(
        user.is_banned
          ? `${getUserName(user)} berhasil diaktifkan kembali.`
          : `${getUserName(user)} berhasil dinonaktifkan.`
      )

      await fetchDashboard()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal mengubah status user.'
      )
    } finally {
      setChangingStatus(false)
    }
  }

  function openDeleteModal(user) {
    if (
      user.id ===
      profile?.id
    ) {
      setError(
        'Kamu tidak dapat menghapus akunmu sendiri.'
      )
      return
    }

    setSelectedUser(user)
    setError('')
    setSuccess('')
    setShowDeleteModal(true)
  }

  async function handleDeleteUser() {
    if (!selectedUser) return

    setDeletingUser(true)
    setError('')
    setSuccess('')

    try {
      await callUserFunction({
        action: 'delete',
        user_id:
          selectedUser.id,
      })

      const deletedName =
        getUserName(
          selectedUser
        )

      setShowDeleteModal(false)
      setSelectedUser(null)

      setSuccess(
        `${deletedName} berhasil dihapus.`
      )

      await fetchDashboard()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ??
          'Gagal menghapus user.'
      )
    } finally {
      setDeletingUser(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  const filteredUsers =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      if (!keyword) {
        return users
      }

      return users.filter(
        (user) => {
          return (
            user.display_name
              ?.toLowerCase()
              .includes(keyword) ||
            user.username
              ?.toLowerCase()
              .includes(keyword) ||
            user.email
              ?.toLowerCase()
              .includes(keyword) ||
            user.role
              ?.toLowerCase()
              .includes(keyword)
          )
        }
      )
    }, [users, search])

  const stats = useMemo(() => {
    const totalUsers =
      users.length

    const admins =
      users.filter(
        (user) =>
          user.role ===
          'admin'
      ).length

    const normalUsers =
      users.filter(
        (user) =>
          user.role ===
          'user'
      ).length

    const activeUsers =
      users.filter(
        (user) =>
          !user.is_banned
      ).length

    const disabledUsers =
      users.filter(
        (user) =>
          user.is_banned
      ).length

    const totalTasks =
      tasks.length

    const todo =
      tasks.filter(
        (task) =>
          task.status ===
          'todo'
      ).length

    const inProgress =
      tasks.filter(
        (task) =>
          task.status ===
          'in_progress'
      ).length

    const completed =
      tasks.filter(
        (task) =>
          task.status ===
          'completed'
      ).length

    const validated =
      tasks.filter(
        (task) =>
          task.validated_at
      ).length

    const waitingValidation =
      tasks.filter(
        (task) =>
          task.status ===
            'completed' &&
          !task.validated_at
      ).length

    const overdue =
      tasks.filter(
        (task) => {
          if (
            !task.deadline
          ) {
            return false
          }

          if (
            task.status ===
              'completed' &&
            task.validated_at
          ) {
            return false
          }

          return (
            new Date(
              task.deadline
            ).getTime() <
            Date.now()
          )
        }
      ).length

    return {
      totalUsers,
      admins,
      normalUsers,
      activeUsers,
      disabledUsers,
      totalTasks,
      todo,
      inProgress,
      completed,
      validated,
      waitingValidation,
      overdue,
    }
  }, [users, tasks])

  const userTaskStats =
    useMemo(() => {
      const result = {}

      users.forEach(
        (user) => {
          result[user.id] = {
            total: 0,
            completed: 0,
            validated: 0,
          }
        }
      )

      tasks.forEach(
        (task) => {
          const userId =
            task.created_by

          if (
            !result[userId]
          ) {
            return
          }

          result[userId].total +=
            1

          if (
            task.status ===
            'completed'
          ) {
            result[userId]
              .completed += 1
          }

          if (
            task.validated_at
          ) {
            result[userId]
              .validated += 1
          }
        }
      )

      return result
    }, [users, tasks])

  const recentTasks =
    useMemo(
      () =>
        tasks.slice(
          0,
          8
        ),
      [tasks]
    )

  function getUserName(
    user
  ) {
    return (
      user.display_name ||
      user.username ||
      'Pengguna'
    )
  }

  function formatDate(
    date
  ) {
    if (!date) return '-'

    return new Date(
      date
    ).toLocaleDateString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  function formatDateTime(
    date
  ) {
    if (!date) return '-'

    return new Date(
      date
    ).toLocaleString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  }

  function getStatusLabel(
    status
  ) {
    switch (status) {
      case 'todo':
        return 'Belum dikerjakan'

      case 'in_progress':
        return 'Sedang dikerjakan'

      case 'completed':
        return 'Selesai'

      default:
        return status ?? '-'
    }
  }

  function getStatusClass(
    status
  ) {
    switch (status) {
      case 'todo':
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20'

      case 'in_progress':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'

      case 'completed':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/20'

      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="text-4xl mb-4"
          >
            ✦
          </motion.div>

          <p className="text-slate-400">
            Memuat Admin Dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* NAVBAR */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-xl">
                👑
              </div>

              <div>
                <h1 className="font-bold text-lg">
                  TaskFlow Admin
                </h1>

                <p className="text-xs text-slate-500">
                  Panel Administrator
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={
                  fetchDashboard
                }
                disabled={
                  refreshing
                }
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
              >
                {refreshing
                  ? 'Memuat...'
                  : '↻ Refresh'}
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    '/dashboard')
                }
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
              >
                Dashboard
              </button>

              <button
                onClick={
                  handleLogout
                }
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition text-sm"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* HEADER */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-violet-400 text-sm font-medium mb-2">
                Administrator
              </p>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Selamat datang,{' '}
                {profile?.display_name ||
                  profile?.username ||
                  'Admin'}{' '}
                👋
              </h2>

              <p className="text-slate-400 mt-2">
                Kelola pengguna dan
                aktivitas TaskFlow
                dari sini.
              </p>
            </div>

            <button
              onClick={
                openAddUser
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold shadow-lg shadow-violet-900/20"
            >
              <span className="text-lg">
                +
              </span>

              Tambah User
            </button>
          </div>
        </motion.div>

        {/* ALERT */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold mb-1">
                    Terjadi kesalahan
                  </div>

                  <div className="text-sm text-red-300/80">
                    {error}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setError('')
                  }
                  className="text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  ✓
                </span>

                <div>
                  <div className="font-semibold">
                    Berhasil
                  </div>

                  <div className="text-sm text-emerald-300/80">
                    {success}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon="👥"
            title="Total User"
            value={
              stats.totalUsers
            }
            description={`${stats.normalUsers} user biasa`}
          />

          <StatCard
            icon="🟢"
            title="Aktif"
            value={
              stats.activeUsers
            }
            description="Akun aktif"
          />

          <StatCard
            icon="🚫"
            title="Nonaktif"
            value={
              stats.disabledUsers
            }
            description="Akun dinonaktifkan"
          />

          <StatCard
            icon="👑"
            title="Admin"
            value={
              stats.admins
            }
            description="Administrator"
          />

          <StatCard
            icon="📋"
            title="Total Tugas"
            value={
              stats.totalTasks
            }
            description={`${stats.validated} tervalidasi`}
          />
        </div>

        {/* TASK OVERVIEW */}
        <div className="grid lg:grid-cols-3 gap-5 mb-8">
          <OverviewCard
            title="Belum Dikerjakan"
            value={
              stats.todo
            }
            icon="○"
          />

          <OverviewCard
            title="Sedang Dikerjakan"
            value={
              stats.inProgress
            }
            icon="◐"
          />

          <OverviewCard
            title="Terlambat"
            value={
              stats.overdue
            }
            icon="⚠"
          />
        </div>

        {/* USER MANAGEMENT */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.025] overflow-hidden mb-8">
          <div className="p-5 sm:p-6 border-b border-white/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">
                  Kelola Pengguna
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Kelola akun, role,
                  password, dan status
                  pengguna.
                </p>
              </div>

              <div className="relative w-full lg:w-96">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Cari nama, username, atau email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
          </div>

          {filteredUsers.length ===
          0 ? (
            <div className="p-10 text-center text-slate-500">
              Tidak ada pengguna
              ditemukan.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredUsers.map(
                (
                  user,
                  index
                ) => {
                  const taskStats =
                    userTaskStats[
                      user.id
                    ] ?? {
                      total: 0,
                      completed: 0,
                      validated: 0,
                    }

                  const isSelf =
                    user.id ===
                    profile?.id

                  return (
                    <motion.div
                      key={
                        user.id
                      }
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.02,
                      }}
                      className="p-5 hover:bg-white/[0.025] transition"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                          {/* USER INFO */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <img
                                  src={
                                    user.avatar_url
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xl">
                                  👤
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold">
                                  {getUserName(
                                    user
                                  )}
                                </h4>

                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                    Kamu
                                  </span>
                                )}

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                    user.role ===
                                    'admin'
                                      ? 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                  }`}
                                >
                                  {user.role ===
                                  'admin'
                                    ? 'Admin'
                                    : 'User'}
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                    user.is_banned
                                      ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  }`}
                                >
                                  {user.is_banned
                                    ? 'Nonaktif'
                                    : 'Aktif'}
                                </span>
                              </div>

                              <p className="text-sm text-slate-400 truncate mt-1">
                                {user.email ||
                                  'Email tidak tersedia'}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                {user.username && (
                                  <p className="text-xs text-slate-600">
                                    @{user.username}
                                  </p>
                                )}

                                <p className="text-xs text-slate-600">
                                  Bergabung{' '}
                                  {formatDate(
                                    user.created_at
                                  )}
                                </p>

                                {user.last_sign_in_at && (
                                  <p className="text-xs text-slate-600">
                                    Login terakhir{' '}
                                    {formatDate(
                                      user.last_sign_in_at
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* TASK STATS */}
                          <div className="grid grid-cols-3 gap-2 xl:w-[300px]">
                            <MiniStat
                              label="Tugas"
                              value={
                                taskStats.total
                              }
                            />

                            <MiniStat
                              label="Selesai"
                              value={
                                taskStats.completed
                              }
                            />

                            <MiniStat
                              label="Valid"
                              value={
                                taskStats.validated
                              }
                            />
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() =>
                              openEditUser(
                                user
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition text-xs font-medium"
                          >
                            ✏️ Edit
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                onClick={() =>
                                  openPasswordModal(
                                    user
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition text-xs font-medium"
                              >
                                🔑 Reset Password
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleUser(
                                    user
                                  )
                                }
                                disabled={
                                  changingStatus
                                }
                                className={`px-3 py-2 rounded-lg border transition text-xs font-medium ${
                                  user.is_banned
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20'
                                }`}
                              >
                                {user.is_banned
                                  ? '✓ Aktifkan'
                                  : '🚫 Nonaktifkan'}
                              </button>

                              <button
                                onClick={() =>
                                  openDeleteModal(
                                    user
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition text-xs font-medium"
                              >
                                🗑️ Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                }
              )}
            </div>
          )}
        </section>

        {/* RECENT TASKS */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.025] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/5">
            <h3 className="text-xl font-bold">
              Aktivitas Tugas Terbaru
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Aktivitas tugas terbaru
              dari seluruh pengguna.
            </p>
          </div>

          {recentTasks.length ===
          0 ? (
            <div className="p-10 text-center text-slate-500">
              Belum ada tugas.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTasks.map(
                (task) => {
                  const owner =
                    users.find(
                      (user) =>
                        user.id ===
                        task.created_by
                    )

                  return (
                    <div
                      key={
                        task.id
                      }
                      className="p-5 hover:bg-white/[0.025] transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium truncate">
                              {task.title ||
                                'Tanpa judul'}
                            </h4>

                            {task.validated_at && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                ✓ Tervalidasi
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-500 mt-1">
                            Oleh{' '}
                            {owner
                              ? getUserName(
                                  owner
                                )
                              : 'Pengguna'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs border ${getStatusClass(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(
                              task.status
                            )}
                          </span>

                          <span className="text-xs text-slate-600">
                            {formatDateTime(
                              task.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          MODAL TAMBAH USER
      ===================================================== */}
      <AnimatePresence>
        {showAddUser && (
          <Modal
            title="Tambah User Baru"
            subtitle="Buat akun TaskFlow baru"
            icon="👤"
            onClose={
              closeAddUser
            }
          >
            <form
              onSubmit={
                handleCreateUser
              }
              className="space-y-4"
            >
              <Input
                label="Username"
                name="username"
                value={
                  form.username
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    username:
                      e.target.value,
                  })
                }
                placeholder="contoh: miladi"
              />

              <Input
                label="Nama Lengkap"
                required
                name="display_name"
                value={
                  form.display_name
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    display_name:
                      e.target.value,
                  })
                }
                placeholder="Nama lengkap pengguna"
              />

              <Input
                label="Email"
                required
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    email:
                      e.target.value,
                  })
                }
                placeholder="user@email.com"
              />

              <Input
                label="Password"
                required
                type="password"
                name="password"
                value={
                  form.password
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    password:
                      e.target.value,
                  })
                }
                placeholder="Minimal 6 karakter"
              />

              <SelectRole
                value={
                  form.role
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    role:
                      e.target.value,
                  })
                }
              />

              <ModalButtons
                onCancel={
                  closeAddUser
                }
                loading={
                  creatingUser
                }
                submitText="+ Tambah User"
              />
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* =====================================================
          MODAL EDIT USER
      ===================================================== */}
      <AnimatePresence>
        {showEditUser &&
          selectedUser && (
            <Modal
              title="Edit User"
              subtitle={`Kelola data ${getUserName(selectedUser)}`}
              icon="✏️"
              onClose={() => {
                if (
                  !savingUser
                ) {
                  setShowEditUser(
                    false
                  )
                }
              }}
            >
              <form
                onSubmit={
                  handleEditUser
                }
                className="space-y-4"
              >
                <Input
                  label="Username"
                  value={
                    editForm.username
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      username:
                        e.target.value,
                    })
                  }
                  placeholder="Username"
                />

                <Input
                  label="Nama Lengkap"
                  required
                  value={
                    editForm.display_name
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      display_name:
                        e.target.value,
                    })
                  }
                  placeholder="Nama lengkap"
                />

                <Input
                  label="Email"
                  required
                  type="email"
                  value={
                    editForm.email
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      email:
                        e.target.value,
                    })
                  }
                  placeholder="Email"
                />

                <SelectRole
                  value={
                    editForm.role
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role:
                        e.target.value,
                    })
                  }
                />

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-xs text-cyan-300/80">
                    Email dikelola melalui
                    Supabase Auth dan akan
                    langsung diperbarui.
                  </p>
                </div>

                <ModalButtons
                  onCancel={() =>
                    setShowEditUser(
                      false
                    )
                  }
                  loading={
                    savingUser
                  }
                  submitText="Simpan Perubahan"
                />
              </form>
            </Modal>
          )}
      </AnimatePresence>

      {/* =====================================================
          MODAL RESET PASSWORD
      ===================================================== */}
      <AnimatePresence>
        {showPasswordModal &&
          selectedUser && (
            <Modal
              title="Reset Password"
              subtitle={`Ubah password ${getUserName(selectedUser)}`}
              icon="🔑"
              onClose={() => {
                if (
                  !resettingPassword
                ) {
                  setShowPasswordModal(
                    false
                  )
                }
              }}
            >
              <form
                onSubmit={
                  handleResetPassword
                }
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-sm text-slate-300">
                    User:
                  </p>

                  <p className="font-semibold mt-1">
                    {getUserName(
                      selectedUser
                    )}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {selectedUser.email}
                  </p>
                </div>

                <Input
                  label="Password Baru"
                  required
                  type="password"
                  value={
                    newPassword
                  }
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimal 6 karakter"
                />

                <ModalButtons
                  onCancel={() =>
                    setShowPasswordModal(
                      false
                    )
                  }
                  loading={
                    resettingPassword
                  }
                  submitText="Ubah Password"
                />
              </form>
            </Modal>
          )}
      </AnimatePresence>

      {/* =====================================================
          MODAL DELETE
      ===================================================== */}
      <AnimatePresence>
        {showDeleteModal &&
          selectedUser && (
            <Modal
              title="Hapus User?"
              subtitle="Tindakan ini tidak dapat dibatalkan"
              icon="⚠️"
              onClose={() => {
                if (
                  !deletingUser
                ) {
                  setShowDeleteModal(
                    false
                  )
                }
              }}
            >
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-sm text-slate-300">
                    Kamu akan menghapus:
                  </p>

                  <p className="font-bold text-lg mt-1">
                    {getUserName(
                      selectedUser
                    )}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    {selectedUser.email}
                  </p>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed">
                  Akun Auth dan profile
                  user akan dihapus.
                  User yang masih
                  mempunyai tugas tidak
                  dapat dihapus.
                </p>

                <ModalButtons
                  onCancel={() =>
                    setShowDeleteModal(
                      false
                    )
                  }
                  loading={
                    deletingUser
                  }
                  submitText="🗑️ Hapus User"
                  danger
                  onSubmit={
                    handleDeleteUser
                  }
                />
              </div>
            </Modal>
          )}
      </AnimatePresence>
    </div>
  )
}

// =====================================================
// COMPONENTS
// =====================================================

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="p-5 rounded-2xl border border-white/5 bg-white/[0.025] hover:bg-white/[0.04] transition"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/10 flex items-center justify-center">
          {icon}
        </div>

        <span className="text-2xl font-bold">
          {value}
        </span>
      </div>

      <h3 className="font-medium">
        {title}
      </h3>

      <p className="text-xs text-slate-500 mt-1">
        {description}
      </p>
    </motion.div>
  )
}

function OverviewCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.025]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2">
            {value}
          </p>
        </div>

        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/[0.025] border border-white/5">
      <p className="text-[11px] text-slate-600">
        {label}
      </p>

      <p className="font-bold mt-0.5">
        {value}
      </p>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  icon,
  children,
  onClose,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
          y: 15,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.96,
          y: 15,
        }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              {icon}
            </div>

            <div>
              <h3 className="font-bold text-lg">
                {title}
              </h3>

              <p className="text-xs text-slate-500">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Input({
  label,
  required = false,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}

        {required && (
          <span className="text-red-400 ml-1">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition"
      />
    </div>
  )
}

function SelectRole({
  value,
  onChange,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Role
      </label>

      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white outline-none focus:border-violet-500/50 transition"
      >
        <option value="user">
          User
        </option>

        <option value="admin">
          Admin
        </option>
      </select>
    </div>
  )
}

function ModalButtons({
  onCancel,
  loading,
  submitText,
  danger = false,
  onSubmit,
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition font-medium disabled:opacity-50"
      >
        Batal
      </button>

      <button
        type={
          onSubmit
            ? 'button'
            : 'submit'
        }
        onClick={
          onSubmit
            ? onSubmit
            : undefined
        }
        disabled={loading}
        className={`flex-1 px-4 py-3 rounded-xl transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
          danger
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-violet-600 hover:bg-violet-500'
        }`}
      >
        {loading
          ? 'Memproses...'
          : submitText}
      </button>
    </div>
  )
}

export default AdminDashboard