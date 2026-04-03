import { Document, ObjectId } from "mongoose";

export type NotificationType =
  | "SYSTEM"
  | "PROFESSIONAL_CREATED"
  | "PROFESSIONAL_UPDATED"
  | "PROFESSIONAL_DELETED"
  | "PROFESSIONAL_DEADLINE_SET"
  | "AUTOPSY_CREATED"
  | "AUTOPSY_UPDATED"
  | "AUTOPSY_DELETED"
  | "TASK_ASSIGNED"
  | "TASK_ACCEPTED"
  | "TASK_DONE"
  | "TASK_APPROVED"
  | "TASK_CANCELLED"
  | "TASK_NEED_APPROVAL"
  | "TASK_REMINDER"
  | "TASK_UPDATED";

export interface INotification extends Document {
  userId: ObjectId;

  title: string;
  body: string;

  type: NotificationType;

  data?: {
    taskId?: string;
    [key: string]: any;
  };

  isRead: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
