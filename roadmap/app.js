// 2026 Roadmap: read-only view of the baked Linear snapshot in data.json (no API keys in the browser).
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt=d=>{if(!d)return 'no date';const [y,m,dd]=d.split('-').map(Number);return `${dd} ${MON[m-1]}`};
const day=d=>Date.UTC(...(d.split('-').map((n,i)=>i==1?n-1:+n)));
const T0=day('2026-10-01'),T1=day('2027-01-01'),SPAN=T1-T0;
const pos=d=>Math.max(0,Math.min(100,(day(d)-T0)/SPAN*100));
const BL={now:'Now',next:'Next',later:'Later',beyond:'After 2026',null:'No date'};
let D;

const card=i=>`<a class="card" href="${esc(i.url)}" target="_blank" rel="noopener" title="Open ${esc(i.id)} in Linear"><span class="meta"><span class="id">${esc(i.id)}</span><span class="st ${esc(i.statusType)}">${esc(i.status)}</span></span><span class="tt">${esc(i.title)}</span></a>`;
const krSort=(a,b)=>(a.targetDate||'9').localeCompare(b.targetDate||'9')||a.name.localeCompare(b.name);

function okrs(){
  $('#okrs').innerHTML=D.streams.map(s=>`<article class="okr" style="border-top-color:${esc(s.color||'#161616')}">
  <h2><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.short)}</a><span class="d">${s.keyResults.length} KRs</span></h2>
  <p class="obj"><small>Objective</small>${esc(s.objective)}</p>
  <ul>${s.keyResults.map(k=>`<li><span class="t">${esc(k.name)}</span><span class="d">${fmt(k.targetDate)}</span><span class="pill ${k.bucket||'none'}">${BL[k.bucket]}</span></li>`).join('')}</ul></article>`).join('');
}

function nnl(){
  const P=D.phases;let h=`<div class="board"><div></div>`+P.map(p=>`<div class="colh ${p.key}">${p.label}<small>${p.phase} · ${fmt(p.start)} – ${fmt(p.end)}</small></div>`).join('');
  D.streams.forEach(s=>{
    h+=`<div class="lane" style="border-left:4px solid ${esc(s.color)}">${esc(s.short)}<small>${esc(s.objective)}</small></div>`;
    P.forEach(p=>{const ks=s.keyResults.filter(k=>k.bucket===p.key).sort(krSort);
      h+=`<div class="cell ${ks.length?'':'empty'}" data-col="${p.label}">`+ks.map(k=>`<div class="kr" style="border-left-color:${esc(s.color)}"><h3>${esc(k.name)}<span class="d">by ${fmt(k.targetDate)}</span></h3>${k.issues.map(card).join('')||'<span class="d">No issues yet</span>'}</div>`).join('')+`</div>`});
    const odd=s.keyResults.filter(k=>!['now','next','later'].includes(k.bucket));
    if(s.unassigned.length||odd.length)h+=`<div class="loose">${s.unassigned.length?`<b>No key result:</b> ${s.unassigned.map(card).join('')}`:''}${odd.length?` <b>Unscheduled KRs:</b> ${odd.map(k=>esc(k.name)).join(', ')}`:''}</div>`;
  });
  $('#view').innerHTML=h+`</div>`;
}

