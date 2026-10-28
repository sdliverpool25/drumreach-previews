(function(){
'use strict';
const $=s=>document.querySelector(s), H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={tok:'digital_drumm_crm_pat',base:'digital_drumm_crm_base',tab:'digital_drumm_crm_tab',view:'digital_drumm_crm_view',mode:'digital_drumm_crm_pipe_mode',col:'digital_drumm_crm_lanes_collapsed'};
// Swim lanes for the combined Pipeline: table id -> lane label. Add a table here to get a new lane.
const LANES={tblcNUFz6N5PaLG8t:'GBP / SEO',tblc1YbbEsnHZd6l2:'AI Consulting'};
// Preferred pipeline order for the union of Status choices; unknown statuses go after, in table order.
const STATUS_ORDER=['Research','To call','To contact','Called – no answer','Contacted','Interested','Follow-up due','Meeting booked','Audit sent','Proposal sent','Pilot','Client','Retainer','Called – not interested','Not a fit','Do not contact'];
// Table roles: field names are resolved against the live schema; missing fields are simply hidden.
const CFG={
 tblcNUFz6N5PaLG8t:{label:'Trades',todo:'To call',score:'Priority',filters:['Status','County','Town','Trade','Ad status','Job value tier'],
  card:['Trade','Town','Phone'],cols:['Name','Status','Priority','Trade','Town','County','Phone','Ad status','Next follow-up'],
  edit:['Status','Phone','Website','Google Maps','Consent to message','Last contact','Next follow-up','Notes'],
  long:['Call opener','Audit hooks','Flags','Ad notes','Outreach pack'],info:['Priority','Rating','Reviews','Photos','Job value tier','Ad status','Ad likelihood','Ad platforms','Google last shown','Unclaimed','Service area','Notion page']},
 tblc1YbbEsnHZd6l2:{label:'AI Consulting',todo:'To contact',score:'Fit score',filters:['Status','Town','Sector','Budget fit','Category'],
  card:['Sector','Town','Budget fit'],cols:['Name','Status','Fit score','Town','Sector','Headcount','Budget fit','Category'],
  edit:['Status','Decision maker','Budget fit','Fit score','Phone','Website','Last contact','Next follow-up','Consent to message','Notes'],
  long:['AI use case','Fit reasoning','Stack signals','Evidence URLs','Headcount source','Stack source','Revenue source'],info:['Headcount','Headcount basis','Revenue','Category','Sector','Town'],addable:true}
};
const S={tok:localStorage.getItem(LS.tok)||'',base:localStorage.getItem(LS.base)||'app8zAXrWXaVWxxys',schema:null,tab:localStorage.getItem(LS.tab)||'tblcNUFz6N5PaLG8t',view:localStorage.getItem(LS.view)||'today',mode:localStorage.getItem(LS.mode)||'combined',collapsed:JSON.parse(localStorage.getItem(LS.col)||'{}'),recs:{},q:'',flt:{},sort:null,open:null};
const MOCK=/[?&]mock=1/.test(location.search);const QP=new URLSearchParams(location.search);if(QP.get('view'))S.view=QP.get('view');if(QP.get('tab'))S.tab=QP.get('tab');if(QP.get('mode'))S.mode=QP.get('mode');
// Run fn with S.tab temporarily set to tid so per-table helpers (F, has, C, choices...) resolve against that table.
function inTab(tid,fn){const o=S.tab;S.tab=tid;try{return fn()}finally{S.tab=o}}
const laneTabs=()=>Object.keys(LANES).filter(id=>S.schema&&S.schema.find(t=>t.id===id));
const combined=()=>S.view==='kanban'&&S.mode==='combined'&&laneTabs().length>0;
const tabOf=id=>Object.keys(S.recs).find(t=>S.recs[t].some(r=>r.id===id));
// ---------- API with rate limit (<=5 req/s) and 429 retry ----------
let last=0;const GAP=220;
async function api(path,opt={},tries=0){
  const wait=Math.max(0,last+GAP-Date.now());last=Date.now()+wait;if(wait)await new Promise(r=>setTimeout(r,wait));
  const url='https://api.airtable.com/v0/'+path;
  const res=await (MOCK?window.mockFetch:fetch)(url,{...opt,headers:{'Authorization':'Bearer '+S.tok,'Content-Type':'application/json',...(opt.headers||{})}});
  if(res.status===429&&tries<6){const d=Math.min(30000,1000*2**tries);status('Rate limited by Airtable – retrying in '+d/1000+'s…');await new Promise(r=>setTimeout(r,d));return api(path,opt,tries+1);}
  let body=null;try{body=await res.json()}catch(e){}
  if(!res.ok){const m=body&&body.error?(body.error.type||'')+': '+(body.error.message||JSON.stringify(body.error)):res.statusText;
    const hint=res.status===401?'\nYour token was rejected. Check it in Settings.':res.status===403?'\nToken lacks a scope or access to this base (needs data.records:read, data.records:write, schema.bases:read).':res.status===422?'\nAirtable rejected the value – check the field type/options.':'';
    throw new Error('Airtable '+res.status+' '+m+hint);}
  return body;
}
function err(e){const b=$('#err');if(!e){b.hidden=true;return}b.textContent=String(e.message||e);b.hidden=false;console.error(e)}
function status(t){$('#status').textContent=t||''}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
// ---------- schema & data ----------
const T=()=>S.schema&&S.schema.find(t=>t.id===S.tab);
const C=()=>CFG[S.tab]||{label:T()?T().name:'',score:null,filters:['Status'],card:[],cols:['Name','Status'],edit:[],long:[],info:[]};
const F=n=>{const t=T();return t&&t.fields.find(f=>f.name===n)};
const has=n=>!!F(n);
const primary=()=>T().fields.find(f=>f.id===T().primaryFieldId)||T().fields[0];
async function loadSchema(){const b=await api('meta/bases/'+S.base+'/tables');S.schema=b.tables;
  if(!S.schema.find(t=>t.id===S.tab))S.tab=S.schema[0].id;}
async function loadRecords(id,force){if(S.recs[id]&&!force)return S.recs[id];let all=[],off;
  do{const p=new URLSearchParams({pageSize:'100'});if(off)p.set('offset',off);status('Loading records… '+all.length);
    const b=await api(S.base+'/'+id+'?'+p);all=all.concat(b.records);off=b.offset;}while(off);
  S.recs[id]=all;status(all.length+' records · '+((S.schema.find(t=>t.id===id)||{}).name||''));return all;}
async function patch(id,fields,tid){tid=tid||tabOf(id)||S.tab;const b=await api(S.base+'/'+tid+'/'+id,{method:'PATCH',body:JSON.stringify({fields,typecast:false})});
  const L=S.recs[tid],i=L.findIndex(r=>r.id===id);if(i>=0)L[i]=b;return b;}
async function create(fields){const b=await api(S.base+'/'+S.tab,{method:'POST',body:JSON.stringify({fields})});S.recs[S.tab].unshift(b);return b;}
// ---------- helpers ----------
const val=(r,n)=>r.fields[n];
const show=v=>Array.isArray(v)?v.join(', '):typeof v==='boolean'?(v?'Yes':'No'):v==null?'':v;
const name=r=>val(r,primary().name)||'(unnamed)';
const score=r=>{const s=C().score;return s&&has(s)?(+val(r,s)||0):0};
function linkify(t){return H(t).replace(/(https?:\/\/[^\s;,<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')}
function choices(n){const f=F(n);if(!f)return null;if(f.options&&f.options.choices)return f.options.choices.map(c=>c.name);if(!/select/i.test(f.type))return null;return [...new Set((S.recs[S.tab]||[]).map(r=>val(r,n)).flat().filter(Boolean))].sort()}
function filtered(){let L=S.recs[S.tab]||[];const q=S.q.toLowerCase();
  if(q)L=L.filter(r=>JSON.stringify(r.fields).toLowerCase().includes(q));
  for(const[k,v]of Object.entries(S.flt))if(v)L=L.filter(r=>{const x=val(r,k);return Array.isArray(x)?x.includes(v):String(x==null?'':x)===v});
  const s=S.sort||{k:C().score&&has(C().score)?C().score:primary().name,d:-1};
  return L.slice().sort((a,b)=>{const x=val(a,s.k),y=val(b,s.k);if(typeof x==='number'||typeof y==='number')return ((+x||0)-(+y||0))*s.d;return String(x||'').localeCompare(String(y||''))*s.d});}
// ---------- render ----------
function nav(){$('#tables').innerHTML=S.schema.map(t=>`<button data-t="${t.id}" class="${t.id===S.tab&&!combined()?'on':''}">${H((CFG[t.id]||{}).label||t.name)}</button>`).join('');
  document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.view));
  $('#addBtn').hidden=!C().addable;}
function filterBar(){const opts=C().filters.filter(has).map(n=>{let c=choices(n);if(!c)c=[...new Set((S.recs[S.tab]||[]).map(r=>val(r,n)).flat().filter(x=>x!=null&&x!==''))].sort();
  return `<select data-f="${H(n)}"><option value="">${H(n)}: all</option>${c.map(o=>`<option ${S.flt[n]===o?'selected':''}>${H(o)}</option>`).join('')}</select>`}).join('');
  const sc=C().score&&has(C().score)?`<select id="sortSel"><option value="${H(C().score)}|-1">${H(C().score)} ↓</option><option value="${H(C().score)}|1">${H(C().score)} ↑</option><option value="${H(primary().name)}|1">Name A–Z</option></select>`:'';
  return `<div class="filters"><input id="q" placeholder="Search…" value="${H(S.q)}">${opts}${sc}<button class="ghost" id="clr" style="color:#333;border-color:#ccc">Clear</button></div>`;}
function cardHTML(r){const c=C();return `<div class="cardi" draggable="true" data-id="${r.id}"><b>${H(name(r))}</b>
 <div class="m">${c.card.filter(has).map(n=>H(show(val(r,n)))).filter(Boolean).join(' · ')}</div>
 ${c.score&&has(c.score)?`<span class="pill r">${H(c.score)} ${H(show(val(r,c.score)))}</span>`:''}${has('Next follow-up')&&val(r,'Next follow-up')?`<span class="pill">Follow-up ${H(val(r,'Next follow-up'))}</span>`:''}</div>`}
function modeBar(){return `<div class="modebar seg2"><button data-mode="combined" class="${S.mode==='combined'?'on':''}">Combined</button><button data-mode="single" class="${S.mode!=='combined'?'on':''}">Single table</button></div>`}
function unionStatuses(tabs){const seen=[];tabs.forEach(t=>inTab(t,()=>(choices('Status')||[]).forEach(c=>{if(!seen.includes(c))seen.push(c)})));
  const rk=c=>{const i=STATUS_ORDER.indexOf(c);return i<0?STATUS_ORDER.length+seen.indexOf(c):i};return seen.sort((a,b)=>rk(a)-rk(b));}
function renderLanes(m){const tabs=laneTabs();status(tabs.map(t=>LANES[t]+' '+(S.recs[t]||[]).length).join(' · ')+' records');const st=unionStatuses(tabs);const noStat=tabs.some(t=>inTab(t,()=>filtered().some(r=>!val(r,'Status'))));const groups=noStat?[...st,'']:st;
  const lanes=tabs.map(t=>inTab(t,()=>{const L=filtered(),own=choices('Status')||[];const coll=!!S.collapsed[t];
    const cells=groups.map(s=>{const items=L.filter(r=>(val(r,'Status')||'')===s);const na=s&&!own.includes(s);
      return `<div class="col cell${na?' na':''}" data-s="${H(s)}" data-t="${t}" title="${na?H(s)+' is not a status in this table':''}">${coll?`<div class="small">${items.length||''}</div>`:items.slice(0,200).map(cardHTML).join('')+(items.length>200?`<div class="small">+${items.length-200} more</div>`:'')}</div>`}).join('');
    return `<div class="lane${coll?' coll':''}" data-lane="${t}"><div class="laneh" data-tog="${t}"><span class="car">${coll?'▸':'▾'}</span> ${H(LANES[t])} <span class="cnt">${L.length}</span></div><div class="lrow">${cells}</div></div>`}));
  m.innerHTML=modeBar()+`<div class="filters"><input id="q" placeholder="Search both tables…" value="${H(S.q)}"></div>`+
   `<div class="lanes" style="--n:${groups.length}"><div class="lrow lhead">${groups.map(s=>`<h3>${H(s||'No status')}<span>${tabs.reduce((n,t)=>n+inTab(t,()=>filtered().filter(r=>(val(r,'Status')||'')===s).length),0)}</span></h3>`).join('')}</div>${lanes.join('')}</div>`;
  document.querySelectorAll('[data-tog]').forEach(h=>h.onclick=()=>{const t=h.dataset.tog;S.collapsed[t]=!S.collapsed[t];localStorage.setItem(LS.col,JSON.stringify(S.collapsed));render()});
  dnd();}
function render(){nav();err(null);const m=$('#main');
  if(combined()){renderLanes(m);wire();return}
  const L=filtered();
  if(S.view==='kanban'){const st=choices('Status')||[];const groups=[...st,''];
    m.innerHTML=modeBar()+filterBar()+`<div class="board">${groups.map(s=>{const items=L.filter(r=>(val(r,'Status')||'')===s);if(s===''&&!items.length)return'';
      return `<div class="col" data-s="${H(s)}"><h3>${H(s||'No status')}<span>${items.length}</span></h3>${items.slice(0,200).map(cardHTML).join('')}${items.length>200?`<div class="small">+${items.length-200} more (use List)</div>`:''}</div>`}).join('')}</div>`;
    dnd();}
  else if(S.view==='list'){const cols=C().cols.filter(has);
    m.innerHTML=filterBar()+`<div class="small">${L.length} shown</div><div style="overflow-x:auto"><table><thead><tr>${cols.map(c=>`<th data-k="${H(c)}">${H(c)}</th>`).join('')}</tr></thead><tbody>${L.map(r=>`<tr data-id="${r.id}">${cols.map(c=>`<td>${H(show(val(r,c)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  else{const t=today();const all=S.recs[S.tab]||[];
    const due=has('Next follow-up')?all.filter(r=>val(r,'Next follow-up')&&val(r,'Next follow-up')<=t).sort((a,b)=>val(a,'Next follow-up').localeCompare(val(b,'Next follow-up'))):null;
    const first=C().todo&&(choices('Status')||[]).includes(C().todo)?C().todo:(choices('Status')||[])[0];const top=all.filter(r=>val(r,'Status')===first).sort((a,b)=>score(b)-score(a)).slice(0,10);
    m.innerHTML=`<div class="sec"><h2>Follow-ups due (on or before ${t})</h2>${due===null?'<div class="empty">This table has no “Next follow-up” field.</div>':due.length?due.map(cardHTML).join(''):'<div class="empty">Nothing due. 🎉</div>'}</div>
    <div class="sec"><h2>Top 10 “${H(first||'')}” by ${H(C().score||'order')}</h2>${top.length?top.map(cardHTML).join(''):'<div class="empty">None.</div>'}</div>`;}
  wire();}
function wire(){document.querySelectorAll('[data-id]').forEach(e=>e.onclick=()=>openRec(e.dataset.id));
  const q=$('#q');if(q){q.oninput=()=>{S.q=q.value;clearTimeout(q._t);q._t=setTimeout(()=>{render();const n=$('#q');n.focus();n.setSelectionRange(n.value.length,n.value.length)},250)};}
  document.querySelectorAll('[data-f]').forEach(s=>s.onchange=()=>{S.flt[s.dataset.f]=s.value;render()});
  const ss=$('#sortSel');if(ss){if(S.sort)ss.value=S.sort.k+'|'+S.sort.d;ss.onchange=()=>{const[k,d]=ss.value.split('|');S.sort={k,d:+d};render()}}
  document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;S.sort={k,d:S.sort&&S.sort.k===k?-S.sort.d:-1};render()});
  const c=$('#clr');if(c)c.onclick=()=>{S.q='';S.flt={};S.sort=null;render()};}
function dnd(){document.querySelectorAll('.cardi').forEach(c=>c.ondragstart=e=>{e.dataTransfer.setData('text/plain',c.dataset.id)});
  document.querySelectorAll('.col').forEach(col=>{col.ondragover=e=>{e.preventDefault();col.classList.add('over')};col.ondragleave=()=>col.classList.remove('over');
    col.ondrop=async e=>{e.preventDefault();col.classList.remove('over');const id=e.dataTransfer.getData('text/plain'),s=col.dataset.s;if(!s)return;
      const tid=tabOf(id);if(!tid)return;const r=S.recs[tid].find(x=>x.id===id);if(!r||val(r,'Status')===s)return;
      const own=inTab(tid,()=>choices('Status')||[]);const tn=LANES[tid]||(CFG[tid]||{}).label||tid;
      if(!own.includes(s)){toast('“'+s+'” is not a status in '+tn+' – move rejected');return}
      if(col.dataset.t&&col.dataset.t!==tid){toast('Lane is set by the source table – cannot move a '+tn+' card to '+(LANES[col.dataset.t]||col.dataset.t));return}
      const old=val(r,'Status');r.fields.Status=s;render();
      try{await patch(id,{Status:s},tid);toast('Moved to '+s)}catch(x){r.fields.Status=old;render();err(x)}};});}
// ---------- drawer ----------
function input(n,v){const f=F(n);if(!f)return'';const t=f.type,id='e_'+f.id;let h;
  if(t==='singleSelect'){const cs=choices(n)||[];if(v&&!cs.includes(v))cs.push(v);h=`<select id="${id}"><option value="">—</option>${cs.map(c=>`<option ${c===v?'selected':''}>${H(c)}</option>`).join('')}</select>`;}
  else if(t==='multipleSelects')h=(choices(n)||[]).map(c=>`<label style="display:inline;text-transform:none;font-weight:400"><input type="checkbox" data-ms="${id}" value="${H(c)}" ${(v||[]).includes(c)?'checked':''} style="width:auto"> ${H(c)}</label> `).join('');
  else if(t==='checkbox')h=`<input id="${id}" type="checkbox" ${v?'checked':''} style="width:auto">`;
  else if(t==='date')h=`<input id="${id}" type="date" value="${H(v||'')}">`;
  else if(t==='number'||t==='percent'||t==='currency')h=`<input id="${id}" type="number" step="any" value="${H(v==null?'':v)}">`;
  else if(t==='multilineText'||t==='richText')h=`<textarea id="${id}">${H(v||'')}</textarea>`;
  else if(['singleLineText','phoneNumber','url','email'].includes(t))h=`<input id="${id}" type="${t==='url'?'url':t==='email'?'email':t==='phoneNumber'?'tel':'text'}" value="${H(v||'')}">`;
  else return `<div class="f"><label>${H(n)}</label><div>${H(show(v))} <span class="small">(read-only type ${H(t)})</span></div></div>`;
  return `<div class="f"><label for="${id}">${H(n)}</label>${h}</div>`;}
function readInput(n){const f=F(n),id='e_'+f.id,t=f.type;
  if(t==='multipleSelects')return [...document.querySelectorAll(`[data-ms="${id}"]:checked`)].map(x=>x.value);
  const e=document.getElementById(id);if(!e)return undefined;if(t==='checkbox')return e.checked;
  if(['number','percent','currency'].includes(t))return e.value===''?null:+e.value;return e.value===''?null:e.value;}
const editable=n=>{const f=F(n);return f&&!['formula','rollup','lookup','createdTime','lastModifiedTime','autoNumber','button','count'].includes(f.type)};
function openRec(id){const tt=tabOf(id);if(tt&&tt!==S.tab){S.tab=tt;nav()}const r=S.recs[S.tab].find(x=>x.id===id);if(!r)return;S.open=id;const c=C();
  $('#dTitle').textContent=name(r);const tel=has('Phone')&&val(r,'Phone'),web=has('Website')&&val(r,'Website'),maps=has('Google Maps')&&val(r,'Google Maps');
  const canLog=has('Last contact')&&has('Notes');
  $('#dBody').innerHTML=`<div class="qa">${tel?`<a href="tel:${H(String(tel).replace(/[^+\d]/g,''))}">📞 Call ${H(tel)}</a>`:''}${web?`<a href="${H(web)}" target="_blank" rel="noopener">🌐 Website</a>`:''}${maps?`<a href="${H(maps)}" target="_blank" rel="noopener">📍 Maps</a>`:''}
   ${canLog?'<button class="btn" id="logBtn">Log call</button>':'<span class="small">Log call needs “Last contact” and “Notes” fields in this table.</span>'}</div>
   <div id="logBox"></div>
   <div>${c.edit.filter(editable).map(n=>input(n,val(r,n))).join('')}</div>
   <div class="row"><button class="btn" id="saveRec">Save changes</button></div>
   ${c.long.filter(has).filter(n=>val(r,n)).map(n=>`<div class="f"><label>${H(n)}</label><div class="long">${linkify(val(r,n))}</div></div>`).join('')}
   <div class="f"><label>Details</label>${c.info.filter(has).filter(n=>val(r,n)!=null&&val(r,n)!=='').map(n=>`<div><b>${H(n)}:</b> ${F(n).type==='url'?`<a href="${H(val(r,n))}" target="_blank" rel="noopener">${H(val(r,n))}</a>`:H(show(val(r,n)))}</div>`).join('')||'<span class="small">—</span>'}</div>`;
  $('#drawer').hidden=false;$('#scrim').hidden=false;
  $('#saveRec').onclick=async()=>{const ch={};for(const n of c.edit.filter(editable)){const v=readInput(n);const o=val(r,n);if(v===undefined)continue;
      const same=JSON.stringify(v==null||v===false?null:v)===JSON.stringify(o==null||o===false?null:o);if(!same)ch[n]=v;}
    if(!Object.keys(ch).length){toast('No changes');return}
    try{$('#saveRec').disabled=true;await patch(r.id,ch);toast('Saved');render();openRec(r.id)}catch(e){err(e);$('#saveRec').disabled=false}};
  const lb=$('#logBtn');if(lb)lb.onclick=()=>{$('#logBox').innerHTML=`<div class="logbox"><div class="f"><label>Call note</label><textarea id="logNote" placeholder="What happened?"></textarea></div>
     ${has('Next follow-up')?'<div class="f"><label>Next follow-up (optional)</label><input id="logNext" type="date"></div>':''}
     ${has('Status')?input('Status',val(r,'Status')).replace('id="e_','id="log_'):''}<button class="btn" id="logSave">Save call log</button></div>`;
    $('#logSave').onclick=()=>logCall(r)};}
async function logCall(r){const note=($('#logNote').value||'').trim();const d=new Date();
  const stamp=today()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const prev=val(r,'Notes')||'';const fields={'Last contact':today(),'Notes':(prev?prev.replace(/\s+$/,'')+'\n':'')+'['+stamp+'] Call'+(note?': '+note:'')};
  const nx=$('#logNext');if(nx&&nx.value)fields['Next follow-up']=nx.value;
  const s=document.querySelector('[id^="log_"]');if(s&&s.value&&s.value!==val(r,'Status'))fields.Status=s.value;
  try{$('#logSave').disabled=true;await patch(r.id,fields);toast('Call logged');render();openRec(r.id)}catch(e){err(e);$('#logSave').disabled=false}}
function closeDrawer(){$('#drawer').hidden=true;$('#scrim').hidden=true;S.open=null}
function addForm(){const t=T();S.open=null;$('#dTitle').textContent='New '+((CFG[t.id]||{}).label||t.name)+' prospect';
  const fs=t.fields.filter(f=>editable(f.name));
  $('#dBody').innerHTML=fs.map(f=>input(f.name,f.name==='Status'?(choices('Status')||[])[0]:null)).join('')+'<div class="row"><button class="btn" id="createRec">Create record</button></div>';
  $('#drawer').hidden=false;$('#scrim').hidden=false;
  $('#createRec').onclick=async()=>{const fields={};for(const f of fs){const v=readInput(f.name);if(v!=null&&v!==''&&!(Array.isArray(v)&&!v.length)&&v!==false)fields[f.name]=v}
    if(!fields[primary().name]){err('Please enter a '+primary().name+'.');return}
    try{$('#createRec').disabled=true;const b=await create(fields);toast('Created');render();openRec(b.id)}catch(e){err(e);$('#createRec').disabled=false}};}
// ---------- settings & boot ----------
function settings(open){$('#settings').hidden=!open;if(open){$('#tok').value=S.tok;$('#base').value=S.base}}
async function boot(){if(MOCK&&!S.tok)S.tok='mock';if(!S.tok){settings(true);return}
  try{status('Loading schema…');await loadSchema();await loadRecords(S.tab);if(combined())for(const t of laneTabs())await loadRecords(t);render();if(QP.get('open'))openRec(QP.get('open'))}catch(e){err(e);status('');if(/401|403/.test(e.message))settings(true)}}
$('#saveTok').onclick=()=>{const t=$('#tok').value.trim(),b=$('#base').value.trim();if(!t){alert('Paste a token first.');return}
  S.tok=t;S.base=b;localStorage.setItem(LS.tok,t);localStorage.setItem(LS.base,b);S.recs={};settings(false);boot()};
$('#forget').onclick=()=>{localStorage.removeItem(LS.tok);S.tok='';S.recs={};S.schema=null;$('#main').innerHTML='';$('#tok').value='';toast('Token removed from this browser')};
$('#closeSet').onclick=()=>settings(false);$('#settingsBtn').onclick=()=>settings(true);
$('#tables').onclick=async e=>{const b=e.target.closest('button');if(!b)return;S.tab=b.dataset.t;localStorage.setItem(LS.tab,S.tab);S.flt={};S.q='';S.sort=null;if(S.view==='kanban'&&S.mode==='combined'){S.mode='single';localStorage.setItem(LS.mode,S.mode)}
  try{nav();await loadRecords(S.tab);render()}catch(x){err(x)}};
async function ensureLanes(){if(combined())for(const t of laneTabs())await loadRecords(t);}
$('#views').onclick=async e=>{const b=e.target.closest('button');if(!b)return;S.view=b.dataset.v;localStorage.setItem(LS.view,S.view);if(S.schema){try{await ensureLanes();render()}catch(x){err(x)}}};
$('#main').addEventListener('click',async e=>{const b=e.target.closest('[data-mode]');if(!b)return;S.mode=b.dataset.mode;localStorage.setItem(LS.mode,S.mode);S.flt={};try{await ensureLanes();render()}catch(x){err(x)}});
$('#refresh').onclick=async()=>{try{if(combined())for(const t of laneTabs())await loadRecords(t,true);else await loadRecords(S.tab,true);render()}catch(e){err(e)}};
$('#addBtn').onclick=addForm;$('#dClose').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
window.__crm={S,LANES,unionStatuses,patch,logCall,render,openRec};boot();
})();
