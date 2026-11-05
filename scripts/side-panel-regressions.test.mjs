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
 const context=vm.createContext({exports:{},require:name=>({'react':{...react,Suspense:'suspense'},'./PreviewSkeleton':{default:'preview-skeleton'},'lucide-react':{CircleSlash2:'empty-icon'},'./isEmptyPreviewValue':{default:load('src/components/Modal/SidePanel/isEmptyPreviewValue.ts')},'react/jsx-runtime':jsx,'react-i18next':{useTranslation:()=>({t:key=>key})},'@/shared/ui/Button':{default:'button'},'./SidePanelFrame':{SidePanelFrame:'frame',SidePanelHeader:'header'},'./SidePanelForm':{SidePanelForm:form,SidePanelHint:'hint'},...modules})[name]});
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
 assert.equal(result.props.children[1].props.children[1].props.children.props['aria-label'],'previewEmpty');
});


test('every preview gets a mobile close action even without other footer actions', () => {
 const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
 for (const footer of [undefined, element('button', { children: 'Edit' })]) {
  const nodes = walk(Panel({ ...base, footer }));
  const mobile = nodes.find(node => node.type === 'span' && node.props.className === 'md:hidden!');
  assert.ok(mobile);
  assert.equal(mobile.props.children.props.onClick, base.onClose);
  const footerNode = nodes.find(node => node.type === 'footer');
  assert.equal(footerNode.props.className.includes('md:hidden!'), !footer);
 }
});


test('empty preview values include legacy placeholders but preserve zero and false', () => {
 const empty = load('src/components/Modal/SidePanel/isEmptyPreviewValue.ts');
 for (const value of [null, undefined, '', '   ', '—', '�', []]) assert.equal(empty(value), true);
 for (const value of [0, false, '0', 'Bank account']) assert.equal(empty(value), false);
});


test('preview skeletons match list fields and preserve entry layout variations', () => {
 const Skeleton = load('src/components/Modal/SidePanel/PreviewSkeleton.tsx');
 const list = Skeleton({ variant: 'list', rows: 3 });
 assert.equal(list.props.children[0], false);
 assert.equal(list.props.children[1].props.children.length, 3);
 assert.equal(list.props.children[2], false);
 const detail = Skeleton({ variant: 'detail', rows: 5 });
 assert.ok(detail.props.children[0]);
 assert.equal(detail.props.children[1].props.children.length, 5);
 assert.ok(detail.props.children[2]);
});
