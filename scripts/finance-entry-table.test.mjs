import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/products/business/pages/Finance/components/EntryTable/entryRows.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {buildEntryRows,entryId,sourceEntryId,entryQuery,isOutstandingEntry}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const entry=(id,date,amount,tx_type='credit',running_balance=null)=>({id,due_date:date,amount,tx_type,running_balance});
test('partial settlements keep their own external ids and their underlying entry id',()=>{
 const a={id:'entry-1',entry_id:'entry-1',external_id:'settlement-1',value_date:'2026-11-01',amount:'10.00',tx_type:'credit'};
 const b={...a,external_id:'settlement-2'};
 assert.equal(entryId(a),'settlement-1');assert.equal(sourceEntryId(a),'entry-1');assert.equal(buildEntryRows([a,b]).filter(row=>row.kind==='record').length,2);
});
test('monthly totals use cents, separate months, and keep server balances authoritative',()=>{
 const rows=buildEntryRows([entry('3','2026-12-01','1.00','debit','123.45'),entry('1','2026-11-01','0.10','credit','100.10'),entry('2','2026-11-02','0.20','credit','100.30')]);
 const totals=rows.filter(row=>row.kind==='summary');assert.equal(totals[0].amount,.30);assert.equal(totals[0].balance,100.30);assert.equal(totals[1].amount,-1);assert.equal(totals[1].balance,123.45);
});
test('missing running balances stay unknown rather than becoming fabricated zeroes',()=>{
 const rows=buildEntryRows([entry('1','2026-11-01','5.00')]);assert.equal(rows[0].balance,null);assert.equal(rows[1].balance,null);
});
test('overlapping cursor records are deduplicated without losing the newest record',()=>{
 const rows=buildEntryRows([entry('1','2026-11-01','5.00'),entry('1','2026-11-01','7.00')]);assert.equal(rows.length,2);assert.equal(rows[1].amount,7);
});
test('cash flow and settlement filters retain dates, ids, type and decimal amounts',()=>{
 const filters={start_date:'2026-11-01',end_date:'2026-11-30',bank_id:['b1','b2'],cashflow_category_id:['c1'],tx_type:'debit',description:'Consulting',observation:'November',amount_min:'1.234,56',amount_max:'2000.00'};
 const cash=entryQuery(filters,false),settled=entryQuery(filters,true);assert.equal(cash.date_from,filters.start_date);assert.equal(cash.date_to,filters.end_date);assert.equal(settled.value_from,filters.start_date);assert.equal(settled.value_to,filters.end_date);assert.equal(settled.include_inactive,true);assert.equal(cash.bank,'b1,b2');assert.equal(cash.cashflow_category,'c1');assert.equal(cash.tx_type,-1);assert.equal(cash.amount_min,1234.56);assert.equal(cash.amount_max,2000);assert.equal(cash.q,'Consulting November');
});
test('the Finance table has all interface and accounting-state translations',()=>{
 for(const lang of ['en','pt','fr','de']){const d=JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${lang}/financeEntries.json`,'utf8'));for(const key of ['statusLegend','confirmReopen','confirmDelete','monthTotal','selected','openAccounting','accountingLoadError','unknown','unavailable'])assert.ok(d[key],`${lang}: ${key}`);for(const status of ['uncategorised','missing_policy','missing_bank_mapping','ready','posted','error'])assert.ok(d.statuses[status]);}
});
test('only the unfinished final month is marked as a loaded subtotal',()=>{
 const summaries=buildEntryRows([entry('1','2026-11-30','10'),entry('2','2026-12-01','20')],true).filter(row=>row.kind==='summary');
 assert.equal(summaries[0].partial,false);assert.equal(summaries[1].partial,true);
});

test('settlement preview actions are limited to outstanding source entries with a known balance',()=>{
 const open={...entry('open','2026-11-05','100'),is_settled:false,open_amount:'25.00'};
 assert.equal(isOutstandingEntry(open),true);
 assert.equal(isOutstandingEntry({...open,open_amount:'0.00'}),false);
 assert.equal(isOutstandingEntry({...open,is_settled:true}),false);
 assert.equal(isOutstandingEntry({...open,open_amount:undefined}),false);
 assert.equal(isOutstandingEntry({...open,open_amount:'Infinity'}),false);
 assert.equal(isOutstandingEntry({...open,external_id:'settlement-1',entry_id:'open'}),false);
});
