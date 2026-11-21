import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const locales = ["en", "de", "fr", "pt"];
const localeRoot = "src/lib/i18n/locales";
const settingsRoot = "src/products/business/pages/Settings";

const targets = [
  {
    namespace: "groupSettings",
    files: [
      path.join(settingsRoot, "GroupSettings/index.tsx"),
      path.join(settingsRoot, "GroupSettings/GroupModal.tsx"),
    ],
  },
  {
    namespace: "groupPermissionsTable",
    files: [
      path.join(settingsRoot, "GroupSettings/permissions/PermissionExplorer.tsx"),
      path.join(settingsRoot, "GroupSettings/permissions/GroupScopeEditor.tsx"),
    ],
  },
  {
    namespace: "memberSettings",
    files: [
      path.join(settingsRoot, "MemberSettings/index.tsx"),
      path.join(settingsRoot, "MemberSettings/MemberModal.tsx"),
    ],
  },
];

const staticKey = /\bt\(\s*(?:"([^"]+)"|'([^']+)')/g;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hasKey(document, dotted) {
  let node = document;
  for (const part of dotted.split(".")) {
    if (!node || typeof node !== "object" || !(part in node)) return false;
    node = node[part];
  }
  return typeof node === "string" && node.trim().length > 0;
}

function collectKeys(file) {
  const source = fs.readFileSync(file, "utf8");
  const keys = new Set();
  for (const match of source.matchAll(staticKey)) {
    const key = match[1] ?? match[2];
    if (!key.includes(":") && !key.includes("${")) keys.add(key);
  }
  return keys;
}

test("groups and member settings strings exist in every locale", () => {
  const failures = [];
  for (const target of targets) {
    const keys = new Set();
    for (const file of target.files) {
      for (const key of collectKeys(file)) keys.add(key);
    }
    for (const locale of locales) {
      const document = readJson(path.join(localeRoot, locale, `${target.namespace}.json`));
      for (const key of keys) {
        if (!hasKey(document, key)) failures.push(`${locale}/${target.namespace}: ${key}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("shared member table labels exist in every locale", () => {
  const keys = ["records.name", "records.fields.email", "records.fields.role"];
  const failures = [];
  for (const locale of locales) {
    const document = readJson(path.join(localeRoot, locale, "common.json"));
    for (const key of keys) {
      if (!hasKey(document, key)) failures.push(`${locale}/common: ${key}`);
    }
  }
  assert.deepEqual(failures, []);
});
