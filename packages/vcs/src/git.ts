import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type { VCSProvider, VCSCommitResult, VCSStatusResult } from "./index.js";

function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const trimmed = url.trim();
  // https://github.com/owner/repo.git or https://github.com/owner/repo
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  // git@github.com:owner/repo.git or git@github.com:owner/repo
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  return null;
}

/**
 * Information about a git worktree from `git worktree list --porcelain`.
 */
export interface WorktreeInfo {
  /** Absolute path to the worktree directory */
  path: string;
  /** Current HEAD commit hash */
  head: string;
  /** Branch name if checked out on a branch (local refs/heads/ or refs/remotes/) */
  branch?: string;
  /** True if HEAD is detached */
  detached: boolean;
  /** True if the worktree is locked */
  locked?: boolean;
}

export class GitProvider implements VCSProvider {
  private root: string;

  constructor(root: string = process.cwd()) {
    this.root = path.resolve(root);
  }

  /**
   * Initialize a new git repository at the given path (VCS abstraction for `git init`).
   */
  static async init(repoRoot: string): Promise<{ success: boolean; error?: string }> {
    const root = path.resolve(repoRoot);
    const result = await GitProvider.execInDir(root, ["init"]);
    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr.trim() || result.stdout.trim() };
    }
    return { success: true };
  }

  getRoot(): string {
    return this.root;
  }

  async isRepo(): Promise<boolean> {
    const gitDir = path.join(this.root, ".git");
    return fs.existsSync(gitDir);
  }

  async status(): Promise<VCSStatusResult> {
    const result = await this.exec(["status", "--porcelain"]);

    const modified: string[] = [];
    const untracked: string[] = [];
    const staged: string[] = [];

    for (const line of result.stdout.split("\n").filter(Boolean)) {
      if (line.length < 2) continue;

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.substring(3);

      if (indexStatus !== " " && indexStatus !== "?") {
        staged.push(filePath);
      }

      if (workTreeStatus === "M" || workTreeStatus === "D") {
        modified.push(filePath);
      }

      if (indexStatus === "?" && workTreeStatus === "?") {
        untracked.push(filePath);
      }
    }

    return {
      isClean: modified.length === 0 && untracked.length === 0 && staged.length === 0,
      modified,
      untracked,
      staged,
    };
  }

  async stage(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.exec(["add", ...files]);
  }

  async stageAll(): Promise<void> {
    await this.exec(["add", "-A"]);
  }

  async commit(message: string): Promise<VCSCommitResult> {
    if (!message.trim()) {
      return { success: false, error: "Commit message cannot be empty" };
    }

    const result = await this.exec(["commit", "-m", message]);

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    if (result.stdout.includes("nothing to commit")) {
      return { success: false, error: "No changes to commit" };
    }

    const hashResult = await this.exec(["rev-parse", "HEAD"]);
    const commitHash = hashResult.stdout.trim();

    return { success: true, commitHash };
  }

  async push(): Promise<{ success: boolean; error?: string }> {
    const result = await this.exec(["push"]);

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async pull(): Promise<{ success: boolean; error?: string }> {
    const result = await this.exec(["pull"]);

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  /**
   * Get the current branch name, or null if HEAD is detached.
   */
  async getCurrentBranch(): Promise<string | null> {
    const result = await this.exec(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (result.exitCode !== 0) return null;
    const branch = result.stdout.trim();
    return branch === "HEAD" ? null : branch;
  }

  /**
   * Check out an existing branch in the current worktree.
   */
  async checkout(branch: string): Promise<{ success: boolean; error?: string }> {
    if (!branch.trim()) {
      return { success: false, error: "Branch name cannot be empty" };
    }
    const result = await this.exec(["checkout", branch.trim()]);
    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr.trim() || result.stdout.trim() };
    }
    return { success: true };
  }

  /**
   * Get the origin remote as { owner, repo } for GitHub (hostname github.com).
   * Returns null if origin is not set or not a GitHub URL.
   */
  async getRemoteOrigin(): Promise<{ owner: string; repo: string } | null> {
    const result = await this.exec(["remote", "get-url", "origin"]);
    if (result.exitCode !== 0) return null;
    const url = result.stdout.trim();
    return parseGitHubRemote(url);
  }

  /**
   * List all worktrees for this repository.
   * Uses the main repo (main worktree) as reference; works from any worktree.
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    const result = await this.exec(["worktree", "list", "--porcelain"]);

    if (result.exitCode !== 0) {
      return [];
    }

    const worktrees: WorktreeInfo[] = [];
    const blocks = result.stdout.split(/\n(?=worktree )/).filter(Boolean);

    for (const block of blocks) {
      let pathLine: string | undefined;
      let head = "";
      let branch: string | undefined;
      let detached = true;
      let locked = false;

      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) {
          pathLine = line.slice(9).trim();
        } else if (line.startsWith("HEAD ")) {
          head = line.slice(5).trim();
        } else if (line.startsWith("branch ")) {
          const ref = line.slice(7).trim();
          if (ref === "detached" || ref === "bare" || ref === "unknown") {
            detached = true;
          } else {
            detached = false;
            branch = ref.replace(/^refs\/heads\//, "").replace(/^refs\/remotes\//, "");
          }
        } else if (line === "locked") {
          locked = true;
        }
      }

      if (pathLine) {
        worktrees.push({
          path: path.resolve(pathLine),
          head,
          branch: branch ?? undefined,
          detached,
          locked,
        });
      }
    }

    return worktrees;
  }

  /**
   * Create a new worktree at the given path.
   * @param worktreePath - Absolute or relative path where the worktree will be created
   * @param options - branch: check out this existing branch; createBranch: create and check out this new branch from current HEAD
   */
  async createWorktree(
    worktreePath: string,
    options?: { branch?: string; createBranch?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const resolvedPath = path.isAbsolute(worktreePath)
      ? worktreePath
      : path.resolve(this.root, worktreePath);

    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const args = ["worktree", "add"];

    if (options?.createBranch) {
      args.push("-b", options.createBranch);
    }

    args.push(resolvedPath);

    if (options?.branch && !options?.createBranch) {
      args.push(options.branch);
    }

    const result = await this.exec(args);

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr.trim() || result.stdout.trim() };
    }

    return { success: true };
  }

  /**
   * Push the current branch to origin and create a GitHub pull request.
   * Requires GITHUB_TOKEN (or options.token). Pushes the current branch with -u origin so it is created on the remote if needed.
   * @param options - title (required), body, base (default "main"), token (default process.env.GITHUB_TOKEN)
   * @returns CreatePullRequestResult with url of the new PR on success
   */
  async createPullRequest(options: {
    title: string;
    body?: string;
    base?: string;
    token?: string;
  }): Promise<{ success: boolean; url?: string; error?: string }> {
    const { title, body, base = "main", token = process.env.GITHUB_TOKEN } = options;

    if (!title.trim()) {
      return { success: false, error: "PR title cannot be empty" };
    }

    if (!token) {
      return { success: false, error: "GITHUB_TOKEN (or options.token) is required to create a pull request" };
    }

    const branch = await this.getCurrentBranch();
    if (!branch) {
      return { success: false, error: "Not on a branch (detached HEAD). Check out a branch to create a PR." };
    }

    const remote = await this.getRemoteOrigin();
    if (!remote) {
      return { success: false, error: "Remote origin is not set or is not a GitHub URL" };
    }

    const pushResult = await this.exec(["push", "-u", "origin", branch]);
    if (pushResult.exitCode !== 0) {
      return { success: false, error: pushResult.stderr.trim() || pushResult.stdout.trim() };
    }

    const res = await fetch(
      `https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body: body ?? "", head: branch, base }),
      }
    );

    const data = (await res.json()) as { html_url?: string; message?: string };

    if (res.status === 201 && data.html_url) {
      return { success: true, url: data.html_url };
    }

    const errorMessage =
      typeof data?.message === "string" ? data.message : res.statusText || `HTTP ${res.status}`;
    return { success: false, error: errorMessage };
  }

  private exec(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return GitProvider.execInDir(this.root, args);
  }

  private static execInDir(
    cwd: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn("git", args, {
        cwd,
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer | string) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer | string) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      proc.on("error", (err) => {
        resolve({
          stdout: "",
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  }
}
