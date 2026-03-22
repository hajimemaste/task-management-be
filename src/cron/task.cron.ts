import cron from "node-cron";
import { Task } from "../models/task.model";
import { sendNotificationToMany } from "../services/notification.service";

export const startTaskCron = () => {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("⏰ Running task deadline reminder...");

      const now = new Date();

      const tasks = await Task.find({
        status: { $in: ["ACTIVE", "PENDING_APPROVAL"] },
      });

      for (const task of tasks) {
        const deadline = new Date(task.deadline);

        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let message = "";

        if (diffDays > 0) {
          message = `${task.title} còn ${diffDays} ngày`;
        } else if (diffDays === 0) {
          message = `${task.title} đến hạn hôm nay`;
        } else {
          message = `${task.title} đã quá hạn ${Math.abs(diffDays)} ngày`;
        }

        // =======================
        // 🔥 PHÂN NHÓM NGƯỜI NHẬN
        // =======================

        let userIds: string[] = [];

        if (task.status === "ACTIVE") {
          // 👉 gửi cho members
          userIds = task.assignments.map((a) => a.userId.toString());
        }

        if (task.status === "PENDING_APPROVAL") {
          // 👉 gửi cho admin
          userIds = [task.createdBy.toString()];
        }

        // =======================
        // 🔔 GỬI NOTIFICATION
        // =======================

        if (userIds.length) {
          await sendNotificationToMany({
            userIds,
            title:
              task.status === "PENDING_APPROVAL"
                ? "Cần duyệt nhiệm vụ"
                : "Nhắc nhở nhiệm vụ",
            body: message,
            type:
              task.status === "PENDING_APPROVAL"
                ? "TASK_NEED_APPROVAL"
                : "TASK_REMINDER",
            data: {
              taskId: task._id.toString(),
              deadline: task.deadline.toString(),
              status: task.status,
            },
          });
        }
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );
};
