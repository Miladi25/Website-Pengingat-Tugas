import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = [
  {
    value: 'todo',
    label: 'Belum dikerjakan',
  },
  {
    value: 'in_progress',
    label: 'Sedang dikerjakan',
  },
  {
    value: 'completed',
    label: 'Selesai',
  },
]

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Rendah',
  },
  {
    value: 'medium',
    label: 'Sedang',
  },
  {
    value: 'high',
    label: 'Tinggi',
  },
  {
    value: 'urgent',
    label: 'Mendesak',
  },
]

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [subtasks, setSubtasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingSubtasks, setLoadingSubtasks] = useState(true)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const [filterCategory, setFilterCategory] = useState('all')
  const [filterProject, setFilterProject] = useState('all')

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium',
    status: 'todo',
    category_id: '',
    project_id: '',
  })

  const [subtaskInputs, setSubtaskInputs] = useState({})
  const [addingSubtask, setAddingSubtask] = useState(null)
  const [validatingTask, setValidatingTask] = useState(null)

  useEffect(() => {
    loadAllData()
  }, [])

  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (message) => {
    setSuccess(message)

    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  // =========================================================
  // LOAD SEMUA DATA
  // =========================================================

  const loadAllData = async () => {
    setLoading(true)
    setError('')

    await Promise.all([
      fetchTasks(),
      fetchCategories(),
      fetchProjects(),
      fetchSubtasks(),
    ])

    setLoading(false)
  }

  // =========================================================
  // TASKS
  // =========================================================

  const fetchTasks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi pengguna tidak ditemukan.')
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        categories (
          id,
          name
        ),
        projects (
          id,
          name,
          description
        )
      `)
      .eq('created_by', user.id)
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

  // =========================================================
  // OPEN ADD
  // =========================================================

  const handleOpenAddForm = () => {
    setEditingTask(null)

    setForm({
      title: '',
      description: '',
      deadline: '',
      priority: 'medium',
      status: 'todo',
      category_id: '',
      project_id: '',
    })

    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const handleOpenEditForm = (task) => {
    setEditingTask(task)

    setForm({
      title: task.title || '',
      description: task.description || '',
      deadline: task.deadline
        ? task.deadline.slice(0, 16)
        : '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      category_id: task.category_id || '',
      project_id: task.project_id || '',
    })

    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // =========================================================
  // CLOSE FORM
  // =========================================================

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(null)

    setForm({
      title: '',
      description: '',
      deadline: '',
      priority: 'medium',
      status: 'todo',
      category_id: '',
      project_id: '',
    })
  }

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  // =========================================================
  // SAVE TASK
  // =========================================================

  const handleSaveTask = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!form.title.trim()) {
      setError('Judul tugas wajib diisi.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi pengguna tidak ditemukan.')
      return
    }

    const taskData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      deadline: form.deadline
        ? new Date(form.deadline).toISOString()
        : null,
      priority: form.priority,
      status: form.status,
      category_id: form.category_id || null,
      project_id: form.project_id || null,

      // Jika task tidak completed,
      // validasi harus dikosongkan.
      ...(form.status !== 'completed'
        ? {
            validated_at: null,
            validated_by: null,
            completed_at: null,
          }
        : {}),
    }

    // =======================================================
    // EDIT TASK
    // =======================================================

    if (editingTask) {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id)
        .eq('created_by', user.id)
        .select(`
          *,
          categories (
            id,
            name
          ),
          projects (
            id,
            name,
            description
          )
        `)
        .single()

      if (error) {
        console.error('Gagal mengubah tugas:', error)
        setError(`Gagal mengubah tugas: ${error.message}`)
        return
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === editingTask.id
            ? data
            : task
        )
      )

      showMessage('Tugas berhasil diperbarui.')
    }

    // =======================================================
    // ADD TASK
    // =======================================================

    else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: user.id,
        })
        .select(`
          *,
          categories (
            id,
            name
          ),
          projects (
            id,
            name,
            description
          )
        `)
        .single()

      if (error) {
        console.error('Gagal menambahkan tugas:', error)
        setError(`Gagal menambahkan tugas: ${error.message}`)
        return
      }

      setTasks((current) => [
        data,
        ...current,
      ])

      showMessage('Tugas berhasil ditambahkan.')
    }

    handleCloseForm()
  }

  // =========================================================
  // DELETE TASK
  // =========================================================

  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm(
      'Apakah kamu yakin ingin menghapus tugas ini?'
    )

    if (!confirmDelete) {
      return
    }

    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Gagal menghapus tugas:', error)
      setError(`Gagal menghapus tugas: ${error.message}`)
      return
    }

    setTasks((current) =>
      current.filter((task) => task.id !== taskId)
    )

    setSubtasks((current) =>
      current.filter(
        (subtask) => subtask.task_id !== taskId
      )
    )

    showMessage('Tugas berhasil dihapus.')
  }

  // =========================================================
  // STATUS
  // =========================================================

  const handleStatusChange = async (task, newStatus) => {
    setError('')

    const completedAt =
      newStatus === 'completed'
        ? (
            task.completed_at ||
            new Date().toISOString()
          )
        : null

    const validationReset =
      newStatus !== 'completed'

    const { error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,

        ...(validationReset
          ? {
              validated_at: null,
              validated_by: null,
            }
          : {}),
      })
      .eq('id', task.id)
      .eq('created_by', task.created_by)

    if (error) {
      console.error('Gagal mengubah status:', error)
      setError(`Gagal mengubah status: ${error.message}`)
      return
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: newStatus,
              completed_at: completedAt,

              ...(validationReset
                ? {
                    validated_at: null,
                    validated_by: null,
                  }
                : {}),
            }
          : item
      )
    )

    if (validationReset) {
      showMessage(
        'Status diubah. Validasi tugas di-reset.'
      )
    } else {
      showMessage('Status tugas berhasil diperbarui.')
    }
  }

  // =========================================================
  // VALIDASI TUGAS
  // =========================================================

  const handleValidateTask = async (task) => {
    if (task.status !== 'completed') {
      setError(
        'Tugas harus berstatus Selesai sebelum divalidasi.'
      )
      return
    }

    const confirmValidation = window.confirm(
      `Apakah kamu yakin ingin memvalidasi tugas "${task.title}" sebagai benar-benar selesai?`
    )

    if (!confirmValidation) {
      return
    }

    setError('')
    setSuccess('')
    setValidatingTask(task.id)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi pengguna tidak ditemukan.')
      setValidatingTask(null)
      return
    }

    const validatedAt = new Date().toISOString()

    const { error } = await supabase
      .from('tasks')
      .update({
        validated_at: validatedAt,
        validated_by: user.id,
      })
      .eq('id', task.id)
      .eq('created_by', user.id)

    if (error) {
      console.error('Gagal memvalidasi tugas:', error)
      setError(`Gagal memvalidasi tugas: ${error.message}`)
      setValidatingTask(null)
      return
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              validated_at: validatedAt,
              validated_by: user.id,
            }
          : item
      )
    )

    setValidatingTask(null)

    showMessage(
      '✅ Tugas berhasil divalidasi!'
    )
  }

  // =========================================================
  // BATALKAN VALIDASI
  // =========================================================

  const handleUnvalidateTask = async (task) => {
    const confirmUnvalidate = window.confirm(
      `Batalkan validasi untuk tugas "${task.title}"?`
    )

    if (!confirmUnvalidate) {
      return
    }

    setError('')
    setSuccess('')
    setValidatingTask(task.id)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi pengguna tidak ditemukan.')
      setValidatingTask(null)
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        validated_at: null,
        validated_by: null,
      })
      .eq('id', task.id)
      .eq('created_by', user.id)

    if (error) {
      console.error(
        'Gagal membatalkan validasi:',
        error
      )
      setError(
        `Gagal membatalkan validasi: ${error.message}`
      )
      setValidatingTask(null)
      return
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              validated_at: null,
              validated_by: null,
            }
          : item
      )
    )

    setValidatingTask(null)

    showMessage(
      'Validasi tugas berhasil dibatalkan.'
    )
  }

  // =========================================================
  // CATEGORIES
  // =========================================================

  const fetchCategories = async () => {
    setLoadingCategories(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoadingCategories(false)
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', {
        ascending: true,
      })

    if (error) {
      console.error('Gagal mengambil kategori:', error)
      setError(`Gagal mengambil kategori: ${error.message}`)
    } else {
      setCategories(data || [])
    }

    setLoadingCategories(false)
  }

  // =========================================================
  // PROJECTS
  // =========================================================

  const fetchProjects = async () => {
    setLoadingProjects(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoadingProjects(false)
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description
      `)
      .eq('created_by', user.id)
      .order('name', {
        ascending: true,
      })

    if (error) {
      console.error('Gagal mengambil project:', error)
      setError(`Gagal mengambil project: ${error.message}`)
    } else {
      setProjects(data || [])
    }

    setLoadingProjects(false)
  }

  // =========================================================
  // SUBTASKS
  // =========================================================

  const fetchSubtasks = async () => {
    setLoadingSubtasks(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoadingSubtasks(false)
      return
    }

    const { data, error } = await supabase
      .from('subtasks')
      .select(`
        *,
        tasks!inner (
          created_by
        )
      `)
      .eq('tasks.created_by', user.id)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      console.error('Gagal mengambil subtask:', error)
      setError(`Gagal mengambil subtask: ${error.message}`)
    } else {
      setSubtasks(data || [])
    }

    setLoadingSubtasks(false)
  }

  const handleSubtaskInputChange = (taskId, value) => {
    setSubtaskInputs((current) => ({
      ...current,
      [taskId]: value,
    }))
  }

  const handleAddSubtask = async (taskId) => {
    const title = (
      subtaskInputs[taskId] || ''
    ).trim()

    if (!title) {
      setError('Nama subtask tidak boleh kosong.')
      return
    }

    setError('')
    setAddingSubtask(taskId)

    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title,
        is_completed: false,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Gagal menambahkan subtask:', error)
      setError(`Gagal menambahkan subtask: ${error.message}`)
      setAddingSubtask(null)
      return
    }

    setSubtasks((current) => [
      ...current,
      data,
    ])

    setSubtaskInputs((current) => ({
      ...current,
      [taskId]: '',
    }))

    setAddingSubtask(null)

    showMessage('Subtask berhasil ditambahkan.')
  }

  const handleSubtaskToggle = async (subtask) => {
    setError('')

    const newCompleted = !subtask.is_completed

    const { error } = await supabase
      .from('subtasks')
      .update({
        is_completed: newCompleted,
      })
      .eq('id', subtask.id)

    if (error) {
      console.error('Gagal mengubah subtask:', error)
      setError(`Gagal mengubah subtask: ${error.message}`)
      return
    }

    setSubtasks((current) =>
      current.map((item) =>
        item.id === subtask.id
          ? {
              ...item,
              is_completed: newCompleted,
            }
          : item
      )
    )
  }

  const handleDeleteSubtask = async (subtaskId) => {
    setError('')

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) {
      console.error('Gagal menghapus subtask:', error)
      setError(`Gagal menghapus subtask: ${error.message}`)
      return
    }

    setSubtasks((current) =>
      current.filter(
        (subtask) => subtask.id !== subtaskId
      )
    )

    showMessage('Subtask berhasil dihapus.')
  }

  // =========================================================
  // FILTER
  // =========================================================

  const filteredTasks = useMemo(() => {
    let result = tasks

    // FILTER KATEGORI
    if (filterCategory === 'none') {
      result = result.filter(
        (task) => !task.category_id
      )
    } else if (filterCategory !== 'all') {
      result = result.filter(
        (task) =>
          task.category_id === filterCategory
      )
    }

    // FILTER PROJECT
    if (filterProject === 'none') {
      result = result.filter(
        (task) => !task.project_id
      )
    } else if (filterProject !== 'all') {
      result = result.filter(
        (task) =>
          task.project_id === filterProject
      )
    }

    return result
  }, [
    tasks,
    filterCategory,
    filterProject,
  ])

  // =========================================================
  // HELPER SUBTASK
  // =========================================================

  const getTaskSubtasks = (taskId) => {
    return subtasks.filter(
      (subtask) =>
        subtask.task_id === taskId
    )
  }

  const getProgress = (taskId) => {
    const taskSubtasks =
      getTaskSubtasks(taskId)

    if (taskSubtasks.length === 0) {
      return 0
    }

    const completed =
      taskSubtasks.filter(
        (subtask) =>
          subtask.is_completed
      ).length

    return Math.round(
      (completed /
        taskSubtasks.length) *
        100
    )
  }

  // =========================================================
  // HELPER PRIORITY
  // =========================================================

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400 border-red-500/20'

      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'

      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'

      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const getPriorityLabel = (priority) => {
    const found =
      PRIORITY_OPTIONS.find(
        (item) =>
          item.value === priority
      )

    return found?.label || priority
  }

  // =========================================================
  // HELPER STATUS
  // =========================================================

  const getStatusLabel = (status) => {
    const found =
      STATUS_OPTIONS.find(
        (item) =>
          item.value === status
      )

    return found?.label || status
  }

  // =========================================================
  // FORMAT DEADLINE
  // =========================================================

  const formatDeadline = (deadline) => {
    if (!deadline) {
      return 'Tanpa deadline'
    }

    const date = new Date(deadline)

    return date.toLocaleString(
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

  const isDeadlinePassed = (
    deadline,
    status
  ) => {
    if (
      !deadline ||
      status === 'completed'
    ) {
      return false
    }

    return (
      new Date(deadline) <
      new Date()
    )
  }

  // =========================================================
  // FORMAT VALIDASI
  // =========================================================

  const formatValidatedAt = (validatedAt) => {
    if (!validatedAt) {
      return ''
    }

    return new Date(
      validatedAt
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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-violet-400">
            ✦
          </div>

          <p className="text-slate-400">
            Memuat tugas...
          </p>
        </div>
      </main>
    )
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="mb-2 text-sm font-medium text-violet-400">
              TaskFlow
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Tugas Saya
            </h1>

            <p className="mt-2 text-slate-400">
              Kelola semua tugas dan subtask kamu.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddForm}
            className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            + Tambah Tugas
          </button>

        </div>

        {/* MESSAGE */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* FILTER */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">

          <div className="grid gap-3 sm:grid-cols-2">

            {/* CATEGORY FILTER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Filter kategori
              </label>

              <select
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
              >
                <option value="all">
                  Semua kategori
                </option>

                <option value="none">
                  Tanpa kategori
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PROJECT FILTER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Filter project
              </label>

              <select
                value={filterProject}
                onChange={(event) =>
                  setFilterProject(
                    event.target.value
                  )
                }
                disabled={loadingProjects}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
              >
                <option value="all">
                  Semua project
                </option>

                <option value="none">
                  Tanpa project
                </option>

                {projects.map(
                  (project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>
        </div>

        {/* EMPTY */}
        {filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">

            <div className="mb-4 text-4xl">
              ✓
            </div>

            <h2 className="text-xl font-semibold">
              Belum ada tugas
            </h2>

            <p className="mt-2 text-slate-400">
              Tambahkan tugas pertama kamu untuk mulai
              menggunakan TaskFlow.
            </p>

            <button
              type="button"
              onClick={handleOpenAddForm}
              className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
            >
              + Tambah Tugas
            </button>

          </div>
        )}

        {/* TASK LIST */}
        <div className="space-y-5">

          {filteredTasks.map((task) => {

            const taskSubtasks =
              getTaskSubtasks(task.id)

            const progress =
              getProgress(task.id)

            const completedSubtasks =
              taskSubtasks.filter(
                (subtask) =>
                  subtask.is_completed
              ).length

            const isValidated =
              Boolean(task.validated_at)

            return (
              <article
                key={task.id}
                className={`overflow-hidden rounded-2xl border bg-slate-900/70 ${
                  isValidated
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >

                {/* TASK CONTENT */}
                <div className="p-5 sm:p-6">

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 flex-1">

                      {/* TITLE */}
                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="text-xl font-bold text-white">
                          {task.title}
                        </h2>

                        {/* CATEGORY */}
                        {task.categories?.name && (
                          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                            🏷️ {task.categories.name}
                          </span>
                        )}

                        {/* PROJECT */}
                        {task.projects?.name && (
                          <Link
                            to={`/projects/${task.projects.id}`}
                            className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20 hover:text-blue-200"
                          >
                            📁 {task.projects.name}
                          </Link>
                        )}

                        {/* PRIORITY */}
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {getPriorityLabel(
                            task.priority
                          )}
                        </span>

                      </div>

                      {/* DESCRIPTION */}
                      {task.description && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {task.description}
                        </p>
                      )}

                      {/* INFO */}
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">

                        <span
                          className={`rounded-lg bg-slate-950 px-3 py-2 ${
                            isDeadlinePassed(
                              task.deadline,
                              task.status
                            )
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          🕒 {formatDeadline(
                            task.deadline
                          )}
                        </span>

                        <span className="rounded-lg bg-slate-950 px-3 py-2 text-slate-400">
                          📌 {getStatusLabel(
                            task.status
                          )}
                        </span>

                      </div>

                    </div>

                    {/* ACTIONS */}
                    <div className="flex shrink-0 gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEditForm(task)
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-violet-500 hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTask(
                            task.id
                          )
                        }
                        className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        Hapus
                      </button>

                    </div>

                  </div>

                  {/* STATUS */}
                  <div className="mt-5">

                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>

                    <select
                      value={task.status}
                      onChange={(event) =>
                        handleStatusChange(
                          task,
                          event.target.value
                        )
                      }
                      className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                    >
                      {STATUS_OPTIONS.map(
                        (status) => (
                          <option
                            key={status.value}
                            value={status.value}
                          >
                            {status.label}
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  {/* VALIDASI TUGAS */}
                  {task.status === 'completed' && (
                    <div className="mt-5">

                      {isValidated ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                  ✓
                                </span>

                                <div>
                                  <p className="text-sm font-semibold text-emerald-300">
                                    Tugas Tervalidasi
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Divalidasi pada{' '}
                                    {formatValidatedAt(
                                      task.validated_at
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleUnvalidateTask(
                                  task
                                )
                              }
                              disabled={
                                validatingTask ===
                                task.id
                              }
                              className="rounded-lg border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {validatingTask ===
                              task.id
                                ? 'Memproses...'
                                : 'Batalkan Validasi'}
                            </button>

                          </div>

                        </div>
                      ) : (
                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-center gap-3">

                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
                                !
                              </span>

                              <div>
                                <p className="text-sm font-semibold text-yellow-300">
                                  Menunggu Validasi
                                </p>

                                <p className="text-xs text-slate-500">
                                  Tugas sudah selesai dan perlu
                                  divalidasi oleh kamu.
                                </p>
                              </div>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleValidateTask(
                                  task
                                )
                              }
                              disabled={
                                validatingTask ===
                                task.id
                              }
                              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {validatingTask ===
                              task.id
                                ? 'Memvalidasi...'
                                : '✓ Validasi Tugas'}
                            </button>

                          </div>

                        </div>
                      )}

                    </div>
                  )}

                  {/* SUBTASK */}
                  <div className="mt-6 border-t border-slate-800 pt-5">

                    <div className="mb-2 flex items-center justify-between">

                      <div>
                        <h3 className="font-semibold text-white">
                          Subtask
                        </h3>

                        <p className="text-xs text-slate-500">
                          {completedSubtasks} dari{' '}
                          {taskSubtasks.length}{' '}
                          selesai
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-violet-400">
                        {progress}%
                      </span>

                    </div>

                    {/* PROGRESS */}
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                    {/* SUBTASK LIST */}
                    <div className="mt-4 space-y-2">

                      {taskSubtasks.map(
                        (subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3"
                          >

                            {/* CHECKBOX */}
                            <button
                              type="button"
                              onClick={() =>
                                handleSubtaskToggle(
                                  subtask
                                )
                              }
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
                                subtask.is_completed
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-600 text-transparent hover:border-violet-500'
                              }`}
                              aria-label={
                                subtask.is_completed
                                  ? 'Batalkan selesai'
                                  : 'Tandai selesai'
                              }
                            >
                              ✓
                            </button>

                            {/* TITLE */}
                            <span
                              className={`min-w-0 flex-1 text-sm ${
                                subtask.is_completed
                                  ? 'text-slate-500 line-through'
                                  : 'text-slate-300'
                              }`}
                            >
                              {subtask.title}
                            </span>

                            {/* DELETE */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSubtask(
                                  subtask.id
                                )
                              }
                              className="text-xs text-slate-600 transition hover:text-red-400"
                            >
                              Hapus
                            </button>

                          </div>
                        )
                      )}

                    </div>

                    {/* ADD SUBTASK */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                      <input
                        type="text"
                        value={
                          subtaskInputs[
                            task.id
                          ] || ''
                        }
                        onChange={(event) =>
                          handleSubtaskInputChange(
                            task.id,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter'
                          ) {
                            handleAddSubtask(
                              task.id
                            )
                          }
                        }}
                        placeholder="Tambah subtask..."
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleAddSubtask(
                            task.id
                          )
                        }
                        disabled={
                          addingSubtask ===
                          task.id
                        }
                        className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingSubtask ===
                        task.id
                          ? 'Menambahkan...'
                          : '+ Subtask'}
                      </button>

                    </div>

                  </div>

                </div>

              </article>
            )
          })}

        </div>
      </div>

      {/* =====================================================
          MODAL FORM
      ===================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* MODAL HEADER */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">

              <div>
                <h2 className="text-lg font-bold">
                  {editingTask
                    ? 'Edit Tugas'
                    : 'Tambah Tugas'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Isi informasi tugas kamu.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSaveTask}
              className="space-y-5 p-5"
            >

              {/* TITLE */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Judul tugas
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Contoh: Kerjakan tugas basis data"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                  autoFocus
                />

              </div>

              {/* DESCRIPTION */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Deskripsi
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Tambahkan deskripsi tugas..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />

              </div>

              {/* CATEGORY + PROJECT */}
              <div className="grid gap-5 sm:grid-cols-2">

                {/* CATEGORY */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Kategori
                  </label>

                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleFormChange}
                    disabled={loadingCategories}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  >

                    <option value="">
                      Tanpa kategori
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* PROJECT */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Project
                  </label>

                  <select
                    name="project_id"
                    value={form.project_id}
                    onChange={handleFormChange}
                    disabled={loadingProjects}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  >

                    <option value="">
                      Tanpa project
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.name}
                        </option>
                      )
                    )}

                  </select>

                  {projects.length === 0 &&
                    !loadingProjects && (
                      <p className="mt-2 text-xs text-slate-600">
                        Belum ada project.
                      </p>
                    )}

                </div>

              </div>

              {/* DEADLINE */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Deadline
                </label>

                <input
                  type="datetime-local"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                />

              </div>

              {/* PRIORITY + STATUS */}
              <div className="grid gap-5 sm:grid-cols-2">

                {/* PRIORITY */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Prioritas
                  </label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  >

                    {PRIORITY_OPTIONS.map(
                      (priority) => (
                        <option
                          key={priority.value}
                          value={priority.value}
                        >
                          {priority.label}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* STATUS */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  >

                    {STATUS_OPTIONS.map(
                      (status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* BUTTON */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  {editingTask
                    ? 'Simpan Perubahan'
                    : 'Tambah Tugas'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  )
}

export default Tasks