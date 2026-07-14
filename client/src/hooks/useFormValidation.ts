/**
 * useFormValidation - Hook para validação inline de formulários
 *
 * Fornece validação em tempo real com debounce e mensagens de erro específicas
 */

import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "./useDebounce";

export interface ValidationRule {
  required?: boolean | string; // true ou mensagem custom
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  email?: boolean | string;
  phone?: boolean | string;
  url?: boolean | string;
  custom?: (value: string) => string | null; // retorna mensagem de erro ou null
}

export interface FieldValidation {
  error: string | null;
  isValid: boolean;
  isTouched: boolean;
  isValidating: boolean;
}

export interface FormValidation {
  [fieldName: string]: FieldValidation;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s()+-]{10,}$/;
const URL_REGEX = /^https?:\/\/.+/;

function validateField(value: string, rules: ValidationRule): string | null {
  // Required
  if (rules.required) {
    if (!value || value.trim() === "") {
      return typeof rules.required === "string" ? rules.required : "Este campo é obrigatório";
    }
  }

  // Se vazio e não required, passa
  if (!value || value.trim() === "") {
    return null;
  }

  // MinLength
  if (rules.minLength && value.length < rules.minLength.value) {
    return rules.minLength.message;
  }

  // MaxLength
  if (rules.maxLength && value.length > rules.maxLength.value) {
    return rules.maxLength.message;
  }

  // Pattern
  if (rules.pattern && !rules.pattern.value.test(value)) {
    return rules.pattern.message;
  }

  // Email
  if (rules.email && !EMAIL_REGEX.test(value)) {
    return typeof rules.email === "string" ? rules.email : "Email inválido";
  }

  // Phone
  if (rules.phone && !PHONE_REGEX.test(value)) {
    return typeof rules.phone === "string" ? rules.phone : "Telefone inválido";
  }

  // URL
  if (rules.url && !URL_REGEX.test(value)) {
    return typeof rules.url === "string" ? rules.url : "URL inválida (deve começar com http:// ou https://)";
  }

  // Custom
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) return customError;
  }

  return null;
}

export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [validation, setValidation] = useState<FormValidation>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  // Debounce values para não validar a cada tecla
  const debouncedValues = useDebounce(values, 300);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newValidation: FormValidation = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const rule = validationRules[fieldName as keyof T];
      const value = values[fieldName as keyof T];

      if (rule) {
        const error = validateField(value, rule);
        newValidation[fieldName] = {
          error,
          isValid: error === null,
          isTouched: touched[fieldName as keyof T] ?? false,
          isValidating: false,
        };
        if (error) isValid = false;
      }
    });

    setValidation(newValidation);
    return isValid;
  }, [values, validationRules, touched]);

  // Validate single field
  const validateSingleField = useCallback(
    (fieldName: keyof T) => {
      const rule = validationRules[fieldName];
      if (!rule) return true;

      const value = values[fieldName];
      const error = validateField(value, rule);

      setValidation((prev) => ({
        ...prev,
        [fieldName]: {
          error,
          isValid: error === null,
          isTouched: true,
          isValidating: false,
        },
      }));

      return error === null;
    },
    [values, validationRules]
  );

  // Validate on debounced change (only touched fields)
  useEffect(() => {
    Object.keys(debouncedValues).forEach((fieldName) => {
      if (touched[fieldName as keyof T]) {
        validateSingleField(fieldName as keyof T);
      }
    });
  }, [debouncedValues, touched, validateSingleField]);

  // Handle value change
  const handleChange = useCallback((fieldName: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Handle blur (mark as touched)
  const handleBlur = useCallback((fieldName: keyof T) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    // Validate immediately on blur
    setTimeout(() => validateSingleField(fieldName), 0);
  }, [validateSingleField]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setValidation({});
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  // Check if form has errors
  const hasErrors = Object.values(validation).some((v) => !v.isValid && v.isTouched);

  return {
    values,
    validation,
    handleChange,
    handleBlur,
    validateAll,
    validateSingleField,
    reset,
    hasErrors,
    isValid: !hasErrors,
  };
}
