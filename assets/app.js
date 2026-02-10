(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- Nav / routing ----------
  const nav = [
    { id: "home", label: "Home" },
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

  function isMobileNav() {
    // Match your CSS breakpoint for mobile nav behavior
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function closeMobileNav() {
    const navEl = $("#nav");
    const t = document.getElementById("navToggle");
    if (navEl) navEl.classList.remove("open");
    if (t) t.setAttribute("aria-expanded", "false");
  }

  function setActiveNav() {
    const cur = (location.hash || "#home").replace("#", "");
    const navEl = $("#nav");
    navEl.innerHTML = nav
      .map(
        (n) => `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${n.label}</a>`
      )
      .join("");

    // Mobile nav toggle
    const t = document.getElementById("navToggle");
    if (t && !t.__bound) {
      t.__bound = true;

      t.addEventListener("click", (e) => {
        e.preventDefault();
        const open = navEl.classList.toggle("open");
        t.setAttribute("aria-expanded", open ? "true" : "false");
      });

      // Close on outside click (mobile only)
      document.addEventListener("click", (e) => {
        if (!isMobileNav()) return;
        const btn = document.getElementById("navToggle");
        const navNode = document.getElementById("nav");
        if (!btn || !navNode) return;

        const isOpen = navNode.classList.contains("open");
        if (!isOpen) return;

        const clickInsideNav = navNode.contains(e.target);
        const clickInsideBtn = btn.contains(e.target);
        if (!clickInsideNav && !clickInsideBtn) closeMobileNav();
      });

      // Close on ESC (mobile only)
      document.addEventListener("keydown", (e) => {
        if (!isMobileNav()) return;
        if (e.key === "Escape") closeMobileNav();
      });
    }

    // Close when a nav link is tapped (mobile only)
    if (t) {
      navEl.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          if (isMobileNav()) closeMobileNav();
        });
      });
    }
  }

  // ---------- Data helpers ----------
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

  // ---------- UI helpers ----------
  function divider(label, align = "center") {
    const cls = align === "left" ? "divider dividerLeft" : "divider";
    return `
      <div class="${cls}" role="separator" aria-label="${escapeHtml(label)}">
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

  // ---------- Pages ----------
  async function renderHome() {
    const app = $("#app");
    const [news, events] = await Promise.all([
      safeLoad("data/news.json", []),
      safeLoad("data/events.json", []),
    ]);

    const latestNews = (news || []).slice(0, 3);
    const upcoming = (events || []).slice(0, 3);

    const missionHtml = `
      <b>Mission:</b>  The BTA  is a union of professionals that champions fairness; democracy; economic opportunity; and high-quality public education, healthcare and public services for our students, their families and our communities. *
      <br><br>
      <em>*We share the same mission as the United Federation of Teachers.</em>
    `;

    // Instagram
    const igHandle = "bhsteachersassociation";
    const igUrl = `https://www.instagram.com/${igHandle}/`;

    // Google Calendar embed
    // Add safe display params; then force AGENDA on mobile (Month view looks bad on phones).
    const calBase =
      "https://calendar.google.com/calendar/embed?src=7e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf%40group.calendar.google.com&ctz=America%2FNew_York";

    const calParams =
      "&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0";

    const calMonth = `${calBase}${calParams}&mode=MONTH`;
    const calAgenda = `${calBase}${calParams}&mode=AGENDA`;

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
              ${
                upcoming.length
                  ? upcoming
                      .map(
                        (e) =>
                          `<li><b>${escapeHtml(e.title || "")}</b> — ${escapeHtml(
                            e.date || ""
                          )}${e.time ? ` (${escapeHtml(e.time)})` : ""}${
                            e.location ? ` · ${escapeHtml(e.location)}` : ""
                          }</li>`
                      )
                      .join("")
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
                <a class="btn ig" href="${escapeHtml(
                  igUrl
                )}" target="_blank" rel="noopener">Follow us on Instagram</a>
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
            <iframe class="calFrame" id="calFrame" src="${calMonth}" style="border:0" frameborder="0" scrolling="no"></iframe>
          </div>
        </div>
      </div>
    `;

    const calFrame = $("#calFrame");
    const mBtn = $("#calMonthBtn");
    const aBtn = $("#calAgendaBtn");

    // Calendar behavior:
    // - Desktop: Month/Agenda toggles work
    // - Mobile: force Agenda (Month view looks bad), hide Month button
    let lastIsMobile = isMobileNav();

    function applyCalendarModeForViewport() {
      const nowMobile = isMobileNav();
      if (!calFrame || !mBtn || !aBtn) return;

      // Always force AGENDA on mobile
      if (nowMobile) {
        mBtn.style.display = "none";
        aBtn.style.display = "";
        aBtn.classList.add("activeBtn");
        mBtn.classList.remove("activeBtn");
        calFrame.setAttribute("scrolling", "yes"); // helps on iOS
        calFrame.src = calAgenda;
      } else {
        mBtn.style.display = "";
        aBtn.style.display = "";
        calFrame.setAttribute("scrolling", "no");

        // Keep current selection if user changed it; default to MONTH
        // If we're coming from mobile, reset to MONTH for a nicer desktop experience
        if (lastIsMobile) {
          mBtn.classList.add("activeBtn");
          aBtn.classList.remove("activeBtn");
          calFrame.src = calMonth;
        } else {
          // keep whichever button is active
          if (aBtn.classList.contains("activeBtn")) calFrame.src = calAgenda;
          else calFrame.src = calMonth;
        }
      }

      lastIsMobile = nowMobile;
    }

    // Bind tab switches (desktop only; mobile is forced agenda)
    if (calFrame && mBtn && aBtn) {
      mBtn.addEventListener("click", () => {
        if (isMobileNav()) return; // forced agenda on mobile
        mBtn.classList.add("activeBtn");
        aBtn.classList.remove("activeBtn");
        calFrame.src = calMonth;
      });

      aBtn.addEventListener("click", () => {
        aBtn.classList.add("activeBtn");
        mBtn.classList.remove("activeBtn");
        calFrame.src = calAgenda;
      });

      // Initialize mode for current viewport
      applyCalendarModeForViewport();

      // Update on resize/orientation change (debounced)
      let rT = null;
      window.addEventListener("resize", () => {
        clearTimeout(rT);
        rT = setTimeout(applyCalendarModeForViewport, 120);
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
      ${hero({
        pill: "Documents",
        title: "Documents",
        subHtml: "Contracts, MOAs, bylaws, meeting minutes, and more.",
      })}
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
            <a class="btn" href="PASTE_GOOGLE_FORM_LINK_HERE" target="_blank" rel="noopener">
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
                  <td><b>${escapeHtml(d.title || "")}</b><div class="small">${escapeHtml(
                    d.note || ""
                  )}</div></td>
                  <td>${
                    d.url
                      ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Open</a>`
                      : "—"
                  }</td>
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
                  <td>${
                    r.url
                      ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Open</a>`
                      : "—"
                  }</td>
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
        { title: "Elementary President", name: "Caite Hansen" },
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
        ${officers["Executive Board"]
          .map((o) => officerCard(o, photoByName.get(o.name)))
          .join("")}
      </div>

      ${divider("Representatives")}
      <div class="staff-grid">
        ${officers["Representatives"]
          .map((o) => officerCard(o, photoByName.get(o.name)))
          .join("")}
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
    closeMobileNav();

    setActiveNav();
    (routes[id] || routes.home)();
  }

  window.addEventListener("hashchange", route);
  route();
})();
