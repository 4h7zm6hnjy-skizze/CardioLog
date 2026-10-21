'use strict';
(()=>{
const VERSION='1.0.4';
const KEY='cardiolog.data.v1';
const OLD_KEY='pulspilot.data.v1';
const LIMIT_DEFAULT={highSys:135,highDia:85,lowSys:90,lowDia:60,lowPulse:50,highPulse:100};
const PERIODS={morning:'Morgens',noon:'Mittags',evening:'Abends'};
const PERIOD_COLORS={morning:'#119A72',noon:'#2373DF',evening:'#9460D6'};
const MEALS={none:'–',breakfast:'Frühstück',lunch:'Mittagessen',dinner:'Abendessen'};
const TIMES={unknown:'',before:'vor dem Essen',after:'nach dem Essen',during:'beim Essen',fasting:'nüchtern'};
const SYMPTOMS={none:'Keine',dizziness:'Schwindel / Benommenheit',headache:'Kopfschmerz',chest:'Brustschmerzen',breath:'Neue starke Atemnot',neurologic:'Sprachstörung / Lähmung / Sehstörung',faint:'Ohnmacht / Bewusstseinsstörung',other:'Andere Beschwerden'};
const SEVERE_SYMPTOMS=new Set(['chest','breath','neurologic','faint']);
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
/* Begrenzte, quellenbasierte Offline-Arzneimittelübersicht, KEINE vollständige Interaktionsdatenbank. */
const DRUG_GUIDE={
 bisoprolol:{title:'Bisoprolol (z. B. BisoLich)',aliases:['bisoprolol','bisolich','biso lich'],effects:['Schwindel, Kopfschmerzen und Müdigkeit','Langsamer Puls und niedriger Blutdruck','Kalte Hände oder Füße, Magen-Darm-Beschwerden'],caution:'Bei Asthma bzw. obstruktiver Atemwegserkrankung ist besondere ärztliche Vorsicht geboten: Bronchospasmen und Atembeschwerden sind möglich. Nicht plötzlich eigenständig absetzen.',source:'https://www.zentiva.de/produkte/produktkatalog/bisolich'},
 hct:{title:'Hydrochlorothiazid (HCT)',aliases:['hydrochlorothiazid','hct','hct-1','hct 1'],effects:['Schwindel, niedriger Blutdruck, häufigeres Wasserlassen','Mögliche Salz- und Flüssigkeitsverluste (z. B. niedriger Kalium- oder Natriumspiegel)','Möglicher Anstieg von Harnsäure und Blutzucker; erhöhte Lichtempfindlichkeit'],caution:'Blutwerte (insbesondere Kalium, Natrium und Nierenfunktion) entsprechend ärztlicher Vorgabe kontrollieren. Bei neuen Sehstörungen oder Augenschmerzen umgehend medizinisch abklären.',source:'https://www.apotheken-umschau.de/medikamente/beipackzettel/hct-1a-pharma-125-mg-tabletten-6453151.html'},
 ramipril:{title:'Ramipril',aliases:['ramipril','ramilich'],effects:['Schwindel und Blutdruckabfall','Trockener Reizhusten','Möglicher Anstieg des Kaliumspiegels und Veränderungen der Nierenwerte'],caution:'Bei Schwellung von Gesicht, Lippen oder Zunge bzw. Atemproblemen sofort medizinische Hilfe suchen (mögliches Angioödem).',source:'https://www.patienteninfo-service.de/a-z-liste/r/ramipril-1a-pharma-5mg-tabletten'},
 citalopram:{title:'Citalopram',aliases:['citalopram'],effects:['Übelkeit, trockener Mund, Schwitzen','Schlafstörungen oder Müdigkeit','Kann dosisabhängig das QT-Intervall verlängern (Herzrhythmusrisiko)'],caution:'Ein niedriger Kalium- oder Magnesiumwert erhöht bei Citalopram das Risiko für Herzrhythmusstörungen. Nicht plötzlich eigenständig absetzen.',source:'https://www.patienteninfo-service.de/a-z-liste/c/citalopram-hexal-20mg-filmtabletten'}
};
const DRUG_PAIRS=[
 {a:'bisoprolol',b:'hct',risk:'Erhöhte Aufmerksamkeit',text:'Die blutdrucksenkende Wirkung kann sich verstärken: Schwindel, Schwäche oder niedriger Blutdruck sind möglich. HCT kann zusätzlich die Elektrolyte verändern.',source:'https://www.fachinfo.de/fi/pdf/004419'},
 {a:'ramipril',b:'hct',risk:'Kontrollen wichtig',text:'Zusammen ist ein stärkerer Blutdruckabfall möglich; Nierenfunktion und Elektrolyte sollten ärztlich überwacht werden. Der Kaliumwert kann sich verändern.',source:'https://www.patienteninfo-service.de/a-z-liste/r/ramipril-hexal-comp-5mg125mg-tabletten'},
 {a:'hct',b:'citalopram',risk:'Besondere Vorsicht',text:'HCT kann Kalium/Magnesium senken. Solche Störungen können bei Citalopram das Risiko für Herzrhythmusstörungen (QT-Verlängerung) erhöhen; ärztliche Prüfung einschließlich Elektrolyten, ggf. EKG.',source:'https://www.patienteninfo-service.de/a-z-liste/c/citalopram-hexal-20mg-filmtabletten'},
 {a:'bisoprolol',b:'ramipril',risk:'Blutdruck beobachten',text:'Beide Mittel senken den Blutdruck; bei gemeinsamer Einnahme können niedriger Blutdruck und Schwindel verstärkt auftreten. Ärztlich vereinbarte Behandlung nicht eigenmächtig ändern.',source:'https://www.fachinfo.de/fi/pdf/004419'}
];
function medKeys(m){
 const text=String((m.name||'')+' '+(m.agent||'')).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
 return Object.entries(DRUG_GUIDE).filter(([key,d])=>d.aliases.some(alias=>new RegExp('(^|[^a-z])'+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^a-z])','i').test(text))).map(([key])=>key);
}
function medInfoHtml(m,compact=false){
 const keys=medKeys(m);
 let body=keys.length?keys.map(key=>{const d=DRUG_GUIDE[key];return `<div class="drug-knowledge"><strong>${esc(d.title)} – mögliche Nebenwirkungen (Auswahl)</strong><ul>${d.effects.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="drug-caution">${esc(d.caution)}</p><a href="${esc(d.source)}" target="_blank" rel="noopener noreferrer">Quelle / Fachinformation ansehen ↗</a></div>`}).join(''):'<p class="knowledge-unknown"><strong>Keine geprüften Angaben hinterlegt.</strong> Wirkstoff prüfen und Beipackzettel bzw. Apotheke befragen. Auch „keine Treffer“ bedeutet nicht „sicher“.</p>';
 if(m.effectsCustom)body+=`<p class="user-knowledge"><strong>Eigene Notizen zu Nebenwirkungen (ungeprüft):</strong> ${esc(m.effectsCustom)}</p>`;
 if(m.interactionsCustom)body+=`<p class="user-knowledge"><strong>Eigene Notizen zu Wechselwirkungen (ungeprüft):</strong> ${esc(m.interactionsCustom)}</p>`;
 return `<div class="med-knowledge ${compact?'compact':''}">${body}</div>`;
}
function medPairFindings(meds){
 const findings=[];
 for(let i=0;i<meds.length;i++)for(let j=i+1;j<meds.length;j++){
  const a=new Set(medKeys(meds[i])),b=new Set(medKeys(meds[j]));
  for(const pair of DRUG_PAIRS){if((a.has(pair.a)&&b.has(pair.b))||(a.has(pair.b)&&b.has(pair.a)))findings.push({...pair,first:meds[i].name,second:meds[j].name});}
 }
 return findings;
}
function interactionHtml(meds){
 if(!meds.length)return '<div class="interaction-empty">Noch keine Medikamente eingetragen.</div>';
 const pairs=medPairFindings(meds),unknown=meds.filter(m=>medKeys(m).length===0);
 return `<h2>Wechselwirkungen im aktuellen Medikamentenplan</h2><p class="field-hint">Automatischer Abgleich bei jeder Änderung – nur für die ${Object.keys(DRUG_GUIDE).length} hinterlegten Wirkstoffe und die aufgeführten Kombinationen. <strong>Keine vollständige Sicherheitsprüfung.</strong></p>`
 + (pairs.length?pairs.map(f=>`<div class="interaction-found" role="note"><strong>${esc(f.risk)}: ${esc(f.first)} + ${esc(f.second)}</strong><p>${esc(f.text)}</p><a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">Medizinische Quelle ↗</a></div>`).join(''):'<p class="interaction-empty">Für diese Einträge ist keine der hinterlegten Kombinationen erkannt worden. <strong>Das schließt andere Wechselwirkungen nicht aus.</strong></p>')
 + (unknown.length?`<p class="interaction-unknown"><strong>Ungeprüfte Medikamente (${unknown.length}):</strong> ${unknown.map(m=>esc(m.name)).join(', ')}. Eintrag und Wirkstoff in der Apotheke abgleichen.</p>`:'')
 + '<p class="field-hint">Auch rezeptfreie Medikamente, Nahrungsergänzungsmittel und Bedarfsmedikamente können Wechselwirkungen verursachen. Die Informationen ändern sich mit neuen Fachinformationen.</p>';
}
function updateMedKnowledgePreview(){
 const form=$('medForm');if(!form)return;
 const candidate={id:$('medId').value||'__candidate__',name:$('medName').value.trim(),agent:$('medAgent').value.trim(),effectsCustom:$('medEffectsCustom').value.trim(),interactionsCustom:$('medInteractionsCustom').value.trim()};
 $('medKnowledgePreview').innerHTML= candidate.name||candidate.agent ? `<h3>Automatisch erkannte Informationen</h3>${medInfoHtml(candidate,true)}${interactionHtml([...data.meds.filter(m=>m.id!==candidate.id),candidate])}`:'<p class="field-hint">Gib einen Medikamentennamen oder Wirkstoff ein, um vorhandene Informationen und mögliche Kombinationen direkt anzuzeigen.</p>';
}

const now=()=>new Date();
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=now();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const timeNow=()=>{const d=now();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
const num=v=>v===''||v===null||v===undefined?null:Number(v);
const fmt=(v,digits=0)=>v===null||v===undefined||!Number.isFinite(v)?'–':Number(v).toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const sum=a=>a.reduce((s,v)=>s+v,0);
const avg=a=>a.length?sum(a)/a.length:null;
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanStr=(v,max=1000)=>String(v??'').slice(0,max);
const $=id=>document.getElementById(id);
const all=(sel,el=document)=>[...el.querySelectorAll(sel)];
const decimal=v=>v===''?null:Number(String(v).replace(',','.'));
const dateTime=(r)=>`${r.date||''}T${r.time||'00:00'}`;
const validDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);if(y<1900||y>2200||m<1||m>12||d<1||d>31)return false;const candidate=new Date(y,m-1,d);return candidate.getFullYear()===y&&candidate.getMonth()===m-1&&candidate.getDate()===d};
const validTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const meanArray=(rows,k)=>avg(rows.map(r=>Number(r[k])).filter(Number.isFinite));
const localDate=(s)=>new Date((s||today())+'T12:00:00');
const fromDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dateLabel=date=>validDate(date)?`${date.slice(8,10)}.${date.slice(5,7)}.${date.slice(0,4)}`:date;
const decimalVal=n=>n===null?'':String(n);
function defaults(){return {schema:1,profile:{name:'',dob:'',age:null,height:null,weight:null},limits:{...LIMIT_DEFAULT},bp:[],weights:[],meds:[
{id:'seed-biso',name:'BisoLich',agent:'Bisoprololfumarat',strength:'1,25 mg',reason:'Puls',schedule:'1–0–0 (handschriftlich; bitte prüfen)',time:'',asNeeded:false,notes:'Vom Foto übernommen. Dosierung und Zeitpunkt unbedingt mit der ärztlichen Verordnung abgleichen.',verified:false},
{id:'seed-hct',name:'HCT – 1 A Pharma',agent:'Hydrochlorothiazid',strength:'12,5 mg',reason:'Wasser / Entwässerung (Foto)',schedule:'Bei Bedarf – genaue Dosierung bitte abklären',time:'',asNeeded:true,notes:'Nutzerangabe: bei Bedarf. Handschrift auf der Packung nicht eindeutig, daher keine verbindliche Einnahmeanweisung übernommen.',verified:false}
]}};
function normalize(input){
 const base=defaults();if(!input||typeof input!=='object')return base;
 const p=input.profile&&typeof input.profile==='object'?input.profile:{};
 const bounded=(v,min,max)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null};
 const obj={schema:1,profile:{name:cleanStr(p.name,120),dob:validDate(p.dob)&&p.dob<=today()?p.dob:'',age:bounded(p.age,0,120),height:bounded(p.height,80,250),weight:bounded(p.weight,20,500)},limits:{...LIMIT_DEFAULT,...(input.limits&&typeof input.limits==='object'?input.limits:{})},bp:[],weights:[],meds:[]};
 if(Array.isArray(input.bp))obj.bp=input.bp.filter(r=>r&&validDate(r.date)&&validTime(r.time)&&Number.isInteger(Number(r.sys))&&Number.isInteger(Number(r.dia))&&Number.isInteger(Number(r.pulse))&&Number(r.sys)>=40&&Number(r.sys)<=300&&Number(r.dia)>=25&&Number(r.dia)<=200&&Number(r.sys)>Number(r.dia)&&Number(r.pulse)>=20&&Number(r.pulse)<=250).slice(0,50000).map(r=>({id:cleanStr(r.id||uid(),90),date:r.date,time:r.time,sys:Number(r.sys),dia:Number(r.dia),pulse:Number(r.pulse),period:PERIODS[r.period]?r.period:guessPeriod(r.time),meal:MEALS[r.meal]?r.meal:'none',mealTiming:TIMES[r.mealTiming]!==undefined?r.mealTiming:'unknown',situation:['rest','activity','other'].includes(r.situation)?r.situation:'rest',symptom:SYMPTOMS[r.symptom]?r.symptom:'none',note:cleanStr(r.note,1000)}));
 if(Array.isArray(input.weights))obj.weights=input.weights.filter(r=>r&&validDate(r.date)&&validTime(r.time)&&Number(r.weight)>=20&&Number(r.weight)<=500).slice(0,50000).map(r=>({id:cleanStr(r.id||uid(),90),date:r.date,time:r.time,weight:Number(r.weight),note:cleanStr(r.note,500)}));
 if(Array.isArray(input.meds))obj.meds=input.meds.filter(r=>r&&r.name).slice(0,300).map(r=>({id:cleanStr(r.id||uid(),90),name:cleanStr(r.name,120),agent:cleanStr(r.agent,120),strength:cleanStr(r.strength,60),reason:cleanStr(r.reason,120),schedule:cleanStr(r.schedule,180),time:validTime(r.time)?r.time:'',asNeeded:!!r.asNeeded,notes:cleanStr(r.notes,600),effectsCustom:cleanStr(r.effectsCustom,2000),interactionsCustom:cleanStr(r.interactionsCustom,2000),verified:!!r.verified}));
 const ranges={highSys:[90,200],highDia:[60,125],lowSys:[60,120],lowDia:[35,90],lowPulse:[30,90],highPulse:[70,180]};
 for(const k of Object.keys(LIMIT_DEFAULT)){const n=Number(obj.limits[k]);obj.limits[k]=Number.isFinite(n)&&n>=ranges[k][0]&&n<=ranges[k][1]?n:LIMIT_DEFAULT[k]}
 if(obj.limits.lowSys>=obj.limits.highSys||obj.limits.lowDia>=obj.limits.highDia||obj.limits.lowPulse>=obj.limits.highPulse)obj.limits={...LIMIT_DEFAULT};
 return obj;
}
let storageIssue='';let data=load();let view='start',historyKind='bp',statMode='month',statYear=now().getFullYear(),statMonth=now().getMonth(),toastTimeout,updateReady=false,serviceReg=null;
const chartSettings={bp:{range:'month',anchor:today()},pulse:{range:'month',anchor:today()},weight:{range:'month',anchor:today()}};
function load(){try{let raw=localStorage.getItem(KEY);if(!raw){raw=localStorage.getItem(OLD_KEY);if(raw)localStorage.setItem(KEY,raw)}if(!raw)return defaults();const parsed=JSON.parse(raw),loaded=normalize(parsed);
 if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.bp)||!Array.isArray(parsed.weights)||!Array.isArray(parsed.meds)||loaded.bp.length!==parsed.bp.length||loaded.weights.length!==parsed.weights.length||loaded.meds.length!==parsed.meds.length){storageIssue='Gespeicherte Daten enthalten fehlerhafte Einträge. Änderungen werden blockiert, um die Ursprungsdaten nicht zu überschreiben. Bitte fachkundige Hilfe zur Wiederherstellung nutzen.';}
 return loaded}catch(e){storageIssue='Gespeicherte Daten konnten nicht gelesen werden. Keine weiteren Änderungen speichern; bitte den Browser-Speicher nicht löschen und die vorhandenen Daten sichern.';return defaults()}}
