import fs from 'node:fs';import ts from 'typescript';
for(const folder of ['BankSettings','DepartmentSettings','EntitySettings','InventorySettings','MemberSettings','ProjectSettings']){
 const file=`src/pages/${folder}/index.tsx`;let source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function walk(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='div'&&node.openingElement.getText(sf).includes('flex items-center gap-2 flex-wrap')&&node.children.some(ch=>ts.isJsxElement(ch)&&ch.getText(sf).includes('<Chip'))){edits.push({start:node.openingElement.getStart(sf),end:node.openingElement.end,text:'<SettingsFilters active={hasAppliedFilters}>'});edits.push({start:node.closingElement.getStart(sf),end:node.closingElement.end,text:'</SettingsFilters>'});return;}ts.forEachChild(node,walk);}
 walk(sf);for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);fs.writeFileSync(file,'import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";\n'+source);
}
