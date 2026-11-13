import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";
import { LOCALES, messageSlots } from "../site/i18n/core.js";
import { catalogs } from "../site/i18n/catalogs/index.js";

/** Only source arguments are messages. Names and other interpolation values are authored data. */
export function findMessageLiterals(code, filename) {
  const messages = new Set();
  const file = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
  function source(expression) {
    if (ts.isStringLiteralLike(expression)) messages.add(expression.text);
    else if (ts.isConditionalExpression(expression)) {
      source(expression.whenTrue);
      source(expression.whenFalse);
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0]) source(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...messages].sort();
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "catalogs" || entry.name === "messages") continue;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(url));
    else if (/\.(?:tsx?|js)$/.test(entry.name) && !/\.(?:test|d)\./.test(entry.name)) files.push(url);
  }
  return files;
}

/** Prevent lost names, amounts and decisions when a source message or draft changes. */
export function auditCatalogs(sources, translations, locales) {
  const errors = [];
  for (const locale of locales) {
    const catalog = translations[locale] ?? {};
    for (const source of sources) {
      const translation = Object.hasOwn(catalog, source) ? catalog[source] : null;
      if (typeof translation !== "string" || translation.trim() === "") errors.push(`${locale}: missing translation: ${source}`);
      else if (messageSlots(source).join() !== messageSlots(translation).join()) errors.push(`${locale}: interpolation mismatch: ${source}`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = new URL("../site/i18n/messages/", import.meta.url);
  const inventories = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const sources = [...new Set((await Promise.all(inventories.map(async (name) => JSON.parse(await readFile(new URL(name, directory), "utf8"))))).flat())];
  if (sources.length === 0 || !sources.every((source) => typeof source === "string" && source.trim())) throw new Error("Source inventory must contain nonempty English messages.");
  const locales = LOCALES.filter(({ id }) => id !== "en").map(({ id }) => id);
  const errors = auditCatalogs(sources, catalogs, locales);
  for (const file of [...await sourceFiles(new URL("../src/", import.meta.url)), ...await sourceFiles(new URL("../site/", import.meta.url))]) {
    for (const message of findMessageLiterals(await readFile(file, "utf8"), file.pathname)) {
      if (!sources.includes(message)) errors.push(`Unregistered source in ${file.pathname}: ${message}`);
    }
  }
  for (const error of errors.slice(0, 25)) console.error(error);
  if (errors.length) {
    console.error(`I18N FAIL: ${errors.length} catalog issues across ${sources.length} messages and ${locales.length} draft locales.`);
    process.exitCode = 1;
  } else console.log(`I18N PASS: ${sources.length} messages, ${locales.length} complete draft locales, interpolation parity verified.`);
}
