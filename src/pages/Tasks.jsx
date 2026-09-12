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

const PRIORITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

const EMPTY_FORM = {
  title: '',
  description: '',
  deadline: '',
  priority: 'medium',
  status: 'todo',
  category_id: '',
  project_id: '',
}

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [subtasks, setSubtasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingSubtasks, setLoadingSubtasks] = useState(true)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  // =========================================================
  // SEARCH / FILTER / SORTING
  // =========================================================

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [sortBy, setSortBy] = useState('created_desc')

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState(EMPTY_FORM)

  // =========================================================
  // SUBTASK
  // =========================================================

  const [subtaskInputs, setSubtaskInputs] = useState({})
  const [addingSubtask, setAddingSubtask] = useState(null)

  // =========================================================
  // VALIDATION
  // =========================================================

  const [validatingTask, setValidatingTask] = useState(null)

  // =========================================================
  // LOAD DATA
  // =========================================================

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
  // FETCH TASKS
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
  // FETCH CATEGORIES
  // =========================================================

  const fetchCategories = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
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
      return
    }

    setCategories(data || [])
  }

  // =========================================================
  // FETCH PROJECTS
  // =========================================================

  const fetchProjects = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
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
      return
    }

    setProjects(data || [])
  }

  // =========================================================
  // FETCH SUBTASKS
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
      setLoadingSubtasks(false)
      return
    }

    setSubtasks(data || [])
    setLoadingSubtasks(false)
  }

  // =========================================================
  // OPEN ADD FORM
  // =========================================================

  const handleOpenAddForm = () => {
    setEditingTask(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // =========================================================
  // OPEN EDIT FORM
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
    setForm({ ...EMPTY_FORM })
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
    }

    // Jika status bukan completed,
    // reset waktu selesai dan validasi.
    if (form.status !== 'completed') {
      taskData.completed_at = null
      taskData.validated_at = null
      taskData.validated_by = null
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
      current.filter(
        (task) => task.id !== taskId
      )
    )

    setSubtasks((current) =>
      current.filter(
        (subtask) =>
          subtask.task_id !== taskId
      )
    )

    showMessage('Tugas berhasil dihapus.')
  }

  // =========================================================
  // CHANGE STATUS
  // =========================================================

  const handleStatusChange = async (
    task,
    newStatus
  ) => {
    setError('')

    const completedAt =
      newStatus === 'completed'
        ? task.completed_at ||
          new Date().toISOString()
        : null

    const validationReset =
      newStatus !== 'completed'

    const updateData = {
      status: newStatus,
      completed_at: completedAt,
    }

    if (validationReset) {
      updateData.validated_at = null
      updateData.validated_by = null
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
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
      showMessage(
        'Status tugas berhasil diperbarui.'
      )
    }
  }

  // =========================================================
  // VALIDASI TASK
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

    showMessage('✅ Tugas berhasil divalidasi!')
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
  // SUBTASK INPUT
  // =========================================================

  const handleSubtaskInputChange = (
    taskId,
    value
  ) => {
    setSubtaskInputs((current) => ({
      ...current,
      [taskId]: value,
    }))
  }

  // =========================================================
  // ADD SUBTASK
  // =========================================================

  const handleAddSubtask = async (taskId) => {
    const title = (
      subtaskInputs[taskId] || ''
    ).trim()

    if (!title) {
      setError(
        'Nama subtask tidak boleh kosong.'
      )
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
      console.error(
        'Gagal menambahkan subtask:',
        error
      )

      setError(
        `Gagal menambahkan subtask: ${error.message}`
      )

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

    showMessage(
      'Subtask berhasil ditambahkan.'
    )
  }

  // =========================================================
  // TOGGLE SUBTASK
  // =========================================================

  const handleSubtaskToggle = async (
    subtask
  ) => {
    setError('')

    const newCompleted =
      !subtask.is_completed

    const { error } = await supabase
      .from('subtasks')
      .update({
        is_completed: newCompleted,
      })
      .eq('id', subtask.id)

    if (error) {
      console.error(
        'Gagal mengubah subtask:',
        error
      )

      setError(
        `Gagal mengubah subtask: ${error.message}`
      )

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

  // =========================================================
  // DELETE SUBTASK
  // =========================================================

  const handleDeleteSubtask = async (
    subtaskId
  ) => {
    setError('')

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) {
      console.error(
        'Gagal menghapus subtask:',
        error
      )

      setError(
        `Gagal menghapus subtask: ${error.message}`
      )

      return
    }

    setSubtasks((current) =>
      current.filter(
        (subtask) =>
          subtask.id !== subtaskId
      )
    )

    showMessage(
      'Subtask berhasil dihapus.'
    )
  }

  // =========================================================
  // FILTER + SEARCH + SORTING
  // =========================================================

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    const query =
      searchQuery.trim().toLowerCase()

    if (query) {
      result = result.filter((task) => {
        const title =
          task.title?.toLowerCase() || ''

        const description =
          task.description?.toLowerCase() || ''

        const categoryName =
          task.categories?.name?.toLowerCase() || ''

        const projectName =
          task.projects?.name?.toLowerCase() || ''

        return (
          title.includes(query) ||
          description.includes(query) ||
          categoryName.includes(query) ||
          projectName.includes(query)
        )
      })
    }

    // -------------------------------------------------------
    // FILTER CATEGORY
    // -------------------------------------------------------

    if (filterCategory === 'none') {
      result = result.filter(
        (task) => !task.category_id
      )
    } else if (
      filterCategory !== 'all'
    ) {
      result = result.filter(
        (task) =>
          String(task.category_id) ===
          String(filterCategory)
      )
    }

    // -------------------------------------------------------
    // FILTER PROJECT
    // -------------------------------------------------------

    if (filterProject === 'none') {
      result = result.filter(
        (task) => !task.project_id
      )
    } else if (
      filterProject !== 'all'
    ) {
      result = result.filter(
        (task) =>
          String(task.project_id) ===
          String(filterProject)
      )
    }

    // -------------------------------------------------------
    // SORTING
    // -------------------------------------------------------

    result.sort((a, b) => {
      const createdA = a.created_at
        ? new Date(a.created_at).getTime()
        : 0

      const createdB = b.created_at
        ? new Date(b.created_at).getTime()
        : 0

      const deadlineA = a.deadline
        ? new Date(a.deadline).getTime()
        : null

      const deadlineB = b.deadline
        ? new Date(b.deadline).getTime()
        : null

      const priorityA =
        PRIORITY_ORDER[a.priority] || 0

      const priorityB =
        PRIORITY_ORDER[b.priority] || 0

      switch (sortBy) {
        case 'created_asc':
          return createdA - createdB

        case 'deadline_asc':
          if (
            deadlineA === null &&
            deadlineB === null
          ) {
            return 0
          }

          if (deadlineA === null) {
            return 1
          }

          if (deadlineB === null) {
            return -1
          }

          return deadlineA - deadlineB

        case 'deadline_desc':
          if (
            deadlineA === null &&
            deadlineB === null
          ) {
            return 0
          }

          if (deadlineA === null) {
            return 1
          }

          if (deadlineB === null) {
            return -1
          }

          return deadlineB - deadlineA

        case 'priority_desc':
          return priorityB - priorityA

        case 'priority_asc':
          return priorityA - priorityB

        case 'created_desc':
        default:
          return createdB - createdA
      }
    })

    return result
  }, [
    tasks,
    searchQuery,
    filterCategory,
    filterProject,
    sortBy,
  ])

  // =========================================================
  // RESET FILTER
  // =========================================================

  const handleResetFilters = () => {
    setSearchQuery('')
    setFilterCategory('all')
    setFilterProject('all')
    setSortBy('created_desc')
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterCategory !== 'all' ||
    filterProject !== 'all' ||
    sortBy !== 'created_desc'

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

  const getPriorityStyle = (
    priority
  ) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/20 bg-red-500/10 text-red-400'

      case 'high':
        return 'border-orange-500/20 bg-orange-500/10 text-orange-400'

      case 'medium':
        return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'

      case 'low':
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'

      default:
        return 'border-slate-500/20 bg-slate-500/10 text-slate-400'
    }
  }

  const getPriorityLabel = (
    priority
  ) => {
    const found =
      PRIORITY_OPTIONS.find(
        (item) =>
          item.value === priority
      )

    return (
      found?.label ||
      priority ||
      'Sedang'
    )
  }

  // =========================================================
  // HELPER STATUS
  // =========================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'

      case 'in_progress':
        return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'

      default:
        return 'border-slate-700 bg-slate-800 text-slate-300'
    }
  }

  const getStatusLabel = (status) => {
    const found =
      STATUS_OPTIONS.find(
        (item) =>
          item.value === status
      )

    return (
      found?.label ||
      status ||
      'Belum dikerjakan'
    )
  }

  // =========================================================
  // FORMAT DEADLINE
  // =========================================================

  const formatDeadline = (deadline) => {
    if (!deadline) {
      return 'Tanpa deadline'
    }

    const date = new Date(deadline)

    if (Number.isNaN(date.getTime())) {
      return 'Deadline tidak valid'
    }

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

  // =========================================================
  // CHECK DEADLINE
  // =========================================================

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

  const isDeadlineSoon = (
    deadline,
    status
  ) => {
    if (
      !deadline ||
      status === 'completed'
    ) {
      return false
    }

    const deadlineTime =
      new Date(deadline).getTime()

    const now = Date.now()

    const difference =
      deadlineTime - now

    return (
      difference > 0 &&
      difference <=
        24 * 60 * 60 * 1000
    )
  }

  // =========================================================
  // FORMAT VALIDASI
  // =========================================================

  const formatValidatedAt = (
    validatedAt
  ) => {
    if (!validatedAt) {
      return ''
    }

    const date =
      new Date(validatedAt)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 text-5xl text-violet-400">
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

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Link
                to="/dashboard"
                className="text-slate-500 transition hover:text-violet-400"
              >
                Dashboard
              </Link>

              <span className="text-slate-700">
                /
              </span>

              <span className="text-violet-400">
                Tugas
              </span>
            </div>

            <p className="mb-2 text-sm font-medium text-violet-400">
              TaskFlow
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tugas Saya
            </h1>

            <p className="mt-2 text-slate-400">
              Kelola semua tugas dan subtask kamu.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddForm}
            className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500"
          >
            + Tambah Tugas
          </button>
        </div>

        {/* ================================================= */}
        {/* MESSAGE */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* SEARCH / FILTER */}
        {/* ================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/10">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-semibold text-white">
              Cari & Filter Tugas
            </h2>

            <p className="text-xs text-slate-500">
              Temukan tugas dengan cepat berdasarkan kata kunci,
              kategori, project, atau urutan tertentu.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]">

            {/* SEARCH */}

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                🔎
              </span>

              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Cari tugas, deskripsi, kategori, atau project..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            {/* CATEGORY */}

            <select
              value={filterCategory}
              onChange={(event) =>
                setFilterCategory(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
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

            {/* PROJECT */}

            <select
              value={filterProject}
              onChange={(event) =>
                setFilterProject(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
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

            {/* SORT */}

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
            >
              <option value="created_desc">
                Terbaru dibuat
              </option>

              <option value="created_asc">
                Terlama dibuat
              </option>

              <option value="deadline_asc">
                Deadline terdekat
              </option>

              <option value="deadline_desc">
                Deadline terjauh
              </option>

              <option value="priority_desc">
                Prioritas tertinggi
              </option>

              <option value="priority_asc">
                Prioritas terendah
              </option>
            </select>

            {/* RESET */}

            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          {/* RESULT INFO */}

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Menampilkan{' '}
              <span className="font-semibold text-slate-300">
                {filteredTasks.length}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-300">
                {tasks.length}
              </span>{' '}
              tugas
            </p>

            {hasActiveFilters && (
              <span className="text-xs text-violet-400">
                Filter sedang aktif
              </span>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* EMPTY STATE */}
        {/* ================================================= */}

        {filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
            <div className="mb-4 text-5xl">
              {tasks.length === 0 ? '📝' : '🔎'}
            </div>

            <h2 className="text-xl font-semibold text-white">
              {tasks.length === 0
                ? 'Belum ada tugas'
                : 'Tugas tidak ditemukan'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {tasks.length === 0
                ? 'Mulai tambahkan tugas pertamamu agar semua aktivitas bisa dikelola di satu tempat.'
                : 'Coba ubah kata pencarian atau filter yang kamu gunakan.'}
            </p>

            {tasks.length === 0 ? (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
              >
                + Tambah Tugas Pertama
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-6 rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:border-violet-500 hover:text-white"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* TASK LIST */}
        {/* ================================================= */}

        <div className="space-y-5">
          {filteredTasks.map((task) => {
            const taskSubtasks =
              getTaskSubtasks(task.id)

            const progress =
              getProgress(task.id)

            const overdue =
              isDeadlinePassed(
                task.deadline,
                task.status
              )

            const deadlineSoon =
              isDeadlineSoon(
                task.deadline,
                task.status
              )

            const isValidated =
              Boolean(task.validated_at)

            return (
              <div
                key={task.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/10 transition hover:border-slate-700"
              >

                {/* TASK HEADER */}

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 flex-1">

                      {/* BADGES */}

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityStyle(task.priority)}`}
                        >
                          {getPriorityLabel(
                            task.priority
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(task.status)}`}
                        >
                          {getStatusLabel(
                            task.status
                          )}
                        </span>

                        {isValidated && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                            ✓ Tervalidasi
                          </span>
                        )}

                        {overdue && (
                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                            ⚠ Terlambat
                          </span>
                        )}

                        {!overdue &&
                          deadlineSoon && (
                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                              ⏰ Deadline &lt; 24 jam
                            </span>
                          )}
                      </div>

                      {/* TITLE */}

                      <h2 className="break-words text-xl font-bold text-white sm:text-2xl">
                        {task.title}
                      </h2>

                      {/* DESCRIPTION */}

                      {task.description && (
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                          {task.description}
                        </p>
                      )}

                      {/* META */}

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        {/* DEADLINE */}

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs font-medium text-slate-600">
                            Deadline
                          </p>

                          <p
                            className={`mt-1 text-sm font-medium ${
                              overdue
                                ? 'text-red-400'
                                : deadlineSoon
                                  ? 'text-orange-400'
                                  : 'text-slate-300'
                            }`}
                          >
                            {task.deadline
                              ? formatDeadline(
                                  task.deadline
                                )
                              : 'Tanpa deadline'}
                          </p>
                        </div>

                        {/* CATEGORY */}

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs font-medium text-slate-600">
                            Kategori
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-300">
                            {task.categories?.name ||
                              'Tanpa kategori'}
                          </p>
                        </div>

                        {/* PROJECT */}

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs font-medium text-slate-600">
                            Project
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-300">
                            {task.projects?.name ||
                              'Tanpa project'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-48 lg:flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEditForm(task)
                        }
                        className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-violet-500 hover:text-white lg:flex-none"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTask(
                            task.id
                          )
                        }
                        className="flex-1 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 lg:flex-none"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>

                  {/* STATUS CONTROL */}

                  <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-300">
                          Status tugas
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          Ubah status sesuai progres pekerjaan.
                        </p>
                      </div>

                      <select
                        value={
                          task.status || 'todo'
                        }
                        onChange={(event) =>
                          handleStatusChange(
                            task,
                            event.target.value
                          )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                      >
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={status.value}
                              value={
                                status.value
                              }
                            >
                              {status.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* VALIDATION */}

                  {task.status ===
                    'completed' && (
                    <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-emerald-300">
                            {isValidated
                              ? '✓ Tugas sudah tervalidasi'
                              : 'Tugas selesai dan menunggu validasi'}
                          </p>

                          {isValidated && (
                            <p className="mt-1 text-xs text-slate-500">
                              Divalidasi pada{' '}
                              {formatValidatedAt(
                                task.validated_at
                              )}
                            </p>
                          )}
                        </div>

                        {isValidated ? (
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
                            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {validatingTask ===
                            task.id
                              ? 'Memproses...'
                              : 'Batalkan Validasi'}
                          </button>
                        ) : (
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
                              ? 'Memproses...'
                              : '✓ Validasi Tugas'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUBTASK */}

                  <div className="mt-6 border-t border-slate-800 pt-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">
                          Subtask
                        </h3>

                        <p className="mt-1 text-xs text-slate-600">
                          Pecah tugas menjadi langkah-langkah kecil.
                        </p>
                      </div>

                      {taskSubtasks.length >
                        0 && (
                        <span className="text-sm text-slate-500">
                          {
                            taskSubtasks.filter(
                              (item) =>
                                item.is_completed
                            ).length
                          }{' '}
                          /{' '}
                          {
                            taskSubtasks.length
                          }{' '}
                          selesai
                        </span>
                      )}
                    </div>

                    {/* PROGRESS */}

                    {taskSubtasks.length >
                      0 && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Progress subtask
                          </span>

                          <span className="font-semibold text-violet-400">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SUBTASK LIST */}

                    <div className="mt-4 space-y-2">
                      {taskSubtasks.map(
                        (subtask) => (
                          <div
                            key={
                              subtask.id
                            }
                            className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleSubtaskToggle(
                                  subtask
                                )
                              }
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition ${
                                subtask.is_completed
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-600 bg-slate-900 text-transparent hover:border-violet-500'
                              }`}
                              aria-label={
                                subtask.is_completed
                                  ? 'Batalkan subtask'
                                  : 'Selesaikan subtask'
                              }
                            >
                              ✓
                            </button>

                            <span
                              className={`min-w-0 flex-1 break-words text-sm ${
                                subtask.is_completed
                                  ? 'text-slate-600 line-through'
                                  : 'text-slate-300'
                              }`}
                            >
                              {subtask.title}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSubtask(
                                  subtask.id
                                )
                              }
                              className="rounded-lg px-2 py-1 text-xs text-slate-600 opacity-100 transition hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label="Hapus subtask"
                            >
                              🗑️
                            </button>
                          </div>
                        )
                      )}

                      {taskSubtasks.length ===
                        0 && (
                        <div className="rounded-xl border border-dashed border-slate-800 px-4 py-5 text-center text-sm text-slate-600">
                          Belum ada subtask.
                        </div>
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
                            event.key ===
                            'Enter'
                          ) {
                            event.preventDefault()

                            handleAddSubtask(
                              task.id
                            )
                          }
                        }}
                        placeholder="Tambahkan subtask..."
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
                        className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-violet-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingSubtask ===
                        task.id
                          ? 'Menambahkan...'
                          : '+ Subtask'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* =================================================== */}
      {/* ADD / EDIT MODAL */}
      {/* =================================================== */}

      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseForm()
            }
          }}
        >
          <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium text-violet-400">
                  TaskFlow
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  {editingTask
                    ? 'Edit Tugas'
                    : 'Tambah Tugas'}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}

            <form
              onSubmit={handleSaveTask}
              className="p-5 sm:p-6"
            >
              <div className="space-y-5">

                {/* TITLE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Judul tugas
                    <span className="text-red-400">
                      {' '}
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="Contoh: Mengerjakan laporan kuliah"
                    autoFocus
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Deskripsi
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="Tambahkan detail tugas..."
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* DEADLINE + PRIORITY */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
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

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
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
                            key={
                              priority.value
                            }
                            value={
                              priority.value
                            }
                          >
                            {priority.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* STATUS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
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

                  {form.status ===
                    'completed' && (
                    <p className="mt-2 text-xs text-yellow-500">
                      Tugas berstatus selesai tetap
                      perlu divalidasi agar menjadi
                      tervalidasi.
                    </p>
                  )}
                </div>

                {/* CATEGORY + PROJECT */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Kategori
                    </label>

                    <select
                      name="category_id"
                      value={
                        form.category_id
                      }
                      onChange={
                        handleFormChange
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    >
                      <option value="">
                        Tanpa kategori
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Project
                    </label>

                    <select
                      name="project_id"
                      value={
                        form.project_id
                      }
                      onChange={
                        handleFormChange
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    >
                      <option value="">
                        Tanpa project
                      </option>

                      {projects.map(
                        (project) => (
                          <option
                            key={project.id}
                            value={
                              project.id
                            }
                          >
                            {project.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
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