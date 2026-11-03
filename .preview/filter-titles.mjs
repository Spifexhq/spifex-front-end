import fs from 'node:fs';import ts from 'typescript';
for(const folder of ['BankSettings','DepartmentSettings','EntitySettings','InventorySettings','MemberSettings','ProjectSettings']){
 const file=`src/pages/${folder}/index.tsx`;let source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function walk(node){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='Popover'){
   let heading;
   function find(n){if(heading)return;if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='div'){
    const text=n.openingElement.getText(sf);if(/text-\[14px\]|font-semibold/.test(text)){
     const expression=n.children.find(c=>ts.isJsxExpression(c)&&c.expression);if(expression){heading={node:n,expression:expression.expression.getText(sf)};return;}
    }
   }ts.forEachChild(n,find);}
   find(node);
   if(heading){
    if(!node.openingElement.attributes.properties.some(a=>a.name?.getText(sf)==='title'))edits.push({start:node.openingElement.end-1,end:node.openingElement.end-1,text:` title={${heading.expression}}`});
    edits.push({start:heading.node.getStart(sf),end:heading.node.end,text:''});
   }
  }
  ts.forEachChild(node,walk);
 }
 walk(sf);for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);fs.writeFileSync(file,source);
}
