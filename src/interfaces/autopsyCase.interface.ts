import { ObjectId } from "mongoose";

export type AutopsyForm = "EXTERNAL" | "INTERNAL";

export type TimeCategory = "UNDER_48H" | "FROM_48H_TO_7D" | "OVER_7D";

export type PaymentStatus = "PAID" | "UNPAID";

export const AUTOPSY_FORM_LABEL = {
  EXTERNAL: "Khám ngoài",
  INTERNAL: "Khám trong",
};

export const TIME_CATEGORY_LABEL = {
  UNDER_48H: "Dưới 48h",
  FROM_48H_TO_7D: "Từ 48h đến 7 ngày",
  OVER_7D: "Trên 7 ngày",
};

export const PAYMENT_STATUS_LABEL = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
};

export interface IAutopsyItem {
  _id?: ObjectId;

  executionDate: Date; // ngày thực hiện

  // tử thi
  corpseName: string;
  birthYear: number;

  // hình thức
  form: AutopsyForm;
  timeCategory: TimeCategory;

  // nội dung
  summary: string;

  // cán bộ
  officers: ObjectId[];

  // phân công
  hasAssignment: boolean;

  // đơn vị
  unit: string;

  // thanh toán
  paymentAmount?: number;
  paymentStatus: PaymentStatus;

  createdBy: ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAutopsyCase extends Document {
  caseMonth: number;
  caseYear: number;
  caseCode: string;

  mainContent: IAutopsyItem[];

  createdAt?: Date;
  updatedAt?: Date;
}
