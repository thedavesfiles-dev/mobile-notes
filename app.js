const TEAMS=[["ARI","Arizona Cardinals"],["ATL","Atlanta Falcons"],["BAL","Baltimore Ravens"],["BUF","Buffalo Bills"],["CAR","Carolina Panthers"],["CHI","Chicago Bears"],["CIN","Cincinnati Bengals"],["CLE","Cleveland Browns"],["DAL","Dallas Cowboys"],["DEN","Denver Broncos"],["DET","Detroit Lions"],["GB","Green Bay Packers"],["HOU","Houston Texans"],["IND","Indianapolis Colts"],["JAX","Jacksonville Jaguars"],["KC","Kansas City Chiefs"],["LV","Las Vegas Raiders"],["LAC","Los Angeles Chargers"],["LAR","Los Angeles Rams"],["MIA","Miami Dolphins"],["MIN","Minnesota Vikings"],["NE","New England Patriots"],["NO","New Orleans Saints"],["NYG","New York Giants"],["NYJ","New York Jets"],["PHI","Philadelphia Eagles"],["PIT","Pittsburgh Steelers"],["SEA","Seattle Seahawks"],["SF","San Francisco 49ers"],["TB","Tampa Bay Buccaneers"],["TEN","Tennessee Titans"],["WAS","Washington Commanders"]];
const TEAM_NAMES=Object.fromEntries(TEAMS);
const TEAM_COLORS={ARI:["#97233f","#000"],ATL:["#a71930","#000"],BAL:["#241773","#9e7c0c"],BUF:["#00338d","#c60c30"],CAR:["#0085ca","#101820"],CHI:["#0b162a","#c83803"],CIN:["#fb4f14","#000"],CLE:["#311d00","#ff3c00"],DAL:["#003594","#869397"],DEN:["#fb4f14","#002244"],DET:["#0076b6","#b0b7bc"],GB:["#203731","#ffb612"],HOU:["#03202f","#a71930"],IND:["#002c5f","#a2aaad"],JAX:["#006778","#d7a22a"],KC:["#e31837","#ffb81c"],LV:["#000","#a5acaf"],LAC:["#0080c6","#ffc20e"],LAR:["#003594","#ffa300"],MIA:["#008e97","#fc4c02"],MIN:["#4f2683","#ffc62f"],NE:["#002244","#c60c30"],NO:["#101820","#d3bc8d"],NYG:["#0b2265","#a71930"],NYJ:["#125740","#000"],PHI:["#004c54","#a5acaf"],PIT:["#101820","#ffb612"],SEA:["#002244","#69be28"],SF:["#aa0000","#b3995d"],TB:["#d50a0a","#34302b"],TEN:["#0c2340","#4b92db"],WAS:["#5a1414","#ffb612"]};

