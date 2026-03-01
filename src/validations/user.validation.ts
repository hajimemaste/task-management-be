import Joi from "joi";

export const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),

  avatar: Joi.string().uri().optional(),
});

export const adminUserUpdateSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});
