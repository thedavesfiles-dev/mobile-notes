const TEAMS=[["ARI", "Arizona Cardinals"], ["ATL", "Atlanta Falcons"], ["BAL", "Baltimore Ravens"], ["BUF", "Buffalo Bills"], ["CAR", "Carolina Panthers"], ["CHI", "Chicago Bears"], ["CIN", "Cincinnati Bengals"], ["CLE", "Cleveland Browns"], ["DAL", "Dallas Cowboys"], ["DEN", "Denver Broncos"], ["DET", "Detroit Lions"], ["GB", "Green Bay Packers"], ["HOU", "Houston Texans"], ["IND", "Indianapolis Colts"], ["JAX", "Jacksonville Jaguars"], ["KC", "Kansas City Chiefs"], ["LV", "Las Vegas Raiders"], ["LAC", "Los Angeles Chargers"], ["LAR", "Los Angeles Rams"], ["MIA", "Miami Dolphins"], ["MIN", "Minnesota Vikings"], ["NE", "New England Patriots"], ["NO", "New Orleans Saints"], ["NYG", "New York Giants"], ["NYJ", "New York Jets"], ["PHI", "Philadelphia Eagles"], ["PIT", "Pittsburgh Steelers"], ["SEA", "Seattle Seahawks"], ["SF", "San Francisco 49ers"], ["TB", "Tampa Bay Buccaneers"], ["TEN", "Tennessee Titans"], ["WAS", "Washington Commanders"]];
const KEY="football_mobile_notes_v1";
let UNIT="GENERAL";
const $=q=>document.querySelector(q);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return []}}
function save(rows){localStorage.setItem(KEY,JSON.stringify(rows));render()}
function uid(){return "mob-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)}
function init(){
  $("#team").innerHTML=TEAMS.map(([a,n])=>`<option value="${a}">${a} — ${n}</option>`).join("");
  document.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>{UNIT=b.dataset.unit;document.querySelectorAll("[data-unit]").forEach(x=>x.classList.toggle("active",x===b));});
  $("#save").onclick=addNote; $("#export").onclick=exportNotes;
  render();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function addNote(){
  const text=$("#text").value.trim(); if(!text)return;
  const rows=load();
  rows.push({id:uid(),created_at:new Date().toISOString(),team:$("#team").value,unit:UNIT,text,opponent:$("#opponent").value.trim().toUpperCase(),week:$("#week").value.trim(),source:"MOBILE_PWA",data_check:"PENDING",imported:false});
  save(rows); $("#text").value="";
  $("#savedFlash").textContent="✓ GUARDADA EN ESTE TELÉFONO";
  setTimeout(()=>$("#savedFlash").textContent="",1600);
}
function del(id){save(load().filter(x=>x.id!==id))}
window.del=del;
function render(){
  const rows=load().filter(x=>!x.imported);
  $("#pendingCount").textContent=rows.length;
  $("#notes").innerHTML=rows.length?rows.slice().reverse().map(n=>`<article class="note"><div class="note-top"><span class="badge">${esc(n.team)} · ${esc(n.unit)}</span><span class="meta">${new Date(n.created_at).toLocaleString()}</span></div><div class="txt">${esc(n.text)}</div>${n.opponent||n.week?`<div class="meta" style="margin-top:7px">${n.opponent?`vs ${esc(n.opponent)} `:""}${n.week?`· W${esc(n.week)}`:""}</div>`:""}<div class="note-actions"><button class="delete" onclick="del('${n.id}')">BORRAR</button></div></article>`).join(""):`<div class="card" style="text-align:center;color:#8f9aa3">No hay notas pendientes.</div>`;
}
function exportNotes(){
  const rows=load().filter(x=>!x.imported);
  if(!rows.length){alert("No hay notas pendientes.");return}
  const payload={schema:"team-archetype-mobile-notes-1.0",exported_at:new Date().toISOString(),notes:rows};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  const d=new Date().toISOString().slice(0,10);
  a.href=url;a.download=`mobile_notes_${d}.json`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
init();