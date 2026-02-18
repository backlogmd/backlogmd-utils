// #!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import { buildBacklogOutput, serializeOutput, isUrl, fetchContent } from "@backlogmd/parser";

export interface CliArgs {
  input: string;
  output: string | null;
  help: boolean;
}

const USAGE = `Usage: backlogmd-parser [options]

Options:
  --input <path|url>  Path to .backlogmd/ directory or URL to a markdown file (default: .backlogmd/)
  --output <path>     Write JSON to file instead of stdout
  --help              Show this help message`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: path.join(process.cwd(), ".backlogmd"),
    output: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--input":
        if (i + 1 >= argv.length) {
          throw new Error("--input requires a path or URL argument");
        }
        args.input = argv[++i];
        break;
      case "--output":
        if (i + 1 >= argv.length) {
          throw new Error("--output requires a path argument");
        }
        args.output = path.resolve(argv[++i]);
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }

  return args;
}

export async function run(argv: string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error((e as Error).message);
    console.error(USAGE);
    return 1;
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  if (isUrl(args.input)) {
    return runRemote(args.input, args.output);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`Error: directory not found: ${args.input}`);
    return 1;
  }

  const output = buildBacklogOutput(args.input);
  const json = serializeOutput(output);

  if (args.output) {
    fs.writeFileSync(args.output, json, "utf-8");
    console.error(`Written to ${args.output}`);
  } else {
    console.log(json);
  }

  if (output.validation.errors.length > 0) {
    console.error(`\n${output.validation.errors.length} validation error(s) found.`);
    return 1;
  }

  return 0;
}

async function runRemote(url: string, outputPath: string | null): Promise<number> {
  let content: string;
  try {
    content = await fetchContent(url);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, content, "utf-8");
    console.error(`Written to ${outputPath}`);
  } else {
    console.log(content);
  }

  return 0;
}

const isDirectRun =
  process.argv[1] && (process.argv[1].endsWith("/cli.js") || process.argv[1].endsWith("/cli.ts"));

if (isDirectRun) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
