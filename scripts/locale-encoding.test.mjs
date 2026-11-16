import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = "src/lib/i18n/locales";
const languages = ["pt", "fr", "de"];
const corruption = /\?\?|[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]|\?[A-Za-zÀ-ÿ]|\?\s+[a-zà-ÿ]/u;

function inspect(value, keyPath, failures) {
  if (typeof value === "string") {
    if (corruption.test(value)) failures.push(`${keyPath}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${keyPath}[${index}]`, failures));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      inspect(item, keyPath ? `${keyPath}.${key}` : key, failures);
    }
  }
}

test("localized copy has no replacement-character corruption", () => {
  const failures = [];
  for (const language of languages) {
    const directory = path.join(root, language);
    for (const file of fs.readdirSync(directory)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
      inspect(document, `${language}/${file}`, failures);
    }
  }
  assert.deepEqual(failures, []);
});
