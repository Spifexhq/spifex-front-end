import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const element=(type,props)=>({type,props});
const jsx={jsx:element,jsxs:element};
const react={Children:{toArray:children=>(Array.isArray(children)?children:[children]).filter(Boolean)},isValidElement:node=>!!node&&typeof node==='object'&&'type'in node,useEffect:()=>{},useId:()=> 'test'};
const form=()=>null;
function load(file,modules={}) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const context=vm.createContext({exports:{},require:name=>({'react':react,'react/jsx-runtime':jsx,'./SidePanelFrame':{SidePanelFrame:'frame',SidePanelHeader:'header'},'./SidePanelForm':{SidePanelForm:form,SidePanelHint:'hint'},...modules})[name]});
 vm.runInContext(code,context);return context.exports.default;
}
const Panel=load('src/components/Modal/SidePanel/SidePanel.tsx');
const base={isOpen:true,title:'Example',onClose:()=>{},children:element('dl',{})};
test('previews close on the backdrop and use the shared shell',()=>{
 const result=Panel(base);assert.equal(result.type,'frame');assert.equal(result.props.onBackdropClose,base.onClose);
});
test('creation and editing never close on the backdrop',()=>{
 for(const children of [element('form',{}),element(form,{}),[element('form',{}),element('div',{role:'alertdialog'})]]) {
  const result=Panel({...base,children});assert.equal(result.props.onBackdropClose,undefined);
  assert.equal(result.props.children[1],children);
 }
 assert.equal(Panel({...base,mode:'edit'}).props.onBackdropClose,undefined);
});
test('busy panels cannot dismiss from the backdrop',()=>assert.equal(Panel({...base,busy:true}).props.onBackdropClose,undefined));
test('preview details share Accounting label/value rows and preserve zero values',()=>{
 const Details=load('src/components/Modal/SidePanel/SidePanelDetails.tsx');
 const result=Details({fields:[{label:'Count',value:0},{label:'Missing',value:null}]});
 assert.equal(result.type,'dl');assert.match(result.props.className,/divide-y/);
 assert.equal(result.props.children[0].props.children[1].props.children,0);
 assert.equal(result.props.children[1].props.children[1].props.children,'—');
});
