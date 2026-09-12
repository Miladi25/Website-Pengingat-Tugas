import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  const panelRef = useRef(null)

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  const fetchNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setNotifications([])
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(50)

    if (error) {
      console.error(
        'Gagal mengambil notifikasi:',
        error
      )
      return
    }

    setNotifications(data || [])
  }

  // =========================================================
  // CHECK REMINDERS
  // =========================================================

  const checkTaskReminders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const { data: tasks, error: taskError } =
      await supabase
        .from('tasks')
        .select(`
          id,
          title,
          deadline,
          status
        `)
        .eq('created_by', user.id)
        .neq('status', 'completed')
        .not('deadline', 'is', null)

    if (taskError) {
      console.error(
        'Gagal memeriksa deadline:',
        taskError
      )
      return
    }

    if (!tasks || tasks.length === 0) {
      return
    }

    // Ambil notifikasi deadline yang sudah pernah dibuat.
    // Tabel notifications tidak mempunyai task_id,
    // jadi message digunakan sebagai identitas.
    const {
      data: existingNotifications,
      error: notificationError,
    } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        message
      `)
      .eq('user_id', user.id)
      .in('type', [
        'deadline_reminder',
        'deadline_due',
      ])
      .limit(500)

    if (notificationError) {
      console.error(
        'Gagal mengambil notifikasi lama:',
        notificationError
      )
      return
    }

    const existingMessages = new Set(
      (existingNotifications || []).map(
        (notification) =>
          notification.message
      )
    )

    const now = new Date()

    const remindersToCreate = []

    tasks.forEach((task) => {
      if (!task.deadline) {
        return
      }

      const deadline = new Date(task.deadline)

      if (Number.isNaN(deadline.getTime())) {
        return
      }

      const difference =
        deadline.getTime() -
        now.getTime()

      const oneDay =
        24 * 60 * 60 * 1000

      // =====================================================
      // H-1
      // =====================================================

      if (
        difference > 0 &&
        difference <= oneDay
      ) {
        const deadlineText =
          deadline.toLocaleString(
            'id-ID',
            {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          )

        const message =
          `Tugas "${task.title}" akan mencapai deadline pada ${deadlineText}.`

        if (!existingMessages.has(message)) {
          remindersToCreate.push({
            user_id: user.id,
            type: 'deadline_reminder',
            title: '⏰ Deadline semakin dekat',
            message,
            is_read: false,
          })

          existingMessages.add(message)
        }
      }

      // =====================================================
      // DEADLINE SUDAH TIBA / TERLEWAT
      // =====================================================

      if (difference <= 0) {
        const deadlineText =
          deadline.toLocaleString(
            'id-ID',
            {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          )

        const message =
          `Deadline tugas "${task.title}" telah tiba atau terlewat sejak ${deadlineText}.`

        if (!existingMessages.has(message)) {
          remindersToCreate.push({
            user_id: user.id,
            type: 'deadline_due',
            title: '🚨 Deadline tugas',
            message,
            is_read: false,
          })

          existingMessages.add(message)
        }
      }
    })

    // =====================================================
    // INSERT NOTIFIKASI
    // =====================================================

    if (remindersToCreate.length === 0) {
      return
    }

    const { error: insertError } =
      await supabase
        .from('notifications')
        .insert(remindersToCreate)

    if (insertError) {
      console.error(
        'Gagal membuat pengingat:',
        insertError
      )
      return
    }

    await fetchNotifications()
  }

  // =========================================================
  // LOAD AWAL
  // =========================================================

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      setLoading(true)

      await checkTaskReminders()

      if (mounted) {
        await fetchNotifications()
        setLoading(false)
      }
    }

    initialize()

    // Cek pengingat setiap 1 menit
    const reminderInterval =
      setInterval(() => {
        checkTaskReminders()
      }, 60 * 1000)

    // Refresh notifikasi setiap 30 detik
    const notificationInterval =
      setInterval(() => {
        fetchNotifications()
      }, 30 * 1000)

    return () => {
      mounted = false
      clearInterval(reminderInterval)
      clearInterval(notificationInterval)
    }
  }, [])

  // =========================================================
  // CLOSE PANEL WHEN CLICK OUTSIDE
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(
          event.target
        )
      ) {
        setShowPanel(false)
      }
    }

    if (showPanel) {
      document.addEventListener(
        'mousedown',
        handleClickOutside
      )
    }

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [showPanel])

  // =========================================================
  // MARK AS READ
  // =========================================================

  const markAsRead = async (notification) => {
    if (notification.is_read) {
      return
    }

    setProcessingId(notification.id)

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notification.id)

    if (error) {
      console.error(
        'Gagal menandai notifikasi:',
        error
      )

      setProcessingId(null)
      return
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    )

    setProcessingId(null)
  }

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    setProcessingId('all')

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error(
        'Gagal menandai semua notifikasi:',
        error
      )

      setProcessingId(null)
      return
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      }))
    )

    setProcessingId(null)
  }

  // =========================================================
  // DELETE NOTIFICATION
  // =========================================================

  const deleteNotification = async (
    notificationId
  ) => {
    setProcessingId(notificationId)

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error(
        'Gagal menghapus notifikasi:',
        error
      )

      setProcessingId(null)
      return
    }

    setNotifications((current) =>
      current.filter(
        (item) =>
          item.id !== notificationId
      )
    )

    setProcessingId(null)
  }

  // =========================================================
  // HELPERS
  // =========================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length

  const formatNotificationDate = (
    createdAt
  ) => {
    if (!createdAt) {
      return ''
    }

    const date = new Date(createdAt)

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

  const getNotificationStyle = (type) => {
    if (type === 'deadline_due') {
      return {
        icon: '🚨',
        iconClass:
          'bg-red-500/10 text-red-400',
      }
    }

    if (
      type === 'deadline_reminder'
    ) {
      return {
        icon: '⏰',
        iconClass:
          'bg-yellow-500/10 text-yellow-400',
      }
    }

    return {
      icon: '🔔',
      iconClass:
        'bg-violet-500/10 text-violet-400',
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      ref={panelRef}
      className="
        fixed
        right-5
        bottom-5
        z-[100]
      "
    >
      {/* ===================================================
          BELL
          Dipindahkan ke kanan bawah agar tidak menutupi
          tombol/header di semua halaman.
          =================================================== */}

      <button
        type="button"
        onClick={() =>
          setShowPanel((current) => !current)
        }
        className="
          relative
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          border
          border-slate-700
          bg-slate-900/95
          text-xl
          shadow-xl
          backdrop-blur
          transition
          hover:border-violet-500
          hover:bg-slate-800
        "
        aria-label="Notifikasi"
      >
        🔔

        {unreadCount > 0 && (
          <span
            className="
              absolute
              -right-1
              -top-1
              flex
              min-h-5
              min-w-5
              items-center
              justify-center
              rounded-full
              border-2
              border-slate-950
              bg-red-500
              px-1
              text-[10px]
              font-bold
              text-white
            "
          >
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {/* ===================================================
          PANEL
          Panel muncul ke ATAS karena bell sekarang berada
          di kanan bawah.
          =================================================== */}

      {showPanel && (
        <div
          className="
            absolute
            bottom-full
            right-0
            mb-3
            w-[calc(100vw-2rem)]
            max-w-md
            overflow-hidden
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            shadow-2xl
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-800
              px-4
              py-4
            "
          >
            <div>
              <h2 className="font-bold text-white">
                Notifikasi
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Pengingat tugas dan aktivitas
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={
                  processingId === 'all'
                }
                className="
                  text-xs
                  font-medium
                  text-violet-400
                  transition
                  hover:text-violet-300
                  disabled:opacity-50
                "
              >
                {processingId === 'all'
                  ? 'Memproses...'
                  : 'Tandai semua dibaca'}
              </button>
            )}
          </div>

          {/* CONTENT */}

          <div className="max-h-[70vh] overflow-y-auto">
            {loading &&
              notifications.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <div
                    className="
                      mx-auto
                      mb-3
                      h-7
                      w-7
                      animate-spin
                      rounded-full
                      border-2
                      border-violet-500/30
                      border-t-violet-500
                    "
                  />

                  <p className="text-sm text-slate-500">
                    Memuat notifikasi...
                  </p>
                </div>
              )}

            {!loading &&
              notifications.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <div className="mb-3 text-4xl">
                    🔕
                  </div>

                  <h3 className="font-semibold text-slate-300">
                    Belum ada notifikasi
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Pengingat deadline akan muncul
                    di sini.
                  </p>
                </div>
              )}

            <div className="divide-y divide-slate-800">
              {notifications.map(
                (notification) => {
                  const style =
                    getNotificationStyle(
                      notification.type
                    )

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition ${
                        notification.is_read
                          ? 'bg-slate-900'
                          : 'bg-violet-500/[0.04]'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* ICON */}

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${style.iconClass}
                          `}
                        >
                          {style.icon}
                        </div>

                        {/* BODY */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`
                                text-sm
                                font-semibold
                                ${
                                  notification.is_read
                                    ? 'text-slate-300'
                                    : 'text-white'
                                }
                              `}
                            >
                              {notification.title}
                            </h3>

                            {!notification.is_read && (
                              <span
                                className="
                                  mt-1
                                  h-2
                                  w-2
                                  shrink-0
                                  rounded-full
                                  bg-violet-500
                                "
                              />
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {notification.message}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-600">
                              {formatNotificationDate(
                                notification.created_at
                              )}
                            </span>

                            <div className="flex gap-2">
                              {!notification.is_read && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    markAsRead(
                                      notification
                                    )
                                  }
                                  disabled={
                                    processingId ===
                                    notification.id
                                  }
                                  className="
                                    text-[11px]
                                    font-medium
                                    text-violet-400
                                    transition
                                    hover:text-violet-300
                                    disabled:opacity-50
                                  "
                                >
                                  Baca
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  deleteNotification(
                                    notification.id
                                  )
                                }
                                disabled={
                                  processingId ===
                                  notification.id
                                }
                                className="
                                  text-[11px]
                                  font-medium
                                  text-slate-600
                                  transition
                                  hover:text-red-400
                                  disabled:opacity-50
                                "
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell