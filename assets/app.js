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
    $("#nav").innerHTML = nav
      .map(n => `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${n.label}</a>`)
      .join("");
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  async function safeLoad(path, fallback) {
    try {
      return await fetchJSON(path);
    } catch {
      return fallback;
    }
  }

  const esc = s =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const divider = label => `
    <div class="divider">
      <span class="dot"></span>
      <span class="label">${esc(label)}</span>
      <span class="dot"></span>
    </div>
  `;

  const hero = ({ pill, title, sub }) => `
    <section class="hero">
      ${pill ? `<div class="pill">${esc(pill)}</div>` : ""}
      <h2>${esc(title)}</h2>
      ${sub ? `<p class="sub">${sub}</p>` : ""}
    </section>
  `;

  // ---------- HOME ----------

  async function renderHome() {
    const app = $("#app");

    const [news, events] = await Promise.all([
      safeLoad("data/news.json", []),
      safeLoad("data/events.json", []),
    ]);

    app.innerHTML = `
      ${hero({
        pill: "Member hub",
        title: "Bridgehampton Teachers Association",
        sub: `
          <strong>Mission:</strong> The BTA is a union of professionals that champions fairness; democracy;
          economic opportunity; and high-quality public education, healthcare and public services for our
          students, their families and our communities.
          <br><br>
          <em>*We share the same mission as the United Federation of Teachers.</em>
        `,
      })}

      ${divider("Quick links")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 6;">
          <div class="ph" style="height:120px;">
            <div style="padding:16px;text-align:center;">
              <div style="font-weight:800;font-size:18px;">Documents</div>
              <div class="small">Contracts, MOAs, bylaws, minutes</div>
              <div style="margin-top:12px">
                <a class="btn" href="#documents">Open</a>
              </div>
            </div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="ph" style="height:120px;">
            <div style="padding:16px;text-align:center;">
              <div style="font-weight:800;font-size:18px;">Staff Directory</div>
              <div class="small">Find a colleague</div>
              <div style="margin-top:12px">
                <a class="btn" href="#directory">Search</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${divider("Connect")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 12;">
          <div class="ph" style="height:110px;">
            <div style="padding:16px;text-align:center;">
              <div style="font-weight:800;font-size:18px;">Follow us on Instagram</div>
              <div class="small">@bhsteachersassociation</div>
              <div style="margin-top:12px">
                <a class="btn" 
                   href="https://www.instagram.com/bhsteachersassociation/" 
                   target="_blank" 
                   rel="noopener">
                  Open Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${divider("Latest")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Upcoming events</div>
            <ul>
              ${(events || []).slice(0,3).map(e =>
                `<li><b>${esc(e.title)}</b> — ${esc(e.date)}</li>`
              ).join("") || "<li>No events posted.</li>"}
            </ul>
            <div class="small"><a href="#events">View all →</a></div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Latest updates</div>
            <ul>
              ${(news || []).slice(0,3).map(n =>
                `<li><b>${esc(n.title)}</b> — ${esc(n.date)}</li>`
              ).join("") || "<li>No updates posted.</li>"}
            </ul>
            <div class="small"><a href="#news">View all →</a></div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- GENERIC LIST ----------

  async function renderListPage(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: title, title })}
      ${divider(title)}
      <div class="person">
        <div class="info">
          <table class="table">
            <thead><tr><th>Date</th><th>Title</th><th>Details</th></tr></thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${esc(i.date)}</td>
                  <td><b>${esc(i.title)}</b></td>
                  <td>${esc(i.details || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---------- DOCUMENTS ----------

  async function renderDocuments() {
    const app = $("#app");
    const docs = await safeLoad("data/docs.json", []);
    app.innerHTML = `
      ${hero({ pill: "Documents", title: "Documents" })}
      ${divider("Documents")}
      <div class="person">
        <div class="info">
          <table class="table">
            <thead><tr><th>Category</th><th>Document</th><th>Link</th></tr></thead>
            <tbody>
              ${docs.map(d => `
                <tr>
                  <td>${esc(d.category)}</td>
                  <td><b>${esc(d.title)}</b></td>
                  <td>${d.url ? `<a href="${esc(d.url)}" target="_blank">Open</a>` : "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---------- RESOURCES ----------

  async function renderResources(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: "Resources", title })}
      ${divider("Links")}
      <div class="person">
        <div class="info">
          <table class="table">
            <thead><tr><th>Title</th><th>Description</th><th>Link</th></tr></thead>
            <tbody>
              ${items.map(r => `
                <tr>
                  <td><b>${esc(r.title)}</b></td>
                  <td>${esc(r.description)}</td>
                  <td><a href="${esc(r.url)}" target="_blank">Open</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---------- DIRECTORY ----------

  async function renderDirectory() {
    const app = $("#app");
    const staff = await safeLoad("data/staff.json", []);

    app.innerHTML = `
      ${hero({ pill: "Directory", title: "Staff directory" })}
      ${divider("Staff")}
      <div class="staff-grid">
        ${staff.map(s => `
          <div class="person">
            <div class="ph">
              ${s.photo
                ? `<img src="${esc(s.photo)}" alt="${esc(s.name)}">`
                : `<div class="initials">${esc(s.name.split(" ").map(x=>x[0]).join(""))}</div>`
              }
            </div>
            <div class="info">
              <div class="name">${esc(s.name)}</div>
              <div class="small">${esc(s.building || "")}</div>
              <div class="small">${esc(s.role || "")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // ---------- OFFICERS ----------

  async function renderOfficers() {
    const app = $("#app");
    app.innerHTML = `
      ${hero({ pill: "Leadership", title: "Union Officers", sub: "Executive Board and Representatives" })}
      ${divider("Leadership")}
      <div class="staff-grid">
        <div class="person"><div class="info"><b>Joe Pluta</b><div class="small">Secondary President</div></div></div>
        <div class="person"><div class="info"><b>Caite Hansen</b><div class="small">Elementary President</div></div></div>
        <div class="person"><div class="info"><b>Allie Federico</b><div class="small">Secretary</div></div></div>
        <div class="person"><div class="info"><b>Pat Aiello</b><div class="small">Treasurer</div></div></div>
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
