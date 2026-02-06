const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const routes = [
  {hash:"#home", label:"Home"},
  {hash:"#news", label:"News"},
  {hash:"#events", label:"Events"},
  {hash:"#docs", label:"Documents"},
  {hash:"#officers", label:"Union Officers"},
  {hash:"#staff", label:"Staff Directory"},
  {hash:"#resources", label:"NYSUT & Links"},
  {hash:"#minutes", label:"Meeting Minutes"},
];

const state = {
  news: [],
  events: [],
  docs: [],
  staff: [],
  resources: [],
  minutes: [],
};

async function loadJSON(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.json();
}

function fmtDate(iso){
  if(!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {weekday:"short", year:"numeric", month:"short", day:"numeric"});
}
function esc(s){ return (s ?? "").toString().replace(/[&<>"\']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function setActiveNav(){
  const h = location.hash || "#home";
  $$(".nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === h));
}

function layout(){
  const nav = routes.map(r => `<a href="${r.hash}">${esc(r.label)}</a>`).join("");
  $("#nav").innerHTML = nav;
  setActiveNav();
}

function renderHome(){
  const upcoming = [...state.events]
    .filter(e => e.date)
    .sort((a,b) => (a.date||"").localeCompare(b.date||""))
    .slice(0, 4);

  const latest = [...state.news]
    .filter(n => n.date)
    .sort((a,b) => (b.date||"").localeCompare(a.date||""))
    .slice(0, 4);

  return `
    <section class="hero">
      <span class="pill">Member hub</span>
      <h2 style="margin-top:10px;">Bridgehampton Teachers Association</h2>
      <p class="sub">
        This site is designed to be a one-stop shop for union news, events, documents, and NYSUT resources.
        If something is missing, it should be added here — not buried in someone's inbox.
      </p>
      <div class="toolbar">
        <a class="btn" href="#docs">Go to Documents</a>
        <a class="btn" href="#staff">Find a Colleague</a>
        <a class="btn" href="#resources">NYSUT Resources</a>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h3>Upcoming events</h3>
        ${upcoming.length ? `
          <ul>
            ${upcoming.map(e => `<li><strong>${esc(e.title||"Event")}</strong> — ${esc(fmtDate(e.date))}${e.start?` (${esc(e.start)}${e.end?`–${esc(e.end)}`:""})`:""}${e.location?` · ${esc(e.location)}`:""}</li>`).join("")}
          </ul>
        ` : `<p class="meta">No events posted yet.</p>`}
        <p class="meta"><a href="#events">View all events →</a></p>
      </div>

      <div class="card">
        <h3>Latest updates</h3>
        ${latest.length ? `
          <ul>
            ${latest.map(n => `<li><strong>${esc(n.title||"Update")}</strong> — ${esc(fmtDate(n.date))}</li>`).join("")}
          </ul>
        ` : `<p class="meta">No news posted yet.</p>`}
        <p class="meta"><a href="#news">View all updates →</a></p>
      </div>
    </section>
  `;
}

function renderNews(){
  const items = [...state.news].sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  return `
    <section class="hero">
      <h2>News</h2>
      <p class="sub">Short, factual posts. If it matters, it goes here.</p>
    </section>
    <section class="grid">
      ${items.map(n => `
        <article class="card" style="grid-column: span 12;">
          <h3>${esc(n.title||"Update")}</h3>
          <div class="meta">${esc(fmtDate(n.date))}${(n.tags||[]).length ? ` · ${(n.tags||[]).map(t=>`<span class="pill" style="margin-right:6px;">${esc(t)}</span>`).join("")}` : ""}</div>
          ${n.body ? `<p>${esc(n.body)}</p>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function renderEvents(){
  const items = [...state.events].sort((a,b)=> (a.date||"").localeCompare(b.date||""));
  return `
    <section class="hero">
      <h2>Events</h2>
      <p class="sub">Union meetings, sunshine events, deadlines, and reminders.</p>
    </section>

    <table class="table" style="margin-top:14px;">
      <thead>
        <tr><th style="width:180px;">Date</th><th>Event</th><th style="width:220px;">Time / Location</th></tr>
      </thead>
      <tbody>
        ${items.map(e => `
          <tr>
            <td>${esc(fmtDate(e.date))}</td>
            <td>
              <strong>${esc(e.title||"Event")}</strong>
              ${e.details ? `<div class="meta">${esc(e.details)}</div>` : ""}
            </td>
            <td>
              ${e.start ? `${esc(e.start)}${e.end?`–${esc(e.end)}`:""}` : ""}
              ${e.location ? `<div class="meta">${esc(e.location)}</div>` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderDocs(){
  const cats = Array.from(new Set(state.docs.map(d=>d.category||"Other"))).sort();
  const options = [`<option value="">All categories</option>`, ...cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`)].join("");

  return `
    <section class="hero">
      <h2>Documents</h2>
      <p class="sub">Contract, bylaws, MOAs, forms. Searchable. No hunting.</p>

      <div class="toolbar">
        <input id="docSearch" class="input" placeholder="Search documents (title, notes)..." />
        <select id="docCat">${options}</select>
      </div>
      <p class="meta" style="margin-top:10px;">
        Tip: For sensitive items, link to a restricted Google Drive file instead of uploading it publicly.
      </p>
    </section>

    <table class="table" style="margin-top:14px;">
      <thead>
        <tr><th style="width:170px;">Category</th><th>Document</th><th style="width:180px;">Link</th></tr>
      </thead>
      <tbody id="docRows"></tbody>
    </table>
  `;
}

function paintDocs(){
  const q = ($("#docSearch")?.value || "").trim().toLowerCase();
  const cat = $("#docCat")?.value || "";

  const rows = state.docs
    .filter(d => !cat || (d.category||"") === cat)
    .filter(d => {
      if(!q) return true;
      const blob = `${d.title||""} ${d.notes||""}`.toLowerCase();
      return blob.includes(q);
    })
    .sort((a,b)=> (a.category||"").localeCompare(b.category||"") || (a.title||"").localeCompare(b.title||""))
    .map(d => {
      const link = d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">Open</a>` : `<span class="pill danger">Missing link</span>`;
      return `
        <tr>
          <td>${esc(d.category||"Other")}</td>
          <td><strong>${esc(d.title||"Document")}</strong>${d.notes?`<div class="meta">${esc(d.notes)}</div>`:""}</td>
          <td>${link}</td>
        </tr>
      `;
    }).join("");

  $("#docRows").innerHTML = rows || `<tr><td colspan="3" class="meta">No documents match your filters.</td></tr>`;
}

function renderOfficers(){
  return `
    <section class="hero">
      <h2>Union Officers</h2>
      <p class="sub">Executive Board and Representatives</p>
    </section>

    <section class="grid">
      <div class="card" style="grid-column: span 12;">
        <h3>Executive Board</h3>
        <div class="staff-grid" style="margin-top:12px;">
          <div class="person">
            <div class="ph"><img src="assets/staff/JosephPlutaASC.jpg" alt="Joe Pluta" loading="lazy" /></div>
            <div class="info">
              <div class="name">Joe Pluta</div>
              <div class="small">Secondary President</div>
            </div>
          </div>

          <div class="person">
            <div class="ph"><img src="assets/staff/CaitlinHansenASC.jpg" alt="Caite Hansen" loading="lazy" /></div>
            <div class="info">
              <div class="name">Caite Hansen</div>
              <div class="small">Elementary President</div>
            </div>
          </div>

          <div class="person">
            <div class="ph"><img src="assets/staff/AllisonFedericoASC.jpg" alt="Allie Federico" loading="lazy" /></div>
            <div class="info">
              <div class="name">Allie Federico</div>
              <div class="small">Secretary</div>
            </div>
          </div>

          <div class="person">
            <div class="ph"><img src="assets/staff/PatrickAielloASC.jpg" alt="Pat Aiello" loading="lazy" /></div>
            <div class="info">
              <div class="name">Pat Aiello</div>
              <div class="small">Treasurer</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: span 12;">
        <h3>Representatives</h3>
        <div class="staff-grid" style="margin-top:12px;">
          <div class="person">
            <div class="ph"><img src="assets/staff/KarenKnightASC.jpg" alt="Karen Knight" loading="lazy" /></div>
            <div class="info">
              <div class="name">Karen Knight</div>
              <div class="small">Secondary Rep</div>
            </div>
          </div>

          <div class="person">
            <div class="ph"><img src="assets/staff/HamraOzsuASC.jpg" alt="Hamra Ozsu" loading="lazy" /></div>
            <div class="info">
              <div class="name">Hamra Ozsu</div>
              <div class="small">Elementary Rep</div>
            </div>
          </div>

          <div class="person">
            <div class="ph"><img src="assets/staff/LindseySanchezASC.jpg" alt="Lindsey Sanchez" loading="lazy" /></div>
            <div class="info">
              <div class="name">Lindsey Sanchez</div>
              <div class="small">Specials Rep</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStaff(){
  const buildings = Array.from(new Set(state.staff.map(s=>s.building||"Unknown"))).sort();
  const options = [`<option value="">All buildings</option>`, ...buildings.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`)].join("");

  return `
    <section class="hero">
      <h2>Staff directory</h2>
      <p class="sub">Search and filter to help members learn who’s who.</p>

      <div class="toolbar">
        <input id="staffSearch" class="input" placeholder="Search by name (and later: role/email)..." />
        <select id="staffBuilding">${options}</select>
      </div>

      <p class="meta" style="margin-top:10px;">
        Note: This directory is only as accurate as the data file. Update <code>/data/staff.json</code> when staffing changes.
      </p>
    </section>

    <section id="staffGrid" class="staff-grid"></section>
  `;
}

function initials(name){
  const parts = (name||"").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "?";
  const b = parts.length > 1 ? parts[parts.length-1][0] : "";
  return (a+b).toUpperCase();
}

function paintStaff(){
  const q = ($("#staffSearch")?.value || "").trim().toLowerCase();
  const b = $("#staffBuilding")?.value || "";

  const items = state.staff
    .filter(s => !b || (s.building||"") === b)
    .filter(s => !q || (s.name||"").toLowerCase().includes(q))
    .sort((a,b)=> (a.name||"").localeCompare(b.name||""));

  const grid = items.map(s => {
    const photo = s.photo ? `<img src="${esc(s.photo)}" alt="${esc(s.name)}" loading="lazy" />` : `<div style="font-size:34px; color:rgba(230,237,243,.85); font-weight:800;">${esc(initials(s.name))}</div>`;
    const role = s.role ? esc(s.role) : "—";
    const email = s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : "—";

    return `
      <div class="person">
        <div class="ph">${photo}</div>
        <div class="info">
          <div class="name">${esc(s.name)}</div>
          <div class="small">Building: ${esc(s.building||"")}</div>
          <div class="small">Role: ${role}</div>
          <div class="small">Email: ${email}</div>
        </div>
      </div>
    `;
  }).join("");

  $("#staffGrid").innerHTML = grid || `<div class="card" style="grid-column: span 12;"><p class="meta">No staff match your search.</p></div>`;
}

function renderResources(){
  const cats = Array.from(new Set(state.resources.map(r=>r.category||"Other"))).sort();
  return `
    <section class="hero">
      <h2>NYSUT & helpful links</h2>
      <p class="sub">Curated. Not a dumping ground.</p>
    </section>

    <section class="grid">
      ${cats.map(c => {
        const items = state.resources.filter(r => (r.category||"Other")===c);
        return `
          <div class="card" style="grid-column: span 12;">
            <h3>${esc(c)}</h3>
            <ul>
              ${items.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></li>`).join("")}
            </ul>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderMinutes(){
  const items = [...state.minutes].sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  return `
    <section class="hero">
      <h2>Meeting minutes</h2>
      <p class="sub">Links to view-only minutes. (If the docs are restricted, members will need to be signed in.)</p>
    </section>

    <table class="table" style="margin-top:14px;">
      <thead>
        <tr><th style="width:180px;">Date</th><th>Minutes</th><th style="width:180px;">Link</th></tr>
      </thead>
      <tbody>
        ${items.map(m => {
          const link = m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">Open</a>` : `<span class="pill danger">Missing link</span>`;
          return `
            <tr>
              <td>${esc(fmtDate(m.date))}</td>
              <td><strong>${esc(m.title||"Meeting minutes")}</strong>${m.notes?`<div class="meta">${esc(m.notes)}</div>`:""}</td>
              <td>${link}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function render(){
  const h = (location.hash || "#home").toLowerCase();
  setActiveNav();

  let html="";
  if(h === "#home") html = renderHome();
  else if(h === "#news") html = renderNews();
  else if(h === "#events") html = renderEvents();
  else if(h === "#docs") html = renderDocs();
  else if(h === "#officers") html = renderOfficers();
  else if(h === "#staff") html = renderStaff();
  else if(h === "#resources") html = renderResources();
  else if(h === "#minutes") html = renderMinutes();
  else { location.hash="#home"; return; }

  $("#app").innerHTML = html;

  // attach page-specific behavior
  if(h === "#docs"){
    $("#docSearch").addEventListener("input", paintDocs);
    $("#docCat").addEventListener("change", paintDocs);
    paintDocs();
  }
  if(h === "#staff"){
    $("#staffSearch").addEventListener("input", paintStaff);
    $("#staffBuilding").addEventListener("change", paintStaff);
    paintStaff();
  }
}

async function boot(){
  layout();
  // load all data in parallel
  const [news, events, docs, staff, resources, minutes] = await Promise.all([
    loadJSON("data/news.json"),
    loadJSON("data/events.json"),
    loadJSON("data/docs.json"),
    loadJSON("data/staff.json"),
    loadJSON("data/resources.json"),
    loadJSON("data/minutes.json"),
  ]);

  state.news = news || [];
  state.events = events || [];
  state.docs = docs || [];
  state.staff = staff || [];
  state.resources = resources || [];
  state.minutes = minutes || [];

  render();
  window.addEventListener("hashchange", render);
}

boot().catch(err => {
  console.error(err);
  $("#app").innerHTML = `
    <section class="hero">
      <h2>Site error</h2>
      <p class="sub">Something failed to load. Check the console for details.</p>
      <p class="meta">${esc(err.message)}</p>
    </section>
  `;
});
