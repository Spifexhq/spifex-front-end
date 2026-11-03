import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
const {outputText}=ts.transpileModule(fs.readFileSync('src/shared/layout/Navbar/pageTitle.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}});
const {getPageTitleKey,getPageBreadcrumbs,getSettingsDescriptionKey}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const routes=['/home','/cashflow','/settled','/reports','/settings','/settings/personal','/settings/notifications','/settings/ledger-accounts','/settings/register/ledger-accounts','/settings/accounting','/settings/accounting/books','/settings/accounting/setup/profile','/settings/accounting/setup/review','/settings/accounting/periods','/settings/accounting/chart','/settings/accounting/posting-policies','/settings/manage-currency','/settings/manage-formats','/onboarding'];
test('page titles resolve to translations in every supported language',()=>{
 for(const language of ['en','pt','fr','de']) for(const route of routes){
  const [namespace,key]=getPageTitleKey(route).split(':');
  const data=JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/${namespace}.json`,'utf8'));
  assert.equal(typeof key.split('.').reduce((value,part)=>value?.[part],data),'string',`${language}: ${route}`);
 }
});
test('legacy ledger routes resolve to the canonical chart and setup titles',()=>{
 assert.equal(getPageTitleKey('/settings/accounting/chart'),'accountingSettings:nav.chart');
 assert.equal(getPageTitleKey('/settings/ledger-accounts'),'accountingSettings:nav.chart');
 assert.equal(getPageTitleKey('/settings/register/ledger-accounts'),'accountingSettings:nav.setup');
});

test('accounting tabs retain their parent breadcrumb',()=>{
 assert.deepEqual(getPageBreadcrumbs('/settings/accounting/books'),[{titleKey:'settingsSidebar:items.accounting',to:'/settings/accounting/overview'},{titleKey:'accountingSettings:nav.books'}]);
 assert.equal(getPageBreadcrumbs('/settings/banks').length,1);
});
test('all settings routes have translated short descriptions',()=>{
 const paths=['personal','organization-settings','subscription-management','subscription','security','banks','departments','entities','inventory','projects','members','groups','categories','ledger-accounts','register/ledger-accounts','bank-statements','notifications','manage-currency','manage-formats','limits',...['overview','setup','periods','chart','books','bank-mappings','posting-policies','journals','reconciliation','correlation'].map(tab=>`accounting/${tab}`)];
 for(const language of ['en','pt','fr','de']){
  const data=JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/navbar.json`,'utf8'));
  for(const path of paths){
   const key=getSettingsDescriptionKey(`/settings/${path}`).split(':')[1].split('.')[1];
   assert.ok(data.settingsDescriptions[key]?.length,`${language}: ${path}`);
  }
 }
});
