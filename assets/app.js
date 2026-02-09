(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const nav = [
    { id: "home", label: "Home" },
    { id: "news", label: "News" },
    { id: "events", label: "Events" },
    { id: "documents", label: "Documents" },
    { id: "officers", label: "Union Officers" },
    { id: "directory", label: "Staff Directory" },
    { id: "resources", label: "NYSUT & Links" },
  ];

  const routes = {
    home: renderHome,
    news: () => renderListPage("News", "data/news.json"),
    events: () => renderListPage("Events", "data/events.json"),
    documents: renderDocuments,
    officers: renderOfficers,
    directory: renderDirectory,
    resources: () => renderResources("NYSUT & Links", "data/resources.json"),
  };

  function setActiveNav() {
    const cur = (location.hash || "#home").replace("#", "");
    const navEl = $("#nav");
    navEl.innerHTML = nav
      .map((n) => `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${n.label}</a>`)
      .join("");
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  async function safeLoad(path, fallback) {
    try {
      return await fetchJSON(path);
    } catch {
      return fallback;
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function divider(label) {
    return `
      <div class="divider" role="separator" aria-label="${escapeHtml(label)}">
        <span class="dot" aria-hidden="true"></span>
        <span class="label">${escapeHtml(label)}</span>
        <span class="dot" aria-hidden="true"></span>
      </div>
    `;
  }

  function hero({ pill, title, subHtml }) {
    return `
      <section class="hero">
        ${pill ? `<div style="margin-bottom:10px;"><span class="pill">${escapeHtml(pill)}</span></div>` : ""}
        <h2>${escapeHtml(title)}</h2>
        ${subHtml ? `<p class="sub">${subHtml}</p>` : ""}
      </section>
    `;
  }

  // --- Instagram embed helper (official embed.js, no API keys) ---
  function ensureInstagramEmbedScript() {
    if (document.querySelector("script[data-instgrm]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = "https://www.instagram.com/embed.js";
    s.setAttribute("data-instgrm", "true");
    document.body.appendChild(s);
  }

  function instagramEmbed(postUrl) {
    if (!postUrl) return "";
    ensureInstagramEmbedScript();
    return `
      <blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(postUrl)}" data-instgrm-version="14"
        style="background:#fff; border:0; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.25); margin:0; width:100%; min-width:260px;">
      </blockquote>
    `;
  }

  // ---------- Pages ----------

  async function renderHome() {
    const app = $("#app");
    const [news, events, social] = await Promise.all([
      safeLoad("data/news.json", []),
      safeLoad("data/events.json", []),
      safeLoad("data/social.json", {}),
    ]);

    const latestNews = (news || []).slice(0, 3);
    const upcoming = (events || []).slice(0, 3);

    const missionHtml = `
      <b>Mission:</b> The BTA is a union of professionals that champions fairness; democracy; economic opportunity; and high-quality public education, healthcare and public services for our students, their families and our communities.
      <br><br>
      <em>*We share the same mission as the United Federation of Teachers.</em>
    `;

    const igHandle = (social && social.instagramHandle) ? social.instagramHandle : "bhsteachersassociation";
    const igUrl = `https://www.instagram.com/${igHandle}/`;
    const igPostUrl = (social && social.instagramPostUrl) ? social.instagramPostUrl : "";

    app.innerHTML = `
      ${hero({
        pill: "Member hub",
        title: "Bridgehampton Teachers Association",
        subHtml: missionHtml
      })}

      ${divider("Latest")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Upcoming events</div>
            <ul>
              ${upcoming.length
                ? upcoming.map(e => `<li><b>${escapeHtml(e.title || "")}</b> — ${escapeHtml(e.date || "")}${e.time ? ` (${escapeHtml(e.time)})` : ""}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</li>`).join("")
                : "<li>No events posted yet.</li>"
              }
            </ul>
            <div class="small"><a href="#events">View all events →</a></div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Latest updates</div>
            <ul>
              ${latestNews.length
                ? latestNews.map(n => `<li><b>${escapeHtml(n.title || "")}</b> — ${escapeHtml(n.date || "")}</li>`).join("")
                : "<li>No updates posted yet.</li>"
              }
            </ul>
            <div class="small"><a href="#news">View all updates →</a></div>
          </div>
        </div>
      </div>

      ${divider("Connect")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 6;">
          <div class="ph" style="height:150px;">
            <div style="padding:16px;text-align:center;">
              <div style="font-weight:900;font-size:18px;">Follow us on Instagram</div>
              <div class="small" style="margin-top:6px;">@${escapeHtml(igHandle)}</div>
              <div style="margin-top:14px;">
                <a class="btn ig" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">Open Instagram</a>
              </div>
            </div>
          </div>
          <div class="info">
            <div class="small">Union updates, reminders, highlights. Opens in a new tab.</div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Instagram preview</div>
            <div class="small" style="margin-top:6px;">
              Free + reliable embeds are for a <b>single post</b> (not a full feed) unless you pay for a service or use API keys.
            </div>

            <div style="margin-top:12px;">
              ${igPostUrl ? instagramEmbed(igPostUrl) : `
                <div class="small">
                  No preview post set yet.<br>
                  Set it by editing <code>data/social.json</code> → <code>instagramPostUrl</code>.
                </div>
              `}
            </div>

            <div class="small" style="margin-top:12px;">
              <a href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">View the full profile →</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // If a post is embedded, ask Instagram to process it
    if (igPostUrl && window.instgrm?.Embeds?.process) {
      try { window.instgrm.Embeds.process(); } catch {}
    } else if (igPostUrl) {
      setTimeout(() => {
        if (window.instgrm?.Embeds?.process) {
          try { window.instgrm.Embeds.process(); } catch {}
        }
      }, 900);
    }
  }

  async function renderListPage(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: title, title, subHtml: "" })}
      ${divider(title)}
      <div class="person" style="padding:0;">
        <div class="info">
          <table class="table" style="width:100%;">
            <thead><tr><th>Date</th><th>Title</th><th>Details</th></tr></thead>
            <tbody>
              ${(items || []).map(i => `
                <tr>
                  <td>${escapeHtml(i.date || "")}</td>
                  <td><b>${escapeHtml(i.title || "")}</b></td>
                  <td>${escapeHtml(i.details || i.location || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderDocuments() {
    const app = $("#app");
    const docs = await safeLoad("data/docs.json", []);

    function isRestricted(d) {
      const c = (d.category || "").toLowerCase();
      const n = (d.note || "").toLowerCase();
      return c.includes("restricted") || n.includes("member");
    }

    app.innerHTML = `
      ${hero({ pill: "Documents", title: "Documents", subHtml: "Contracts, MOAs, bylaws, meeting minutes, and more." })}
      ${divider("Documents")}
      <div class="person" style="padding:0;">
        <div class="info">
          <table class="table" style="width:100%;">
            <thead><tr><th>Access</th><th>Category</th><th>Document</th><th>Link</th></tr></thead>
            <tbody>
              ${(docs || []).map(d => {
                const restricted = isRestricted(d);
                return `
                <tr>
                  <td>${restricted ? `<span class="lockTag">🔒 Member</span>` : `<span class="lockTag" style="opacity:.55">Public</span>`}</td>
                  <td>${escapeHtml(d.category || "")}</td>
                  <td><b>${escapeHtml(d.title || "")}</b><div class="small">${escapeHtml(d.note || "")}</div></td>
                  <td>${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Open</a>` : "—"}</td>
                </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          <div class="small" style="margin-top:10px;">
            🔒 Member documents are stored in Google Drive with restricted access. If you get a “Request access” screen, you’re not added yet.
          </div>
        </div>
      </div>
    `;
  }

  async function renderResources(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: "Resources", title, subHtml: "Helpful links and NYSUT resources." })}
      ${divider("Links")}
      <div class="person" style="padding:0;">
        <div class="info">
          <table class="table" style="width:100%;">
            <thead><tr><th>Title</th><th>Description</th><th>Link</th></tr></thead>
            <tbody>
              ${(items || []).map(r => `
                <tr>
                  <td><b>${escapeHtml(r.title || "")}</b></td>
                  <td>${escapeHtml(r.description || "")}</td>
                  <td>${r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Open</a>` : "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderDirectory() {
    const app = $("#app");
    const staff = await safeLoad("data/staff.json", []);
    const buildings = ["All buildings", ...Array.from(new Set((staff || []).map(s => s.building).filter(Boolean)))];

    app.innerHTML = `
      ${hero({
        pill: "Directory",
        title: "Staff directory",
        subHtml: "Search and filter to help members learn who’s who."
      })}
      ${divider("Search")}
      <div class="person" style="padding:0;">
        <div class="info">
          <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; align-items:center;">
            <input id="q" class="input" placeholder="Search by name (and later: role)" />
            <select id="bldg">
              ${buildings.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
            </select>
          </div>
          <div class="small" style="margin-top:10px;">
            Note: Update <code>/data/staff.json</code> when staffing changes.
          </div>
        </div>
      </div>

      ${divider("Staff")}

      <div class="staff-grid" id="grid"></div>
    `;

    const grid = $("#grid");
    const q = $("#q");
    const bldg = $("#bldg");

    function render() {
      const term = (q.value || "").trim().toLowerCase();
      const building = bldg.value;

      const filtered = (staff || []).filter(s => {
        const name = (s.name || "").toLowerCase();
        const okName = !term || name.includes(term);
        const okB = building === "All buildings" || s.building === building;
        return okName && okB;
      });

      grid.innerHTML = filtered.map(s => {
        const initials = (s.name || "?").split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase();
        return `
          <div class="person">
            <div class="ph">
              ${s.photo
                ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.name)}" loading="lazy" />`
                : `<div style="font-weight:900; font-size:44px; color:rgba(255,255,255,.75);">${escapeHtml(initials)}</div>`
              }
            </div>
            <div class="info">
              <div class="name">${escapeHtml(s.name || "")}</div>
              <div class="small">Building: ${escapeHtml(s.building || "—")}</div>
              <div class="small">Role: ${escapeHtml(s.role || "—")}</div>
            </div>
          </div>
        `;
      }).join("");
    }

    q.addEventListener("input", render);
    bldg.addEventListener("change", render);
    render();
  }

  async function renderOfficers() {
    const app = $("#app");

    const officers = {
      "Executive Board": [
        { title: "Secondary President", name: "Joe Pluta" },
        { title: "Elementary President", name: "Caite Hansen" },
        { title: "Secretary", name: "Allie Federico" },
        { title: "Treasurer", name: "Pat Aiello" },
      ],
      "Representatives": [
        { title: "Secondary Rep", name: "Karen Knight" },
        { title: "Elementary Rep", name: "Hamra Ozsu" },
        { title: "Specials Rep", name: "Lindsey Sanchez" },
      ],
    };

    const staff = await safeLoad("data/staff.json", []);
    const photoByName = new Map((staff || []).map(s => [s.name, s.photo]));

    app.innerHTML = `
      ${hero({
        pill: "Leadership",
        title: "Union Officers",
        subHtml: "Executive Board and Representatives"
      }).replace(
        `<h2>Union Officers</h2>`,
        `<div class="crestRow">
           <div class="crestMark" aria-hidden="true">
             <img src="assets/logo.png" alt="" />
           </div>
           <div>
             <h2>Union Officers</h2>
             <p class="sub">Executive Board and Representatives</p>
           </div>
         </div>`
      )}

      ${divider("Executive Board")}
      <div class="staff-grid">
        ${officers["Executive Board"].map(o => officerCard(o, photoByName.get(o.name))).join("")}
      </div>

      ${divider("Representatives")}
      <div class="staff-grid">
        ${officers["Representatives"].map(o => officerCard(o, photoByName.get(o.name))).join("")}
      </div>
    `;
  }

  function officerCard(officer, photo) {
    const initials = (officer.name || "?").split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase();
    return `
      <div class="person">
        <div class="ph">
          ${photo
            ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(officer.name)}" loading="lazy" />`
            : `<div style="font-weight:900; font-size:44px; color:rgba(255,255,255,.75);">${escapeHtml(initials)}</div>`
          }
        </div>
        <div class="info">
          <div class="name">${escapeHtml(officer.name || "")}</div>
          <div class="small">${escapeHtml(officer.title || "")}</div>
        </div>
      </div>
    `;
  }

  function route() {
    const id = (location.hash || "#home").replace("#", "");
    setActiveNav();
    (routes[id] || routes.home)();
  }

  window.addEventListener("hashchange", route);
  route();
})();
