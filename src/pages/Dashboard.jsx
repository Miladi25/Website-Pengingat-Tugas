import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // =========================================================
  // AMBIL DATA USER + TUGAS
  // =========================================================

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi pengguna tidak ditemukan.')
      setLoading(false)
      return
    }

    // -------------------------------------------------------
    // Ambil profil pengguna
    // -------------------------------------------------------

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

    if (profileError) {
      console.error(
        'Gagal mengambil profil pengguna:',
        profileError
      )
    }

    const name =
      profile?.display_name ||
      profile?.username ||
      user.email?.split('@')[0] ||
      'Pengguna'

    setUserName(name)

    // -------------------------------------------------------
    // Ambil tugas
    // -------------------------------------------------------

    const { data, error: taskError } =
      await supabase
        .from('tasks')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', {
          ascending: false,
        })

    if (taskError) {
      console.error(
        'Gagal mengambil tugas:',
        taskError
      )

      setError(
        `Gagal mengambil data tugas: ${taskError.message}`
      )

      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  // =========================================================
  // STATISTIK
  // =========================================================

  const statistics = useMemo(() => {
    const total = tasks.length

    const todo = tasks.filter(
      (task) => task.status === 'todo'
    ).length

    const inProgress = tasks.filter(
      (task) => task.status === 'in_progress'
    ).length

    // Semua tugas yang statusnya sudah completed
    const completed = tasks.filter(
      (task) => task.status === 'completed'
    ).length

    // Tugas completed yang sudah divalidasi
    const validated = tasks.filter(
      (task) =>
        task.status === 'completed' &&
        task.validated_at
    ).length

    // Tugas completed tetapi belum divalidasi
    const waitingValidation = tasks.filter(
      (task) =>
        task.status === 'completed' &&
        !task.validated_at
    ).length

    const now = new Date()

    const overdue = tasks.filter((task) => {
      if (!task.deadline) {
        return false
      }

      if (task.status === 'completed') {
        return false
      }

      return new Date(task.deadline) < now
    }).length

    // Progress pekerjaan
    const completionRate =
      total > 0
        ? Math.round(
            (completed / total) * 100
          )
        : 0

    // Progress validasi
    const validationRate =
      completed > 0
        ? Math.round(
            (validated / completed) * 100
          )
        : 0

    return {
      total,
      todo,
      inProgress,
      completed,
      validated,
      waitingValidation,
      overdue,
      completionRate,
      validationRate,
    }
  }, [tasks])

  // =========================================================
  // DEADLINE TERDEKAT
  // =========================================================

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter(
        (task) =>
          task.deadline &&
          task.status !== 'completed'
      )
      .sort(
        (a, b) =>
          new Date(a.deadline) -
          new Date(b.deadline)
      )
      .slice(0, 5)
  }, [tasks])

  // =========================================================
  // TUGAS TERBARU
  // =========================================================

  const recentTasks = useMemo(() => {
    return tasks.slice(0, 5)
  }, [tasks])

  // =========================================================
  // STATISTIK KATEGORI
  // =========================================================

  const categoryStats = useMemo(() => {
    const result = {}

    tasks.forEach((task) => {
      const categoryName =
        task.categories?.name ||
        'Tanpa kategori'

      if (!result[categoryName]) {
        result[categoryName] = {
          name: categoryName,
          total: 0,
          completed: 0,
        }
      }

      result[categoryName].total += 1

      if (task.status === 'completed') {
        result[categoryName].completed += 1
      }
    })

    return Object.values(result).sort(
      (a, b) => b.total - a.total
    )
  }, [tasks])

  // =========================================================
  // HELPER
  // =========================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-'
    }

    return new Date(
      dateString
    ).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) {
      return 'Tanpa deadline'
    }

    return new Date(
      dateString
    ).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = (task) => {
    if (!task.deadline) {
      return false
    }

    if (task.status === 'completed') {
      return false
    }

    return new Date(task.deadline) < new Date()
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'todo':
        return 'Belum dikerjakan'

      case 'in_progress':
        return 'Sedang dikerjakan'

      case 'completed':
        return 'Selesai'

      default:
        return status
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-500/10 text-slate-300 border-slate-700'

      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'

      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-700'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'low':
        return 'Rendah'

      case 'medium':
        return 'Sedang'

      case 'high':
        return 'Tinggi'

      case 'urgent':
        return 'Mendesak'

      default:
        return priority || '-'
    }
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400'

      case 'high':
        return 'text-orange-400'

      case 'medium':
        return 'text-yellow-400'

      case 'low':
        return 'text-emerald-400'

      default:
        return 'text-slate-400'
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl text-violet-400">
              ✦
            </div>

            <p className="text-slate-400">
              Memuat Dashboard...
            </p>
          </div>
        </div>
      </main>
    )
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="mb-2 text-sm font-medium text-violet-400">
              TaskFlow
            </p>

            {/* SAPAAN USER */}
            <p className="mb-1 text-base font-medium text-slate-400">
              Selamat datang,{' '}
              <span className="font-semibold text-violet-400">
                {userName || 'Pengguna'}
              </span>{' '}
              👋
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-slate-400">
              Pantau semua pekerjaanmu dalam satu tempat.
            </p>
          </div>

          <Link
            to="/tasks"
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            + Kelola Tugas
          </Link>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          {/* TOTAL */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Total Tugas
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-lg text-violet-400">
                📋
              </span>

            </div>

            <p className="text-3xl font-bold">
              {statistics.total}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Semua tugas
            </p>

          </div>

          {/* TODO */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Belum Dikerjakan
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-lg">
                📝
              </span>

            </div>

            <p className="text-3xl font-bold">
              {statistics.todo}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Menunggu dikerjakan
            </p>

          </div>

          {/* IN PROGRESS */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Sedang Dikerjakan
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg text-blue-400">
                🔄
              </span>

            </div>

            <p className="text-3xl font-bold">
              {statistics.inProgress}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Sedang berjalan
            </p>

          </div>

          {/* SELESAI */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Selesai
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-400">
                ✓
              </span>

            </div>

            <p className="text-3xl font-bold">
              {statistics.completed}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Menunggu validasi
            </p>

          </div>

          {/* TERVALIDASI */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Tervalidasi
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-lg text-cyan-400">
                ✓✓
              </span>

            </div>

            <p className="text-3xl font-bold text-cyan-400">
              {statistics.validated}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Benar-benar selesai
            </p>

          </div>

          {/* TERLAMBAT */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

            <div className="mb-4 flex items-center justify-between">

              <span className="text-sm text-slate-400">
                Terlambat
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-lg text-red-400">
                ⚠️
              </span>

            </div>

            <p className="text-3xl font-bold text-red-400">
              {statistics.overdue}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Melewati deadline
            </p>

          </div>

        </div>

        {/* ===================================================
            VALIDATION SUMMARY
        =================================================== */}

        <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-semibold text-cyan-400">
                Status Validasi Tugas
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {statistics.validated} dari{' '}
                {statistics.completed} tugas selesai
                sudah tervalidasi.
              </h2>

              <p className="mt-2 text-sm text-slate-400">

                {statistics.waitingValidation > 0
                  ? `${statistics.waitingValidation} tugas masih menunggu validasi.`
                  : statistics.completed > 0
                    ? 'Semua tugas yang selesai sudah tervalidasi.'
                    : 'Belum ada tugas yang berstatus selesai.'}

              </p>

            </div>

            <div className="shrink-0 text-left sm:text-right">

              <p className="text-3xl font-bold text-cyan-400">
                {statistics.validationRate}%
              </p>

              <p className="text-xs text-slate-500">
                Progress validasi
              </p>

            </div>

          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-500"
              style={{
                width: `${statistics.validationRate}%`,
              }}
            />

          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="rounded-xl bg-slate-950 p-4">

              <p className="text-xs text-slate-500">
                Selesai
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-400">
                {statistics.completed}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Status pekerjaan selesai
              </p>

            </div>

            <div className="rounded-xl bg-slate-950 p-4">

              <p className="text-xs text-slate-500">
                Menunggu Validasi
              </p>

              <p className="mt-1 text-xl font-bold text-yellow-400">
                {statistics.waitingValidation}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Sudah selesai, belum divalidasi
              </p>

            </div>

            <div className="rounded-xl bg-slate-950 p-4">

              <p className="text-xs text-slate-500">
                Tervalidasi
              </p>

              <p className="mt-1 text-xl font-bold text-cyan-400">
                {statistics.validated}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Sudah dikonfirmasi
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            MAIN GRID
        =================================================== */}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

            <div className="flex items-start justify-between">

              <div>

                <h2 className="font-semibold">
                  Progress Keseluruhan
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Persentase tugas yang selesai
                </p>

              </div>

              <span className="text-2xl font-bold text-violet-400">
                {statistics.completionRate}%
              </span>

            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{
                  width: `${statistics.completionRate}%`,
                }}
              />

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Selesai
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-400">
                  {statistics.completed}
                </p>

              </div>

              <div className="rounded-xl bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Belum selesai
                </p>

                <p className="mt-1 text-xl font-bold">
                  {statistics.total -
                    statistics.completed}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              CATEGORY
          ================================================= */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2">

            <div className="mb-5">

              <h2 className="font-semibold">
                Tugas Berdasarkan Kategori
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Distribusi tugas yang kamu miliki
              </p>

            </div>

            {categoryStats.length === 0 ? (

              <div className="rounded-xl bg-slate-950 p-6 text-center">

                <p className="text-sm text-slate-500">
                  Belum ada data kategori.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {categoryStats.map(
                  (category) => {

                    const percentage =
                      category.total > 0
                        ? Math.round(
                            (category.completed /
                              category.total) *
                              100
                          )
                        : 0

                    return (
                      <div
                        key={category.name}
                      >

                        <div className="mb-2 flex items-center justify-between gap-3">

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium">
                              {category.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {category.completed}{' '}
                              selesai dari{' '}
                              {category.total}
                            </p>

                          </div>

                          <span className="shrink-0 text-sm text-violet-400">
                            {percentage}%
                          </span>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>
                    )
                  }
                )}

              </div>

            )}

          </div>

        </div>

        {/* ===================================================
            BOTTOM GRID
        =================================================== */}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* =================================================
              UPCOMING DEADLINES
          ================================================= */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70">

            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div>

                <h2 className="font-semibold">
                  Deadline Terdekat
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Prioritas pekerjaan berikutnya
                </p>

              </div>

              <span className="text-lg">
                📅
              </span>

            </div>

            <div className="p-5">

              {upcomingTasks.length === 0 ? (

                <div className="rounded-xl bg-slate-950 p-6 text-center">

                  <p className="text-sm text-slate-500">
                    Tidak ada deadline terdekat.
                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {upcomingTasks.map(
                    (task) => (

                      <div
                        key={task.id}
                        className={`rounded-xl border p-4 ${
                          isOverdue(task)
                            ? 'border-red-500/20 bg-red-500/5'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium">
                              {task.title}
                            </p>

                            <p
                              className={`mt-1 text-xs ${
                                isOverdue(task)
                                  ? 'text-red-400'
                                  : 'text-slate-500'
                              }`}
                            >

                              {isOverdue(task)
                                ? '⚠️ Terlambat · '
                                : '🕒 '}

                              {formatDateTime(
                                task.deadline
                              )}

                            </p>

                          </div>

                          <span
                            className={`shrink-0 text-xs font-medium ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            {getPriorityLabel(
                              task.priority
                            )}
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

          {/* =================================================
              RECENT TASKS
          ================================================= */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70">

            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div>

                <h2 className="font-semibold">
                  Tugas Terbaru
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Tugas yang baru dibuat
                </p>

              </div>

              <Link
                to="/tasks"
                className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
              >
                Lihat semua →
              </Link>

            </div>

            <div className="p-5">

              {recentTasks.length === 0 ? (

                <div className="rounded-xl bg-slate-950 p-6 text-center">

                  <p className="text-sm text-slate-500">
                    Belum ada tugas.
                  </p>

                  <Link
                    to="/tasks"
                    className="mt-4 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
                  >
                    Buat tugas pertama →
                  </Link>

                </div>

              ) : (

                <div className="space-y-3">

                  {recentTasks.map(
                    (task) => (

                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-medium">
                              {task.title}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">

                              {task.categories?.name && (

                                <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[11px] text-violet-300">
                                  {task.categories.name}
                                </span>

                              )}

                              <span
                                className={`rounded-full border px-2 py-1 text-[11px] ${getStatusStyle(
                                  task.status
                                )}`}
                              >
                                {getStatusLabel(
                                  task.status
                                )}
                              </span>

                              {/* VALIDATION BADGE */}

                              {task.status === 'completed' && (

                                task.validated_at ? (

                                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300">
                                    ✓ Tervalidasi
                                  </span>

                                ) : (

                                  <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[11px] text-yellow-300">
                                    Menunggu Validasi
                                  </span>

                                )

                              )}

                            </div>

                          </div>

                          <div className="shrink-0 text-right">

                            <p
                              className={`text-xs font-medium ${getPriorityStyle(
                                task.priority
                              )}`}
                            >
                              {getPriorityLabel(
                                task.priority
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-600">
                              {formatDate(
                                task.created_at
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

        {/* ===================================================
            QUICK ACTION
        =================================================== */}

        <div className="mt-6 overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-semibold text-violet-400">
                Tetap produktif 🚀
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Selesaikan tugasmu satu per satu.
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Fokus pada tugas dengan deadline terdekat
                agar pekerjaanmu tetap terorganisir.
              </p>

            </div>

            <Link
              to="/tasks"
              className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Buka Daftar Tugas
            </Link>

          </div>

        </div>

      </div>

    </main>
  )
}

export default Dashboard