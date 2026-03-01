import { Schema } from "mongoose";

export const FirebaseUploadSchema = new Schema(
  {
    secure_url: { type: String, required: true },
    public_id: { type: String, required: true },
    resource_type: { type: String, required: true },
    original_filename: { type: String, required: true },
  },
  { _id: false }, // không tạo _id riêng cho subdocument này
);
