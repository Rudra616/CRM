
import { useState } from "react";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export const useFormValidation = <T extends Record<string, any>>() => {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validateField = (field: keyof T, value: any, validator: (val: any) => ValidationResult) => {
    const result = validator(value);
    setErrors(prev => ({ ...prev, [field]: result.valid ? undefined : result.message }));
    return result.valid;
  };

  const clearFieldError = (field: keyof T) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const resetErrors = () => setErrors({});

  const setErrorsFromValidation = (results: Record<string, ValidationResult>) => {
    const errs: Partial<Record<keyof T, string>> = {};
    for (const [field, result] of Object.entries(results)) {
      if (!result.valid && result.message) errs[field as keyof T] = result.message;
    }
    setErrors(errs);
  };

  return { errors, validateField, clearFieldError, resetErrors, setErrors, setErrorsFromValidation };
};