import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ProjectDetail() {
  const { id } = useParams()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // =========================
  // AMBIL DATA PROJECT
  // =========================
  const fetchProject = async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        created_by
      `)
      .eq('id', id)
      .eq('created_by', userId)
      .single()

    if (error) {
      console.error('Gagal mengambil project:', error)
      setError(`Gagal mengambil project: ${error.message}`)
      return null
    }

    setProject(data)
    return data
  }

  // =========================
  // AMBIL TUGAS PROJECT
  // =========================
  const fetchTasks = async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        deadline,
        priority,
        status,
        completed_at,
        created_at,
        category_id,
        project_id,
        categories (
          id,
          name
        )
      `)
      .eq('project_id', id)
      .eq('created_by', userId)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error('Gagal mengambil tugas:', error)
      setError(`Gagal mengambil tugas: ${error.message}`)
      return
    }

    setTasks(data || [])
  }

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('User tidak ditemukan. Silakan login kembali.')
        setLoading(false)
        return
      }

      const projectData = await fetchProject(user.id)

      if (projectData) {
        await fetchTasks(user.id)
      }

      setLoading(false)
    }

    loadData()
  }, [id])

  // =========================
  // STATISTIK
  // =========================
  const statistics = useMemo(() => {
    const total = tasks.length

    const todo = tasks.filter(
      (task) => task.status === 'todo'
    ).length

    const inProgress = tasks.filter(
      (task) => task.status === 'in_progress'
    ).length

    const completed = tasks.filter(
      (task) => task.status === 'completed'
    ).length

    const overdue = tasks.filter((task) => {
      if (!task.deadline) return false
      if (task.status === 'completed') return false

      return new Date(task.deadline) < new Date()
    }).length

    const progress =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0

    return {
      total,
      todo,
      inProgress,
      completed,
      overdue,
      progress,
    }
  }, [tasks])

  // =========================
  // HELPER STATUS
  // =========================
  const getStatusLabel = (status) => {
    switch (status) {
      case 'todo':
        return 'Belum dikerjakan'

      case 'in_progress':
        return 'Sedang dikerjakan'

      case 'completed':
        return 'Selesai'

      default:
        return status || '-'
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

  // =========================
  // HELPER PRIORITAS
  // =========================
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

  // =========================
  // FORMAT DEADLINE
  // =========================
  const formatDeadline = (deadline) => {
    if (!deadline) {
      return 'Tanpa deadline'
    }

    return new Date(deadline).toLocaleString(
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

  const isOverdue = (task) => {
    if (!task.deadline) return false
    if (task.status === 'completed') return false

    return new Date(task.deadline) < new Date()
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 text-violet-400">
              ✦
            </div>

            <p className="text-slate-400">
              Memuat detail project...
            </p>
          </div>
        </div>
      </main>
    )
  }

  // =========================
  // PROJECT TIDAK DITEMUKAN
  // =========================
  if (!project) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="text-4xl mb-4">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold">
              Project tidak ditemukan
            </h1>

            <p className="mt-2 text-red-300">
              {error || 'Project tersebut tidak tersedia.'}
            </p>

            <Link
              to="/projects"
              className="inline-block mt-6 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold"
            >
              ← Kembali ke Project
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <Link
            to="/projects"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            ← Kembali ke Project
          </Link>

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-4">

              <div className="w-14 h-14 shrink-0 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl">
                📁
              </div>

              <div>
                <p className="text-sm text-violet-400 font-medium">
                  Project
                </p>

                <h1 className="text-3xl font-bold mt-1 break-words">
                  {project.name}
                </h1>

                <p className="text-slate-400 mt-2 max-w-2xl">
                  {project.description ||
                    'Tidak ada deskripsi project.'}
                </p>
              </div>

            </div>

            <Link
              to="/tasks"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold shadow-lg shadow-violet-900/20"
            >
              + Kelola Tugas
            </Link>

          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="max-w-7xl mx-auto px-6 py-8">

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Total Tugas
              </span>

              <span className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                📋
              </span>
            </div>

            <p className="text-3xl font-bold">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Belum Dikerjakan
              </span>

              <span className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                📝
              </span>
            </div>

            <p className="text-3xl font-bold">
              {statistics.todo}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Sedang Dikerjakan
              </span>

              <span className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                🔄
              </span>
            </div>

            <p className="text-3xl font-bold">
              {statistics.inProgress}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Selesai
              </span>

              <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                ✓
              </span>
            </div>

            <p className="text-3xl font-bold">
              {statistics.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Terlambat
              </span>

              <span className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                ⚠️
              </span>
            </div>

            <p className="text-3xl font-bold text-red-400">
              {statistics.overdue}
            </p>
          </div>

        </div>

        {/* PROGRESS */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                Progress Project
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Persentase tugas yang sudah selesai.
              </p>
            </div>

            <span className="text-2xl font-bold text-violet-400">
              {statistics.progress}%
            </span>
          </div>

          <div className="mt-5 h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{
                width: `${statistics.progress}%`,
              }}
            />
          </div>

          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>
              {statistics.completed} dari {statistics.total} tugas selesai
            </span>

            <span>
              {statistics.progress}%
            </span>
          </div>

        </div>

        {/* TASK LIST */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70">

          <div className="border-b border-slate-800 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Tugas dalam Project
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Semua tugas yang terhubung dengan project ini.
                </p>
              </div>

              <Link
                to="/tasks"
                className="text-sm font-medium text-violet-400 hover:text-violet-300 transition"
              >
                Kelola semua tugas →
              </Link>

            </div>
          </div>

          <div className="p-6">

            {tasks.length === 0 ? (
              <div className="rounded-xl bg-slate-950 p-10 text-center">

                <div className="text-5xl mb-5">
                  📋
                </div>

                <h3 className="text-xl font-bold">
                  Belum ada tugas
                </h3>

                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                  Belum ada tugas yang terhubung dengan project ini.
                  Tambahkan tugas melalui halaman Kelola Tugas.
                </p>

                <Link
                  to="/tasks"
                  className="inline-block mt-6 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold"
                >
                  + Tambah Tugas
                </Link>

              </div>
            ) : (
              <div className="space-y-3">

                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-5 transition ${
                      isOverdue(task)
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="min-w-0 flex-1">

                        <h3
                          className={`font-semibold break-words ${
                            task.status === 'completed'
                              ? 'text-slate-500 line-through'
                              : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-3">

                          {task.categories?.name && (
                            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                              🏷️ {task.categories.name}
                            </span>
                          )}

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${getStatusStyle(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(task.status)}
                          </span>

                          <span
                            className={`text-xs font-medium ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            ⚡ {getPriorityLabel(task.priority)}
                          </span>

                        </div>

                      </div>

                      <div className="shrink-0 lg:text-right">

                        <p
                          className={`text-xs ${
                            isOverdue(task)
                              ? 'text-red-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isOverdue(task)
                            ? '⚠️ Terlambat'
                            : '📅 Deadline'}
                        </p>

                        <p className="text-sm mt-1 text-slate-300">
                          {formatDeadline(task.deadline)}
                        </p>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>
        </div>

      </section>
    </main>
  )
}

export default ProjectDetail
