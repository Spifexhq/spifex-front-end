import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
const {outputText}=ts.transpileModule(fs.readFileSync('src/shared/layout/Navbar/pageTitle.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}});
const {getPageTitleKey}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const routes=['/home','/cashflow','/settled','/reports','/settings','/settings/personal','/settings/notifications','/settings/ledger-accounts','/settings/register/ledger-accounts','/settings/accounting','/settings/accounting/books','/settings/accounting/chart','/settings/accounting/posting-policies','/settings/manage-currency','/settings/manage-formats','/onboarding'];
test('page titles resolve to translations in every supported language',()=>{
 for(const language of ['en','pt','fr','de']) for(const route of routes){
  const [namespace,key]=getPageTitleKey(route).split(':');
  const data=JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/${namespace}.json`,'utf8'));
  assert.equal(typeof key.split('.').reduce((value,part)=>value?.[part],data),'string',`${language}: ${route}`);
 }
});
test('accounting and independent ledger routes have distinct titles',()=>{
 assert.equal(getPageTitleKey('/settings/accounting/chart'),'accountingSettings:nav.chart');
 assert.equal(getPageTitleKey('/settings/ledger-accounts'),'settingsSidebar:items.ledger-accounts');
});
