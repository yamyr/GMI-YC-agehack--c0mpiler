import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");
const versionOf = (json: string): string => (JSON.parse(json) as { version: string }).version;

const packageVersion = versionOf(read("../package.json"));
const tauriVersion = versionOf(read("../src-tauri/tauri.conf.json"));
const cargoVersion = /^version = "([^"]+)"/m.exec(read("../src-tauri/Cargo.toml"))?.[1];

describe("release manifests", () => {
  it("carry one version in package.json, tauri.conf.json and Cargo.toml", () => {
    expect(packageVersion.length).toBeGreaterThan(0);
    expect({ tauriVersion, cargoVersion }).toEqual({
      tauriVersion: packageVersion,
      cargoVersion: packageVersion,
    });
  });
});
