# @backlogmd/vcs

VCS abstraction for BacklogMD: Git operations and GitHub pull request creation.

## Features

- **Git**: status, stage, commit, push, pull
- **Worktrees**: list worktrees, create worktree (with optional new branch)
- **GitHub PRs**: create a pull request (pushes the current branch, then opens a PR via the GitHub API)

Creating a PR requires a GitHub token. Set `GITHUB_TOKEN` in the environment or pass `token` in the options to `createPullRequest()`. The remote `origin` must be a GitHub URL (`https://github.com/...` or `git@github.com:...`).

## Usage

```ts
import { GitProvider, type CreatePullRequestResult } from "@backlogmd/vcs";

const git = new GitProvider("/path/to/repo");

// Stage, commit, and open a PR
await git.stageAll();
await git.commit("feat: add feature");
const result: CreatePullRequestResult = await git.createPullRequest({
  title: "feat: add feature",
  body: "Optional description",
  base: "main",
});
if (result.success && result.url) console.log("PR:", result.url);
```
