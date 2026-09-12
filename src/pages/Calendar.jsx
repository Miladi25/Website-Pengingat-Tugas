import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const STATUS_LABELS = {
  todo: "Belum dikerjakan",
  in_progress: "Sedang dikerjakan",
  completed: "Selesai",
};

const PRIORITY_LABELS = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

// Menghasilkan YYYY-MM-DD berdasarkan waktu lokal.
// Ini menghindari masalah timezone dari toISOString().
function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDeadline(deadline) {
  if (!deadline) return "Tidak ada deadline";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "Deadline tidak valid";
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

    case "in_progress":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";

    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function getPriorityClass(priority) {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-300 border-red-500/30";

    case "high":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";

    case "medium":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";

    default:
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  }
}

function isTaskOverdue(task) {
  if (!task.deadline || task.status === "completed") {
    return false;
  }

  return new Date(task.deadline).getTime() < Date.now();
}

function getDayType(task, currentDateKey) {
  if (task.status === "completed") {
    return "completed";
  }

  if (isTaskOverdue(task)) {
    return "overdue";
  }

  if (currentDateKey === dateKey(new Date())) {
    return "today";
  }

  return "upcoming";
}

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setTasks([]);
        return;
      }

      const { data, error: taskError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          deadline,
          priority,
          status,
          completed_at,
          validated_at,
          category_id,
          project_id,
          categories (
            id,
            name
          ),
          projects (
            id,
            name
          )
        `)
        .eq("created_by", user.id)
        .order("deadline", {
          ascending: true,
          nullsFirst: false,
        });

      if (taskError) {
        throw taskError;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("Gagal memuat kalender:", err);
      setError(
        err?.message || "Terjadi kesalahan saat memuat data kalender."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  // Refresh data ketika halaman kembali aktif.
  useEffect(() => {
    const handleFocus = () => {
      loadTasks();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstGridDay = new Date(year, month, 1 - firstDay.getDay());

    const totalCells = Math.ceil(
      (firstDay.getDay() + lastDay.getDate()) / 7
    ) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(firstGridDay);
      date.setDate(firstGridDay.getDate() + index);
      return date;
    });
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const grouped = {};

    tasks.forEach((task) => {
      if (!task.deadline) return;

      const taskDate = new Date(task.deadline);

      if (Number.isNaN(taskDate.getTime())) return;

      const key = dateKey(taskDate);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(task);
    });

    return grouped;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];

    return tasksByDate[selectedDate] || [];
  }, [selectedDate, tasksByDate]);

  const noDeadlineTasks = useMemo(() => {
    return tasks.filter((task) => !task.deadline);
  }, [tasks]);

  const statistics = useMemo(() => {
    const overdue = tasks.filter(isTaskOverdue).length;

    const completed = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const upcoming = tasks.filter(
      (task) =>
        task.deadline &&
        !isTaskOverdue(task) &&
        task.status !== "completed"
    ).length;

    const todayKey = dateKey(new Date());

    const today = tasks.filter((task) => {
      if (!task.deadline) return false;

      const taskDate = new Date(task.deadline);

      return (
        !Number.isNaN(taskDate.getTime()) &&
        dateKey(taskDate) === todayKey
      );
    }).length;

    return {
      total: tasks.length,
      today,
      upcoming,
      overdue,
      completed,
    };
  }, [tasks]);

  function goPreviousMonth() {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  }

  function goNextMonth() {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  }

  function goToday() {
    const today = new Date();

    setCurrentDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setSelectedDate(dateKey(today));
  }

  function handleSelectDate(date) {
    setSelectedDate(dateKey(date));
  }

  function getSelectedDateTitle() {
    if (!selectedDate) {
      return "Pilih tanggal";
    }

    const date = dateFromKey(selectedDate);

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                <span>📅</span>
                <span>Kalender Deadline</span>
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Jadwal Tugas
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Pantau semua deadline tugasmu dalam satu kalender.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-500/50 hover:bg-violet-500/10"
              >
                📍 Hari Ini
              </button>

              <Link
                to="/tasks"
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                + Kelola Tugas
              </Link>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>⚠️ {error}</span>

              <button
                type="button"
                onClick={loadTasks}
                className="rounded-lg bg-red-500/20 px-3 py-2 font-medium text-red-200 hover:bg-red-500/30"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* STATISTICS */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Total Tugas</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-xs text-yellow-300">Hari Ini</p>
            <p className="mt-2 text-2xl font-bold text-yellow-200">
              {statistics.today}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs text-blue-300">Mendatang</p>
            <p className="mt-2 text-2xl font-bold text-blue-200">
              {statistics.upcoming}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs text-red-300">Terlambat</p>
            <p className="mt-2 text-2xl font-bold text-red-200">
              {statistics.overdue}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-emerald-300">Selesai</p>
            <p className="mt-2 text-2xl font-bold text-emerald-200">
              {statistics.completed}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          {/* CALENDAR */}
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-violet-950/10">
            {/* CALENDAR HEADER */}
            <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {MONTHS[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Klik tanggal untuk melihat tugas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPreviousMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg text-slate-200 transition hover:border-violet-500/50 hover:bg-violet-500/10"
                  aria-label="Bulan sebelumnya"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={goNextMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg text-slate-200 transition hover:border-violet-500/50 hover:bg-violet-500/10"
                  aria-label="Bulan berikutnya"
                >
                  →
                </button>
              </div>
            </div>

            {/* LEGEND */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-800 px-4 py-3 text-xs text-slate-400 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Terlambat
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                Hari ini
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                Mendatang
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Selesai
              </div>
            </div>

            {loading ? (
              <div className="grid min-h-[500px] place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
                  <p className="text-sm text-slate-400">
                    Memuat kalender...
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 sm:p-4">
                {/* DAY NAMES */}
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-xs font-semibold text-slate-500 sm:text-sm"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* CALENDAR CELLS */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date) => {
                    const key = dateKey(date);
                    const dayTasks = tasksByDate[key] || [];

                    const isCurrentMonth =
                      date.getMonth() === currentDate.getMonth();

                    const isToday =
                      key === dateKey(new Date());

                    const isSelected =
                      key === selectedDate;

                    const overdueTasks = dayTasks.filter(
                      isTaskOverdue
                    );

                    const completedTasks = dayTasks.filter(
                      (task) => task.status === "completed"
                    );

                    const upcomingTasks = dayTasks.filter(
                      (task) =>
                        !isTaskOverdue(task) &&
                        task.status !== "completed"
                    );

                    let dotClass = "";

                    if (overdueTasks.length > 0) {
                      dotClass = "bg-red-500";
                    } else if (completedTasks.length > 0) {
                      dotClass = "bg-emerald-400";
                    } else if (upcomingTasks.length > 0) {
                      dotClass = isToday
                        ? "bg-yellow-400"
                        : "bg-blue-400";
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectDate(date)}
                        className={[
                          "group relative min-h-[76px] rounded-xl border p-1.5 text-left transition sm:min-h-[100px] sm:p-2",
                          isCurrentMonth
                            ? "border-slate-800 bg-slate-950/60"
                            : "border-slate-900 bg-slate-950/20",
                          isSelected
                            ? "border-violet-500/70 bg-violet-500/10 ring-1 ring-violet-500/30"
                            : "hover:border-violet-500/40 hover:bg-violet-500/5",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold sm:text-sm",
                              isToday
                                ? "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30"
                                : isCurrentMonth
                                ? "text-slate-200"
                                : "text-slate-700",
                            ].join(" ")}
                          >
                            {date.getDate()}
                          </span>

                          {dayTasks.length > 0 && (
                            <span
                              className={[
                                "h-2.5 w-2.5 rounded-full",
                                dotClass,
                              ].join(" ")}
                            />
                          )}
                        </div>

                        {/* TASK PREVIEW */}
                        <div className="mt-2 space-y-1">
                          {dayTasks
                            .slice(0, 2)
                            .map((task) => {
                              const type = getDayType(
                                task,
                                key
                              );

                              const previewClass =
                                type === "overdue"
                                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                                  : type === "completed"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                  : type === "today"
                                  ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                                  : "border-blue-500/20 bg-blue-500/10 text-blue-300";

                              return (
                                <div
                                  key={task.id}
                                  className={`truncate rounded-md border px-1.5 py-1 text-[10px] ${previewClass}`}
                                  title={task.title}
                                >
                                  {task.title}
                                </div>
                              );
                            })}

                          {dayTasks.length > 2 && (
                            <div className="px-1 text-[10px] font-medium text-slate-500">
                              +{dayTasks.length - 2} tugas lainnya
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SELECTED DATE */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-violet-950/10">
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                    📌 Tanggal Dipilih
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white">
                  {getSelectedDateTitle()}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedTasks.length} tugas pada tanggal ini
                </p>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
                  <div className="mb-2 text-3xl">🎉</div>

                  <p className="text-sm font-medium text-slate-300">
                    Tidak ada tugas
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Tidak ada deadline tugas pada tanggal ini.
                  </p>

                  <Link
                    to="/tasks"
                    className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
                  >
                    + Tambah Tugas
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTasks.map((task) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-violet-500/40 hover:bg-violet-500/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold text-white">
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {isTaskOverdue(task) && (
                          <span className="shrink-0 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300">
                            Terlambat
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${getStatusClass(
                            task.status
                          )}`}
                        >
                          {STATUS_LABELS[task.status] ||
                            task.status}
                        </span>

                        <span
                          className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${getPriorityClass(
                            task.priority
                          )}`}
                        >
                          {PRIORITY_LABELS[task.priority] ||
                            task.priority}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 text-[11px] text-slate-500">
                        <span>
                          🕐 {formatDeadline(task.deadline)}
                        </span>

                        {task.categories?.name && (
                          <span>
                            🏷️ {task.categories.name}
                          </span>
                        )}

                        {task.projects?.name && (
                          <span>
                            📁 {task.projects.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* NO DEADLINE */}
            {noDeadlineTasks.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4">
                  <h2 className="font-bold text-white">
                    📝 Tanpa Deadline
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Tugas yang belum memiliki tanggal deadline.
                  </p>
                </div>

                <div className="space-y-2">
                  {noDeadlineTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition hover:border-violet-500/30"
                    >
                      <span className="line-clamp-1 text-xs font-medium text-slate-300">
                        {task.title}
                      </span>

                      <span className="shrink-0 text-[10px] text-slate-600">
                        Kelola →
                      </span>
                    </Link>
                  ))}

                  {noDeadlineTasks.length > 5 && (
                    <Link
                      to="/tasks"
                      className="block pt-2 text-center text-xs font-medium text-violet-400 hover:text-violet-300"
                    >
                      Lihat {noDeadlineTasks.length - 5} tugas lainnya →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* INFO */}
            <div className="rounded-3xl border border-violet-500/10 bg-violet-500/5 p-5">
              <h3 className="font-semibold text-violet-200">
                💡 Tips Produktivitas
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Gunakan kalender untuk melihat deadline yang
                menumpuk. Prioritaskan tugas yang deadline-nya
                paling dekat agar tidak terlambat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}