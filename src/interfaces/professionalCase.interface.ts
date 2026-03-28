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

export interface ICaseItem {
  _id?: ObjectId;

  workDate: Date;
  content: string;
  traces: string[];

  officers: ObjectId[];

  caseType: CaseType;

  unit: string;
  note: string;

  progress: CaseProgress;

  imageCount?: number;
  hasImages?: boolean;

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
