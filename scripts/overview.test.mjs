import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/products/business/pages/Overview/overviewUtils.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const context=vm.createContext({exports:{},URLSearchParams,Date});vm.runInContext(source,context);
const {periodPreset,queryFromParams,cumulativeValues,percentageChange,exportSeries}=context.exports;
test('period shortcuts use local calendar dates across month boundaries',()=>{
 const value=periodPreset(7,new Date(2026,2,1,12));assert.equal(value.start_date,'2026-02-23');assert.equal(value.end_date,'2026-03-01');
});
test('URL filters preserve useful state and remove banks from outstanding mode',()=>{
 const query=queryFromParams(new URLSearchParams('basis=planned&bank_id=bank&group_by=week&description=rent&start_date=2026-01-01&end_date=2026-01-31'));
 assert.equal(query.basis,'planned');assert.equal(query.bank_id,undefined);assert.equal(query.group_by,'week');assert.equal(query.description,'rent');
});
test('sparkline previews accumulate real period values and zero-baseline deltas stay finite',()=>{
 const series=[{in:'1.25',net:'-1.00',count:1},{in:'2.50',net:'2.00',count:0}];
 assert.deepEqual(Array.from(cumulativeValues(series,'in')),[1.25,3.75]);assert.deepEqual(Array.from(cumulativeValues(series,'net')),[-1,1]);
 assert.equal(percentageChange(5,0),null);assert.equal(percentageChange(0,0),0);assert.equal(percentageChange(-5,-10),.5);
});
test('CSV export preserves exact decimal values, negative amounts and safe headers',()=>{
 const csv=exportSeries([{date:'2026-11-05',in:'90071992547409.91',out:'0.01',net:'-0.01',count:1}],['Date','=FORMULA','Out','Net','Count']);
 assert.ok(csv.includes('90071992547409.91'));assert.ok(csv.includes('"-0.01"'));assert.ok(csv.includes("'=FORMULA"));
});
test('Overview and Help content are translated with consistent topic/article identities',()=>{
 const read=(language,name)=>JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/${name}.json`,'utf8'));
 const keys=(object,prefix='')=>Object.entries(object).flatMap(([key,value])=>value&&typeof value==='object'&&!Array.isArray(value)?keys(value,`${prefix}${key}.`):[`${prefix}${key}`]).sort();
 const topicIds=read('en','help').topics.map(topic=>[topic.id,...topic.articles.map(article=>article.id)]);
 for(const lang of ['en','pt','fr','de']) {
  assert.deepEqual(keys(read(lang,'overview')),keys(read('en','overview')));
  const help=read(lang,'help');assert.deepEqual(help.topics.map(topic=>[topic.id,...topic.articles.map(article=>article.id)]),topicIds);
  for(const topic of help.topics)for(const article of topic.articles){assert.ok(article.question.trim());assert.ok(article.answer.length>30);}
 }
});

test('outstanding entries are the initial Overview mode and explicit settled links remain supported',()=>{
 assert.equal(queryFromParams(new URLSearchParams()).basis,'planned');
 const settled=queryFromParams(new URLSearchParams('basis=settled&bank_id=b1'));
 assert.equal(settled.basis,'settled');assert.equal(settled.bank_id,'b1');
});