function timeline(){
  const months=[[2026,9],[2026,10],[2026,11]];let mh='',gl='';
  months.forEach(([y,m])=>{const s=Date.UTC(y,m,1),e=Date.UTC(y,m+1,1),l=(s-T0)/SPAN*100,w=(e-s)/SPAN*100;
    mh+=`<span class="m" style="left:${l}%;width:${w}%">${MON[m]} ${y}</span>`;gl+=`<i class="m" style="left:${l}%"></i>`});
  for(let t=day('2026-10-05');t<T1;t+=7*864e5){const l=(t-T0)/SPAN*100,d=new Date(t);mh+=`<span class="w" style="left:${l}%">${d.getUTCDate()}</span>`;gl+=`<i style="left:${l}%"></i>`}
  const pc={now:'#fbe9eb',next:'#fff4d6',later:'#e6eefb'};
  D.phases.forEach(p=>{const l=pos(p.start),w=pos(p.end)+100/92-l;mh+=`<span class="ph" style="left:${l}%;width:${w}%;background:${pc[p.key]}" title="${p.label}"></span>`;gl+=`<span class="band" style="left:${l}%;width:${w}%;background:${pc[p.key]}"></span>`});
  const td=new Date().toISOString().slice(0,10);if(td>='2026-10-01'&&td<='2026-12-31')gl+=`<i class="today" style="left:${pos(td)}%"><b>Today</b></i>`;
  const ph=Object.fromEntries(D.phases.map(p=>[p.key,p]));
  let rows='';
  D.streams.forEach(s=>{rows+=`<div class="trow sh" style="border-left:4px solid ${esc(s.color)}">${esc(s.short)}<small>${esc(s.objective)}</small></div>`;
    s.keyResults.slice().sort(krSort).forEach(k=>{
      if(!k.targetDate){rows+=`<div class="trow"><div class="lbl">${esc(k.name)} <span class="d">no target date</span></div><div class="track">${k.issues.map(i=>`<a class="chip" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.id)}</a>`).join(' ')}</div></div>`;return}
      const start=k.startsPhase1?D.phases[0].start:(ph[k.bucket]||D.phases[0]).start;const l=pos(start),r=pos(k.targetDate)+100/92;
      rows+=`<div class="trow"><div class="lbl">${esc(k.name)}<br><span class="d">${fmt(start)} → ${fmt(k.targetDate)} · ${BL[k.bucket]}</span></div><div class="track"><div class="bar ${k.bucket}" style="left:${l}%;width:${r-l}%" title="${esc(k.description)}">${k.issues.map(i=>`<a class="chip" href="${esc(i.url)}" target="_blank" rel="noopener" title="${esc(i.title)} (${esc(i.status)})">${esc(i.id)}</a>`).join('')}<span class="nm">${esc(k.issues.map(i=>i.status).join(', '))}</span><span class="end"></span></div></div></div>`});
    if(s.unassigned.length)rows+=`<div class="trow"><div class="lbl"><i>No key result</i></div><div class="track" style="padding:6px 0">${s.unassigned.map(i=>`<a class="chip" href="${esc(i.url)}" target="_blank" rel="noopener" title="${esc(i.title)} (${esc(i.status)})">${esc(i.id)}</a> <span class="d">${esc(i.title)}</span>`).join(' ')}</div></div>`;
  });
  $('#view').innerHTML=`<div class="tl"><div class="tl-in"><div class="grid-lines">${gl}</div><div class="months"><div></div><div class="mhead">${mh}</div></div>${rows}</div></div>`;
}

function show(){const v=location.hash==='#timeline'?'timeline':'nnl';
  document.querySelectorAll('.view').forEach(b=>{const on=b.dataset.view===v;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  v==='timeline'?timeline():nnl()}
document.querySelectorAll('.view').forEach(b=>b.onclick=()=>{location.hash=b.dataset.view==='timeline'?'timeline':'now-next-later'});
window.addEventListener('hashchange',show);
$('#print').onclick=()=>window.print();

fetch('data.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{D=d;
  const g=new Date(d.generatedAt),when=g.toLocaleString('en-IE',{timeZone:'Europe/Dublin',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const nk=d.streams.reduce((a,s)=>a+s.keyResults.length,0),ni=d.streams.reduce((a,s)=>a+s.unassigned.length+s.keyResults.reduce((b,k)=>b+k.issues.length,0),0);
  $('#legend').innerHTML=`Data from ${esc(d.source)} · snapshot <b>${when}</b> (Irish time) · ${d.streams.length} streams, ${nk} key results, ${ni} issues. Key results are Linear milestones, bucketed by target date: Now ≤ 8 Nov, Next ≤ 6 Dec, Later ≤ 31 Dec. Cards open in Linear.`;
  $('#foot').innerHTML=`Read-only snapshot baked into <code>roadmap/data.json</code>; no Linear key is used in the browser. To refresh, see <code>scripts/refresh-roadmap.md</code>.`;
  okrs();show()}).catch(e=>{$('#legend').textContent='Could not load data.json: '+e});