function persist(){if(storageIssue){toast(storageIssue,11000);return false}try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch(e){toast('Speichern fehlgeschlagen! Die Änderung wurde NICHT übernommen. Bitte Speicherplatz prüfen.',9000);return false}}
function toast(message,duration=3600){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.hidden=true,duration)}
function sortRows(a){return [...a].sort((x,y)=>dateTime(y).localeCompare(dateTime(x)))}
function chronology(a){return [...a].sort((x,y)=>dateTime(x).localeCompare(dateTime(y)))}
function age(){if(data.profile.dob&&validDate(data.profile.dob)){const d=new Date(data.profile.dob+'T12:00:00');const t=now();let n=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))n--;return n>=0&&n<=120?n:null}return num(data.profile.age)}
function guessPeriod(t){const h=Number((t||timeNow()).slice(0,2));return h<12?'morning':h<17?'noon':'evening'}
function periodHtml(p){return `<span class="dot ${esc(p)}"></span>${PERIODS[p]||'–'}`}
function mealText(r){let t=MEALS[r.meal]||'–';let context=TIMES[r.mealTiming]||'';if(context==='nüchtern')return 'nüchtern';return [t!=='–'?t:'',context].filter(Boolean).join(' · ')||'–'}
function getBmi(){const w=decimal(data.profile.weight),h=decimal(data.profile.height);return w&&h?+(w/Math.pow(h/100,2)).toFixed(1):null}
function classify(r){const L=data.limits;const symptom=SEVERE_SYMPTOMS.has(r.symptom);const severe=r.sys>=180||r.dia>=120;const low=r.sys<L.lowSys||r.dia<L.lowDia;const pulse=r.situation==='rest'&&(r.pulse<L.lowPulse||r.pulse>L.highPulse);const high=r.sys>=L.highSys||r.dia>=L.highDia;
 if(symptom)return {level:'critical',title:'NOTFALLZEICHEN – 112 WÄHLEN',message:'Es wurden schwere Beschwerden angegeben. Bei Brustschmerzen, neuer starker Atemnot, Lähmungen, Sprachstörungen oder Ohnmacht sofort 112 anrufen – nicht auf eine weitere Messung warten.'};
 if(severe)return {level:'critical',title:'ACHTUNG: SEHR HOHER BLUTDRUCK',message:'Ab 180 mmHg systolisch oder 120 mmHg diastolisch: Nach mindestens 1 Minute Ruhe erneut messen. Bleiben die Werte so hoch, umgehend ärztlich abklären. Bei Brustschmerzen, Atemnot oder neurologischen Ausfällen sofort 112.'};
 if(r.situation==='rest'&&(r.pulse<40||r.pulse>150))return {level:'critical',title:'SEHR AUFFÄLLIGER RUHEPULS',message:'Der Ruhepuls ist ungewöhnlich niedrig oder hoch. Erneut in Ruhe messen und unverzüglich medizinisch abklären lassen. Bei Ohnmacht, Brustschmerzen, neuer starker Atemnot oder anderen Notfallzeichen sofort 112.'};
 if(low&&r.symptom!=='none')return {level:'low',title:'NIEDRIGER BLUTDRUCK MIT BESCHWERDEN',message:'Der Blutdruck ist niedrig und es wurden Beschwerden angegeben. Hinsetzen/hinlegen, nicht Auto fahren und zeitnah ärztlich abklären. Bei Ohnmacht oder schwerer Verschlechterung 112.'};
 if(low)return {level:'low',title:'NIEDRIGER BLUTDRUCK',message:'Unter deiner eingestellten Untergrenze. Ein niedriger Wert muss ohne Beschwerden nicht gefährlich sein. Bei wiederholten Werten oder Symptomen ärztlichen Rat einholen.'};
 if(high)return {level:'mild',title:'ERHÖHTER BLUTDRUCK',message:'Der Wert liegt über der eingestellten Grenze für Heimblutdruck. Nach Ruhe erneut messen und den Verlauf beurteilen; bei wiederholt hohen Werten ärztlich besprechen.'};
 if(pulse)return {level:'mild',title:'PULS AUFFÄLLIG',message:'Der Ruhepuls liegt außerhalb deiner eingestellten Grenzen. Medikamente, Fitness und Erkrankungen können den Puls beeinflussen. Bei Beschwerden ärztlich abklären.'};
 return null;
}
function alertHtml(result){if(!result)return '';return `<div class="alert ${result.level}" role="alert"><strong>${esc(result.title)}</strong><div>${esc(result.message)}</div>${result.level==='critical'?'<div class="alert-actions"><a href="tel:112">Notruf 112 anrufen</a></div>':''}</div>`}
function setPage(p){view=p;all('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===p));all('.tab').forEach(el=>{el.classList.toggle('active',el.dataset.tab===p);el.setAttribute('aria-current',el.dataset.tab===p?'page':'false')});window.scrollTo({top:0,behavior:'instant'});renderPage(p)}
function renderPage(p){if(p==='start')renderHome();if(p==='verlauf')renderHistory();if(p==='diagramme')renderCharts();if(p==='statistik')renderStats();if(p==='medikamente')renderMeds();if(p==='profil')fillProfile()}
function renderAll(){renderHome();if(view!=='start')renderPage(view)}
function renderHome(){const latest=sortRows(data.bp)[0],lastWeight=sortRows(data.weights)[0],m=data.bp.filter(r=>r.date.slice(0,7)===today().slice(0,7)),weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-6);const recent=data.bp.filter(r=>r.date>=fromDate(weekAgo));
 $('welcomeText').textContent=(data.profile.name?`Hallo ${data.profile.name.split(' ')[0]}. `:'')+'Blutdruck, Puls und Gewicht auf einen Blick.';
 $('homeStats').innerHTML=[['Letzter Blutdruck',latest?`${latest.sys} / ${latest.dia}`:'–','mmHg',latest?`${dateLabel(latest.date)} · ${latest.time}`:'Noch keine Messung','◉'],['Letzter Puls',latest?latest.pulse:'–','/min',latest?PERIODS[latest.period]:'Noch keine Messung','♡'],['Monatsdurchschnitt',m.length?`${fmt(meanArray(m,'sys'))} / ${fmt(meanArray(m,'dia'))}`:'–','mmHg',`${m.length} Messungen in diesem Monat`,'↗'],['Aktuelles Gewicht',lastWeight?fmt(lastWeight.weight,1):fmt(decimal(data.profile.weight),1),'kg',lastWeight?dateLabel(lastWeight.date):'Profilwert','⚖']].map(([lab,value,unit,detail,icon])=>`<div class="kpi"><span class="kpi-icon">${icon}</span><span class="caption">${lab}</span><span class="value">${value} <span class="unit">${unit}</span></span><span class="detail">${esc(detail)}</span></div>`).join('');
 const warn=latest?classify(latest):null;$('homeAlert').innerHTML=(storageIssue?`<div class="alert critical" role="alert"><strong>DATENZUGRIFF FEHLGESCHLAGEN</strong><div>${esc(storageIssue)}</div></div>`:'')+alertHtml(warn);
 $('homeRecent').innerHTML=sortRows(data.bp).slice(0,5).map(r=>`<div class="history-row"><div class="value-block"><strong>${r.sys}/${r.dia} mmHg</strong><span class="when">${dateLabel(r.date)} · ${r.time} · ${periodHtml(r.period)}</span></div><div><strong>${r.pulse} <small>/min</small></strong><div class="meta">Puls</div></div></div>`).join('')||'<p class="sub">Noch keine Messungen. Tippe auf „Wert eintragen“.</p>';
}
function resetBp(){ $('bpForm').reset();$('bpId').value='';$('bpDate').value=today();$('bpTime').value=timeNow();$('bpPeriod').value=guessPeriod(timeNow());$('saveBp').textContent='Messung speichern';$('cancelBp').classList.add('hidden');$('entryAlert').innerHTML=''}
function resetWeight(){ $('weightForm').reset();$('weightId').value='';$('weightDate').value=today();$('weightTime').value=timeNow();$('saveWeight').textContent='Gewicht speichern';$('cancelWeight').classList.add('hidden')}
function readingFromForm(){return {id:$('bpId').value||uid(),date:$('bpDate').value,time:$('bpTime').value,sys:Number($('bpSys').value),dia:Number($('bpDia').value),pulse:Number($('bpPulse').value),period:$('bpPeriod').value,meal:$('bpMeal').value,mealTiming:$('bpMealTiming').value,situation:$('bpSituation').value,symptom:$('bpSymptom').value,note:$('bpNote').value.trim()}}
function updateEntryWarning(){const v=readingFromForm();$('entryAlert').innerHTML=Number.isFinite(v.sys)&&v.sys>0&&v.dia>0&&v.pulse>0?alertHtml(classify(v)):''}
function saveBp(e){e.preventDefault();const r=readingFromForm();if(!validDate(r.date)||!validTime(r.time)||!Number.isInteger(r.sys)||!Number.isInteger(r.dia)||!Number.isInteger(r.pulse)||r.sys<40||r.sys>300||r.dia<25||r.dia>200||r.pulse<20||r.pulse>250||r.sys<=r.dia){toast('Ungültige Werte: Bitte Blutdruck, Puls, Datum und Uhrzeit prüfen.',5000);return}
 const idx=data.bp.findIndex(x=>x.id===r.id),old=idx>=0?data.bp[idx]:null;if(idx>=0)data.bp[idx]=r;else data.bp.push(r);if(!persist()){if(idx>=0)data.bp[idx]=old;else data.bp.pop();return}const warning=classify(r);resetBp();renderHome();toast(idx>=0?'Messung geändert.':'Messung gespeichert.');if(warning){$('entryAlert').innerHTML=alertHtml(warning);$('entryAlert').scrollIntoView({block:'nearest'})}
}
function saveWeight(e){e.preventDefault();const w=decimal($('weightValue').value),date=$('weightDate').value,time=$('weightTime').value;if(!w||w<20||w>500||!validDate(date)||!validTime(time)){toast('Bitte gültiges Gewicht und Datum eingeben.');return}const r={id:$('weightId').value||uid(),date,time,weight:Math.round(w*10)/10,note:$('weightNote').value.trim()};const idx=data.weights.findIndex(x=>x.id===r.id),old=idx>=0?data.weights[idx]:null,oldWeight=data.profile.weight;if(idx>=0)data.weights[idx]=r;else data.weights.push(r);data.profile.weight=sortRows(data.weights)[0].weight;if(!persist()){if(idx>=0)data.weights[idx]=old;else data.weights.pop();data.profile.weight=oldWeight;return}resetWeight();renderAll();toast(idx>=0?'Gewicht geändert.':'Gewicht gespeichert.')}
function editBp(id){const r=data.bp.find(x=>x.id===id);if(!r)return;setPage('erfassen');$('bpId').value=r.id;for(const k of ['date','time','sys','dia','pulse','period','meal','mealTiming','situation','symptom','note']){const el=$(`bp${k[0].toUpperCase()}${k.slice(1)}`);if(el)el.value=r[k]}$('saveBp').textContent='Änderung speichern';$('cancelBp').classList.remove('hidden');updateEntryWarning()}
function editWeight(id){const r=data.weights.find(x=>x.id===id);if(!r)return;setPage('erfassen');$('weightId').value=r.id;for(const [k,v] of [['Date',r.date],['Time',r.time],['Value',r.weight],['Note',r.note]])$(`weight${k}`).value=v;$('saveWeight').textContent='Änderung speichern';$('cancelWeight').classList.remove('hidden')}
function delEntry(type,id){if(!confirm('Diesen Eintrag endgültig löschen?'))return;const a=type==='bp'?data.bp:data.weights;const idx=a.findIndex(x=>x.id===id);if(idx<0)return;const deleted=a[idx],oldWeight=data.profile.weight;a.splice(idx,1);if(type==='weight'&&data.weights.length)data.profile.weight=sortRows(data.weights)[0].weight;if(!persist()){a.splice(idx,0,deleted);data.profile.weight=oldWeight;return}renderAll();toast('Eintrag gelöscht.')}
function renderHistory(){all('[data-history]').forEach(b=>b.classList.toggle('selected',b.dataset.history===historyKind));const q=$('historySearch').value.trim().toLowerCase(),rows=sortRows(historyKind==='bp'?data.bp:data.weights).filter(r=>[r.date,dateLabel(r.date),r.note,r.time].some(x=>String(x||'').toLowerCase().includes(q)));
 $('historyList').innerHTML=rows.slice(0,1000).map(r=>historyKind==='bp'?`<div class="history-row"><div class="value-block"><strong>${r.sys} / ${r.dia} mmHg · Puls ${r.pulse}</strong><span class="when">${dateLabel(r.date)} ${r.time} · ${periodHtml(r.period)} · ${esc(mealText(r))}</span>${r.note?`<div class="meta">${esc(r.note)}</div>`:''}${r.symptom!=='none'?`<div class="meta">Beschwerden: ${esc(SYMPTOMS[r.symptom]||r.symptom)}</div>`:''}</div><div class="actions"><button class="mini-btn" data-edit-bp="${esc(r.id)}">Ändern</button><button class="mini-btn danger" data-delete-bp="${esc(r.id)}">Löschen</button></div></div>`:`<div class="history-row"><div class="value-block"><strong>${fmt(r.weight,1)} kg</strong><span class="when">${dateLabel(r.date)} ${r.time}</span>${r.note?`<div class="meta">${esc(r.note)}</div>`:''}</div><div class="actions"><button class="mini-btn" data-edit-weight="${esc(r.id)}">Ändern</button><button class="mini-btn danger" data-delete-weight="${esc(r.id)}">Löschen</button></div></div>`).join('')||'<p class="sub">Keine passenden Einträge vorhanden.</p>';if(rows.length>1000)$('historyList').insertAdjacentHTML('beforeend','<p class="field-hint">Es werden die neuesten 1.000 Einträge angezeigt. Alle Daten bleiben gespeichert und im Export enthalten.</p>')}
function rangeWindow(range,anchor){const d=localDate(anchor),y=d.getFullYear(),m=d.getMonth();let a,b;switch(range){
 case 'day':a=new Date(y,m,d.getDate());b=new Date(y,m,d.getDate()+1);break;
 case 'week':{const monday=(d.getDay()+6)%7;a=new Date(y,m,d.getDate()-monday);b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+7);break}
 case 'month':a=new Date(y,m,1);b=new Date(y,m+1,1);break;
 case 'year':a=new Date(y,0,1);b=new Date(y+1,0,1);break;
 case 'decade':a=new Date(y-9,0,1);b=new Date(y+1,0,1);break;
 default:a=new Date(y,m,1);b=new Date(y,m+1,1)}return {start:fromDate(a),end:fromDate(b),startDate:a,endDate:b}}
function filterWindow(rows,settings){const w=rangeWindow(settings.range,settings.anchor);return chronology(rows.filter(r=>r.date>=w.start&&r.date<w.end))}
function shiftAnchor(which,step){const s=chartSettings[which],d=localDate(s.anchor);switch(s.range){case 'day':d.setDate(d.getDate()+step);break;case 'week':d.setDate(d.getDate()+7*step);break;case 'month':{const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+step);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));break}case 'year':case 'decade':{const day=d.getDate(),month=d.getMonth();d.setDate(1);d.setFullYear(d.getFullYear()+step*(s.range==='decade'?10:1));d.setMonth(month);d.setDate(Math.min(day,new Date(d.getFullYear(),month+1,0).getDate()));break}}s.anchor=fromDate(d);renderCharts()}
function squeezeRows(rows,keys){if(rows.length<=650)return {rows,compressed:false};const grouped=new Map();for(const r of rows){const group=grouped.get(r.date)||{date:r.date,time:'12:00',period:'aggregate',count:0,...Object.fromEntries(keys.map(k=>[k,0]))};group.count++;for(const k of keys)group[k]+=Number(r[k])||0;grouped.set(r.date,group)}const points=[...grouped.values()].map(r=>{for(const k of keys)r[k]/=r.count;return r});if(points.length<=650)return {rows:points,compressed:true};const chunk=Math.ceil(points.length/600);return {rows:Array.from({length:Math.ceil(points.length/chunk)},(_,i)=>{const part=points.slice(i*chunk,(i+1)*chunk),v={...part[0],time:'12:00'};for(const k of keys)v[k]=avg(part.map(r=>r[k]));return v}),compressed:true}
}
function chartSeries(type){if(type==='bp')return [{key:'sys',color:'#244D76',name:'Systolisch'},{key:'dia',color:'#18A4A3',name:'Diastolisch'}];if(type==='pulse')return [{key:'pulse',color:'#C66A3D',name:'Puls'}];return [{key:'weight',color:'#7164D2',name:'Gewicht'}]}
function graphSVG(type,rows,opts={}){
 const keys=chartSeries(type),width=760,height=260,left=48,right=18,top=19,bottom=43,plotW=width-left-right,plotH=height-top-bottom;
 const w=rangeWindow(opts.range||'month',opts.anchor||today());const arr=squeezeRows(rows,keys.map(k=>k.key));const points=arr.rows;
 if(!points.length)return `<div class="chart-empty">Keine Messwerte in diesem Zeitraum.</div>`;
 const vals=points.flatMap(r=>keys.map(k=>Number(r[k.key]))).filter(Number.isFinite);let min=Math.min(...vals),max=Math.max(...vals);
 const refs=type==='bp'?[{value:data.limits.highSys,label:`${data.limits.highSys} sys`,color:'#C59A4B'},{value:data.limits.highDia,label:`${data.limits.highDia} dia`,color:'#C59A4B'}]:type==='pulse'?[{value:data.limits.lowPulse,label:'min',color:'#B49A57'},{value:data.limits.highPulse,label:'max',color:'#B49A57'}]:[];
 for(const r of refs){min=Math.min(min,r.value);max=Math.max(max,r.value)}const space=(max-min)||20;min=Math.max(0,Math.floor((min-space*.13)/5)*5);max=Math.ceil((max+space*.13)/5)*5;if(min===max)max+=10;
 const minDate=w.startDate.getTime(),maxDate=w.endDate.getTime();const xTime=r=>{const t=new Date(dateTime(r)).getTime();return left+((t-minDate)/Math.max(1,maxDate-minDate))*plotW};const yVal=v=>top+plotH-((v-min)/(max-min))*plotH;
 const elements=[];const line=(a,b,c,d,color='#DCE8F2',dash='')=>`<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${d.toFixed(1)}" stroke="${color}" stroke-width="1" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 for(let i=0;i<=4;i++){let y=top+plotH*i/4;elements.push(line(left,y,width-right,y));elements.push(`<text x="${left-10}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#7D8EA0">${fmt(max-(max-min)*i/4,type==='weight'?1:0)}</text>`)}
 for(let i=0;i<=4;i++){const x=left+plotW*i/4;const d=new Date(minDate+(maxDate-minDate)*i/4);const ds=opts.range==='day'?`${pad(d.getHours())}:${pad(d.getMinutes())}`:opts.range==='decade'||opts.range==='year'?`${pad(d.getMonth()+1)}.${String(d.getFullYear()).slice(-2)}`:`${pad(d.getDate())}.${pad(d.getMonth()+1)}`;elements.push(`<text x="${x.toFixed(1)}" y="${height-14}" text-anchor="middle" font-size="11" fill="#7D8EA0">${ds}</text>`)}
 for(const r of refs){const y=yVal(r.value);elements.push(line(left,y,width-right,y,r.color,'6 6'))}
 for(const series of keys){const coord=points.map(r=>[xTime(r),yVal(Number(r[series.key])),r]);let path=coord.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');elements.push(`<path d="${path}" stroke="${series.color}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);if(coord.length<=650)for(const p of coord){const period=p[2].period||(type==='weight'?guessPeriod(p[2].time):'aggregate');const c=PERIOD_COLORS[period]||series.color;const lab=`${dateLabel(p[2].date)} ${p[2].time||''}: ${series.name} ${fmt(p[2][series.key],type==='weight'?1:0)}${type==='weight'?' kg':type==='pulse'?' /min':' mmHg'} (${period==='aggregate'?'aggregierter Wert':(PERIODS[period]||'–')})`;elements.push(`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${points.length>90?2.7:4.5}" fill="${c}" stroke="white" stroke-width="1.1"><title>${esc(lab)}</title></circle>`)}}
 return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${type==='bp'?'Blutdruckwerte':'Verlauf '+(type==='pulse'?'Puls':'Gewicht')} als verbundene Linien">${elements.join('')}</svg>`;
}
function renderChartCard(type){const s=chartSettings[type],raw=filterWindow(type==='weight'?data.weights:data.bp,s);const legend=chartSeries(type).map(k=>`<span><i style="background:${k.color}"></i>${k.name}</span>`).join('');const label={bp:'Blutdruck: Systolisch / Diastolisch',pulse:'Pulsverlauf',weight:'Gewichtsverlauf'}[type];
 const window=rangeWindow(s.range,s.anchor);return `<article class="chart-card" data-chart-card="${type}"><div class="chart-top"><h2>${label}</h2><div class="chart-controls">${[['day','Tag'],['week','Woche'],['month','Monat'],['year','Jahr'],['decade','10 Jahre']].map(([k,v])=>`<button type="button" class="range-btn ${s.range===k?'on':''}" data-chart-range="${type}:${k}">${v}</button>`).join('')}</div></div><div class="chart-period-nav"><button type="button" data-shift="${type}:-1" aria-label="Zeitraum zurück">‹</button><input type="date" value="${s.anchor}" data-chart-anchor="${type}" aria-label="Bezugsdatum ${label}"><button type="button" data-shift="${type}:1" aria-label="Zeitraum vor">›</button><span>${dateLabel(window.start)} – ${dateLabel(fromDate(new Date(window.endDate.getTime()-86400000)))}</span></div><div class="chart-summary">${raw.length} Werte im gewählten Zeitraum · Punkte: Grün morgens, Blau mittags, Violett abends</div>${graphSVG(type,raw,s)}<div class="chart-legend">${legend}${type==='bp'?'<span>– – Referenz: eingestellte obere Grenzwerte</span>':type==='pulse'?'<span>– – Referenz: gewählte Pulsgrenzen</span>':''}</div></article>`}
function renderCharts(){$('chartsHost').innerHTML=['bp','pulse','weight'].map(renderChartCard).join('')}
function statRows(){return {bp:chronology(data.bp.filter(r=>r.date.slice(0,4)===String(statYear)&&(statMode==='year'||Number(r.date.slice(5,7))===statMonth+1))),weights:chronology(data.weights.filter(r=>r.date.slice(0,4)===String(statYear)&&(statMode==='year'||Number(r.date.slice(5,7))===statMonth+1)))}}
function statistics(bp,weights){const values=k=>bp.map(r=>r[k]);const stats={count:bp.length,meanSys:meanArray(bp,'sys'),meanDia:meanArray(bp,'dia'),meanPulse:meanArray(bp,'pulse'),minSys:bp.length?Math.min(...values('sys')):null,maxSys:bp.length?Math.max(...values('sys')):null,minDia:bp.length?Math.min(...values('dia')):null,maxDia:bp.length?Math.max(...values('dia')):null,minPulse:bp.length?Math.min(...values('pulse')):null,maxPulse:bp.length?Math.max(...values('pulse')):null,high:bp.filter(r=>r.sys>=data.limits.highSys||r.dia>=data.limits.highDia).length,low:bp.filter(r=>r.sys<data.limits.lowSys||r.dia<data.limits.lowDia).length,severe:bp.filter(r=>r.sys>=180||r.dia>=120).length,weights:weights.length,firstWeight:weights.length?weights[0].weight:null,lastWeight:weights.length?weights.at(-1).weight:null,byPeriod:{}};
 for(const p of Object.keys(PERIODS)){const arr=bp.filter(r=>r.period===p);stats.byPeriod[p]={n:arr.length,sys:meanArray(arr,'sys'),dia:meanArray(arr,'dia'),pulse:meanArray(arr,'pulse')}}return stats}
