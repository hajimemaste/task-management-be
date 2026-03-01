import Joi from "joi";

export const firebaseUploadSchema = Joi.object({
  secure_url: Joi.string().uri().required(),
  public_id: Joi.string().required(),
  resource_type: Joi.string().required(),
  original_filename: Joi.string().required(),
});
