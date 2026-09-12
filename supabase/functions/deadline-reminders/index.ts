import { withSupabase } from 'npm:@supabase/server@^1'

export default {
  fetch: withSupabase(
    { auth: 'secret' },
    async (_req, ctx) => {
      try {
        const supabaseAdmin = ctx.supabaseAdmin

        // =====================================================
        // AMBIL SEMUA TUGAS YANG BELUM SELESAI
        // =====================================================

        const { data: tasks, error: taskError } =
          await supabaseAdmin
            .from('tasks')
            .select(`
              id,
              created_by,
              title,
              deadline,
              status
            `)
            .neq('status', 'completed')
            .not('deadline', 'is', null)

        if (taskError) {
          console.error(
            'Gagal mengambil tugas:',
            taskError
          )

          return Response.json(
            {
              success: false,
              message:
                'Gagal mengambil data tugas.',
              error: taskError.message,
            },
            { status: 500 }
          )
        }

        if (!tasks || tasks.length === 0) {
          return Response.json({
            success: true,
            message:
              'Tidak ada tugas yang perlu diperiksa.',
            created: 0,
          })
        }

        // =====================================================
        // AMBIL NOTIFIKASI DEADLINE YANG SUDAH ADA
        // =====================================================

        const { data: existingNotifications, error: notificationError } =
          await supabaseAdmin
            .from('notifications')
            .select(`
              id,
              user_id,
              type,
              message
            `)
            .in('type', [
              'deadline_reminder',
              'deadline_due',
            ])
            .limit(10000)

        if (notificationError) {
          console.error(
            'Gagal mengambil notifikasi:',
            notificationError
          )

          return Response.json(
            {
              success: false,
              message:
                'Gagal mengambil notifikasi lama.',
              error:
                notificationError.message,
            },
            { status: 500 }
          )
        }

        // =====================================================
        // BUAT IDENTITAS NOTIFIKASI YANG SUDAH ADA
        // =====================================================

        const existingNotificationsSet =
          new Set(
            (existingNotifications || []).map(
              (notification) =>
                `${notification.user_id}|${notification.type}|${notification.message}`
            )
          )

        const now = new Date()

        const oneDay =
          24 * 60 * 60 * 1000

        const remindersToCreate = []

        // =====================================================
        // PERIKSA SETIAP TUGAS
        // =====================================================

        for (const task of tasks) {
          if (!task.deadline) {
            continue
          }

          const deadline =
            new Date(task.deadline)

          if (
            Number.isNaN(
              deadline.getTime()
            )
          ) {
            continue
          }

          const difference =
            deadline.getTime() -
            now.getTime()

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

          // ===================================================
          // H-1 / <= 24 JAM
          // ===================================================

          if (
            difference > 0 &&
            difference <= oneDay
          ) {
            const message =
              `Tugas "${task.title}" akan mencapai deadline pada ${deadlineText}.`

            const notificationKey =
              `${task.created_by}|deadline_reminder|${message}`

            if (
              !existingNotificationsSet.has(
                notificationKey
              )
            ) {
              remindersToCreate.push({
                user_id:
                  task.created_by,

                type:
                  'deadline_reminder',

                title:
                  '⏰ Deadline semakin dekat',

                message,

                is_read: false,
              })

              existingNotificationsSet.add(
                notificationKey
              )
            }
          }

          // ===================================================
          // DEADLINE SUDAH TIBA / TERLEWAT
          // ===================================================

          if (difference <= 0) {
            const message =
              `Deadline tugas "${task.title}" telah tiba atau terlewat sejak ${deadlineText}.`

            const notificationKey =
              `${task.created_by}|deadline_due|${message}`

            if (
              !existingNotificationsSet.has(
                notificationKey
              )
            ) {
              remindersToCreate.push({
                user_id:
                  task.created_by,

                type:
                  'deadline_due',

                title:
                  '🚨 Deadline tugas',

                message,

                is_read: false,
              })

              existingNotificationsSet.add(
                notificationKey
              )
            }
          }
        }

        // =====================================================
        // TIDAK ADA NOTIFIKASI BARU
        // =====================================================

        if (
          remindersToCreate.length === 0
        ) {
          return Response.json({
            success: true,
            message:
              'Tidak ada notifikasi baru.',
            checked:
              tasks.length,
            created: 0,
          })
        }

        // =====================================================
        // SIMPAN NOTIFIKASI
        // =====================================================

        const {
          data: insertedNotifications,
          error: insertError,
        } = await supabaseAdmin
          .from('notifications')
          .insert(
            remindersToCreate
          )
          .select(
            'id, user_id, type, title, message'
          )

        if (insertError) {
          console.error(
            'Gagal membuat notifikasi:',
            insertError
          )

          return Response.json(
            {
              success: false,
              message:
                'Gagal menyimpan notifikasi.',
              error:
                insertError.message,
            },
            { status: 500 }
          )
        }

        // =====================================================
        // HASIL
        // =====================================================

        console.log(
          `Deadline reminder selesai. Tugas diperiksa: ${tasks.length}. Notifikasi dibuat: ${remindersToCreate.length}.`
        )

        return Response.json({
          success: true,
          message:
            'Pengecekan deadline berhasil.',
          checked:
            tasks.length,
          created:
            insertedNotifications?.length ||
            remindersToCreate.length,
        })
      } catch (error) {
        console.error(
          'Error deadline-reminders:',
          error
        )

        return Response.json(
          {
            success: false,
            message:
              'Terjadi kesalahan pada server.',
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error',
          },
          { status: 500 }
        )
      }
    }
  ),
}