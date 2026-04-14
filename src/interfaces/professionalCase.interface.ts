import { Document, ObjectId } from "mongoose";

export type CaseType =
  | "TNGT"
  | "TNLĐ"
  | "CYGTT"
  | "OTHER_DEATH"
  | "DRUG"
  | "RAPE"
  | "MURDER"
  | "THEFT"
  | "OTHER";

export type CaseProgress =
  | "DONE_HANDOVER"
  | "DONE_CONTACTED"
  | "DONE_NOT_CONTACTED"
  | "PENDING";

export const CASE_PROGRESS_LABEL = {
  DONE_HANDOVER: "Đã hoàn thành và bàn giao",
  DONE_CONTACTED: "Đã hoàn thành và liên hệ với ĐTV",
  DONE_NOT_CONTACTED: "Đã hoàn thành và chưa liên được với ĐTV",
  PENDING: "Đang chờ",
};

export const CASE_TYPE_LABEL = {
  TNGT: "TNGT",
  TNLĐ: "TNLĐ",
  CYGTT: "CYGTT",
  OTHER_DEATH: "Chết do NN khác",
  DRUG: "Ma tuý",
  RAPE: "Hiếp dâm",
  MURDER: "Giết người",
  THEFT: "TCTS",
  OTHER: "Hiện trường khác",
};

export interface ICaseItem {
  _id?: ObjectId;

  workDate: Date;
  content: string;
  traces: string;

  officers: ObjectId[];

  caseType: CaseType;

  unit: string;
  note: string;

  progress: CaseProgress;

  imageCount?: number;
  hasImages?: boolean;

  // 👉 NEW FIELD
  submissionDeadline?: Date;
  participants?: string;

  createdBy: ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProfessionalCase extends Document {
  caseMonth: number;
  caseYear: number;
  caseCode: string;

  mainContent: ICaseItem[];

  createdAt?: Date;
  updatedAt?: Date;
}
