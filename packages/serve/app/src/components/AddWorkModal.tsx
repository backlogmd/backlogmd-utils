import { useState, useRef, useEffect } from "react";
import { WORK_ITEM_TEMPLATE } from "../constants";

function getFocusables(container: HTMLElement): HTMLElement[] {
  const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

export function AddWorkModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (content: string) => void;
}) {
  const [content, setContent] = useState(WORK_ITEM_TEMPLATE);
  const [showNotImplemented, setShowNotImplemented] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = () => {
    if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
    onClose();
  };

  // Focus trap, restore focus, focus textarea on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = modalRef.current && getFocusables(modalRef.current)[0];
    if (firstFocusable) firstFocusable.focus();
    else textareaRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusables = getFocusables(modalRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
    };
  }, [onClose]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setShowNotImplemented(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Add Work</h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none p-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          {showNotImplemented && (
            <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">
              Not implemented yet. Adding work from this dialog is not available.
            </p>
          )}
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Work item template
          </label>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 rounded-lg border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-800 placeholder:text-slate-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            {showNotImplemented ? "Close" : "Cancel"}
          </button>
          {!showNotImplemented && (
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
