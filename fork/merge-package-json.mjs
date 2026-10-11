import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import semver from "semver";

const SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "overrides",
];

function isHigher(theirs, ours) {
  if (!semver.validRange(theirs) || !semver.validRange(ours)) return false;
  return semver.gt(semver.minVersion(theirs), semver.minVersion(ours));
}

export function mergeManifest(ours, theirs) {
  const merged = structuredClone(ours);
  for (const section of SECTIONS) {
    for (const [name, spec] of Object.entries(theirs[section] ?? {})) {
      const current = merged[section]?.[name];
      if (current === undefined || isHigher(spec, current)) {
        merged[section] ??= {};
        merged[section][name] = spec;
      }
    }
  }
  return merged;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function bothSidesConflicted() {
  const stages = new Map();
  for (const line of git("ls-files", "-u").split("\n").filter(Boolean)) {
    const [info, path] = line.split("\t");
    const stage = info.split(" ")[2];
    stages.set(path, (stages.get(path) ?? new Set()).add(stage));
  }
  return [...stages].filter(([, set]) => set.has("2") && set.has("3")).map(([path]) => path);
}

function main() {
  const conflicted = bothSidesConflicted();
  const isNamed = (name) => (path) => path === name || path.endsWith(`/${name}`);
  const manifests = conflicted.filter(isNamed("package.json"));
  const locks = conflicted.filter(isNamed("package-lock.json"));
  if (manifests.length === 0 && locks.length === 0) return;

  for (const path of manifests) {
    const ours = JSON.parse(git("show", `HEAD:${path}`));
    const theirs = JSON.parse(git("show", `:3:${path}`));
    writeFileSync(path, `${JSON.stringify(mergeManifest(ours, theirs), null, 2)}\n`);
    git("add", path);
  }
  for (const path of locks) {
    git("checkout", "HEAD", "--", path);
    execFileSync("npm", ["install", "--package-lock-only"], {
      cwd: dirname(path),
      stdio: "inherit",
    });
    git("add", path);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
