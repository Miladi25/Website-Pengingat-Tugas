import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  // =========================
  // AMBIL PROJECT
  // =========================
  const fetchProjects = async () => {
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

    const { data, error } = await supabase
      .from('projects')
      .select('*')
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

    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // =========================
  // INPUT FORM
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  // =========================
  // BUKA FORM TAMBAH
  // =========================
  const openAddForm = () => {
    setEditingProject(null)

    setForm({
      name: '',
      description: '',
    })

    setError('')
    setShowForm(true)
  }

  // =========================
  // BUKA FORM EDIT
  // =========================
  const openEditForm = (project) => {
    setEditingProject(project)

    setForm({
      name: project.name || '',
      description: project.description || '',
    })

    setError('')
    setShowForm(true)
  }

  // =========================
  // TUTUP FORM
  // =========================
  const closeForm = () => {
    if (saving) return

    setShowForm(false)
    setEditingProject(null)

    setForm({
      name: '',
      description: '',
    })
  }

  // =========================
  // SIMPAN PROJECT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')

    const projectName = form.name.trim()
    const projectDescription = form.description.trim()

    if (!projectName) {
      setError('Nama project wajib diisi.')
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('User tidak ditemukan. Silakan login kembali.')
      setSaving(false)
      return
    }

    // EDIT PROJECT
    if (editingProject) {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          description: projectDescription || null,
        })
        .eq('id', editingProject.id)
        .eq('created_by', user.id)
        .select('*')
        .single()

      if (error) {
        console.error('Gagal mengubah project:', error)
        setError(`Gagal mengubah project: ${error.message}`)
        setSaving(false)
        return
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id ? data : project
        )
      )
    }

    // TAMBAH PROJECT
    else {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          created_by: user.id,
          name: projectName,
          description: projectDescription || null,
        })
        .select('*')
        .single()

      if (error) {
        console.error('Gagal menambahkan project:', error)
        setError(`Gagal menambahkan project: ${error.message}`)
        setSaving(false)
        return
      }

      setProjects((current) =>
        [...current, data].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        )
      )
    }

    setSaving(false)
    closeForm()
  }

  // =========================
  // HAPUS PROJECT
  // =========================
  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus project "${project.name}"?`
    )

    if (!confirmed) return

    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('User tidak ditemukan. Silakan login kembali.')
      return
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)
      .eq('created_by', user.id)

    if (error) {
      console.error('Gagal menghapus project:', error)
      setError(`Gagal menghapus project: ${error.message}`)
      return
    }

    setProjects((current) =>
      current.filter((item) => item.id !== project.id)
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              to="/dashboard"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              ← Kembali ke Dashboard
            </Link>

            <h1 className="text-3xl font-bold mt-2">
              Project
            </h1>

            <p className="text-slate-400 mt-1">
              Kelola project dan pekerjaanmu dengan lebih terorganisir.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold shadow-lg shadow-violet-900/20"
          >
            + Tambah Project
          </button>

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

        {/* LOADING */}
        {loading ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">
                ✦
              </div>

              <p className="text-slate-400">
                Memuat project...
              </p>
            </div>
          </div>
        ) : projects.length === 0 ? (

          /* EMPTY STATE */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">

            <div className="text-5xl mb-5">
              📁
            </div>

            <h2 className="text-2xl font-bold mb-2">
              Belum ada project
            </h2>

            <p className="text-slate-400 max-w-md mx-auto mb-6">
              Buat project pertamamu untuk mengelompokkan
              tugas agar lebih rapi.
            </p>

            <button
              onClick={openAddForm}
              className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold"
            >
              + Buat Project Pertama
            </button>

          </div>

        ) : (

          /* PROJECT LIST */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {projects.map((project) => (
              <div
                key={project.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:border-violet-500/40 hover:bg-slate-900 transition"
              >

                {/* ICON */}
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl mb-5">
                  📁
                </div>

                {/* NAME */}
                <h2 className="text-xl font-bold break-words">
                  {project.name}
                </h2>

                {/* DESCRIPTION */}
                <p className="text-slate-400 mt-2 min-h-[48px] break-words">
                  {project.description ||
                    'Tidak ada deskripsi project.'}
                </p>

                {/* DETAIL */}
                <Link
                  to={`/projects/${project.id}`}
                  className="mt-5 block w-full px-4 py-3 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 text-violet-300 transition text-sm font-semibold text-center"
                >
                  👁️ Lihat Detail Project
                </Link>

                {/* ACTION */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">

                  <button
                    onClick={() => openEditForm(project)}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-sm font-medium"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => handleDelete(project)}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition text-sm font-medium"
                  >
                    🗑️ Hapus
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}
      </section>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* MODAL HEADER */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  {editingProject
                    ? 'Edit Project'
                    : 'Tambah Project'}
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  {editingProject
                    ? 'Perbarui informasi project.'
                    : 'Buat project baru untuk mengatur tugas.'}
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-slate-300"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5"
            >

              {/* NAMA */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Project
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Website TaskFlow"
                  maxLength={100}
                  disabled={saving}
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* DESKRIPSI */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deskripsi
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Jelaskan project ini..."
                  rows={4}
                  disabled={saving}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* BUTTON */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition font-medium"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition font-semibold"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingProject
                    ? 'Simpan Perubahan'
                    : 'Buat Project'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  )
}

export default Projects

