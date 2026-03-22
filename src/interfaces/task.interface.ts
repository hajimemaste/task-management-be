import { Document, ObjectId } from "mongoose";

export type TaskCategory =
  | "PARTY"
  | "MASS"
  | "DISCIPLINE"
  | "LOGISTICS"
  | "OTHER";

export type TaskStatus =
  | "ACTIVE"
  | "PENDING_APPROVAL"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE";

export type AssignmentStatus = "PENDING" | "ACCEPTED" | "DONE";

export interface ITaskAssignment {
  userId: ObjectId;

  status: AssignmentStatus;

  acceptedAt?: Date;
  completedAt?: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;

  category: TaskCategory;

  deadline: Date;

  attachments?: string;

  assignments: ITaskAssignment[];

  status: TaskStatus;

  createdBy: ObjectId;

  // 🔥 ai xác nhận
  approvedBy?: ObjectId;
  approvedAt?: Date;

  completedAt?: Date;
  cancelledAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
