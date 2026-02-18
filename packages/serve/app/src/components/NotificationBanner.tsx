import { useState, useEffect } from "react";
import type { ValidationIssue } from "../hooks/useBacklog";

export function NotificationBanner({
  errors,
  warnings,
}: {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}) {
  const [dismissedErrors, setDismissedErrors] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);

  // Reset dismissed state when new data arrives with different issues
  useEffect(() => {
    if (errors.length > 0) setDismissedErrors(false);
  }, [errors.length]);

  useEffect(() => {
    if (warnings.length > 0) setDismissedWarnings(false);
  }, [warnings.length]);

  const showErrors = errors.length > 0 && !dismissedErrors;
  const showWarnings = warnings.length > 0 && !dismissedWarnings;

  if (!showErrors && !showWarnings) return null;

  return (
    <div className="space-y-3 mb-6">
      {showErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-red-500 text-sm mt-0.5 shrink-0">&#x26A0;</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-800">
                  {errors.length} parse {errors.length === 1 ? "error" : "errors"}
                </p>
                <ul className="mt-1 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-700 leading-relaxed">
                      <span className="font-medium">{e.code}</span>
                      {e.source && (
                        <span className="text-red-500"> in {e.source}</span>
                      )}
                      <span className="block text-red-600">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setDismissedErrors(true)}
              className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded"
              aria-label="Dismiss errors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {showWarnings && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-amber-500 text-sm mt-0.5 shrink-0">&#x26A0;</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {warnings.length} {warnings.length === 1 ? "warning" : "warnings"}
                </p>
                <ul className="mt-1 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 leading-relaxed">
                      <span className="font-medium">{w.code}</span>
                      {w.source && (
                        <span className="text-amber-500"> in {w.source}</span>
                      )}
                      <span className="block text-amber-600">{w.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setDismissedWarnings(true)}
              className="text-amber-400 hover:text-amber-600 text-lg leading-none shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded"
              aria-label="Dismiss warnings"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
