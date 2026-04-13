import cron from "node-cron";
import { Task } from "../models/task.model";
import { sendNotificationToMany } from "../services/notification.service";
import { NotificationType } from "../interfaces/notification.interface";

export const startTaskCron = () => {
  cron.schedule(
    "30 7 * * *",
    async () => {
      console.log("⏰ Running task deadline cron...");

      const now = new Date();

      try {
        // =======================
        // 🔥 1. UPDATE OVERDUE (BATCH)
        // =======================
        await Task.updateMany(
          {
            status: { $in: ["ACTIVE", "PENDING_APPROVAL"] },
            deadline: { $lt: now },
          },
          {
            $set: { status: "OVERDUE" },
          },
        );

        // =======================
        // 🔥 2. LẤY TASKS CẦN NOTIFY
        // =======================
        const tasks = await Task.find({
          status: { $in: ["ACTIVE", "PENDING_APPROVAL", "OVERDUE"] },
        });

        for (const task of tasks) {
          const deadline = new Date(task.deadline);

          const diffTime = deadline.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // =======================
          // 🔥 3. BUILD MESSAGE
          // =======================
          let message = "";

          if (diffDays > 0) {
            message = `${task.title} còn ${diffDays} ngày`;
          } else if (diffDays === 0) {
            message = `${task.title} đến hạn hôm nay`;
          } else {
            message = `${task.title} đã quá hạn ${Math.abs(diffDays)} ngày`;
          }

          // =======================
          // 🔥 4. CHỐNG SPAM (1 NGÀY 1 LẦN)
          // =======================
          const today = now.toDateString();

          const lastSent = task.lastReminderAt
            ? new Date(task.lastReminderAt).toDateString()
            : null;

          if (lastSent === today) continue;

          // =======================
          // 🔥 5. PHÂN LOẠI NOTIFICATION
          // =======================
          let userIds: string[] = [];
          let type = "TASK_REMINDER" as NotificationType;
          let title = "Nhắc nhở nhiệm vụ";

          // 👉 ACTIVE + OVERDUE → gửi cho members
          if (["ACTIVE", "OVERDUE"].includes(task.status)) {
            userIds = task.assignments.map((a) => a.userId.toString());
          }

          // 👉 PENDING_APPROVAL → gửi admin
          if (task.status === "PENDING_APPROVAL") {
            userIds = [task.createdBy.toString()];
            type = "TASK_NEED_APPROVAL";
            title = "Cần duyệt nhiệm vụ";
          }

          // 👉 OVERDUE → override
          if (task.status === "OVERDUE") {
            type = "TASK_REMINDER";
            title = "Nhiệm vụ đã trễ hạn";
          }

          // =======================
          // 🔔 6. GỬI NOTIFICATION
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

            // =======================
            // 🔥 7. UPDATE LAST SENT
            // =======================
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
