import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import ActivityHistory from "./pages/ActivityHistory";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AdminDashboard from "./pages/AdminDashboard";

import NotificationBell from "./components/NotificationBell";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
        }

        if (!mounted) return;

        setSession(session);
        setLoading(false);
      } catch (error) {
        console.error("Gagal memeriksa session:", error);

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
          <p className="text-sm text-slate-400">
            Memeriksa sesi...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Gagal mengecek role:", error);

          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }

          return;
        }

        if (mounted) {
          setIsAdmin(data?.role === "admin");
          setLoading(false);
        }
      } catch (error) {
        console.error("Admin check error:", error);

        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
          <p className="text-sm text-slate-400">
            Memeriksa akses admin...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function Navigation() {
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  async function loadUser() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Gagal mengambil user:", userError);
        return;
      }

      if (!user) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil profile:", error);
        return;
      }

      setProfile(data || null);
    } catch (error) {
      console.error("Navigation user error:", error);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (!mounted) return;
      await loadUser();
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const displayName =
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Pengguna";

  const isAdmin = profile?.role === "admin";

  if (
    location.pathname === "/login" ||
    location.pathname === "/register"
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-2">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-900/30">
              ✦
            </div>

            <div className="hidden sm:block">
              <div className="text-sm font-bold text-white">
                TaskFlow
              </div>

              <div className="text-[10px] text-slate-500">
                Kelola tugasmu
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <Link
              to="/dashboard"
              className={[
                "whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                isActive("/dashboard")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              🏠 Dashboard
            </Link>

            <Link
              to="/tasks"
              className={[
                "whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                isActive("/tasks")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              ✅ Tugas
            </Link>

            <Link
              to="/calendar"
              className={[
                "whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                isActive("/calendar")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              📅 Kalender
            </Link>

            <Link
              to="/statistics"
              className={[
                "whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                isActive("/statistics")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              📊 Statistik
            </Link>

            <Link
              to="/history"
              className={[
                "whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                isActive("/history")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              📜 History
            </Link>

            <Link
              to="/projects"
              className={[
                "hidden whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition md:block md:px-3 md:text-sm",
                isActive("/projects")
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              📁 Project
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={[
                  "hidden whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-medium transition lg:block lg:px-3 lg:text-sm",
                  isActive("/admin")
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                🛡️ Admin
              </Link>
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <div className="hidden text-right lg:block">
              <p className="max-w-[150px] truncate text-xs font-semibold text-slate-200">
                {displayName}
              </p>

              <p className="text-[10px] text-slate-500">
                {isAdmin ? "Administrator" : "Pengguna"}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-sm font-bold text-violet-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const location = useLocation();

  if (
    location.pathname === "/login" ||
    location.pathname === "/register"
  ) {
    return null;
  }

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-slate-600 sm:px-6 lg:px-8">
        © 2026 Miladi TaskFlow · Hak cipta dilindungi.
      </div>
    </footer>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />

      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <ActivityHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>

      <Footer />

      <NotificationBell />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}