const KEY="football_mobile_notes_v1";
const GH_REPO="thedavesfiles-dev/mobile-notes";
const GH_BRANCH="main";
const GH_TOKEN_KEY="tal_github_token_v1";
let UNIT="GENERAL", SCHEDULE=[], CURRENT_GAME=null, ASSIGNED=new Set();
const $=q=>document.querySelector(q);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return []}}
function save(rows){localStorage.setItem(KEY,JSON.stringify(rows));render()}
function uid(){return "mob-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)}

async function init(){
  try{
    const payload=await fetch("schedule_2026.json",{cache:"no-store"}).then(r=>r.json());
    SCHEDULE=payload.games||[];
  }catch(e){SCHEDULE=[]}

  const weeks=[...new Set(SCHEDULE.map(g=>Number(g.week)).filter(Boolean))].sort((a,b)=>a-b);
  const savedWeek=Number(localStorage.getItem("tal_last_week")||4);
  $("#week").innerHTML=(weeks.length?weeks:[4]).map(w=>`<option value="${w}">W${w}</option>`).join("");
  $("#week").value=(weeks.includes(savedWeek)?savedWeek:(weeks.includes(4)?4:weeks[0]))||4;

  document.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>{
    UNIT=b.dataset.unit;
    document.querySelectorAll("[data-unit]").forEach(x=>x.classList.toggle("active",x===b));
  });
  $("#week").onchange=weekChanged;
  $("#matchup").onchange=matchupChanged;
  $("#save").onclick=addNote;
  $("#export").onclick=exportNotes;
  const setupBtn=$("#githubSetup");
  if(setupBtn)setupBtn.onclick=setupGithub;

  weekChanged();
  render();

  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

function weekChanged(){
  const week=Number($("#week").value);
  localStorage.setItem("tal_last_week",week);
  const games=SCHEDULE.filter(g=>Number(g.week)===week);
  $("#matchup").innerHTML=games.length
    ? games.map(g=>`<option value="${esc(g.game_id)}">${esc(g.away)} @ ${esc(g.home)}</option>`).join("")
    : `<option value="">SIN PARTIDOS CARGADOS</option>`;
  matchupChanged();
}

function matchupChanged(){
  const id=$("#matchup").value;
  CURRENT_GAME=SCHEDULE.find(g=>String(g.game_id)===String(id))||null;
  ASSIGNED.clear();

  if(!CURRENT_GAME){
    $("#assignTeams").innerHTML="";
    $("#matchupHero").innerHTML="";
    return;
  }

  const {away,home}=CURRENT_GAME;
  $("#matchupHero").innerHTML=`
    <div class="mh-week">WEEK ${esc(CURRENT_GAME.week)}</div>
    <div class="mh-main">
      <div class="mh-team">${esc(away)}</div>
      <div class="mh-at">@</div>
      <div class="mh-team right">${esc(home)}</div>
    </div>`;

  $("#assignTeams").innerHTML=[away,home].map(team=>{
    const c=TEAM_COLORS[team]||["#303a42","#697680"];
    return `<button class="team-assign" data-team="${team}" style="--t1:${c[0]};--t2:${c[1]}">
      <span class="ta-abbr">${esc(team)}</span>
      <span class="ta-name">${esc(TEAM_NAMES[team]||team)}</span>
    </button>`;
  }).join("");

  document.querySelectorAll(".team-assign").forEach(b=>b.onclick=()=>{
    const team=b.dataset.team;
    if(ASSIGNED.has(team))ASSIGNED.delete(team);else ASSIGNED.add(team);
    b.classList.toggle("active",ASSIGNED.has(team));
  });
}

async function addNote(){
  const text=$("#text").value.trim();
  if(!text)return;
  if(!CURRENT_GAME){alert("Selecciona un partido.");return}
  if(!ASSIGNED.size){alert("Selecciona al menos un equipo.");return}

  const rows=load(),selected=[...ASSIGNED],rival={
    [CURRENT_GAME.away]:CURRENT_GAME.home,
    [CURRENT_GAME.home]:CURRENT_GAME.away
  };

  const created=[];
  selected.forEach(team=>{
    const note={
      id:uid(),
      created_at:new Date().toISOString(),
      team,
      unit:UNIT,
      text,
      opponent:rival[team]||"",
      week:String(CURRENT_GAME.week),
      game_id:CURRENT_GAME.game_id,
      matchup:`${CURRENT_GAME.away} @ ${CURRENT_GAME.home}`,
      source:"MOBILE_PWA",
      data_check:"PENDING",
      imported:false,
      github_synced:false
    };
    rows.push(note);
    created.push(note);
  });

  save(rows);
  $("#text").value="";
  ASSIGNED.clear();
  document.querySelectorAll(".team-assign").forEach(x=>x.classList.remove("active"));

  const token=localStorage.getItem(GH_TOKEN_KEY)||"";
  if(!token){
    $("#savedFlash").textContent="GUARDADA · CONFIGURA GITHUB UNA VEZ";
    setTimeout(()=>$("#savedFlash").textContent="",3000);
    return;
  }

  $("#savedFlash").textContent="SINCRONIZANDO...";
  let ok=0;
  for(const note of created){
    if(await githubUpload(note,token)){note.github_synced=true;ok++}
  }
  save(rows);

  $("#savedFlash").textContent=
    ok===created.length ? "GUARDADA EN GITHUB" : `${ok}/${created.length} SINCRONIZADAS`;
  setTimeout(()=>$("#savedFlash").textContent="",2600);
}

async function githubUpload(note,token){
  const path=`inbox/${note.id}.json`;
  const api=`https://api.github.com/repos/${GH_REPO}/contents/${path}`;
  const clean={...note};
  delete clean.github_synced;

  const raw=JSON.stringify(clean,null,2);
  const content=btoa(unescape(encodeURIComponent(raw)));

  try{
    const r=await fetch(api,{
      method:"PUT",
      headers:{
        "Accept":"application/vnd.github+json",
        "Authorization":`Bearer ${token}`,
        "X-GitHub-Api-Version":"2022-11-28",
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        message:`Field note ${note.id}`,
        content,
        branch:GH_BRANCH
      })
    });

    if(r.ok)return true;
    if(r.status===422)return true;
    console.error("GitHub sync failed",r.status,await r.text());
    return false;
  }catch(e){
    console.error("GitHub sync failed",e);
    return false;
  }
}

