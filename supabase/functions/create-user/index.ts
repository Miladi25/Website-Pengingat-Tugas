import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  )
}

Deno.serve(async (req) => {
  // =========================
  // CORS
  // =========================
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    // =========================
    // ENV
    // =========================
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL")

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY")

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      )

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Konfigurasi Supabase Edge Function belum lengkap.",
        },
        500,
      )
    }

    // =========================
    // CLIENT USER
    // =========================
    const authHeader =
      req.headers.get("Authorization")

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authorization tidak ditemukan.",
        },
        401,
      )
    }

    const supabaseUser =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authHeader,
            },
          },
        },
      )

    // =========================
    // CEK USER LOGIN
    // =========================
    const {
      data: {
        user: currentUser,
      },
      error: currentUserError,
    } =
      await supabaseUser.auth.getUser()

    if (
      currentUserError ||
      !currentUser
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Sesi login tidak valid.",
        },
        401,
      )
    }

    // =========================
    // ADMIN CLIENT
    // =========================
    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )

    // =========================
    // CEK ROLE ADMIN
    // =========================
    const {
      data: currentProfile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, role",
        )
        .eq(
          "id",
          currentUser.id,
        )
        .single()

    if (
      profileError ||
      !currentProfile
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Profile admin tidak ditemukan.",
        },
        403,
      )
    }

    if (
      currentProfile.role !==
      "admin"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Akses ditolak. Hanya admin yang dapat mengelola user.",
        },
        403,
      )
    }

    // =========================
    // BACA BODY
    // =========================
    const body =
      await req.json()

    const action =
      body?.action

    // =====================================================
    // ACTION LIST
    // =====================================================
    if (action === "list") {
      const allUsers = []

      let page = 1
      const perPage = 1000

      while (true) {
        const {
          data,
          error,
        } =
          await supabaseAdmin.auth.admin.listUsers(
            {
              page,
              perPage,
            },
          )

        if (error) {
          throw new Error(
            `Gagal mengambil user Auth: ${error.message}`,
          )
        }

        const users =
          data?.users ?? []

        allUsers.push(
          ...users,
        )

        if (
          users.length <
          perPage
        ) {
          break
        }

        page++
      }

      const {
        data: profiles,
        error:
          profilesError,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, role, created_at, updated_at",
          )

      if (profilesError) {
        throw new Error(
          `Gagal mengambil profiles: ${profilesError.message}`,
        )
      }

      const profileMap =
        new Map()

      for (
        const profile of
          profiles ?? []
      ) {
        profileMap.set(
          profile.id,
          profile,
        )
      }

      const result =
        allUsers.map(
          (authUser) => {
            const profile =
              profileMap.get(
                authUser.id,
              )

            const bannedUntil =
              authUser.banned_until

            const isBanned =
              !!bannedUntil &&
              new Date(
                bannedUntil,
              ).getTime() >
                Date.now()

            return {
              id: authUser.id,

              email:
                authUser.email ??
                "",

              email_confirmed:
                !!authUser.email_confirmed_at,

              created_at:
                profile?.created_at ??
                authUser.created_at,

              updated_at:
                profile?.updated_at ??
                authUser.updated_at,

              last_sign_in_at:
                authUser.last_sign_in_at ??
                null,

              banned_until:
                bannedUntil ??
                null,

              is_banned:
                isBanned,

              username:
                profile?.username ??
                authUser.user_metadata
                  ?.username ??
                "",

              display_name:
                profile?.display_name ??
                authUser.user_metadata
                  ?.display_name ??
                "",

              avatar_url:
                profile?.avatar_url ??
                authUser.user_metadata
                  ?.avatar_url ??
                null,

              role:
                profile?.role ===
                "admin"
                  ? "admin"
                  : "user",
            }
          },
        )

      return jsonResponse({
        success: true,
        users: result,
      })
    }

    // =====================================================
    // ACTION CREATE
    // =====================================================
    if (action === "create") {
      const username =
        typeof body.username ===
        "string"
          ? body.username.trim()
          : ""

      const displayName =
        typeof body.display_name ===
        "string"
          ? body.display_name.trim()
          : ""

      const email =
        typeof body.email ===
        "string"
          ? body.email
              .trim()
              .toLowerCase()
          : ""

      const password =
        typeof body.password ===
        "string"
          ? body.password
          : ""

      const role =
        body.role === "admin"
          ? "admin"
          : "user"

      // -------------------------
      // VALIDASI CREATE
      // -------------------------
      if (!displayName) {
        return jsonResponse(
          {
            success: false,
            error:
              "Nama lengkap wajib diisi.",
          },
          400,
        )
      }

      if (!email) {
        return jsonResponse(
          {
            success: false,
            error:
              "Email wajib diisi.",
          },
          400,
        )
      }

      if (
        password.length < 6
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Password minimal 6 karakter.",
          },
          400,
        )
      }

      // -------------------------
      // CEK USERNAME
      // -------------------------
      if (username) {
        const {
          data:
            existingUsername,
          error:
            usernameError,
        } =
          await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq(
              "username",
              username,
            )
            .maybeSingle()

        if (usernameError) {
          throw new Error(
            `Gagal mengecek username: ${usernameError.message}`,
          )
        }

        if (
          existingUsername
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Username tersebut sudah digunakan.",
            },
            400,
          )
        }
      }

      // -------------------------
      // BUAT USER AUTH
      // -------------------------
      const {
        data:
          createdAuth,
        error:
          createAuthError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email,
            password,
            email_confirm:
              true,

            user_metadata: {
              username:
                username || null,
              display_name:
                displayName,
            },
          },
        )

      if (
        createAuthError ||
        !createdAuth?.user
      ) {
        throw new Error(
          createAuthError?.message ??
            "Gagal membuat akun Auth.",
        )
      }

      const newUser =
        createdAuth.user

      // -------------------------
      // BUAT PROFILE
      // -------------------------
      const {
        error:
          insertProfileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: newUser.id,

              username:
                username || null,

              display_name:
                displayName,

              role,
            },
            {
              onConflict:
                "id",
            },
          )

      // -------------------------
      // ROLLBACK JIKA PROFILE GAGAL
      // -------------------------
      if (insertProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(
          newUser.id,
        )

        throw new Error(
          `Gagal membuat profile: ${insertProfileError.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "User berhasil dibuat.",
        user: {
          id: newUser.id,
          email:
            newUser.email,
          username:
            username || null,
          display_name:
            displayName,
          role,
        },
      })
    }

    // =====================================================
    // ACTION EDIT
    // =====================================================
    if (action === "edit") {
      const userId =
        typeof body.user_id ===
        "string"
          ? body.user_id.trim()
          : ""

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID wajib diberikan.",
          },
          400,
        )
      }

      const username =
        typeof body.username ===
        "string"
          ? body.username.trim()
          : ""

      const displayName =
        typeof body.display_name ===
        "string"
          ? body.display_name.trim()
          : ""

      const email =
        typeof body.email ===
        "string"
          ? body.email
              .trim()
              .toLowerCase()
          : ""

      const role =
        body.role === "admin"
          ? "admin"
          : "user"

      if (!displayName) {
        return jsonResponse(
          {
            success: false,
            error:
              "Nama lengkap wajib diisi.",
          },
          400,
        )
      }

      if (!email) {
        return jsonResponse(
          {
            success: false,
            error:
              "Email wajib diisi.",
          },
          400,
        )
      }

      // Cek username milik user lain
      if (username) {
        const {
          data:
            existingUsername,
          error:
            usernameError,
        } =
          await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq(
              "username",
              username,
            )
            .neq(
              "id",
              userId,
            )
            .maybeSingle()

        if (usernameError) {
          throw new Error(
            usernameError.message,
          )
        }

        if (
          existingUsername
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Username tersebut sudah digunakan.",
            },
            400,
          )
        }
      }

      const {
        error:
          updateAuthError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            email,
            user_metadata: {
              username:
                username || null,
              display_name:
                displayName,
            },
          },
        )

      if (updateAuthError) {
        throw new Error(
          `Gagal memperbarui Auth: ${updateAuthError.message}`,
        )
      }

      const {
        error:
          updateProfileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            username:
              username || null,
            display_name:
              displayName,
            role,
          })
          .eq(
            "id",
            userId,
          )

      if (updateProfileError) {
        throw new Error(
          `Gagal memperbarui profile: ${updateProfileError.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "User berhasil diperbarui.",
      })
    }

    // =====================================================
    // ACTION RESET PASSWORD
    // =====================================================
    if (
      action ===
      "reset_password"
    ) {
      const userId =
        typeof body.user_id ===
        "string"
          ? body.user_id.trim()
          : ""

      const password =
        typeof body.password ===
        "string"
          ? body.password
          : ""

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID wajib diberikan.",
          },
          400,
        )
      }

      if (
        userId ===
        currentUser.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Gunakan pengaturan akun untuk mengubah password akun admin sendiri.",
          },
          400,
        )
      }

      if (
        password.length < 6
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Password minimal 6 karakter.",
          },
          400,
        )
      }

      const {
        error,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password,
          },
        )

      if (error) {
        throw new Error(
          `Gagal mengubah password: ${error.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "Password berhasil diubah.",
      })
    }

    // =====================================================
    // ACTION DISABLE
    // =====================================================
    if (action === "disable") {
      const userId =
        typeof body.user_id ===
        "string"
          ? body.user_id.trim()
          : ""

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID wajib diberikan.",
          },
          400,
        )
      }

      if (
        userId ===
        currentUser.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Kamu tidak dapat menonaktifkan akunmu sendiri.",
          },
          400,
        )
      }

      const {
        error,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration:
              "876000h",
          },
        )

      if (error) {
        throw new Error(
          `Gagal menonaktifkan user: ${error.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "User berhasil dinonaktifkan.",
      })
    }

    // =====================================================
    // ACTION ENABLE
    // =====================================================
    if (action === "enable") {
      const userId =
        typeof body.user_id ===
        "string"
          ? body.user_id.trim()
          : ""

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID wajib diberikan.",
          },
          400,
        )
      }

      const {
        error,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration:
              "none",
          },
        )

      if (error) {
        throw new Error(
          `Gagal mengaktifkan user: ${error.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "User berhasil diaktifkan.",
      })
    }

    // =====================================================
    // ACTION DELETE
    // =====================================================
    if (action === "delete") {
      const userId =
        typeof body.user_id ===
        "string"
          ? body.user_id.trim()
          : ""

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID wajib diberikan.",
          },
          400,
        )
      }

      if (
        userId ===
        currentUser.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Kamu tidak dapat menghapus akunmu sendiri.",
          },
          400,
        )
      }

      // Cek apakah user masih punya tugas
      const {
        count: taskCount,
        error:
          taskCountError,
      } =
        await supabaseAdmin
          .from("tasks")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            },
          )
          .eq(
            "created_by",
            userId,
          )

      if (taskCountError) {
        throw new Error(
          `Gagal mengecek tugas user: ${taskCountError.message}`,
        )
      }

      if (
        (taskCount ?? 0) >
        0
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "User masih memiliki tugas. Hapus atau pindahkan tugas user tersebut terlebih dahulu.",
          },
          400,
        )
      }

      // Hapus Auth user
      const {
        error:
          deleteAuthError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        )

      if (deleteAuthError) {
        throw new Error(
          `Gagal menghapus akun Auth: ${deleteAuthError.message}`,
        )
      }

      // Hapus profile
      const {
        error:
          deleteProfileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq(
            "id",
            userId,
          )

      if (deleteProfileError) {
        throw new Error(
          `Akun Auth sudah dihapus, tetapi profile gagal dihapus: ${deleteProfileError.message}`,
        )
      }

      return jsonResponse({
        success: true,
        message:
          "User berhasil dihapus.",
      })
    }

    // =====================================================
    // ACTION TIDAK DIKENAL
    // =====================================================
    return jsonResponse(
      {
        success: false,
        error:
          "Action tidak dikenali.",
      },
      400,
    )
  } catch (error) {
    console.error(
      "create-user error:",
      error,
    )

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      500,
    )
  }
})