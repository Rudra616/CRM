import { RequestHandler } from "express";

const trimValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(trimValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = trimValue(record[key]);
    }
  }
  return value;
};

export const trimBodyStrings: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = trimValue(req.body);
  }
  next();
};
