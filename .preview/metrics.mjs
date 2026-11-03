import fs from 'node:fs';import ts from 'typescript';
for(const file of fs.readdirSync('src/pages/Settings/AccountingSettings/pages').filter(x=>x.endsWith('.tsx')).map(x=>'src/pages/Settings/AccountingSettings/pages/'+x)){
 let source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function walk(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='div'&&node.children.some(c=>ts.isJsxSelfClosingElement(c)&&c.tagName.getText(sf)==='MetricCard')){const attr=node.openingElement.attributes.properties.find(a=>a.name?.getText(sf)==='className');if(attr&&ts.isStringLiteral(attr.initializer))edits.push({start:attr.initializer.getStart(sf),end:attr.initializer.end,text:JSON.stringify(attr.initializer.text+' settings-metrics')});}ts.forEachChild(node,walk);}
 walk(sf);for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);fs.writeFileSync(file,source);
}
