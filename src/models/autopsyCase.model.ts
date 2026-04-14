import mongoose, { Schema } from "mongoose";
import { IAutopsyCase } from "../interfaces/autopsyCase.interface";

// =======================
// 🔹 Item schema
// =======================

const AutopsyItemSchema = new Schema(
  {
    executionDate: { type: Date, required: true },

    corpseName: { type: String, required: true },
    birthYear: { type: Number },

    form: {
      type: String,
      enum: ["EXTERNAL", "INTERNAL"],
      required: true,
    },

    timeCategory: {
      type: String,
      enum: ["UNDER_48H", "FROM_48H_TO_7D", "OVER_7D"],
      required: true,
    },

    summary: { type: String },

    officers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    hasAssignment: {
      type: Boolean,
      default: false,
    },

    unit: { type: String },

    participants: {
      type: String,
    },

    paymentAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID"],
      default: "UNPAID",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// =======================
// 🔹 Main schema (1 tháng)
// =======================

const AutopsyCaseSchema = new Schema<IAutopsyCase>(
  {
    caseMonth: {
      type: Number,
      required: true,
      index: true,
    },

    caseYear: {
      type: Number,
      required: true,
      index: true,
    },

    caseCode: {
      type: String,
      required: true,
    },

    mainContent: {
      type: [AutopsyItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// =======================
// 🔥 Unique 1 tháng
// =======================

AutopsyCaseSchema.index({ caseMonth: 1, caseYear: 1 }, { unique: true });

export const AutopsyCase = mongoose.model<IAutopsyCase>(
  "AutopsyCase",
  AutopsyCaseSchema,
);
