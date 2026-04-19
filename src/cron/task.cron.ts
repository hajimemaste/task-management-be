import cron from "node-cron";
import { Task } from "../models/task.model";
import { sendNotificationToMany } from "../services/notification.service";
import { NotificationType } from "../interfaces/notification.interface";

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const startTaskCron = () => {
  cron.schedule(
    "30 7 * * *",
    async () => {
      console.log("⏰ Running task deadline cron...");

      const now = new Date();
      const today = startOfDay(now);

      try {
        // =======================
        // 🔥 1. UPDATE OVERDUE (SO THEO NGÀY)
        // =======================
        await Task.updateMany(
          {
            status: "ACTIVE",
            deadline: { $lt: today }, // ✅ chỉ so ngày
          },
          {
            $set: { status: "OVERDUE" },
          },
        );

        // =======================
        // 🔥 2. LẤY TASK
        // =======================
        const tasks = await Task.find({
          status: { $in: ["ACTIVE", "PENDING_APPROVAL", "OVERDUE"] },
        });

        for (const task of tasks) {
          const deadline = startOfDay(new Date(task.deadline));

          const diffDays = Math.floor(
            (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          // =======================
          // 🔥 3. BUILD MESSAGE
          // =======================
          let message = "";

          if (diffDays > 0) {
            message = `${task.title} còn ${diffDays} ngày`;
          } else if (diffDays === 0) {
            message = `${task.title} cần báo cáo hôm nay`;
          } else {
            const overdueDays = Math.abs(diffDays);

            // 🔥 CHỈ gửi 1 lần khi vừa quá hạn
            if (overdueDays !== 1) continue;

            message = `${task.title} đã quá hạn ${overdueDays} ngày`;
          }

          // =======================
          // 🔥 4. CHỐNG SPAM
          // =======================
          const todayStr = today.toDateString();

          const lastSent = task.lastReminderAt
            ? new Date(task.lastReminderAt).toDateString()
            : null;

          if (lastSent === todayStr) continue;

          // =======================
          // 🔥 5. PHÂN LOẠI
          // =======================
          let userIds: string[] = [];
          let type: NotificationType = "TASK_REMINDER";
          let title = "Nhắc nhở nhiệm vụ";

          if (task.status === "PENDING_APPROVAL") {
            userIds = [task.createdBy.toString()];
            type = "TASK_NEED_APPROVAL";
            title = "Cần duyệt nhiệm vụ";
          } else if (task.status === "ACTIVE") {
            userIds = task.assignments.map((a) => a.userId.toString());
          } else if (task.status === "OVERDUE") {
            const memberIds = task.assignments.map((a) => a.userId.toString());
            const adminId = task.createdBy.toString();

            userIds = [...new Set([...memberIds, adminId])];

            type = "TASK_REMINDER";
            title = "Nhiệm vụ đã trễ hạn";
          }

          // =======================
          // 🔔 6. SEND
          // =======================
          if (userIds.length) {
            await sendNotificationToMany({
              userIds,
              title,
              body: message,
              type,
              data: {
                taskId: task._id.toString(),
                deadline: task.deadline.toString(),
                status: task.status,
              },
            });

            task.lastReminderAt = now;
            await task.save();
          }
        }
      } catch (err) {
        console.error("❌ Task cron error:", err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );
};
