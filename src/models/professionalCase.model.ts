import mongoose, { Schema } from "mongoose";
import { IProfessionalCase } from "../interfaces/professionalCase.interface";

const CaseItemSchema = new Schema(
  {
    workDate: { type: Date, required: true },

    content: { type: String, required: true },
    traces: { type: String, default: "" },

    officers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    caseType: {
      type: String,
      enum: [
        "TNGT",
        "TNLĐ",
        "CYGTT",
        "OTHER_DEATH",
        "DRUG",
        "RAPE",
        "MURDER",
        "THEFT",
        "OTHER",
      ],
      required: true,
    },

    unit: { type: String, default: "" },
    note: { type: String, default: "" },

    progress: {
      type: String,
      enum: [
        "DONE_HANDOVER",
        "DONE_CONTACTED",
        "DONE_NOT_CONTACTED",
        "PENDING",
      ],
      default: "PENDING",
    },

    imageCount: { type: Number, default: 0 },
    hasImages: { type: Boolean, default: false },

    participants: {
      type: String,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    submissionDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// 🔥 Schema chính (1 tháng)
const ProfessionalCaseSchema = new Schema<IProfessionalCase>(
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
      type: [CaseItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

ProfessionalCaseSchema.index({ caseMonth: 1, caseYear: 1 }, { unique: true });

export const ProfessionalCase = mongoose.model<IProfessionalCase>(
  "ProfessionalCase",
  ProfessionalCaseSchema,
);
