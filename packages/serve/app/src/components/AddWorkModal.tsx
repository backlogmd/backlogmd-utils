import { useState, useRef, useEffect } from "react";

export function AddWorkModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (content: string) => void;
}) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Add Work</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Paste backlogmd template
          </label>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"<!-- METADATA -->\n\n```\nTask: My Task\nStatus: open\nPriority: 001\n```\n\n<!-- /METADATA -->"}
            className="w-full h-64 rounded-lg border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-800 placeholder:text-slate-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
