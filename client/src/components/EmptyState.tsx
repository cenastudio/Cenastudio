import { memo, useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateStep {
  title: string;
  description: string;
}

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  eyebrow?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  steps?: readonly EmptyStateStep[];
  footer?: ReactNode;
  className?: string;
}

const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  eyebrow,
  action,
  secondaryAction,
  steps = [],
  footer,
  className = ""
}: EmptyStateProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const isGuided = steps.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      aria-labelledby={titleId}
      className={`frame-empty-state relative overflow-hidden px-5 py-10 text-center sm:p-12 ${className}`}
    >
      {isGuided && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <motion.span
            className="block h-full w-1/3 bg-frame-orange"
            initial={false}
            animate={reduceMotion ? { x: "0%" } : { x: ["-110%", "410%"] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 3.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.6 }}
          />
        </div>
      )}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-frame-orange/30 bg-frame-orange/10"
      >
        <Icon className="h-7 w-7 text-frame-orange" aria-hidden="true" />
        {isGuided && (
          <div aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 flex gap-0.5 border border-frame-orange/30 bg-frame-black px-1 py-1">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="block h-1 w-1 bg-frame-orange"
                initial={false}
                animate={reduceMotion ? { opacity: 0.75 } : { opacity: [0.25, 1, 0.25] }}
                transition={reduceMotion ? { duration: 0 } : { duration: 1.8, delay: index * 0.18, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {eyebrow && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
          className="mb-2 font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange"
        >
          {eyebrow}
        </motion.p>
      )}

      <motion.h2
        id={titleId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={isGuided ? "mb-2 text-xl font-bold text-frame-white sm:text-2xl" : "mb-1 text-sm font-medium text-frame-white"}
      >
        {title}
      </motion.h2>

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-frame-gray-light text-sm leading-relaxed mb-5 max-w-md mx-auto"
        >
          {description}
        </motion.p>
      )}

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2"
        >
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="frame-btn-primary inline-flex items-center gap-2 text-sm"
            >
              {action.icon && <action.icon className="h-4 w-4" aria-hidden="true" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="frame-btn-ghost inline-flex items-center gap-2 text-sm"
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" aria-hidden="true" />}
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}

      {isGuided && (
        <div data-testid="empty-state-steps" className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + index * 0.08, duration: 0.28 }}
              className="border border-frame-gray-3/70 bg-frame-black/20 p-4"
            >
              <span className="mb-2 block font-frame-mono text-[0.6rem] tracking-[0.14em] text-frame-orange">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-sm font-semibold text-frame-white">{step.title}</p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-frame-gray-light">{step.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {footer && <div className="mx-auto mt-6 max-w-lg">{footer}</div>}
    </motion.section>
  );
});

export default EmptyState;