async function syncUnsynced(){
  const token=localStorage.getItem(GH_TOKEN_KEY)||"";
  if(!token)return {ok:0,total:0};

  const rows=load();
  const pending=rows.filter(n=>!n.github_synced);
  let ok=0;

  for(const note of pending){
    if(await githubUpload(note,token)){
      note.github_synced=true;
      ok++;
    }
  }
  save(rows);
  return {ok,total:pending.length};
}

async function setupGithub(){
  const current=localStorage.getItem(GH_TOKEN_KEY)||"";
  const token=prompt(
    "Pega tu Fine-grained GitHub token para el repo mobile-notes.\n"+
    "Se guarda SOLO en este telefono. No lo compartas por chat.",
    current
  );
  if(!token)return;

  localStorage.setItem(GH_TOKEN_KEY,token.trim());
  $("#savedFlash").textContent="PROBANDO GITHUB...";

  const result=await syncUnsynced();
  $("#savedFlash").textContent=
    result.total===0 ? "GITHUB CONFIGURADO" :
    result.ok===result.total ? `GITHUB OK · ${result.ok} SINCRONIZADAS` :
    `GITHUB OK · ${result.ok}/${result.total} SINCRONIZADAS`;
  setTimeout(()=>$("#savedFlash").textContent="",3200);
}

function del(id){save(load().filter(x=>x.id!==id))}
window.del=del;

function render(){
  const rows=load().filter(x=>!x.imported);
  $("#pendingCount").textContent=rows.filter(x=>!x.github_synced).length;
  $("#notes").innerHTML=rows.length?rows.slice().reverse().map(n=>`
    <article class="note">
      <div class="note-top">
        <span class="badge">${esc(n.team)} · ${esc(n.unit)}</span>
        <span class="meta">${new Date(n.created_at).toLocaleString()}</span>
      </div>
      <div class="txt">${esc(n.text)}</div>
      <div class="meta note-context">${n.opponent?`vs ${esc(n.opponent)}`:""}${n.week?` · W${esc(n.week)}`:""}${n.matchup?` · ${esc(n.matchup)}`:""}</div>
      <div class="note-actions"><button class="delete" onclick="del('${n.id}')">BORRAR</button></div>
    </article>`).join("")
    :`<div class="card" style="text-align:center;color:#8f9aa3">No hay notas pendientes.</div>`;
}

function exportNotes(){
  const rows=load().filter(x=>!x.imported);
  if(!rows.length){alert("No hay notas pendientes.");return}
  const payload={schema:"team-archetype-mobile-notes-1.0",exported_at:new Date().toISOString(),notes:rows};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  const d=new Date().toISOString().slice(0,10);
  a.href=url;a.download=`mobile_notes_${d}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
init();
