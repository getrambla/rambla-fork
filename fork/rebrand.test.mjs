import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "rebrand.sh");

test("replaces upstream's GitHub username outside skipped files", (t) => {
  const files = {
    "app/paseo-links.tsx": 'open("https://github.com/sponsors/boudra");\n',
    ".github/FUNDING.yml": "github: [boudra]\n",
    "package.json": "hello@moboudra.com\n",
    ".github/workflows/release.yml": '          scope: "@boudra"\n',
    "PASEO-README.md": "https://github.com/sponsors/boudra\n",
  };
  const dir = mkdtempSync(path.join(tmpdir(), "rebrand-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });

  execFileSync("bash", [script], { cwd: dir, stdio: "pipe" });

  const read = (name) => readFileSync(path.join(dir, name), "utf8");
  assert.equal(read("app/rambla-links.tsx"), 'open("https://github.com/sponsors/tgrushka");\n');
  assert.equal(read(".github/FUNDING.yml"), "github: [tgrushka]\n");
  assert.equal(read("package.json"), "hello@dra11y.com\n");
  assert.equal(read(".github/workflows/release.yml"), '          scope: "@getrambla"\n');
  assert.equal(read("PASEO-README.md"), "https://github.com/sponsors/boudra\n");
});
