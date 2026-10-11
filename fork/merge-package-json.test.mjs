import assert from "node:assert/strict";
import test from "node:test";
import { mergeManifest } from "./merge-package-json.mjs";

test("keeps ours when theirs is lower or equal", () => {
  const ours = { dependencies: { expo: "^57.0.27", zod: "^4.4.3" } };
  const theirs = { dependencies: { expo: "^54.0.18", zod: "^4.4.3" } };
  assert.deepEqual(mergeManifest(ours, theirs), ours);
});

test("takes theirs when theirs is higher", () => {
  const ours = { devDependencies: { typescript: "~6.0.3" } };
  const theirs = { devDependencies: { typescript: "~6.1.0" } };
  assert.deepEqual(mergeManifest(ours, theirs), theirs);
});

test("adds dependencies only theirs has, in a section ours lacks too", () => {
  const ours = { dependencies: { expo: "^57.0.27" } };
  const theirs = { dependencies: { "expo-new": "~1.0.0" }, peerDependencies: { react: "~19.2.0" } };
  assert.deepEqual(mergeManifest(ours, theirs), {
    dependencies: { expo: "^57.0.27", "expo-new": "~1.0.0" },
    peerDependencies: { react: "~19.2.0" },
  });
});

test("never removes a dependency theirs dropped", () => {
  const ours = { dependencies: { "expo-paste-input": "^1.0.0" } };
  assert.deepEqual(mergeManifest(ours, { dependencies: {} }), ours);
});

test("keeps ours when either spec is not a semver range", () => {
  const ours = { dependencies: { a: "file:../a", b: "^1.0.0" } };
  const theirs = { dependencies: { a: "^9.0.0", b: "github:x/b" } };
  assert.deepEqual(mergeManifest(ours, theirs), ours);
});

test("leaves non-dependency fields as ours", () => {
  const ours = { version: "0.11.1", scripts: { dev: "ours" } };
  const theirs = { version: "0.11.2", scripts: { dev: "theirs" } };
  assert.deepEqual(mergeManifest(ours, theirs), ours);
});
