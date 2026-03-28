import mongoose, { Schema } from "mongoose";
import { INotification } from "../interfaces/notification.interface";

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_REMINDER",
        "TASK_OVERDUE",
        "SYSTEM",
        "PROFESSIONAL_CREATED",
        "PROFESSIONAL_UPDATED",
        "PROFESSIONAL_DELETED",
        "AUTOPSY_CREATED",
        "AUTOPSY_UPDATED",
        "AUTOPSY_DELETED",
        "TASK_ACCEPTED",
        "TASK_DONE",
        "TASK_APPROVED",
        "TASK_CANCELLED",
        "TASK_NEED_APPROVAL",
      ],
      required: true,
    },

    data: {
      type: Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
