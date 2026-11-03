import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const languages = ["en", "pt", "fr", "de"];
const namespaces = ["accountingSettings", "ledgerAccounts"];
const catalogues = Object.fromEntries(languages.map(language => [language, Object.fromEntries(namespaces.map(namespace => [namespace, JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/${namespace}.json`, "utf8"))]))]));
const errors = [];
const required = Object.fromEntries(namespaces.map(namespace => [namespace, new Set()]));
const get = (data, key) => key.split(".").reduce((value, segment) => value?.[segment], data);
const tokens = value => [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map(match => match[1]).sort().join(",");

function inspect(directory, namespace) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isDirectory()) { inspect(file, namespace); continue; }
    if (!file.endsWith(".tsx")) continue;
    const text = fs.readFileSync(file, "utf8");
    const fileNamespace = /useTranslation\("ledgerAccounts"\)/.test(text) ? "ledgerAccounts" : namespace;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) required[fileNamespace].add(node.arguments[0].text);
      if (ts.isJsxText(node) && /[a-zA-Z]{2}/.test(node.text.trim())) errors.push(`${file}: untranslated JSX text: ${node.text.trim()}`);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
inspect("src/pages/Settings/AccountingSettings", "accountingSettings");



// Enum options and tooltip definitions use dynamic translation keys.
function collectSetupKeys(node, prefix = "setupFlow") {
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") required.accountingSettings.add(`${prefix}.${key}`);
    else collectSetupKeys(value, `${prefix}.${key}`);
  }
}
collectSetupKeys(catalogues.en.accountingSettings.setupFlow);
for (const [group, values] of Object.entries({ basis: ["management", "cash", "accrual", "tax"], status: ["draft", "posted", "reversed", "void", "error"], source: ["cash_entry", "cash_settlement", "cash_transfer", "manual", "system"] })) for (const value of values) required.accountingSettings.add(`enums.${group}.${value}`);
for (const term of ["basis", "primary", "header", "posting", "section", "normalBalance", "bankControl", "manualPosting", "debit", "credit", "policy", "clearing", "accrual", "postingDate"]) required.accountingSettings.add(`terms.${term}`);
for (const key of ["currency.choose", "currency.inherit"]) required.accountingSettings.add(key);
for (const key of ["modal.header", "modal.posting", "modal.debit", "modal.credit", "explorer.expandGroup", "explorer.collapseGroup"]) required.ledgerAccounts.add(key);
for (const namespace of namespaces) for (const key of required[namespace]) for (const language of languages) {
  const value = get(catalogues[language][namespace], key);
  const reference = get(catalogues.en[namespace], key);
  if (typeof value !== "string" || !value.trim()) errors.push(`${language}/${namespace}: missing ${key}`);
  else if (typeof reference === "string" && tokens(value) !== tokens(reference)) errors.push(`${language}/${namespace}: interpolation mismatch in ${key}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`Accounting and Ledger translations verified in ${languages.join(", ")} (${Object.values(required).reduce((count, keys) => count + keys.size, 0)} keys).`);
