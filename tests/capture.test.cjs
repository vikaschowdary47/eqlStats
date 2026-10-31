const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (name) =>
      name.startsWith(".")
        ? load(path.resolve(path.dirname(file), name + ".ts"))
        : require(name),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { parseCapture, suggestProject, captureUrl } = load(
  path.resolve("src/lib/capture.ts"),
);
const projects = [
  { id: "equal-tab", name: "Equal Tab" },
  { id: "eqlstats", name: "eqlStats" },
  { id: "orbit", name: "Orbit" },
];
test("mixed dump separates console links, references, and original notes", () => {
  const items = parseCapture(
    "https://vercel.com/me/equal-tab\nhttps://github.com/me/eqlstats\nhttps://www.figma.com/design/abc\nRemember to review the login flow.",
    projects,
  );
  assert.equal(items.length, 4);
  assert.equal(items[0].kind, "service");
  assert.equal(items[0].projectId, "equal-tab");
  assert.equal(items[1].kind, "artifact");
  assert.equal(items[1].projectId, "eqlstats");
  assert.equal(items[2].kind, "artifact");
  assert.equal(items[3].body, "Remember to review the login flow.");
});
test("duplicate URLs collapse and markdown punctuation is excluded", () => {
  const items = parseCapture(
    "[Repo](https://github.com/me/eqlstats)\nhttps://github.com/me/eqlstats.",
    projects,
  );
  assert.equal(items.filter((i) => i.url).length, 1);
  assert.equal(items[0].url, "https://github.com/me/eqlstats");
  assert.equal(items.find((i) => !i.url).body, "Repo");
});
test("plain decision is classified without discarding reasoning", () => {
  const [i] = parseCapture(
    "Decision: keep everything local.\nWhy: API work comes later.",
    projects,
  );
  assert.equal(i.kind, "decision");
  assert.match(i.body, /Why:/);
});
test("unknown web links stay references and require a project choice", () => {
  const [i] = parseCapture("https://example.com/research", projects);
  assert.equal(i.kind, "artifact");
  assert.equal(i.projectId, "");
});
test("protocol-less domains work", () => {
  assert.equal(
    parseCapture("github.com/me/orbit", projects)[0].projectId,
    "orbit",
  );
});
test("malformed percent escapes never crash the parser", () => {
  assert.doesNotThrow(() => parseCapture("https://example.com/%ZZ", projects));
});
test("file links are artifacts", () => {
  assert.equal(
    parseCapture("https://example.com/brief.pdf", projects)[0].kind,
    "artifact",
  );
});
test("empty input has no candidates", () => {
  assert.deepEqual(parseCapture(" \n ", projects), []);
});
test("unsafe schemes are not actionable URLs", () => {
  assert.equal(captureUrl("javascript:alert(1)"), null);
  assert.equal(captureUrl("data:text/html,test"), null);
});
test("matching project website has priority", () => {
  assert.equal(
    suggestProject("https://app.example.com/path", [
      ...projects,
      { id: "web", name: "My app", website_url: "https://app.example.com" },
    ]),
    "web",
  );
});
test("email addresses and loose filenames stay text, not guessed websites", () => {
  const items = parseCapture(
    "Send design.pdf and draft.md to team@example.com",
    projects,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "note");
  assert.match(items[0].body, /team@example.com/);
});
test("ambiguous equal matches do not force a project", () => {
  assert.equal(
    suggestProject("alpha beta", [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Alpha" },
    ]),
    "",
  );
});
