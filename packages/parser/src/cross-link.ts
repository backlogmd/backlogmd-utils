import type {
  RoadmapFeature,
  FeatureFolder,
  FeatureStatus,
  Task,
  ValidationIssue,
} from "./types.js";

export interface CrossLinkResult {
  features: RoadmapFeature[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Derive a feature's status from its tasks per protocol:
 * - All tasks done → done
 * - Any task in-progress / ready-to-review / ready-to-test → in-progress
 * - Otherwise → todo
 */
function deriveFeatureStatus(tasks: Task[]): FeatureStatus {
  if (tasks.length === 0) return "todo";
  if (tasks.every((t) => t.status === "done")) return "done";
  if (
    tasks.some(
      (t) =>
        t.status === "in-progress" ||
        t.status === "ready-to-review" ||
        t.status === "ready-to-test",
    )
  ) {
    return "in-progress";
  }
  return "todo";
}

/**
 * Detect circular dependencies in the task graph.
 * Returns a list of cycles found (each as an array of task IDs).
 */
function detectCycles(tasks: Task[]): string[][] {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(taskId: string, path: string[]): void {
    if (inStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      cycles.push(path.slice(cycleStart).concat(taskId));
      return;
    }
    if (visited.has(taskId)) return;

    visited.add(taskId);
    inStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const dep of task.dependsOn) {
        dfs(dep, [...path, taskId]);
      }
    }

    inStack.delete(taskId);
  }

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      dfs(t.id, []);
    }
  }

  return cycles;
}

/**
 * Build cross-references between features and tasks, derive feature statuses,
 * and validate consistency between feature index tables and task files.
 */
export function crossLink(
  features: RoadmapFeature[],
  featureFolders: FeatureFolder[],
  tasks: Task[],
): CrossLinkResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const featureMap = new Map<string, RoadmapFeature>();
  for (const f of features) {
    featureMap.set(f.id, f);
  }

  const folderMap = new Map<string, FeatureFolder>();
  for (const ff of featureFolders) {
    folderMap.set(ff.slug, ff);
  }

  // 1. Link tasks to features and build task refs
  for (const task of tasks) {
    const feature = featureMap.get(task.featureId);
    if (!feature) {
      errors.push({
        code: "TASK_MISSING_FEATURE",
        message: `Task "${task.name}" (${task.id}) references feature ${task.featureId} which does not exist in the roadmap`,
        source: task.source,
      });
      continue;
    }
    feature.taskRefs.push(task.id);
  }

  // 2. Validate feature folder references
  for (const feature of features) {
    if (feature.featureSlug) {
      const folder = folderMap.get(feature.featureSlug);
      if (!folder) {
        errors.push({
          code: "FEATURE_MISSING_FOLDER",
          message: `Feature ${feature.id} ("${feature.name}") references folder "${feature.featureSlug}" which does not exist`,
          source: feature.source,
        });
      }
    }
  }

  // 3. Validate table-vs-file consistency
  for (const folder of featureFolders) {
    for (const stub of folder.tasks) {
      const taskId = `${folder.slug}/${stub.priority}`;
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        warnings.push({
          code: "TABLE_TASK_MISSING_FILE",
          message: `Feature "${folder.name}" task table references task ${stub.priority} ("${stub.name}") but no task file was found`,
          source: folder.source,
        });
        continue;
      }

      if (stub.status !== task.status) {
        warnings.push({
          code: "STATUS_MISMATCH",
          message: `Task ${task.id} ("${task.name}"): table says "${stub.status}" but file says "${task.status}"`,
          source: task.source,
        });
      }

      if (stub.owner !== task.owner) {
        warnings.push({
          code: "OWNER_MISMATCH",
          message: `Task ${task.id} ("${task.name}"): table says owner "${stub.owner ?? "—"}" but file says "${task.owner ?? "—"}"`,
          source: task.source,
        });
      }
    }
  }

  // 4. Derive feature status from tasks
  for (const feature of features) {
    const featureTasks = tasks.filter((t) => t.featureId === feature.id);
    feature.statusDerived = deriveFeatureStatus(featureTasks);

    if (feature.status !== feature.statusDerived) {
      warnings.push({
        code: "FEATURE_STATUS_MISMATCH",
        message: `Feature ${feature.id} ("${feature.name}"): declared status "${feature.status}" but derived status is "${feature.statusDerived}"`,
        source: feature.source,
      });
    }
  }

  // 5. Validate task dependency graph for cycles
  const cycles = detectCycles(tasks);
  for (const cycle of cycles) {
    errors.push({
      code: "CIRCULAR_DEPENDENCY",
      message: `Circular dependency detected: ${cycle.join(" → ")}`,
      source: tasks.find((t) => t.id === cycle[0])?.source ?? "",
    });
  }

  return { features, errors, warnings };
}
