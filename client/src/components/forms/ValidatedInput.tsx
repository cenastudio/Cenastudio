/**
 * ValidatedInput - Input com validação inline e autocomplete
 *
 * Exibe erro embaixo do campo, sugere valores anteriores
 */

import { useState, useRef, useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FieldValidation } from "@/hooks/useFormValidation";

interface ValidatedInputProps {
  type?: "text" | "email" | "tel" | "url" | "number" | "password";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  validation?: FieldValidation;
  suggestions?: string[];
  onSelectSuggestion?: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedInput({
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  validation,
  suggestions = [],
  onSelectSuggestion,
  label,
  required,
  className = "",
}: ValidatedInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const hasError = validation && validation.isTouched && !validation.isValid;
  const isSuccess = validation && validation.isTouched && validation.isValid && value.trim() !== "";
  const showValidation = validation && validation.isTouched;

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    onBlur?.();
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block font-frame-mono text-xs text-frame-orange uppercase mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full bg-frame-gray-2 border px-3 py-2 text-sm outline-none transition-colors
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
            className="absolute right-3 top-1/2 -translate-y-1/2"
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

      {/* Autocomplete suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-frame-black border border-frame-gray-3 shadow-lg max-h-48 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${index === selectedIndex ? "bg-frame-orange/20 text-frame-white" : "text-frame-gray-light hover:bg-frame-gray-1/30 hover:text-frame-white"}
                `}
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
