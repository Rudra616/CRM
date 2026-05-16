import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorResponse } from "../utils/apiResponse";
/**
 * Creates a request body validation middleware using a Joi schema.
 *
 * Validates incoming request body and returns a 400 error if validation fails.
 * If valid, replaces request body with the sanitized value.
 *
 * @param schema Joi validation schema used to validate request body
 * @returns Express middleware function for request validation
 */
export const validateSchema = (schema: Joi.ObjectSchema) => {       //It accepts a Joi.ObjectSchema (a Joi validation schema)
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body || {}, {
      abortEarly: true, //Stops validation as soon as the first error is found
      allowUnknown: true, //extra fields are allowed in the body
    });
    if (error) {
      return errorResponse(res, error.details?.[0]?.message || "Validation failed", 400);
    }
    req.body = value;
    next();
  };
};