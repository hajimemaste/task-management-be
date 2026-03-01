import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

type RequestSource = "body" | "query" | "params";

const validate = (schema: ObjectSchema, source: RequestSource = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    let data = req[source];
    if (source === "body" && typeof data === "object" && data !== null) {
      const { _id, createdAt, updatedAt, __v, isDelete, ...cleanData } = data;
      data = cleanData;
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      console.warn("🔶 Joi validation error:", error.details);
      return res.status(400).json({
        message: "Validation error",
        details: error.details.map((detail) => detail.message),
      });
    }

    req[source] = value;

    next();
  };
};

export default validate;
