import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorResponse } from "../utils/apiResponse";
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body || {}, {
      abortEarly: true,
      allowUnknown: true,
    });
    if (error) {
      return errorResponse(res, error.details?.[0]?.message || "Validation failed", 400);
    }
    req.body = value;
    next();
  };
};