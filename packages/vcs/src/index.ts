export interface VCSCommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export interface CreatePullRequestResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface VCSStatusResult {
  isClean: boolean;
  modified: string[];
  untracked: string[];
  staged: string[];
}

export interface VCSProvider {
  /**
   * Get the current status of the repository
   */
  status(): Promise<VCSStatusResult>;

  /**
   * Stage specific files for commit
   */
  stage(files: string[]): Promise<void>;

  /**
   * Stage all changes
   */
  stageAll(): Promise<void>;

  /**
   * Commit staged changes with a message
   */
  commit(message: string): Promise<VCSCommitResult>;

  /**
   * Check if the directory is a valid repository
   */
  isRepo(): Promise<boolean>;

  /**
   * Get the root directory of the repository
   */
  getRoot(): string;

  /**
   * Push changes to remote (optional)
   */
  push?(): Promise<{ success: boolean; error?: string }>;

  /**
   * Pull changes from remote (optional)
   */
  pull?(): Promise<{ success: boolean; error?: string }>;
}

export interface VCSOptions {
  /**
   * Auto-commit after changes are made
   */
  autoCommit?: boolean;

  /**
   * Commit message template
   */
  commitMessageTemplate?: string;

  /**
   * Whether to auto-push after commit
   */
  autoPush?: boolean;
}

export { GitProvider, type WorktreeInfo } from "./git.js";
