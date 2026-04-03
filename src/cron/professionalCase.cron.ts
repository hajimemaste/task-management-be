import cron from "node-cron";
import { ProfessionalCase } from "../models/professionalCase.model";
import { sendNotificationToMany } from "../services/notification.service";

export const startProfessionalCaseCron = () => {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("⏰ Running professional case deadline reminder...");

      const now = new Date();

      const cases = await ProfessionalCase.find({
        "mainContent.submissionDeadline": { $ne: null },
      });

      for (const caseDoc of cases) {
        for (const item of caseDoc.mainContent) {
          if (!item.submissionDeadline) continue;

          const deadline = new Date(item.submissionDeadline);

          const diffTime = deadline.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // 🔥 UX: giống Task (tránh spam vô nghĩa)
          if (![3, 1, 0].includes(diffDays) && diffDays >= 0) continue;

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
              userIds: userIds,
              title: "Nhắc nhở hạn nộp hồ sơ",
              body: message,
              type: "PROFESSIONAL_DEADLINE_SET",
              data: {
                caseId: caseDoc._id.toString(),
                type: "PROFESSIONAL_DEADLINE_SET",
                name: caseDoc.caseCode.toString(),
                month: caseDoc.caseMonth.toString(),
                year: caseDoc.caseYear.toString(),
              },
            });
          } catch (err) {
            console.error("Send notification failed:", err);
          }
        }
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );
};
