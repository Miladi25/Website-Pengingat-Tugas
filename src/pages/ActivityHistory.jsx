import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACTION_CONFIG = {
  task_created: {
    icon: "🟢",
    title: "Tugas dibuat",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },

  task_updated: {
    icon: "✏️",
    title: "Tugas diperbarui",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },

  title_changed: {
    icon: "✏️",
    title: "Judul tugas diubah",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },

  description_changed: {
    icon: "📝",
    title: "Deskripsi tugas diubah",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },

  status_changed: {
    icon: "🔄",
    title: "Status tugas diubah",
    className:
      "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },

  priority_changed: {
    icon: "🎯",
    title: "Prioritas diubah",
    className:
      "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },

  deadline_changed: {
    icon: "📅",
    title: "Deadline diubah",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  },

  category_changed: {
    icon: "🏷️",
    title: "Kategori diubah",
    className:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },

  project_changed: {
    icon: "📁",
    title: "Project diubah",
    className:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },

  task_validated: {
    icon: "✅",
    title: "Tugas divalidasi",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },

  validation_cancelled: {
    icon: "↩️",
    title: "Validasi dibatalkan",
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  },

  task_deleted: {
    icon: "🗑️",
    title: "Tugas dihapus",
    className:
      "border-red-500/20 bg-red-500/10 text-red-300",
  },
};

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

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(action, value) {
  if (!value) {
    return "Tidak ada";
  }

  if (
    action === "status_changed"
  ) {
    return (
      STATUS_LABELS[value] || value
    );
  }

  if (
    action === "priority_changed"
  ) {
    return (
      PRIORITY_LABELS[value] || value
    );
  }

  if (
    action === "deadline_changed"
  ) {
    return formatDate(value);
  }

  if (
    action === "description_changed"
  ) {
    return value.length > 100
      ? `${value.substring(0, 100)}...`
      : value;
  }

  return value;
}

function getActionConfig(action) {
  return (
    ACTION_CONFIG[action] || {
      icon: "📌",
      title: "Aktivitas tugas",
      className:
        "border-slate-700 bg-slate-800/50 text-slate-300",
    }
  );
}

export default function ActivityHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadHistory() {
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
        setHistory([]);
        return;
      }

      const { data, error: historyError } =
        await supabase
          .from("task_history")
          .select(`
            id,
            task_id,
            user_id,
            action,
            old_value,
            new_value,
            created_at,
            tasks (
              id,
              title
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (historyError) {
        throw historyError;
      }

      setHistory(data || []);
    } catch (err) {
      console.error(
        "Gagal mengambil activity history:",
        err
      );

      setError(
        err?.message ||
          "Gagal memuat riwayat aktivitas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadHistory();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.action === filter;

      const taskTitle =
        item.tasks?.title || "";

      const actionTitle =
        getActionConfig(item.action).title;

      const searchText =
        `${taskTitle} ${actionTitle} ${
          item.old_value || ""
        } ${item.new_value || ""}`.toLowerCase();

      const matchesSearch =
        !search.trim() ||
        searchText.includes(
          search.trim().toLowerCase()
        );

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [history, filter, search]);

  const statistics = useMemo(() => {
    const total = history.length;

    const created = history.filter(
      (item) =>
        item.action === "task_created"
    ).length;

    const statusChanges = history.filter(
      (item) =>
        item.action === "status_changed"
    ).length;

    const validations = history.filter(
      (item) =>
        item.action === "task_validated"
    ).length;

    const updates = history.filter(
      (item) =>
        item.action !== "task_created" &&
        item.action !== "task_deleted" &&
        item.action !== "task_validated" &&
        item.action !== "validation_cancelled"
    ).length;

    return {
      total,
      created,
      statusChanges,
      validations,
      updates,
    };
  }, [history]);

  const groupedHistory = useMemo(() => {
    const groups = {};

    filteredHistory.forEach((item) => {
      const date = new Date(item.created_at);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
    });

    return Object.entries(groups);
  }, [filteredHistory]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              📜 Activity History
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Riwayat Aktivitas
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Lihat semua aktivitas yang terjadi pada tugasmu.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadHistory}
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

        {/* STATISTICS */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">
              Total Aktivitas
            </p>

            <p className="mt-2 text-2xl font-bold">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-emerald-300">
              Tugas Dibuat
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {statistics.created}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs text-violet-300">
              Status Diubah
            </p>

            <p className="mt-2 text-2xl font-bold text-violet-300">
              {statistics.statusChanges}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs text-blue-300">
              Aktivitas Edit
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-300">
              {statistics.updates}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-xs text-yellow-300">
              Validasi
            </p>

            <p className="mt-2 text-2xl font-bold text-yellow-300">
              {statistics.validations}
            </p>
          </div>

        </div>

        {/* FILTER */}
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="🔎 Cari aktivitas atau nama tugas..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="all">
                Semua Aktivitas
              </option>

              <option value="task_created">
                Tugas Dibuat
              </option>

              <option value="status_changed">
                Status Diubah
              </option>

              <option value="priority_changed">
                Prioritas Diubah
              </option>

              <option value="deadline_changed">
                Deadline Diubah
              </option>

              <option value="task_validated">
                Tugas Divalidasi
              </option>

              <option value="validation_cancelled">
                Validasi Dibatalkan
              </option>

              <option value="task_deleted">
                Tugas Dihapus
              </option>
            </select>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Reset
              </button>
            )}

          </div>

          <p className="mt-3 text-xs text-slate-600">
            Menampilkan{" "}
            {filteredHistory.length} dari{" "}
            {history.length} aktivitas.
          </p>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="grid min-h-[400px] place-items-center rounded-3xl border border-slate-800 bg-slate-900/70">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />

              <p className="text-sm text-slate-400">
                Memuat riwayat aktivitas...
              </p>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <div className="text-5xl">
              📜
            </div>

            <h2 className="mt-4 text-lg font-bold">
              Belum ada aktivitas
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Aktivitas tugas yang kamu lakukan akan muncul
              di halaman ini secara otomatis.
            </p>

            <Link
              to="/tasks"
              className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Mulai Kelola Tugas
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {groupedHistory.map(
              ([date, items]) => (
                <section key={date}>

                  {/* DATE */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800" />

                    <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-400">
                      {date}
                    </span>

                    <div className="h-px flex-1 bg-slate-800" />
                  </div>

                  {/* TIMELINE */}
                  <div className="relative ml-3 border-l border-slate-800 pl-6 sm:ml-6 sm:pl-8">

                    {items.map(
                      (item) => {
                        const config =
                          getActionConfig(
                            item.action
                          );

                        return (
                          <div
                            key={item.id}
                            className="relative mb-4 last:mb-0"
                          >

                            {/* TIMELINE DOT */}
                            <div
                              className={[
                                "absolute -left-[39px] top-4 flex h-7 w-7 items-center justify-center rounded-full border bg-slate-950 text-sm sm:-left-[47px]",
                                config.className,
                              ].join(" ")}
                            >
                              {config.icon}
                            </div>

                            {/* CARD */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-violet-500/20">

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                <div className="min-w-0">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span
                                      className={[
                                        "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                                        config.className,
                                      ].join(" ")}
                                    >
                                      {config.icon}{" "}
                                      {config.title}
                                    </span>

                                  </div>

                                  <h3 className="mt-2 text-sm font-semibold text-slate-200">
                                    {item.tasks?.title ||
                                      "Tugas tidak ditemukan"}
                                  </h3>

                                </div>

                                <span className="shrink-0 text-[11px] text-slate-600">
                                  {formatDate(
                                    item.created_at
                                  )}
                                </span>

                              </div>

                              {/* CHANGE DETAILS */}
                              {item.action !==
                                "task_created" &&
                                item.action !==
                                  "task_deleted" &&
                                (item.old_value ||
                                  item.new_value) && (
                                  <div className="mt-4 grid gap-2 sm:grid-cols-2">

                                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                      <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                        Sebelumnya
                                      </p>

                                      <p className="mt-1 break-words text-xs text-red-300">
                                        {formatValue(
                                          item.action,
                                          item.old_value
                                        )}
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                      <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                        Sekarang
                                      </p>

                                      <p className="mt-1 break-words text-xs text-emerald-300">
                                        {formatValue(
                                          item.action,
                                          item.new_value
                                        )}
                                      </p>
                                    </div>

                                  </div>
                                )}

                              {/* TASK LINK */}
                              {item.tasks?.id && (
                                <div className="mt-4">
                                  <Link
                                    to="/tasks"
                                    className="text-xs font-medium text-violet-400 hover:text-violet-300"
                                  >
                                    Kelola tugas →
                                  </Link>
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      }
                    )}

                  </div>
                </section>
              )
            )}

          </div>
        )}
      </div>
    </div>
  );
}