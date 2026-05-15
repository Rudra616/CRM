import Joi from "joi";

const trimmedString = () => Joi.string().trim();

export const createBroadcastSchema = Joi.object({
  message: trimmedString().min(1).max(8000).required().messages({
    "string.empty": "Message is required",
    "string.min": "Message cannot be empty",
    "string.max": "Message is too long",
  }),
});
