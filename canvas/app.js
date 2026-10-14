const KEY='drumreach-lean-canvas-v2',E='evidence',A='assumption';
const DEFAULT={title:'Process Power – operational AI that gives your team time back',boxes:{
problem:[['Skilled staff retype and reconcile data across ERP, Excel and Microsoft',A],['Quotes, tenders, spec sheets, compliance paperwork and month-end reports are manual',A],['Decisions run on days-old numbers',A],['Hypothesis to validate in first calls: “How many hours a week does your team spend moving data between systems?”',A]],
alternatives:[['Microsoft partners and ERP resellers (e.g. ProStrategy)',E],['Dublin AI consultancies',E],['Big Four',E],['Hiring a data person',E],['Doing nothing in Excel',E]],
solution:[['AI readiness assessment plus roadmap',E],['Rapid prototypes in about 6 weeks',E],['Forward-deployed engineer on retainer',E],['Pilots in data analysis, market research, data harvesting and Power Apps',E]],
metrics:[['Discovery calls booked',E],['Assessments sold',E],['Pilot-to-retainer conversion',E],['Monthly recurring revenue',E],['Hours saved per client',E]],
uvp:[['We help growing Cork and Kerry firms turn the data and paperwork already sitting in their Microsoft and ERP systems into working AI tools in weeks, so their teams spend less time on admin and make faster decisions without hiring.',E]],
concept:[['Process Power: operational AI that gives your team time back',E],['Your own AI engineer, on call, for less than the cost of a hire.',E]],
advantage:[['Local and in person in Cork and Kerry',E],['Builds working tools in weeks rather than selling licences',E],['Agent-run delivery engine that keeps costs low (partly an assumption)',A]],
channels:[['Personalised branded landing pages per prospect (7 built)',E],['Direct outreach to named decision-makers',E],['Email to limited companies with an opt-out (marketing calls to mobiles need consent under Irish ePrivacy rules)',E],['LinkedIn',E],['Local referrals (e.g. CSG)',E],['Cork Chamber',E]],
segments:[['Cork and Kerry manufacturers, distributors and engineering firms, roughly 50–1,000 staff',E],['On Microsoft 365, Power BI or SAP/IFS ERP',E],['Budget for a €3–5k/month retainer',E]],
adopters:[['MIG Fermoy',E],['EPS Group Mallow',E],['Tricel Killarney (hiring a Data Manager)',E],['Barry Group Mallow',E],['Cygnum Macroom',E]],
costs:[['Founder time — TBD',A],['AI/API and tooling costs — TBD',A],['Microsoft and Power Platform dev licences — TBD',A],['Hosting — TBD',A],['Outreach tools — TBD',A],['Insurance — TBD',A]],
revenue:[['€3–5k/month retainer',E],['Paid readiness assessment or pilot as the entry point (price TBD)',A],['10–20 clients ≈ €360k–€1.2m a year',E]]}};
const LAYOUT=[['p','problem','Problem',1,'alternatives','Existing alternatives'],['s','solution','Solution',4],['m','metrics','Key Metrics',8],['u','uvp','Unique Value Proposition',3,'concept','High-level concept'],['a','advantage','Unfair Advantage',9],['h','channels','Channels',5],['c','segments','Customer Segments',2,'adopters','Early adopters'],['x','costs','Cost Structure',7],['r','revenue','Revenue Streams',6]];
const NAMES={};LAYOUT.forEach(l=>{NAMES[l[1]]=l[2];if(l[4])NAMES[l[4]]=l[5]});
const clone=o=>JSON.parse(JSON.stringify(o));
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!S||!S.boxes)S=clone(DEFAULT);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(S));const s=document.getElementById('saved');s.textContent='Saved ✓';clearTimeout(save.t);save.t=setTimeout(()=>s.textContent='',1200)};
function list(k){const ul=document.createElement('ul');(S.boxes[k]||(S.boxes[k]=[])).forEach((it,i)=>{const li=document.createElement('li');
const t=document.createElement('div');t.className='t';t.contentEditable='true';t.textContent=it[0];t.oninput=()=>{it[0]=t.textContent;save()};
const g=document.createElement('button');g.className='tag '+it[1];g.textContent=it[1];g.title='Toggle evidence / assumption';g.onclick=()=>{it[1]=it[1]===E?A:E;save();render()};
const d=document.createElement('button');d.className='del';d.textContent='×';d.title='Remove';d.onclick=()=>{S.boxes[k].splice(i,1);save();render()};
li.append(t,g,d);ul.append(li)});const add=document.createElement('button');add.className='add';add.textContent='+ Add item';
add.onclick=()=>{S.boxes[k].push(['New item',A]);save();render();const ts=document.querySelectorAll(`[data-k="${k}"] .t`);ts[ts.length-1].focus()};
const w=document.createElement('div');w.dataset.k=k;w.append(ul,add);return w}
function render(){document.getElementById('title').textContent=S.title;const g=document.getElementById('grid');g.innerHTML='';
LAYOUT.forEach(([area,k,name,n,sk,sn])=>{const b=document.createElement('section');b.className='box '+k;b.style.gridArea=area;
b.innerHTML=`<h2>${name}<span class="n">${n}</span></h2>`;b.append(list(k));
if(sk){const s=document.createElement('div');s.className='sub';s.innerHTML=`<h3>${sn}</h3>`;s.append(list(sk));b.append(s)}g.append(b)})}
document.getElementById('title').oninput=e=>{S.title=e.target.textContent;save()};
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function md(){let o=`# ${S.title}\n\n_Lean Canvas. Tags: [evidence] / [assumption]._\n`;LAYOUT.forEach(l=>[[l[1],l[2]],l[4]?[l[4],l[5]]:null].filter(Boolean).forEach(([k,n])=>{o+=`\n## ${n}\n\n`+S.boxes[k].map(i=>`- ${i[0]} [${i[1]}]`).join('\n')+'\n'}));return o+'\n'+FOOT_MD}
document.getElementById('exJson').onclick=()=>dl('lean-canvas.json',JSON.stringify(S,null,2),'application/json');
document.getElementById('exMd').onclick=()=>dl('lean-canvas.md',md(),'text/markdown');
document.getElementById('print').onclick=()=>window.print();
document.getElementById('reset').onclick=()=>{if(confirm('Reset the canvas to the default Process Power content? Your edits will be lost.')){S=clone(DEFAULT);localStorage.removeItem(KEY);render()}};
const SRC='https://www.cso.ie/en/releasesandpublications/ep/p-biiilb/businessinireland2024-insightsonthelifecycleofbusinesses/keyfindings/';
const FOOT_MD=`Market note (estimate): about 750 Irish firms with 50+ staff in Cork and Kerry, estimated from the CSO 2024 national count (4,835 medium plus 958 large) × about 13% (Cork ~10%, Kerry ~3%). Source: ${SRC}\n`;
document.getElementById('foot').innerHTML=`<b>Market note</b> <span class="tag assumption">estimate</span> — about <b>750</b> Irish firms with 50+ staff in Cork and Kerry, estimated from the CSO 2024 national count (4,835 medium plus 958 large) × about 13% (Cork ~10%, Kerry ~3%). Source: <a href="${SRC}" target="_blank" rel="noopener">CSO, Business in Ireland 2024 – key findings</a>.`;
render();