function summaryStatsHtml(stats,title){const rows=[['Systolisch',fmt(stats.minSys),fmt(stats.maxSys),fmt(stats.meanSys)],['Diastolisch',fmt(stats.minDia),fmt(stats.maxDia),fmt(stats.meanDia)],['Puls',fmt(stats.minPulse),fmt(stats.maxPulse),fmt(stats.meanPulse)]];
 return `<h3>${title}</h3><div class="stat-top"><div class="stat-cell"><span>Messungen</span><strong>${stats.count}</strong></div><div class="stat-cell"><span>Ø Blutdruck</span><strong>${fmt(stats.meanSys)}/${fmt(stats.meanDia)}</strong></div><div class="stat-cell"><span>Ø Puls</span><strong>${fmt(stats.meanPulse)}</strong></div><div class="stat-cell"><span>Gewichtsänderung</span><strong>${stats.firstWeight!==null?`${stats.lastWeight-stats.firstWeight>0?'+':''}${fmt(stats.lastWeight-stats.firstWeight,1)} kg`:'–'}</strong></div></div><div class="stat-details"><div><h3>Tiefste, höchste & durchschnittliche Werte</h3><table class="stat-table"><thead><tr><th>Wert</th><th>Min.</th><th>Max.</th><th>Ø</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="field-hint">Einheiten: Blutdruck in mmHg, Puls in Schlägen/min.</p><h3>Auffällige Messungen</h3><table class="stat-table"><tbody><tr><th>Oberhalb der persönlichen Grenze</th><td>${stats.high}</td></tr><tr><th>Unterhalb der persönlichen Grenze</th><td>${stats.low}</td></tr><tr><th>≥ 180 syst. oder ≥ 120 diast.</th><td>${stats.severe}</td></tr><tr><th>Gewichtseinträge</th><td>${stats.weights}</td></tr></tbody></table></div><div><h3>Vergleich nach Tageszeit</h3><table class="stat-table"><thead><tr><th>Zeit</th><th>Anzahl</th><th>Ø Blutdruck</th><th>Ø Puls</th></tr></thead><tbody>${Object.keys(PERIODS).map(p=>{const o=stats.byPeriod[p];return `<tr><td>${periodHtml(p)}</td><td>${o.n}</td><td>${fmt(o.sys)}/${fmt(o.dia)}</td><td>${fmt(o.pulse)}</td></tr>`}).join('')}</tbody></table><p class="field-hint">Mittelwerte dienen zur Verlaufsbeobachtung; sie stellen keine ärztliche Diagnose dar. Auffällig ist ein Wert, wenn mindestens eine Grenze erreicht bzw. unterschritten wird.</p></div></div>`}
