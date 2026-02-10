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
    events: () => renderEventsPage(),
    documents: renderDocuments,
    officers: renderOfficers,
    directory: renderDirectory,
    resources: () => renderResources("NYSUT & Links", "data/resources.json"),
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setActiveNav() {
    const cur = (location.hash || "#home").replace("#", "");
    const navEl = $("#nav");
    navEl.innerHTML = nav
      .map((n) => `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${escapeHtml(n.label)}</a>`)
      .join("");

    // Close mobile nav after selection
    navEl.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => closeMobileNav());
    });
  }

  function hookNavToggle() {
    const btn = $("#navToggle");
    const navEl = $("#nav");
    if (!btn || !navEl) return;

    btn.addEventListener("click", () => {
      const isOpen = navEl.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close if user taps outside (mobile)
    document.addEventListener("click", (e) => {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobile) return;
      if (!navEl.classList.contains("open")) return;
      if (navEl.contains(e.target) || btn.contains(e.target)) return;
      closeMobileNav();
    });

    // Reset on resize up
    window.addEventListener("resize", () => {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobile) {
        navEl.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function closeMobileNav() {
    const btn = $("#navToggle");
    const navEl = $("#nav");
    if (!btn || !navEl) return;
    navEl.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
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

    const calendarId = (social && social.googleCalendarId)
      ? social.googleCalendarId
      : "7e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf@group.calendar.google.com";

    const baseEmbed = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FNew_York`;

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
                ? upcoming.map(e => `<li><b>${escapeHtml(e.title || "")}</b> — ${escapeHtml(e.date || "")}${e.time ? ` · ${escapeHtml(e.time)}` : ""}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</li>`).join("")
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
          <div class="ph" style="height:auto; padding:18px;">
            <div style="text-align:center;">
              <div style="font-weight:900;font-size:18px;">Follow us on Instagram</div>
              <div class="small" style="margin-top:6px;">@${escapeHtml(igHandle)}</div>
              <div style="margin-top:14px;">
                <a class="btn ig" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">Open Instagram</a>
              </div>
            </div>
          </div>

          <div class="info">
            <div class="name">Instagram preview</div>
            <div class="small" style="margin-top:6px;">
              (Paused) We’ll plug LightWidget here once your IG admin connects it.
            </div>
            <div class="small" style="margin-top:10px;">
              For now: <a href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">view the profile →</a>
            </div>
          </div>
        </div>

        <div class="person" style="grid-column:span 6;">
          <div class="info">
            <div class="name">Event calendar</div>
            <div class="small" style="margin-top:6px;">
              Shared BTA Google Calendar (Month / Agenda view).
            </div>

            <div class="calWrap" style="margin-top:12px;">
              <div class="calTabs">
                <button class="btn activeBtn" id="calMonthBtn" type="button">Month</button>
                <button class="btn" id="calAgendaBtn" type="button">Agenda</button>
                <a class="btn" href="https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(calendarId)}" target="_blank" rel="noopener" style="margin-left:auto;">Open</a>
              </div>
              <iframe class="calFrame" id="calFrame" src="${baseEmbed}&mode=MONTH" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>
    `;

    const frame = $("#calFrame");
    const monthBtn = $("#calMonthBtn");
    const agendaBtn = $("#calAgendaBtn");
    if (frame && monthBtn && agendaBtn) {
      const setMode = (mode) => {
        frame.src = `${baseEmbed}&mode=${mode}`;
        if (mode === "MONTH") {
          monthBtn.classList.add("activeBtn");
          agendaBtn.classList.remove("activeBtn");
        } else {
          agendaBtn.classList.add("activeBtn");
          monthBtn.classList.remove("activeBtn");
        }
      };
      monthBtn.addEventListener("click", () => setMode("MONTH"));
      agendaBtn.addEventListener("click", () => setMode("AGENDA"));
    }
  }

  async function renderEventsPage() {
    const app = $("#app");
    const social = await safeLoad("data/social.json", {});
    const calendarId = (social && social.googleCalendarId)
      ? social.googleCalendarId
      : "7e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf@group.calendar.google.com";
    const baseEmbed = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FNew_York`;

    app.innerHTML = `
      ${hero({ pill: "Events", title: "Events", subHtml: "Calendar view (Month / Agenda). Updates are managed in Google Calendar." })}
      ${divider("Calendar")}
      <div class="person" style="grid-column:span 12;">
        <div class="info">
          <div class="calWrap">
            <div class="calTabs">
              <button class="btn activeBtn" id="evMonthBtn" type="button">Month</button>
              <button class="btn" id="evAgendaBtn" type="button">Agenda</button>
              <a class="btn" href="https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(calendarId)}" target="_blank" rel="noopener" style="margin-left:auto;">Open</a>
            </div>
            <iframe class="calFrame" id="evFrame" src="${baseEmbed}&mode=MONTH" loading="lazy"></iframe>
          </div>
        </div>
      </div>
    `;

    const frame = $("#evFrame");
    const monthBtn = $("#evMonthBtn");
    const agendaBtn = $("#evAgendaBtn");
    if (frame && monthBtn && agendaBtn) {
      const setMode = (mode) => {
        frame.src = `${baseEmbed}&mode=${mode}`;
        if (mode === "MONTH") {
          monthBtn.classList.add("activeBtn");
          agendaBtn.classList.remove("activeBtn");
        } else {
          agendaBtn.classList.add("activeBtn");
          monthBtn.classList.remove("activeBtn");
        }
      };
      monthBtn.addEventListener("click", () => setMode("MONTH"));
      agendaBtn.addEventListener("click", () => setMode("AGENDA"));
    }
  }

  async function renderListPage(title, path) {
    const app = $("#app");
    const items = await safeLoad(path, []);
    app.innerHTML = `
      ${hero({ pill: title, title, subHtml: "" })}
      ${divider(title)}
      <div class="person" style="padding:0;">
        <div class="info tableWrap">
          <table class="table">
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

  // Your existing Documents / Resources / Directory / Officers can stay as-is.
  // If you want, paste your current versions and I’ll merge them into this exact file cleanly.

  async function renderDocuments(){ location.hash = "#home"; }   // placeholder
  async function renderResources(){ location.hash = "#home"; }   // placeholder
  async function renderDirectory(){ location.hash = "#home"; }   // placeholder
  async function renderOfficers(){ location.hash = "#home"; }    // placeholder

  function route() {
    const id = (location.hash || "#home").replace("#", "");
    setActiveNav();
    (routes[id] || routes.home)();
    closeMobileNav();
  }

  window.addEventListener("hashchange", route);

  hookNavToggle();
  route();
})();
