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

function isOverdue(task) {
  if (!task.deadline || task.status === "completed") {
    return false;
  }

  return new Date(task.deadline).getTime() < Date.now();
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPercentage(value, total) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

export default function Statistics() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          created_at,
          updated_at,
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
        .order("created_at", {
          ascending: false,
        });

      if (taskError) {
        throw taskError;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("Gagal memuat statistik:", err);

      setError(
        err?.message ||
          "Terjadi kesalahan saat memuat statistik."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadTasks();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const statistics = useMemo(() => {
    const total = tasks.length;

    const todo = tasks.filter(
      (task) => task.status === "todo"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "in_progress"
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const overdue = tasks.filter(isOverdue).length;

    const validated = tasks.filter(
      (task) =>
        task.status === "completed" &&
        task.validated_at
    ).length;

    const waitingValidation = tasks.filter(
      (task) =>
        task.status === "completed" &&
        !task.validated_at
    ).length;

    const completionRate = getPercentage(
      completed,
      total
    );

    const validationRate = getPercentage(
      validated,
      completed
    );

    return {
      total,
      todo,
      inProgress,
      completed,
      overdue,
      validated,
      waitingValidation,
      completionRate,
      validationRate,
    };
  }, [tasks]);

  const monthlyStatistics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    return MONTHS.map((month, index) => {
      const monthTasks = tasks.filter((task) => {
        if (!task.created_at) return false;

        const date = new Date(task.created_at);

        return (
          date.getFullYear() === currentYear &&
          date.getMonth() === index
        );
      });

      const completed = monthTasks.filter(
        (task) => task.status === "completed"
      ).length;

      return {
        month,
        shortMonth: month.substring(0, 3),
        total: monthTasks.length,
        completed,
      };
    });
  }, [tasks]);

  const priorityStatistics = useMemo(() => {
    const priorities = [
      "urgent",
      "high",
      "medium",
      "low",
    ];

    return priorities.map((priority) => {
      const count = tasks.filter(
        (task) => task.priority === priority
      ).length;

      return {
        priority,
        label: PRIORITY_LABELS[priority],
        count,
        percentage: getPercentage(
          count,
          tasks.length
        ),
      };
    });
  }, [tasks]);

  const categoryStatistics = useMemo(() => {
    const categoryMap = {};

    tasks.forEach((task) => {
      const categoryName =
        task.categories?.name || "Tanpa kategori";

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          total: 0,
          completed: 0,
        };
      }

      categoryMap[categoryName].total += 1;

      if (task.status === "completed") {
        categoryMap[categoryName].completed += 1;
      }
    });

    return Object.values(categoryMap)
      .map((category) => ({
        ...category,
        percentage: getPercentage(
          category.completed,
          category.total
        ),
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  const recentCompletedTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status === "completed")
      .sort((a, b) => {
        const dateA = new Date(
          a.completed_at || a.updated_at || a.created_at
        ).getTime();

        const dateB = new Date(
          b.completed_at || b.updated_at || b.created_at
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [tasks]);

  const maxMonthlyTasks = useMemo(() => {
    const max = Math.max(
      ...monthlyStatistics.map((item) => item.total),
      1
    );

    return max;
  }, [monthlyStatistics]);

  const productivityMessage = useMemo(() => {
    const {
      total,
      completionRate,
      overdue,
    } = statistics;

    if (total === 0) {
      return {
        icon: "🚀",
        title: "Belum ada data",
        text: "Mulai tambahkan tugas untuk melihat statistik produktivitasmu.",
      };
    }

    if (completionRate >= 90 && overdue === 0) {
      return {
        icon: "🏆",
        title: "Luar biasa!",
        text: "Produktivitasmu sangat bagus. Pertahankan ritme ini!",
      };
    }

    if (completionRate >= 70) {
      return {
        icon: "🔥",
        title: "Performa bagus!",
        text: "Kamu sudah menyelesaikan sebagian besar tugasmu.",
      };
    }

    if (completionRate >= 40) {
      return {
        icon: "💪",
        title: "Terus tingkatkan!",
        text: "Progress-mu sudah berjalan. Fokus menyelesaikan tugas berikutnya.",
      };
    }

    return {
      icon: "🚀",
      title: "Ayo mulai!",
      text: "Selesaikan tugas satu per satu dan tingkatkan progress-mu.",
    };
  }, [statistics]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              📊 Statistik Produktivitas
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Performa Tugasmu
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Lihat perkembangan produktivitas dan pencapaianmu.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadTasks}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10"
            >
              🔄 Refresh
            </button>

            <Link
              to="/tasks"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              + Kelola Tugas
            </Link>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[500px] place-items-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />

              <p className="text-sm text-slate-400">
                Menghitung statistik...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">
                  Total
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {statistics.total}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">
                  Belum Dikerjakan
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-300">
                  {statistics.todo}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="text-xs text-blue-300">
                  Dikerjakan
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-300">
                  {statistics.inProgress}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs text-emerald-300">
                  Selesai
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {statistics.completed}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs text-red-300">
                  Terlambat
                </p>

                <p className="mt-2 text-2xl font-bold text-red-300">
                  {statistics.overdue}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-xs text-violet-300">
                  Penyelesaian
                </p>

                <p className="mt-2 text-2xl font-bold text-violet-300">
                  {statistics.completionRate}%
                </p>
              </div>
            </div>

            {/* MAIN PROGRESS */}
            <div className="mb-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Overall Progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Persentase tugas yang sudah selesai.
                    </p>
                  </div>

                  <div className="text-4xl font-bold text-violet-300">
                    {statistics.completionRate}%
                  </div>
                </div>

                <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-600 transition-all duration-700"
                    style={{
                      width: `${statistics.completionRate}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Belum
                    </p>

                    <p className="mt-1 font-semibold text-slate-300">
                      {statistics.todo}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Proses
                    </p>

                    <p className="mt-1 font-semibold text-blue-300">
                      {statistics.inProgress}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Selesai
                    </p>

                    <p className="mt-1 font-semibold text-emerald-300">
                      {statistics.completed}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Terlambat
                    </p>

                    <p className="mt-1 font-semibold text-red-300">
                      {statistics.overdue}
                    </p>
                  </div>
                </div>
              </div>

              {/* PRODUCTIVITY MESSAGE */}
              <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-slate-900/70 p-6">
                <div className="text-4xl">
                  {productivityMessage.icon}
                </div>

                <h2 className="mt-4 text-xl font-bold">
                  {productivityMessage.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {productivityMessage.text}
                </p>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-xs text-slate-500">
                    Status Validasi
                  </p>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-emerald-300">
                        {statistics.validated}
                      </p>

                      <p className="text-xs text-slate-500">
                        tugas tervalidasi
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-violet-300">
                      {statistics.validationRate}%
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${statistics.validationRate}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MONTHLY CHART */}
            <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">
                  📅 Aktivitas Tahun Ini
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Jumlah tugas yang dibuat setiap bulan.
                </p>
              </div>

              <div className="flex h-64 items-end gap-2 overflow-x-auto pb-2 sm:gap-3">
                {monthlyStatistics.map((item) => {
                  const height =
                    item.total === 0
                      ? 4
                      : Math.max(
                          (item.total / maxMonthlyTasks) * 100,
                          8
                        );

                  return (
                    <div
                      key={item.month}
                      className="flex min-w-[42px] flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-[10px] font-semibold text-slate-400">
                        {item.total}
                      </span>

                      <div className="flex h-48 w-full items-end justify-center">
                        <div
                          className="w-full max-w-[38px] rounded-t-lg bg-violet-600 transition-all duration-500 hover:bg-violet-500"
                          style={{
                            height: `${height}%`,
                          }}
                          title={`${item.month}: ${item.total} tugas`}
                        />
                      </div>

                      <span className="text-[10px] text-slate-500">
                        {item.shortMonth}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRIORITY + CATEGORY */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">

              {/* PRIORITY */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-bold">
                  🎯 Berdasarkan Prioritas
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Distribusi tugas berdasarkan tingkat prioritas.
                </p>

                <div className="mt-6 space-y-5">
                  {priorityStatistics.map((item) => (
                    <div key={item.priority}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-slate-300">
                          {item.label}
                        </span>

                        <span className="text-xs text-slate-500">
                          {item.count} tugas ·{" "}
                          {item.percentage}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={[
                            "h-full rounded-full transition-all duration-500",
                            item.priority === "urgent"
                              ? "bg-red-500"
                              : item.priority === "high"
                              ? "bg-orange-500"
                              : item.priority === "medium"
                              ? "bg-yellow-500"
                              : "bg-emerald-500",
                          ].join(" ")}
                          style={{
                            width: `${item.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CATEGORY */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-bold">
                  🏷️ Berdasarkan Kategori
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Kategori dengan aktivitas tugas terbanyak.
                </p>

                {categoryStatistics.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    Belum ada kategori tugas.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {categoryStatistics
                      .slice(0, 6)
                      .map((category) => (
                        <div key={category.name}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="truncate text-sm text-slate-300">
                              {category.name}
                            </span>

                            <span className="ml-3 shrink-0 text-xs text-slate-500">
                              {category.completed}/
                              {category.total} selesai
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                              style={{
                                width: `${category.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* COMPLETED TASKS */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    🏆 Tugas yang Baru Diselesaikan
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Riwayat penyelesaian tugas terbaru.
                  </p>
                </div>

                <Link
                  to="/tasks"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Lihat semua tugas →
                </Link>
              </div>

              {recentCompletedTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
                  <div className="text-3xl">
                    📋
                  </div>

                  <p className="mt-3 text-sm text-slate-400">
                    Belum ada tugas yang selesai.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCompletedTasks.map((task) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-violet-500/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-200">
                          {task.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Selesai{" "}
                          {formatDate(
                            task.completed_at ||
                              task.updated_at
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                          ✓ Selesai
                        </span>

                        {task.validated_at ? (
                          <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-300">
                            ✓ Tervalidasi
                          </span>
                        ) : (
                          <span className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-300">
                            Menunggu validasi
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM SUMMARY */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">
                  Efisiensi Penyelesaian
                </p>

                <p className="mt-2 text-2xl font-bold text-violet-300">
                  {statistics.completionRate}%
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  dari seluruh tugas
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">
                  Menunggu Validasi
                </p>

                <p className="mt-2 text-2xl font-bold text-yellow-300">
                  {statistics.waitingValidation}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  tugas selesai belum divalidasi
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">
                  Tingkat Validasi
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {statistics.validationRate}%
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  dari tugas yang selesai
                </p>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}