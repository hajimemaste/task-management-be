import mongoose, { Schema } from "mongoose";
import { ITask } from "../interfaces/task.interface";

// =======================
// 🔹 Assignment Schema
// =======================

const AssignmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DONE"],
      default: "PENDING",
    },

    acceptedAt: Date,
    completedAt: Date,
  },
  { _id: false },
);

// =======================
// 🔹 Task Schema
// =======================

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },

    description: String,

    category: {
      type: String,
      enum: ["PARTY", "MASS", "DISCIPLINE", "LOGISTICS", "OTHER"],
      required: true,
    },

    deadline: {
      type: Date,
      required: true,
    },

    // 🔥 Dropbox folder
    attachments: {
      type: String,
    },

    assignments: {
      type: [AssignmentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING_APPROVAL", "COMPLETED", "CANCELLED", "OVERDUE"],
      default: "ACTIVE",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,

    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  },
);

// =======================
// 🔥 Index
// =======================

TaskSchema.index({ deadline: 1 });
TaskSchema.index({ "assignments.userId": 1 });

export const Task = mongoose.model<ITask>("Task", TaskSchema);
