import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// AGENTS.md is what people and coding agents actually read. The constitution says the two must
// agree, so these tests fail when AGENTS.md drifts from the constitution or from the repository
// it describes.
const path = (relative: string): URL => new URL(`../${relative}`, import.meta.url);
const read = (relative: string): string => readFileSync(path(relative), "utf8");

const agents = read("AGENTS.md");
const constitution = read(".specify/memory/constitution.md");
const tokens = read("src/ui/tokens.css");
const scripts = Object.keys((JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts);

describe("AGENTS.md", () => {
  it("is imported by CLAUDE.md and nothing else is in that file", () => {
    expect(read("CLAUDE.md").trim()).toBe("@AGENTS.md");
  });

  it("stays under 10 KB so it is read in full", () => {
    expect(Buffer.byteLength(agents)).toBeLessThan(10_000);
  });

  it("names every principle of the constitution", () => {
    const principles = [...constitution.matchAll(/^### [IVX]+\. (.+)$/gm)].map((m) => m[1] ?? "");
    expect(principles.length).toBeGreaterThanOrEqual(6);
    // Principle IV is carried by the Commands section rather than a product rule.
    const named = principles.filter((p) => !p.startsWith("Test-First"));
    for (const principle of named) {
      const firstWords = principle.split(",")[0]?.toLowerCase() ?? "";
      expect(agents.toLowerCase(), `AGENTS.md does not mention “${principle}”`).toContain(firstWords);
    }
  });

  it("quotes the same size limits as the constitution and the design tokens", () => {
    for (const text of [agents, constitution]) {
      expect(text).toContain("16px");
      expect(text).toContain("56px");
    }
    expect(tokens).toMatch(/--control-h:\s*56px/);
    expect(tokens).toMatch(/--text-xs:\s*1rem/);
  });

  it("only lists bun scripts that exist", () => {
    const used = [...agents.matchAll(/`bun run ([a-z0-9:]+)/g)].map((m) => m[1] ?? "");
    expect(used.length).toBeGreaterThan(4);
    for (const script of used) expect(scripts, `package.json has no “${script}” script`).toContain(script);
  });

  it("only points at paths that exist", () => {
    const table = agents.slice(agents.indexOf("## Where things are"), agents.indexOf("## Boundaries"));
    const paths = [...table.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1] ?? "");
    expect(paths.length).toBeGreaterThan(4);
    for (const p of [...paths, "ATTRIBUTION.md", "LICENSE", "scripts/site-check.mjs", "src-tauri/deny.toml", "site/costs/costs.json"]) {
      expect(existsSync(path(p)), `${p} is named in AGENTS.md but does not exist`).toBe(true);
    }
  });
});

describe("constitution", () => {
  it("has a version line that matches its sync report", () => {
    const version = /\*\*Version\*\*: (\d+\.\d+\.\d+)/.exec(constitution)?.[1];
    expect(version).toBeDefined();
    expect(constitution).toContain(`→ ${version}`);
  });
});
