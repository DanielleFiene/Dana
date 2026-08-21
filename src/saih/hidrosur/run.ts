import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIRMED_ON_FORM } from "./catalog.ts";
import { createClient } from "./client.ts";
import { fixturePaths, pullCartamaMalaga2024, writeCartamaFixture } from "./fetchCartama.ts";
import { farolaFixturePaths, pullFarolaMalaga2024, writeFarolaFixture } from "./fetchFarola.ts";

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

const HELP = `Hidrosur CSV (Junta de Andalucía). Not CHG.

  npm run saih:hidrosur                fetch Cártama 038P01 rain + 038R03 nivel/caudal and Farola 022P01 rain for 11–15 Nov 2024
  npm run saih:hidrosur -- --farola-only  Farola 022P01 only (does not rewrite Cártama fixtures)
  npm run saih:hidrosur -- --list      print corridor sensors confirmed on the form
`;

export async function main(argv = process.argv): Promise<number> {
  const list = argv.includes("--list") || argv.includes("-l");
  const help = argv.includes("--help") || argv.includes("-h");
  if (help) {
    process.stdout.write(HELP);
    return 0;
  }
  const client = createClient();
  if (list) {
    const seed = await client.seedSession();
    if (!seed.ok) {
      process.stderr.write(`session failed (${seed.kind}): ${seed.error}\n`);
      return 1;
    }
    const catalog = await client.fetchStations();
    if (!catalog.ok) {
      process.stderr.write(`parametros failed (${catalog.kind}): ${catalog.error}\n`);
      return 1;
    }
    process.stdout.write(`${catalog.value.length} stations on datos-a-la-carta\n`);
    process.stdout.write("Corridor sensors previously confirmed (form, not fetched this round):\n");
    for (const row of CONFIRMED_ON_FORM) {
      process.stdout.write(`  ${row.stationId.padStart(3)} ${row.sensorId}  ${row.name}  ${row.sensorName}\n`);
    }
    return 0;
  }

  const farolaOnly = argv.includes("--farola-only");
  const repoRoot = findRepoRoot(fileURLToPath(import.meta.url));
  const fetchedAt = new Date().toISOString();

  if (!farolaOnly) {
    const pull = await pullCartamaMalaga2024(client);
    if (!pull.ok) {
      process.stderr.write(`Hidrosur ${pull.kind}: ${pull.error}\n`);
      return 1;
    }
    await writeCartamaFixture(repoRoot, pull.value, fetchedAt);
    const paths = fixturePaths(repoRoot);
    const mm = pull.value.rain.points.reduce((s, p) => s + (p.valor ?? 0), 0);
    const stageMax = pull.value.stage.points.reduce((m, p) => (p.valor != null && p.valor > m ? p.valor : m), 0);
    const flowMax = pull.value.flow.points.reduce((m, p) => (p.valor != null && p.valor > m ? p.valor : m), 0);
    process.stdout.write(
      [
        `Hidrosur Cártama ${pull.value.fromLocal} → ${pull.value.toLocal}`,
        `stations on form ${pull.value.stationCount}; Cártama ${pull.value.stationName}`,
        `rain ${pull.value.rain.sensorId}: ${pull.value.rain.points.length} points, ${mm.toFixed(1)} mm`,
        `stage ${pull.value.stage.sensorId} nivel: ${pull.value.stage.points.length} points, max ${stageMax.toFixed(2)} m`,
        `flow ${pull.value.flow.sensorId} caudal column: ${pull.value.flow.points.length} points, max ${flowMax.toFixed(2)} m³/s`,
        `wrote ${paths.rainJsonl}`,
        `wrote ${paths.stageJsonl}`,
        `wrote ${paths.flowJsonl}`,
      ].join("\n") + "\n",
    );
  }

  const farola = await pullFarolaMalaga2024(client);
  if (!farola.ok) {
    process.stderr.write(`Hidrosur Farola ${farola.kind}: ${farola.error}\n`);
    return 1;
  }
  await writeFarolaFixture(repoRoot, farola.value, fetchedAt);
  const farolaPaths = farolaFixturePaths(repoRoot);
  const farolaMm = farola.value.rain.points.reduce((s, p) => s + (p.valor ?? 0), 0);
  process.stdout.write(
    [
      `Hidrosur Farola ${farola.value.fromLocal} → ${farola.value.toLocal}`,
      `Farola ${farola.value.stationName}`,
      `rain ${farola.value.rain.sensorId}: ${farola.value.rain.points.length} points, ${farolaMm.toFixed(1)} mm`,
      `wrote ${farolaPaths.rainJsonl}`,
    ].join("\n") + "\n",
  );
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
