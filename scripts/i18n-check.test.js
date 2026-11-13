import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOCALES } from "../site/i18n/core.js";
import { auditCatalogs, findMessageLiterals } from "./i18n-check.mjs";

describe("catalog integrity gate", () => {
  it("keeps advertised languages aligned with the native IPC allowlist", () => {
    // Otherwise a newly advertised language would fail every live turn at the native boundary.
    const rust = readFileSync(new URL("../src-tauri/src/agent/types.rs", import.meta.url), "utf8");
    const native = [...rust.matchAll(/#\[serde\(rename = "([^"]+)"\)\]/g)].map((match) => match[1]);
    expect(native).toEqual(LOCALES.map(({ id }) => id));
  });
  it("inventories source arguments rather than user values", () => {
    const code = 't("Book {0}", "Margaret"); t(ready ? "Ready" : "Wait"); t(userText);';
    expect(findMessageLiterals(code, "example.tsx")).toEqual(["Book {0}", "Ready", "Wait"]);
  });
  it("reads TSX, escapes and static templates without treating comments or authored values as messages", () => {
    const code = [
      '// t("Comment")',
      'const example: string = \'t("Example")\';',
      'const view = <p>{t((ready ? `Ready` : "Say \\"yes\\""), "Person")}</p>;',
      't(`Hello ${name}`); other.t("Other");',
    ].join("\n");
    expect(findMessageLiterals(code, "example.tsx")).toEqual(['Ready', 'Say "yes"']);
  });
  it("fails on malformed source so syntax errors cannot silently remove messages from the audit", () => {
    expect(() => findMessageLiterals('t("Book"', "broken.tsx")).toThrow(/broken\.tsx/);
  });
  it("finds absent languages, empty drafts and lost interpolation values", () => {
    const errors = auditCatalogs(["Book {0}", "Language"], { fr: { "Book {0}": "Réserver", Language: "" } }, ["fr", "de"]);
    expect(errors).toEqual(expect.arrayContaining([
      "fr: interpolation mismatch: Book {0}", "fr: missing translation: Language", "de: missing translation: Book {0}", "de: missing translation: Language",
    ]));
  });
  it("accepts reordered slots and intentional identical text", () => {
    expect(auditCatalogs(["{0}: {1}", "Agely"], { fr: { "{0}: {1}": "{1} : {0}", Agely: "Agely" } }, ["fr"])).toEqual([]);
  });
  it("does not count inherited keys as translations", () => {
    expect(auditCatalogs(["toString"], { fr: {} }, ["fr"])).toEqual(["fr: missing translation: toString"]);
  });
});