function updateStatSelects(){const years=new Set([now().getFullYear(),statYear,...data.bp.map(r=>Number(r.date.slice(0,4))),...data.weights.map(r=>Number(r.date.slice(0,4)))]);$('statYear').innerHTML=[...years].filter(y=>y>=1900&&y<=2200).sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}</option>`).join('');$('statYear').value=String(statYear);$('statMonth').innerHTML=MONTHS.map((m,i)=>`<option value="${i}">${m}</option>`).join('');$('statMonth').value=String(statMonth);$('statMonthWrap').classList.toggle('hidden',statMode==='year')}
function renderStats(){updateStatSelects();all('[data-statmode]').forEach(b=>b.classList.toggle('selected',b.dataset.statmode===statMode));const {bp,weights}=statRows();const s=statistics(bp,weights),title=statMode==='year'?`Jahresstatistik ${statYear}`:`Monatsstatistik ${MONTHS[statMonth]} ${statYear}`;$('statsHost').innerHTML=summaryStatsHtml(s,title)}
function renderMeds(){
 $('medInteractions').innerHTML=interactionHtml(data.meds);
 $('medList').innerHTML=data.meds.map(m=>`<article class="med-card"><span class="tag ${m.verified?'':'warn'}">${m.verified?'Einnahmeplan abgeglichen':'Einnahmeplan prüfen'}</span><h3>${esc(m.name)} <span class="unit">${esc(m.strength)}</span></h3><p class="med-note">${esc(m.agent)}${m.reason?` · ${esc(m.reason)}`:''}</p><div class="dose">${esc(m.schedule)||'Einnahmeschema fehlt'}</div><p class="med-note">${m.asNeeded?'Bei Bedarf':'Regelmäßige Einnahme'}${m.time?` · ${esc(m.time)} Uhr`:''}</p>${m.notes?`<p class="med-note">${esc(m.notes)}</p>`:''}<details class="med-details"><summary>Nebenwirkungen & Hinweise ansehen</summary>${medInfoHtml(m)}</details><div class="form-actions"><button type="button" class="mini-btn" data-edit-med="${esc(m.id)}">Bearbeiten</button><button type="button" class="mini-btn danger" data-delete-med="${esc(m.id)}">Löschen</button></div></article>`).join('')||'<div class="panel">Noch keine Medikamente eingetragen.</div>';
}
function openMed(id){const m=id?data.meds.find(r=>r.id===id):null;
 $('medForm').reset();$('medId').value=m?.id||'';
 for(const [k,v] of [['Name',m?.name||''],['Agent',m?.agent||''],['Strength',m?.strength||''],['Reason',m?.reason||''],['Schedule',m?.schedule||''],['Time',m?.time||''],['Notes',m?.notes||''],['EffectsCustom',m?.effectsCustom||''],['InteractionsCustom',m?.interactionsCustom||'']])$(`med${k}`).value=v;
 $('medAsNeeded').checked=!!m?.asNeeded;$('medVerified').checked=!!m?.verified;$('medFormTitle').textContent=m?'Medikament bearbeiten':'Medikament hinzufügen';
 $('medEditPanel').classList.remove('hidden');updateMedKnowledgePreview();$('medEditPanel').scrollIntoView({block:'nearest'});
}
function saveMed(e){e.preventDefault();
 const m={id:$('medId').value||uid(),name:$('medName').value.trim(),agent:$('medAgent').value.trim(),strength:$('medStrength').value.trim(),reason:$('medReason').value.trim(),schedule:$('medSchedule').value.trim(),time:$('medTime').value,asNeeded:$('medAsNeeded').checked,verified:$('medVerified').checked,notes:$('medNotes').value.trim(),effectsCustom:$('medEffectsCustom').value.trim(),interactionsCustom:$('medInteractionsCustom').value.trim()};
 if(!m.name){toast('Bitte den Medikamentennamen angeben.');return}
 if(!data.meds.some(r=>r.id===m.id)&&data.meds.length>=300){toast('Maximal 300 Medikamente möglich.');return}
 const idx=data.meds.findIndex(r=>r.id===m.id);const old=idx>=0?{...data.meds[idx]}:null;
 if(idx<0)data.meds.push(m);else data.meds[idx]=m;
 if(!persist()){if(idx<0)data.meds.pop();else data.meds[idx]=old;return}
 $('medEditPanel').classList.add('hidden');renderMeds();toast('Medikament und Hinweise gespeichert.');
}
function fillProfile(){const p=data.profile;$('profileName').value=p.name||'';$('profileDob').value=p.dob||'';$('profileAge').value=age()??'';$('profileHeight').value=decimalVal(p.height);$('profileWeight').value=decimalVal(p.weight);showProfileCalc();for(const k of Object.keys(LIMIT_DEFAULT)){$(`limit${k[0].toUpperCase()}${k.slice(1)}`).value=data.limits[k]}}
function showProfileCalc(){const height=decimal($('profileHeight').value),weight=decimal($('profileWeight').value);$('profileCalculated').textContent=`Alter: ${$('profileAge').value||'–'} Jahre · BMI: ${height&&weight?fmt(weight/Math.pow(height/100,2),1):'–'}${height&&weight?' kg/m²':''}. Ein BMI ist keine medizinische Blutdruck-Zielwertberechnung.`}
function saveProfile(e){e.preventDefault();const p={name:cleanStr($('profileName').value,120).trim(),dob:$('profileDob').value||'',age:decimal($('profileAge').value),height:decimal($('profileHeight').value),weight:decimal($('profileWeight').value)};
 if(p.dob&&(!validDate(p.dob)||p.dob>today())){toast('Ungültiges Geburtsdatum.');return}if(p.age!==null&&(p.age<0||p.age>120)||p.height!==null&&(p.height<80||p.height>250)||p.weight!==null&&(p.weight<20||p.weight>500)){toast('Bitte persönliche Daten prüfen.');return}
 const oldProfile={...data.profile},oldWeightsLength=data.weights.length,prev=decimal(data.profile.weight);data.profile=p;if(p.weight!==null&&p.weight!==prev){data.weights.push({id:uid(),date:today(),time:timeNow(),weight:p.weight,note:'Aktuelles Gewicht im Profil aktualisiert'})}if(!persist()){data.profile=oldProfile;data.weights.length=oldWeightsLength;return}fillProfile();renderHome();toast('Profil gespeichert.')}
function saveLimits(e){e.preventDefault();const next={};for(const k of Object.keys(LIMIT_DEFAULT)){const el=$(`limit${k[0].toUpperCase()}${k.slice(1)}`);next[k]=Number(el.value);if(!el.validity.valid||!Number.isFinite(next[k])){toast('Bitte gültige Grenzwerte angeben.');return}}if(next.lowSys>=next.highSys||next.lowDia>=next.highDia||next.lowPulse>=next.highPulse){toast('Untere Grenzwerte müssen unter den oberen liegen.');return}const old=data.limits;data.limits=next;if(!persist()){data.limits=old;return}renderAll();toast('Grenzwerte gespeichert.')}


/* Drucken / PDF – iOS-Safari kann im Druckdialog eine PDF erzeugen und in Dateien speichern. */
function tableHtml(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function reportProfile(){const p=data.profile,L=data.limits;return `<section class="print-section"><h2>Persönliche Daten und Warnschwellen</h2><div class="print-row">Name: ${esc(p.name||'–')} · Alter: ${fmt(age())} Jahre · Geburtsdatum: ${esc(dateLabel(p.dob)||'–')}</div><div class="print-row">Größe: ${fmt(decimal(p.height),1)} cm · Gewicht: ${fmt(decimal(p.weight),1)} kg · BMI: ${fmt(getBmi(),1)}</div><div class="print-row">Warnschwelle oben: ${L.highSys}/${L.highDia} mmHg · untere Schwelle: ${L.lowSys}/${L.lowDia} mmHg · Ruhepuls: ${L.lowPulse}–${L.highPulse}/min</div><p>Hinweis: Die Warnschwellen sind editierbare Orientierungswerte, keine automatisierte medizinische Bewertung anhand von Alter, Größe oder Gewicht.</p></section>`}
function reportReadings(){return `<section class="print-section"><h2>Blutdruck und Puls – alle Messungen (${data.bp.length})</h2>${tableHtml(['Datum','Uhrzeit','Syst.','Diast.','Puls','Tageszeit','Essen','Situation','Beschwerden / Notiz'],sortRows(data.bp).map(r=>[dateLabel(r.date),r.time,r.sys,r.dia,r.pulse,PERIODS[r.period]||'–',mealText(r),r.situation==='rest'?'Ruhe':r.situation==='activity'?'Belastung':'Andere',`${SYMPTOMS[r.symptom]||'–'}${r.note?' · '+r.note:''}`]))}</section>`}
function reportWeights(){return `<section class="print-section"><h2>Gewichtsverlauf (${data.weights.length})</h2>${tableHtml(['Datum','Uhrzeit','Gewicht in kg','Notiz'],sortRows(data.weights).map(r=>[dateLabel(r.date),r.time,fmt(r.weight,1),r.note]))}</section>`}
function reportMeds(){return `<section class="print-section"><h2>Medikamentenplan mit Sicherheitshinweisen</h2>${tableHtml(['Präparat','Wirkstoff','Stärke','Einnahme','Zeit','Status','Notizen'],data.meds.map(m=>[m.name,m.agent,m.strength,m.schedule,m.time||'–',`${m.asNeeded?'Bedarf · ':''}${m.verified?'abgeglichen':'NICHT BESTÄTIGT'}`,m.notes]))}<h3>Nebenwirkungen (Auswahl)</h3>${data.meds.map(m=>`<div class="print-med"><h4>${esc(m.name)}</h4>${medInfoHtml(m)}</div>`).join('')}${interactionHtml(data.meds)}<p>Keine vollständige Interaktionsprüfung. Fachinformation, Arzt und Apotheke haben Vorrang. Medikamente nicht eigenmächtig ändern.</p></section>`}
function reportStat(mode){const year=statYear,month=statMonth;const bp=chronology(data.bp.filter(r=>r.date.slice(0,4)===String(year)&&(mode==='year'||Number(r.date.slice(5,7))===month+1)));const weights=chronology(data.weights.filter(r=>r.date.slice(0,4)===String(year)&&(mode==='year'||Number(r.date.slice(5,7))===month+1)));const title=mode==='year'?`Jahresstatistik ${year}`:`Monatsstatistik ${MONTHS[month]} ${year}`;return `<section class="print-section"><h2>${title}</h2>${summaryStatsHtml(statistics(bp,weights),title)}</section>`}
function makeReport(sections){let html=`<h1>CardioLog – Gesundheitsbericht</h1><p>Erstellt am ${dateLabel(today())} · Version ${VERSION} · Persönliche Gesundheitsdaten – vertraulich behandeln.</p>`;
if(sections.has('profile'))html+=reportProfile();if(sections.has('readings'))html+=reportReadings();if(sections.has('weight'))html+=reportWeights();if(sections.has('charts'))html+=`<section class="print-section"><h2>Diagramme</h2>${['bp','pulse','weight'].map(renderChartCard).join('')}</section>`;
if(sections.has('month'))html+=reportStat('month');if(sections.has('year'))html+=reportStat('year');if(sections.has('meds'))html+=reportMeds();
html+=`<p class="print-foot">CardioLog ersetzt keine ärztliche Diagnostik. Bei akuten Notfallsymptomen 112 anrufen.</p>`;return html;}
function doPrint(sections){if(!sections.size){toast('Bitte mindestens einen Bereich auswählen.');return}const area=$('printArea');area.innerHTML=makeReport(sections);window.print()}
function checkedSections(){return new Set(all('[data-report]:checked').map(el=>el.dataset.report))}
function printStatsOnly(){doPrint(new Set([statMode==='month'?'month':'year']))}
function saveBlob(filename,body,type){const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function saveBackup(){if(storageIssue){toast('Keine Sicherung der unvollständig lesbaren Daten möglich. Bitte ursprüngliche Daten zuerst wiederherstellen.',9000);return}const backup={app:'CardioLog',version:VERSION,created:new Date().toISOString(),data};saveBlob(`CardioLog-Sicherung-${today()}.json`,JSON.stringify(backup,null,2),'application/json;charset=utf-8');toast('Datensicherung erstellt. Bitte sicher in Dateien speichern.')}
function csvCell(v){let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@\-]/u.test(s)&&!/^-[0-9]+(?:[.,][0-9]+)?$/.test(s.trim()))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
function saveCsv(){const rows=[['Typ','Datum','Uhrzeit','Systolisch mmHg','Diastolisch mmHg','Puls /min','Gewicht kg','Tageszeit','Mahlzeit','Bezug zum Essen','Situation','Symptome','Notiz']];for(const r of sortRows(data.bp))rows.push(['Blutdruck',r.date,r.time,r.sys,r.dia,r.pulse,'',PERIODS[r.period],MEALS[r.meal],TIMES[r.mealTiming],r.situation,SYMPTOMS[r.symptom],r.note]);for(const r of sortRows(data.weights))rows.push(['Gewicht',r.date,r.time,'','','',r.weight,'','','','','',r.note]);saveBlob(`CardioLog-Messwerte-${today()}.csv`,'\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('CSV-Messwerte exportiert.')}
async function importBackup(evt){const f=evt.target.files?.[0];if(!f)return;try{if(f.size>12*1024*1024)throw new Error('Datei ist zu groß (maximal 12 MB).');const raw=JSON.parse(await f.text());if(raw.app&&raw.app!=='CardioLog'&&raw.app!=='PulsPilot')throw new Error('Keine CardioLog-Sicherung erkannt.');const source=raw.data||raw;if(!source||source.schema!==1||!Array.isArray(source.bp)||!Array.isArray(source.weights)||!Array.isArray(source.meds))throw new Error('Datenformat ungültig.');if(source.bp.length>50000||source.weights.length>50000||source.meds.length>300)throw new Error('Sicherung überschreitet die unterstützte Anzahl von Einträgen.');
 if(source.profile!==undefined&&(!source.profile||typeof source.profile!=='object'||Array.isArray(source.profile)))throw new Error('Ungültiges Profilformat.');
 if(source.limits!==undefined&&(!source.limits||typeof source.limits!=='object'||Array.isArray(source.limits)))throw new Error('Ungültige Grenzwerte in der Sicherung.');
 if(source.limits){const lr={highSys:[90,200],highDia:[60,125],lowSys:[60,120],lowDia:[35,90],lowPulse:[30,90],highPulse:[70,180]};for(const [k,[min,max]] of Object.entries(lr)){const v=Number(source.limits[k]);if(!Number.isFinite(v)||v<min||v>max)throw new Error('Ungültiger Grenzwert: '+k)}if(Number(source.limits.lowSys)>=Number(source.limits.highSys)||Number(source.limits.lowDia)>=Number(source.limits.highDia)||Number(source.limits.lowPulse)>=Number(source.limits.highPulse))throw new Error('Grenzwerte in der Sicherung widersprechen sich.');}
 const incoming=normalize(source);
 if(incoming.bp.length!==source.bp.length||incoming.weights.length!==source.weights.length||incoming.meds.length!==source.meds.length)throw new Error('Sicherung enthält ungültige Datensätze. Kein Import und kein stilles Weglassen von Einträgen.');
 for(const list of [incoming.bp,incoming.weights,incoming.meds])if(new Set(list.map(r=>r.id)).size!==list.length)throw new Error('Doppelte Datensatz-Kennungen in der Sicherung.');
 if(source.profile&&typeof source.profile==='object'){
  const p=source.profile;
  if((p.name!=null&&typeof p.name!=='string')||(p.dob&&!validDate(p.dob))||(p.dob&&p.dob>today()))throw new Error('Ungültige persönliche Angaben in der Sicherung.');
  for(const [field,min,max] of [['age',0,120],['height',80,250],['weight',20,500]])if(p[field]!=null&&p[field]!==''&&(!Number.isFinite(Number(p[field]))||Number(p[field])<min||Number(p[field])>max))throw new Error('Ungültiger Profilwert: '+field);
 }
 if(!confirm('Alle bestehenden Messungen und Medikamente mit dieser Sicherung ERSETZEN? Vorher ggf. JSON-Sicherung erstellen.'))return;const old=data;data=incoming;if(!persist()){data=old;return}renderAll();toast('Sicherung wiederhergestellt.')}catch(err){toast(`Import fehlgeschlagen: ${err.message}`,6500)}finally{evt.target.value=''}}

/* Updates: Nur nach Veröffentlichung einer neuen version.json und geänderter SW-Version. */
let remoteVersion='',updateAttempted=false;
function versionCompare(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return (A[i]||0)-(B[i]||0)}return 0}
async function checkUpdate(){remoteVersion='';$('installUpdate').disabled=true;const status=$('updateStatus');status.textContent='Prüfe auf Updates …';try{if(location.protocol==='file:')throw new Error('Updates benötigen eine über HTTPS veröffentlichte Webapp.');const res=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error('Versionsdatei nicht erreichbar.');const payload=await res.json();if(!/^\d+\.\d+\.\d+$/.test(payload.version))throw new Error('Ungültige Versionsangabe.');remoteVersion=payload.version;if(versionCompare(remoteVersion,VERSION)<=0){status.textContent=`CardioLog ${VERSION} – aktuell`;$('installUpdate').disabled=true;return}status.textContent=`Neue Version ${remoteVersion} verfügbar`;$('installUpdate').disabled=false;if(serviceReg)await serviceReg.update();}catch(e){status.textContent='Updateprüfung nicht möglich';toast(e.message,6500)}}
async function installUpdate(){if(!remoteVersion||versionCompare(remoteVersion,VERSION)<=0){toast('Keine neuere Version verfügbar.');return}if(!('serviceWorker' in navigator)){toast('Dieser Browser unterstützt kein automatisches Update.');return}try{const reg=serviceReg||await navigator.serviceWorker.getRegistration();if(!reg)throw new Error('App muss über HTTPS installiert werden.');updateAttempted=true;await reg.update();
 const waiting=reg.waiting||await new Promise(resolve=>{const w=reg.installing;if(!w)return resolve(null);if(w.state==='installed')return resolve(w);const finish=()=>{if(w.state==='installed'||w.state==='redundant'){w.removeEventListener('statechange',finish);resolve(w.state==='installed'?w:null)}};w.addEventListener('statechange',finish);setTimeout(()=>{w.removeEventListener('statechange',finish);resolve(null)},12000)});
 if(waiting){waiting.postMessage({type:'SKIP_WAITING'});$('updateStatus').textContent='Update wird aktiviert …';return}
 $('updateStatus').textContent='Aktivierung nicht bestätigt – Seite neu öffnen';toast('Die neue Version konnte nicht sicher aktiviert werden. Seite schließen, neu öffnen und Versionsnummer überprüfen.',8000)}catch(e){toast(`Update nicht installiert: ${e.message}`,7000)}}

/* Interaktion & Initialisierung */
function handleClick(e){const el=e.target.closest('button');if(!el)return;
 if(el.matches('[data-tab],[data-go]')){setPage(el.dataset.tab||el.dataset.go);return}
 if(el.id==='quickAdd'){setPage('erfassen');return}
 if(el.dataset.history){historyKind=el.dataset.history;renderHistory();return}
 if(el.dataset.editBp){editBp(el.dataset.editBp);return}
 if(el.dataset.editWeight){editWeight(el.dataset.editWeight);return}
 if(el.dataset.deleteBp){delEntry('bp',el.dataset.deleteBp);return}
 if(el.dataset.deleteWeight){delEntry('weight',el.dataset.deleteWeight);return}
 if(el.dataset.chartRange){const [kind,range]=el.dataset.chartRange.split(':');if(chartSettings[kind]&&['day','week','month','year','decade'].includes(range)){chartSettings[kind].range=range;renderCharts()}return}
 if(el.dataset.shift){const [kind,dir]=el.dataset.shift.split(':');if(chartSettings[kind])shiftAnchor(kind,Number(dir));return}
 if(el.dataset.statmode){statMode=el.dataset.statmode;renderStats();return}
 if(el.dataset.editMed){openMed(el.dataset.editMed);return}
 if(el.dataset.deleteMed){if(confirm('Medikament wirklich löschen?')){const previous=data.meds;data.meds=data.meds.filter(m=>m.id!==el.dataset.deleteMed);if(!persist()){data.meds=previous;return}renderMeds()}return}
 if(el.id==='newMedBtn'){openMed('');return}
 if(el.id==='cancelMed'){$('medEditPanel').classList.add('hidden');return}
 if(el.id==='cancelBp'){resetBp();return}
 if(el.id==='cancelWeight'){resetWeight();return}
 if(el.id==='printReport'||el.id==='pdfReport'){doPrint(checkedSections());return}
 if(el.id==='printStats'||el.id==='pdfStats'){printStatsOnly();return}
 if(el.id==='backupBtn'){saveBackup();return}
 if(el.id==='csvBtn'){saveCsv();return}
 if(el.id==='checkUpdate'){checkUpdate();return}
 if(el.id==='installUpdate'){installUpdate();return}
}
function handleChange(e){const el=e.target;
 if(el.matches('[data-chart-anchor]')){const kind=el.dataset.chartAnchor;if(chartSettings[kind]&&validDate(el.value)){chartSettings[kind].anchor=el.value;renderCharts()}return}
 if(el.id==='statYear'){statYear=Number(el.value);renderStats();return}
 if(el.id==='statMonth'){statMonth=Number(el.value);renderStats();return}
 if(el.id==='profileDob'&&el.value){const d=new Date(el.value+'T12:00:00'),t=now();let n=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))n--;$('profileAge').value=n>=0&&n<=120?n:''}
 if(el.id==='profileAge'&&el.value&&$('profileDob').value){$('profileDob').value=''}
 if(el.id==='importFile'){importBackup(e)}
}
function init(){resetBp();resetWeight();renderHome();$('footerVersion').textContent=VERSION;$('versionLabel').textContent=`v${VERSION}`;$('updateStatus').textContent=`Version ${VERSION}`;
 document.addEventListener('click',handleClick);document.addEventListener('change',handleChange);$('historySearch').addEventListener('input',renderHistory);
 $('bpForm').addEventListener('submit',saveBp);$('weightForm').addEventListener('submit',saveWeight);$('medForm').addEventListener('submit',saveMed);for(const id of ['medName','medAgent','medEffectsCustom','medInteractionsCustom'])$(id).addEventListener('input',updateMedKnowledgePreview);$('profileForm').addEventListener('submit',saveProfile);$('limitsForm').addEventListener('submit',saveLimits);
 for(const id of ['bpSys','bpDia','bpPulse','bpSituation','bpSymptom'])$(id).addEventListener('input',updateEntryWarning);
 for(const id of ['profileHeight','profileWeight'])$(id).addEventListener('input',showProfileCalc);
 if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol)){navigator.serviceWorker.register('./sw.js').then(reg=>{serviceReg=reg}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateAttempted)location.reload()})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
