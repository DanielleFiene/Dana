import { existsSync } from "node:fs";
import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_INTERVAL_MS, DEFAULT_LOOKBACK_HOURS } from "./catalog.ts";
import { formatReport, harvestOnce, type HarvestReport } from "./harvest.ts";

type Cli = {
  once: boolean;
  lookbackHours: number;
  intervalMs: number;
  rootDir: string;
  help: boolean;
};

export function parseArgs(argv: readonly string[], cwd: string, repoRoot: string): Cli {
  const args = argv.slice(2);
  let once = true;
  let lookbackHours = DEFAULT_LOOKBACK_HOURS;
  let intervalMs = DEFAULT_INTERVAL_MS;
  let rootDir = join(repoRoot, "data/saih/chj");
  let help = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const next = args[i + 1];
    if (a === "--loop") once = false;
    else if (a === "--once") once = true;
    else if (a === "--lookback-hours" && next) {
      lookbackHours = Number(next);
      i += 1;
    } else if (a === "--interval-hours" && next) {
      intervalMs = Number(next) * 3600_000;
      i += 1;
    } else if (a === "--dir" && next) {
      rootDir = resolve(cwd, next);
      i += 1;
    } else if (a === "--help" || a === "-h") {
      help = true;
    }
  }
  if (!help && (!Number.isFinite(lookbackHours) || lookbackHours <= 0)) {
    throw new Error("invalid --lookback-hours");
  }
  if (!help && (!Number.isFinite(intervalMs) || intervalMs < 60_000)) {
    throw new Error("invalid --interval-hours");
  }
  return { once, lookbackHours, intervalMs, rootDir, help };
}

export function findRepoRoot(fromFile: string): string {
  let dir = dirname(fromFile);
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const HELP = `CHJ SAIH archive (Magre corridor). Does not recover Oct 2024.

  npm run saih:chj                  one pull (default)
  npm run saih:chj -- --loop        repeat every 2 hours
  npm run saih:chj -- --lookback-hours 72 --dir data/saih/chj
`;

async function writeRunLog(rootDir: string, report: HarvestReport): Promise<void> {
  const filePath = join(rootDir, "runs.jsonl");
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(
    filePath,
    `${JSON.stringify({
      harvestedAt: report.harvestedAt,
      fromLocal: report.fromLocal,
      toLocal: report.toLocal,
      outcomes: report.outcomes.map((o) => ({
        id: o.id,
        stationCode: o.stationCode,
        variableId: o.variableId,
        status: o.status,
        fetched: o.fetched,
        written: o.written,
        skipped: o.skipped,
        error: o.error ?? null,
      })),
    })}\n`,
    "utf8",
  );
}

export async function main(argv = process.argv): Promise<number> {
  const self = fileURLToPath(import.meta.url);
  const repoRoot = findRepoRoot(self);
  const cli = parseArgs(argv, process.cwd(), repoRoot);
  if (cli.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const run = async () => {
    const report = await harvestOnce({
      rootDir: cli.rootDir,
      lookbackHours: cli.lookbackHours,
    });
    await writeRunLog(cli.rootDir, report);
    process.stdout.write(`${formatReport(report)}\n`);
    return report;
  };

  await run();
  if (cli.once) return 0;

  process.stderr.write(`loop every ${cli.intervalMs / 3600_000} h, lookback ${cli.lookbackHours} h\n`);
  await new Promise<void>((resolve) => {
    const tick = async () => {
      try {
        await run();
      } catch (err) {
        process.stderr.write(`harvest failed: ${err instanceof Error ? err.message : err}\n`);
      }
    };
    const timer = setInterval(() => {
      void tick();
    }, cli.intervalMs);
    const stop = () => {
      clearInterval(timer);
      resolve();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  return 0;
}

const startedAsCli =
  Boolean(process.argv[1]) && resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);

if (startedAsCli) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : err}\n`);
      process.exit(1);
    },
  );
}
