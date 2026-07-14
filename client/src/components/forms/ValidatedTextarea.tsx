/**
 * ValidatedTextarea - Textarea com validação inline
 */

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FieldValidation } from "@/hooks/useFormValidation";

interface ValidatedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  validation?: FieldValidation;
  label?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}

export function ValidatedTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  validation,
  label,
  required,
  rows = 3,
  className = "",
}: ValidatedTextareaProps) {
  const hasError = validation && validation.isTouched && !validation.isValid;
  const isSuccess = validation && validation.isTouched && validation.isValid && value.trim() !== "";
  const showValidation = validation && validation.isTouched;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block font-frame-mono text-xs text-frame-orange uppercase mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`
            w-full bg-frame-gray-2 border px-3 py-2 text-sm outline-none transition-colors resize-none
            ${hasError ? "border-red-400 focus:border-red-500" : ""}
            ${isSuccess ? "border-green-400 focus:border-green-500" : ""}
            ${!hasError && !isSuccess ? "border-frame-gray-3 focus:border-frame-orange" : ""}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        />

        {/* Validation icon */}
        {showValidation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-3 top-3"
          >
            {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          </motion.div>
        )}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {hasError && validation.error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-red-400 mt-1 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {validation.error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
