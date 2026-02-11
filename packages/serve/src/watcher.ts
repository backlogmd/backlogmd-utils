import { watch, type FSWatcher } from "node:fs";

export interface WatchOptions {
  debounceMs?: number;
  onError?: (error: Error) => void;
}

export function watchBacklogDir(
  dirPath: string,
  onChange: () => void,
  options: WatchOptions = {},
): FSWatcher {
  const { debounceMs = 300, onError } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;

  const scheduleCallback = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      onChange();
    }, debounceMs);
  };

  watcher = watch(dirPath, { recursive: true }, (eventType, fileName) => {
    if (fileName && (fileName.endsWith(".md") || fileName.endsWith(".MD"))) {
      scheduleCallback();
    }
  });

  watcher.on("error", (error) => {
    if (onError) {
      onError(error);
    }
  });

  return watcher;
}
