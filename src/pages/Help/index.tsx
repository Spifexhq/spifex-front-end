import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, BookOpen, ChevronDown, Search, Wallet, FileUp, Settings2, ShieldCheck, Landmark } from "lucide-react";
import Input from "@/shared/ui/Input";
type Article = { id: string; question: string; answer: string };
type Topic = { id: string; title: string; description: string; articles: Article[] };
const icons = { start: BookOpen, finance: Wallet, imports: FileUp, accounting: Landmark, settings: Settings2, security: ShieldCheck };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Help() {
  const { t } = useTranslation("help"), [params, setParams] = useSearchParams();
  const query = params.get("q") || "", topic = params.get("topic") || "all";
  const content = t("topics", { returnObjects: true }) as Topic[];
  const topics = useMemo(()=>Array.isArray(content) ? content : [],[content]);
  const visible = topics.filter(item => topic === "all" || topic === item.id).map(item=>({...item,articles:item.articles.filter(article=>normalize(`${article.question} ${article.answer} ${item.title}`).includes(normalize(query.trim())))})).filter(item=>item.articles.length);
  const count = visible.reduce((total,item)=>total+item.articles.length,0);
  useEffect(()=>{document.title=t("title");},[t]);
  const update = (key:string,value:string) => {const next=new URLSearchParams(params);if(value && value!=="all")next.set(key,value);else next.delete(key);setParams(next,{replace:true});};
  return <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 lg:px-10">
    <header className="mb-8 max-w-2xl"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-500"><BookOpen size={20} aria-hidden="true" /></div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">{t("title")}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t("intro")}</p><div className="relative mt-6"><Search size={16} aria-hidden className="absolute left-3 top-3 z-10 text-slate-400"/><Input aria-label={t("search")} placeholder={t("search")} value={query} onChange={event=>update("q",event.target.value)} className="pl-10" /></div></header>
    <div className="grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)]"><nav aria-label={t("browse")} className="flex gap-1 overflow-x-auto pb-2 lg:sticky lg:top-5 lg:flex-col"><button onClick={()=>update("topic","all")} aria-pressed={topic==="all"} className={`min-h-10 shrink-0 rounded-lg px-3 text-left text-xs font-medium ${topic==="all"?"bg-slate-100 text-slate-900":"text-slate-500 hover:bg-slate-50"}`}>{t("all")}</button>{topics.map(item=>{const Icon=icons[item.id as keyof typeof icons] || BookOpen;return <button key={item.id} onClick={()=>update("topic",item.id)} aria-pressed={topic===item.id} className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-xs ${topic===item.id?"bg-slate-100 font-medium text-slate-900":"text-slate-500 hover:bg-slate-50"}`}><Icon size={15} aria-hidden="true"/>{item.title}<span className="ml-auto pl-3 text-[10px] text-slate-400">{item.articles.length}</span></button>;})}</nav>
      <div className="space-y-7"><p role="status" className="text-xs text-slate-400">{t("results",{count})}</p>{visible.map(item=><section key={item.id} id={item.id}><div className="mb-3"><h2 className="text-sm font-semibold text-slate-900">{item.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div><div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{item.articles.map(article=><details key={article.id} className="group border-b border-slate-100 last:border-b-0"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:px-5"><span>{article.question}</span><ChevronDown size={15} className="shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" /></summary><div className="max-w-3xl whitespace-pre-line px-4 pb-5 text-[13px] leading-7 text-slate-500 sm:px-5">{article.answer}</div></details>)}</div></section>)}{!visible.length && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm font-medium text-slate-700">{t("empty")}</p><p className="mt-2 text-xs text-slate-400">{t("emptyHelp")}</p><button onClick={()=>setParams({},{replace:true})} className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-800">{t("reset")}</button></div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-5"><div><p className="text-sm font-medium text-slate-800">{t("backTitle")}</p><p className="mt-1 text-xs text-slate-500">{t("backText")}</p></div><Link to="/overview" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100">{t("back")}<ArrowUpRight size={13} aria-hidden="true" /></Link></footer></div>
    </div>
  </main>;
}
