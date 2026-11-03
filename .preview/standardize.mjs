import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const roots=['AccountingSettings','BankSettings','CategorySettings','CurrencySettings','DepartmentSettings','EntitySettings','FormatSettings','GroupSettings','InventorySettings','LedgerAccountSettings','MemberSettings','NotificationSettings','OrganizationSettings','PersonalSettings','ProjectSettings','SecurityAndPrivacy','SubscriptionManagement','SubscriptionCanceled','LimitsAndUsage','Statements'];
const printer=ts.createPrinter();
const files=roots.flatMap(root=>fs.readdirSync(`src/pages/${root}`,{recursive:true}).filter(x=>x.endsWith('.tsx')&&!x.includes('Modal')&&!x.includes('components')).map(x=>`src/pages/${root}/${x}`));
const cls=node=>node.attributes?.properties?.find(x=>x.name?.getText()==='className')?.initializer;
const textClass=node=>{const a=cls(node);return a&&ts.isStringLiteral(a)?a.text:'';};
for(const file of files){
 let source=fs.readFileSync(file,'utf8'); const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); const edits=[];
 const edit=(start,end,text)=>edits.push({start,end,text});
 const classEdit=(opening,text)=>{const a=cls(opening);if(a&&ts.isStringLiteral(a))edit(a.getStart(sf),a.end,JSON.stringify(text));};
 const headerSanitize=(node)=>{
  if(!ts.isJsxElement(node)) return node;
  const tag=node.openingElement.tagName.getText(sf), c=textClass(node.openingElement);
  if(tag==='h1'||(c.includes('text-[10px]')&&c.includes('uppercase'))||(c.includes('h-9 w-9')&&c.includes('place-items-center')))return null;
  const children=node.children.map(child=>headerSanitize(child)).filter(Boolean);
  if(!children.some(c=>!ts.isJsxText(c)||c.text.trim()))return null;
  return ts.factory.updateJsxElement(node,node.openingElement,children,node.closingElement);
 };
 const walk=node=>{
  if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>['Chip','ClearFiltersChip'].includes(d.name.getText(sf)))){
   edit(node.getStart(sf),node.end,'');return;
  }
  if(ts.isJsxElement(node)){
   const tag=node.openingElement.tagName.getText(sf), c=textClass(node.openingElement);
   if(tag==='header'&&node.getText(sf).includes('<h1')){
    const clean=headerSanitize(node);
    if(!clean){edit(node.getStart(sf),node.end,'');return;}
    const meaningful=clean.children.filter(ch=>!ts.isJsxText(ch)||ch.text.trim());
    const children=meaningful.map(ch=>printer.printNode(ts.EmitHint.Unspecified,ch,sf)).join('\n');
    edit(node.getStart(sf),node.end,`<div className="settings-intro">${children}</div>`);return;
   }
   if(tag==='h1'){edit(node.getStart(sf),node.end,'');return;}
   if(tag==='h2'&&file.includes('AccountingSettings/pages')&&/booksPage.title|bankMappingsPage.title|journalsPage.title|postingPoliciesPage.title|redesign.overviewTitle|redesign.guide.title|workspace.title/.test(node.getText(sf))){edit(node.getStart(sf),node.end,'');return;}
   if(tag==='main'){
    const keep=c.split(' ').filter(x=>x==='accounting-workspace');
    classEdit(node.openingElement,[...keep,'settings-page'].join(' '));
   }else if((c.includes('max-w-5xl')||c.includes('max-w-7xl')||c.includes('max-w-[1440px]')||c.includes('max-w-3xl'))&&c.includes('mx-auto')&&node.parent&&ts.isJsxElement(node.parent)&&node.parent.openingElement.tagName.getText(sf)==='main'){
    classEdit(node.openingElement,'settings-content '+c.split(' ').filter(x=>!x.startsWith('max-w-')&&x!=='mx-auto').join(' '));
   }else if(c){
    let next=c;
    if(c.includes('rounded-lg')&&c.includes('border-gray-200')&&c.includes('bg-white'))next+=' settings-panel';
    if(c.includes('bg-gray-50')&&c.includes('border-b')&&!c.includes('rounded'))next+=' settings-panel-heading';
    if(c.includes('flex items-center justify-between')&&node.getText(sf).includes('<Chip')&&node.getText(sf).length<14000)next+=' settings-toolbar';
    if(c.includes('overflow-x-auto'))next+=' settings-table-scroll';
    if(c.includes('flex gap-2 shrink-0'))next+=' settings-row-actions';
    if(c.includes('flex items-center justify-between px-4 py-2.5'))next+=' settings-row';
    if(next!==c)classEdit(node.openingElement,next);
   }
   const a=cls(node.openingElement);
   if(a&&ts.isJsxExpression(a)&&a.expression&&ts.isTemplateExpression(a.expression)){
    const head=a.expression.head;
    if(head.text.includes('flex items-center justify-between px-4 py-2.5'))edit(head.getStart(sf)+1,head.end-2,head.text+' settings-row ');
   }
  }
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(sf)==='Popover') edit(node.getStart(sf)+8,node.getStart(sf)+8,' appearance="settings" ');
  ts.forEachChild(node,walk);
 };
 walk(sf);
 if(source.includes('const Chip ='))edits.push({start:0,end:0,text:'import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";\n'});
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 fs.writeFileSync(file,source);
}
