(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Google Form embed (Update Contact Info)
  const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfXsuucGYGRnUdDwCy19LoHy6DIQdOlsTKDILaBGo09HlsJIg/viewform?embedded=true";
    // Google Calendar embeds
    const calMonth = `${CAL_BASE}`;
    const calAgenda = `${CAL_BASE}&mode=AGENDA&showTitle=0&showNav=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0`;

    app.innerHTML = `
      ${hero({
        pill: "Member hub",
        title: "Bridgehampton Teachers Association",
        subHtml: missionHtml,
      })}

      ${divider("Latest")}

      <div class="staff-grid">
        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Upcoming events</div>
            <ul>
              
              <li style="list-style:none;margin-left:0;">
                <div class="small" style="margin-bottom:10px;">Pulled live from the BTA Google Calendar.</div>
                <div class="embedWrap" style="border-top:none;background:transparent;">
                  <iframe class="embedFrame" src="${calAgenda}" style="height:360px;" frameborder="0" scrolling="no"></iframe>
                </div>
              </li>

            </ul>
            <div class="small"><a href="#events">View all events →</a></div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Latest updates</div>
            <ul>
              ${
                latestNews.length
                  ? latestNews
                      .map(
                        (n) =>
                          `<li><b>${escapeHtml(n.title || "")}</b> — ${escapeHtml(
                            n.date || ""
                          )}</li>`
                      )
                      .join("")
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
          <div class="ph" style="height:auto;">
            <div style="padding:16px;text-align:center;width:100%;">
              <div style="font-weight:900;font-size:18px;">Follow us on Instagram</div>
              <div class="small" style="margin-top:6px;">@${escapeHtml(igHandle)}</div>
              <div style="margin-top:14px;">
                <a class="btn ig" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">Follow us on Instagram</a>
              </div>

              <div class="igReserve" style="margin-top:14px;">
                <div class="small" style="opacity:.9;">
                  Instagram preview will appear here once we connect the account.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6; padding:0;">
          <div class="info">
            <div class="name">BTA Calendar</div>
            <div class="small" style="margin-top:6px;">Month + agenda view (from the BTA Google Calendar)</div>
          </div>

          <div class="calWrap" style="margin:12px;">
            <div class="calTabs">
              <button class="btn activeBtn" id="calMonthBtn" type="button">Month</button>
              <button class="btn" id="calAgendaBtn" type="button">Agenda</button>
              <a class="btn" href="#events" style="margin-left:auto;">Events tab</a>
            </div>

            <!-- IMPORTANT: viewport wrapper lets us scale the iframe on mobile portrait -->
            <div class="calViewport" id="calViewport">
              <iframe class="calFrame" id="calFrame" src="${calMonth}" style="border:0" frameborder="0" scrolling="no"></iframe>
            </div>
          </div>
        </div>
      </div>
    `;

    // Calendar tab switch
    const calFrame = $("#calFrame");
    const mBtn = $("#calMonthBtn");
    const aBtn = $("#calAgendaBtn");

    // Keep the embed "desktop-shaped" so portrait doesn't flip into the ugly mobile agenda layout.
    // These are the base render dimensions the iframe will use (scaled down on phones).
    const BASE_W = 1100;
    const BASE_H = 780;

    // Bind scaler once per renderHome call
    bindCalendarScaler(BASE_W, BASE_H);

    if (calFrame && mBtn && aBtn) {
      mBtn.addEventListener("click", () => {
        mBtn.classList.add("activeBtn");
        aBtn.classList.remove("activeBtn");
        calFrame.src = calMonth;
        // give the iframe a tick to load, then re-apply scale
        setTimeout(() => bindCalendarScaler(BASE_W, BASE_H), 50);
      });

      aBtn.addEventListener("click", () => {
        aBtn.classList.add("activeBtn");
        mBtn.classList.remove("activeBtn");
        calFrame.src = calAgenda;
        setTimeout(() => bindCalendarScaler(BASE_W, BASE_H), 50);
      });
    }
  }

  
  async function renderEventsPage() {
    const app = $("#app");

    const calMonth = `${CAL_BASE}`;
    const calAgenda = `${CAL_BASE}&mode=AGENDA&showTitle=0&showNav=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0`;

    app.innerHTML = `
      ${hero({
        pill: "Events",
        title: "Events",
        subHtml: "All events are managed in the BTA Google Calendar. This page always stays current.",
      })}

      ${divider("BTA Calendar")}

      <div class="calWrap">
        <div class="calTabs">
          <button class="btn activeBtn" id="evMonthBtn" type="button">Month</button>
          <button class="btn" id="evAgendaBtn" type="button">Agenda</button>
        </div>

        <div class="calViewport" id="evViewport">
          <iframe class="calFrame" id="evFrame" src="${calMonth}" style="border:0" frameborder="0" scrolling="no"></iframe>
        </div>
      </div>
    `;

    const evFrame = $("#evFrame");
    const mBtn = $("#evMonthBtn");
    const aBtn = $("#evAgendaBtn");

    const BASE_W = 1100;
    const BASE_H = 780;

    // Scale this iframe on mobile the same way the home calendar scales
    bindScaler("evViewport", "evFrame", BASE_W, BASE_H);

    if (evFrame && mBtn && aBtn) {
      mBtn.addEventListener("click", () => {
        mBtn.classList.add("activeBtn");
        aBtn.classList.remove("activeBtn");
        evFrame.src = calMonth;
        setTimeout(() => bindScaler("evViewport", "evFrame", BASE_W, BASE_H), 50);
      });

      aBtn.addEventListener("click", () => {
        aBtn.classList.add("activeBtn");
        mBtn.classList.remove("activeBtn");
        evFrame.src = calAgenda;
        setTimeout(() => bindScaler("evViewport", "evFrame", BASE_W, BASE_H), 50);
      });
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
          <div class="tableWrap"><table class="table">
            <thead><tr><th>Date</th><th>Title</th><th>Details</th></tr></thead>
            <tbody>
              ${(items || [])
                .map(
                  (i) => `
                <tr>
                  <td>${escapeHtml(i.date || "")}</td>
                  <td><b>${escapeHtml(i.title || "")}</b></td>
                  <td>${escapeHtml(i.details || i.location || "")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table></div>
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

      <div class="person" style="margin-bottom:14px;">
        <div class="info">
          <div class="name">Members-only access</div>
          <div class="small" style="margin-top:6px;">
            This website is public by design. Some BTA documents are restricted to members and are stored securely in Google Drive.
            <br><br>
            If you click a document and see a <b>“Request access”</b> screen, it means your email has not yet been added to the BTA Drive.
            <br><br>
            <b>BTA members:</b> request access using the form below. Once approved, you will be able to open all member-only documents.
          </div>

          <div style="margin-top:12px;">
            <a class="btn" href="#contact" target="_blank" rel="noopener">
              Request member access
            </a>
          </div>
        </div>
      </div>

      <div class="person" style="padding:0;">
        <div class="info">
          <div class="tableWrap"><table class="table">
            <thead><tr><th>Access</th><th>Category</th><th>Document</th><th>Link</th></tr></thead>
            <tbody>
              ${(docs || [])
                .map((d) => {
                  const restricted = isRestricted(d);
                  return `
                <tr>
                  <td>${
                    restricted
                      ? `<span class="lockTag">🔒 Member</span>`
                      : `<span class="lockTag" style="opacity:.55">Public</span>`
                  }</td>
                  <td>${escapeHtml(d.category || "")}</td>
                  <td><b>${escapeHtml(d.title || "")}</b><div class="small">${escapeHtml(d.note || "")}</div></td>
                  <td>${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Open</a>` : "—"}</td>
                </tr>
                `;
                })
                .join("")}
            </tbody>
          </table></div>
          <div class="small" style="margin-top:10px;">
            🔒 Member documents are stored in Google Drive with restricted access. If you get a “Request access” screen, you’re not added yet.
          </div>
        </div>
      </div>
    `;
  }


  async function renderContact() {
    const app = $("#app");

    // Base render size from your Google Forms embed code.
    const BASE_W = 640;
    const BASE_H = 1257;

    app.innerHTML = `
      ${hero({
        pill: "New member / access",
        title: "Update your contact info",
        subHtml:
          "We use <b>Gmail</b> for BTA Google Drive access and Google Meet links. Please submit your personal email and the <b>Gmail</b> you will use for union business.",
      })}

      ${divider("Step 1: Use a Gmail for union business", "left")}

      <div class="person" style="margin-bottom:14px;">
        <div class="info">
          <div class="name">Why Gmail?</div>
          <div class="small" style="margin-top:6px;">
            BTA member documents live in Google Drive and meeting links are run through Google Meet.
            If you try to open a restricted document and see “Request access,” it usually means we don’t have your Gmail added yet.
            <br><br>
            <b>If you already have a Gmail:</b> great — use that in the form below.
            <br>
            <b>If you don’t have one:</b> make a free Gmail just for BTA (takes ~2 minutes).
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn" href="https://accounts.google.com/signup" target="_blank" rel="noopener">
              Create a Gmail account
            </a>
            <a class="btn" href="#documents">
              Go to Documents
            </a>
          </div>
        </div>
      </div>

      ${divider("Step 2: Submit the form", "left")}

      <div class="person" style="padding:0;">
        <div class="info">
          <div class="small" style="margin:12px 12px 0;">
            This form writes directly to a Google Sheet so the union can update Drive permissions and contact lists.
          </div>

          <div class="calWrap" style="margin:12px;">
            <div class="calViewport" id="formViewport">
              <iframe
                class="calFrame"
                id="formFrame"
                src="${escapeHtml(FORM_EMBED_URL)}"
                style="border:0"
                frameborder="0"
                marginheight="0"
                marginwidth="0"
                scrolling="no"
                title="BTA Contact Info Form"
              ></iframe>
            </div>
          </div>

          <div class="small" style="margin:12px;">
            If the form does not load, <a href="${escapeHtml(FORM_EMBED_URL)}" target="_blank" rel="noopener">open it in a new tab</a>.
          </div>
        </div>
      </div>
    `;

    // Scale the form for phones so there is no horizontal scroll.
    bindScaler("formViewport", "formFrame", BASE_W, BASE_H);
  }

  async function renderResources(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: "Resources", title, subHtml: "Helpful links and NYSUT resources." })}
      ${divider("Links", "left")}
      <div class="person" style="padding:0;">
        <div class="info">
          <div class="tableWrap"><table class="table">
            <thead><tr><th>Title</th><th>Description</th><th>Link</th></tr></thead>
            <tbody>
              ${(items || [])
                .map(
                  (r) => `
                <tr>
                  <td><b>${escapeHtml(r.title || "")}</b></td>
                  <td>${escapeHtml(r.description || "")}</td>
                  <td>${r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Open</a>` : "—"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table></div>
        </div>
      </div>
    `;
  }

  async function renderDirectory() {
    const app = $("#app");
    const staff = await safeLoad("data/staff.json", []);
    const buildings = [
      "All buildings",
      ...Array.from(new Set((staff || []).map((s) => s.building).filter(Boolean))),
    ];

    app.innerHTML = `
      ${hero({
        pill: "Directory",
        title: "Staff directory",
        subHtml: "Search and filter to help members learn who’s who.",
      })}
      ${divider("Search")}
      <div class="person" style="padding:0;">
        <div class="info">
          <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; align-items:center;">
            <input id="q" class="input" placeholder="Search by name (and later: role)" />
            <select id="bldg">
              ${buildings
                .map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`)
                .join("")}
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

      const filtered = (staff || []).filter((s) => {
        const name = (s.name || "").toLowerCase();
        const okName = !term || name.includes(term);
        const okB = building === "All buildings" || s.building === building;
        return okName && okB;
      });

      grid.innerHTML = filtered
        .map((s) => {
          const initials = (s.name || "?")
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return `
          <div class="person">
            <div class="ph">
              ${
                s.photo
                  ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(
                      s.name
                    )}" loading="lazy" />`
                  : `<div style="font-weight:900; font-size:44px; color:rgba(255,255,255,.75);">${escapeHtml(
                      initials
                    )}</div>`
              }
            </div>
            <div class="info">
              <div class="name">${escapeHtml(s.name || "")}</div>
              <div class="small">Building: ${escapeHtml(s.building || "—")}</div>
              <div class="small">Role: ${escapeHtml(s.role || "—")}</div>
            </div>
          </div>
        `;
        })
        .join("");
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
        { title: "Elementary President", name: "Caitlin Hansen" },
        { title: "Secretary", name: "Allie Federico" },
        { title: "Treasurer", name: "Pat Aiello" },
      ],
      Representatives: [
        { title: "Secondary Rep", name: "Karen Knight" },
        { title: "Elementary Rep", name: "Hamra Ozsu" },
        { title: "Specials Rep", name: "Lindsey Sanchez" },
      ],
    };

    const staff = await safeLoad("data/staff.json", []);
    const photoByName = new Map((staff || []).map((s) => [s.name, s.photo]));

    app.innerHTML = `
      ${hero({
        pill: "Leadership",
        title: "Union Officers",
        subHtml: "Executive Board and Representatives",
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
        ${officers["Executive Board"].map((o) => officerCard(o, photoByName.get(o.name))).join("")}
      </div>

      ${divider("Representatives")}
      <div class="staff-grid">
        ${officers["Representatives"].map((o) => officerCard(o, photoByName.get(o.name))).join("")}
      </div>
    `;
  }

  function officerCard(officer, photo) {
    const initials = (officer.name || "?")
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return `
      <div class="person">
        <div class="ph">
          ${
            photo
              ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(
                  officer.name
                )}" loading="lazy" />`
              : `<div style="font-weight:900; font-size:44px; color:rgba(255,255,255,.75);">${escapeHtml(
                  initials
                )}</div>`
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

    // Close mobile nav on navigation
    const navEl = $("#nav");
    const t = document.getElementById("navToggle");
    if (navEl) navEl.classList.remove("open");
    if (t) t.setAttribute("aria-expanded", "false");

    setActiveNav();
    (routes[id] || routes.home)();
  }

  window.addEventListener("hashchange", route);
  route();
})();
