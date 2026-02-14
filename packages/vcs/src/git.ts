import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type { VCSProvider, VCSCommitResult, VCSStatusResult } from "./index.js";

export class GitProvider implements VCSProvider {
  private root: string;

  constructor(root: string = process.cwd()) {
    this.root = path.resolve(root);
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

  private exec(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn("git", args, {
        cwd: this.root,
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
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
