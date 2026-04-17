import cron from "node-cron";
import { ProfessionalCase } from "../models/professionalCase.model";
import { sendNotificationToMany } from "../services/notification.service";

export const startProfessionalCaseCron = () => {
  cron.schedule(
    "30 7 * * *",
    async () => {
      console.log("⏰ Running professional case deadline reminder...");

      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const cases = await ProfessionalCase.find({
        "mainContent.submissionDeadline": {
          $ne: null,
          $lte: threeDaysLater,
        },
      });

      const DONE_PROGRESS = [
        "DONE_HANDOVER",
        "DONE_CONTACTED",
        "DONE_NOT_CONTACTED",
      ];

      for (const caseDoc of cases) {
        let updated = false;

        for (const item of caseDoc.mainContent) {
          if (!item.submissionDeadline) continue;
          if (DONE_PROGRESS.includes(item.progress)) continue;

          const deadline = new Date(item.submissionDeadline);

          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const startOfDeadline = new Date(deadline);
          startOfDeadline.setHours(0, 0, 0, 0);

          const diffDays = Math.round(
            (startOfDeadline.getTime() - startOfToday.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (![3, 1, 0].includes(diffDays) && diffDays >= 0) continue;

          // 🔥 chống spam
          const today = now.toDateString();
          const lastSent = item.lastReminderAt
            ? new Date(item.lastReminderAt).toDateString()
            : null;

          if (lastSent === today) continue;

          const deadlineStr = deadline.toLocaleDateString("vi-VN");

          let message = "";

          if (diffDays > 0) {
            message = `Hồ sơ "${item.content}" còn ${diffDays} ngày (hạn: ${deadlineStr})`;
          } else if (diffDays === 0) {
            message = `Hồ sơ "${item.content}" đến hạn hôm nay (${deadlineStr})`;
          } else {
            message = `Hồ sơ "${item.content}" đã quá hạn ${Math.abs(
              diffDays,
            )} ngày (hạn: ${deadlineStr})`;
          }

          const userIds = [
            ...new Set(item.officers.map((id) => id.toString())),
          ];

          if (!userIds.length) continue;

          try {
            await sendNotificationToMany({
              userIds,
              title: "Nhắc nhở hạn nộp hồ sơ",
              body: message,
              type: "PROFESSIONAL_DEADLINE_SET",
              data: {
                caseId: caseDoc._id.toString(),
                name: caseDoc.caseCode.toString(),
                month: caseDoc.caseMonth.toString(),
                year: caseDoc.caseYear.toString(),
              },
            });

            item.lastReminderAt = now;
            updated = true;
          } catch (err) {
            console.error("Send notification failed:", err);
          }
        }

        if (updated) {
          await caseDoc.save();
        }
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );
};
