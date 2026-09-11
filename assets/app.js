(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Google Form embed (Update Contact Info)
  const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfXsuucGYGRnUdDwCy19LoHy6DIQdOlsTKDILaBGo09HlsJIg/viewform?embedded=true";

  // Upcoming events Google Sheet (public)
  const EVENTS_SHEET_ID = "19gTGcoFG9UnlW8m1ZEuGxuFZ_5cG5Tmem2Md5ROotp8";
  const EVENTS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${EVENTS_SHEET_ID}/gviz/tq?tqx=out:json`;

  // ---------- Nav / routing ----------
  const nav = [
    { id: "home", label: "Home" },
    { id: "documents", label: "Documents" },
    { id: "salary", label: "Salary" },
    { id: "contract", label: "Contract" },
    { id: "officers", label: "Officers" },
    { id: "directory", label: "Directory" },
    { id: "contact", label: "Contact" },
    { id: "resources", label: "NYSUT" },
  ];

  const routes = {
    home: renderHome,
    news: () => renderListPage("News", "data/news.json"),
    events: renderEventsPage,
    documents: renderDocuments,
    salary: renderSalaryLookup,
    contract: renderContract,
    officers: renderOfficers,
    directory: renderDirectory,
    contact: renderContact,
    resources: () => renderResources("NYSUT & Links", "data/resources.json"),
  };

  function setActiveNav() {
    const cur = (location.hash || "#home").replace("#", "");
    const navEl = $("#nav");
    navEl.innerHTML = nav
      .map((n) => `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${n.label}</a>`)
      .join("");

    // Mobile nav toggle (only shows on small screens)
    const t = document.getElementById("navToggle");
    if (t && !t.__bound) {
      t.__bound = true;
      t.addEventListener("click", () => {
        navEl.classList.toggle("open");
        t.setAttribute("aria-expanded", navEl.classList.contains("open") ? "true" : "false");
      });
    }
    if (t) {
      navEl.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          if (window.innerWidth <= 900) {
            navEl.classList.remove("open");
            t.setAttribute("aria-expanded", "false");
          }
        });
      });
    }

    // If the nav fits within the available width, force scroll position back to 0.
    // Some browsers preserve a tiny scrollLeft value on overflow-x:auto containers,
    // which makes the last tab look clipped even when everything fits.
    requestAnimationFrame(() => {
      ensureNavScrollReset(navEl);
    });
  }

  function ensureNavScrollReset(navEl) {
    if (!navEl) return;
    // Only do this when the nav does NOT need scrolling.
    if (navEl.scrollWidth <= navEl.clientWidth + 2) {
      navEl.scrollLeft = 0;
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

  // ---------- Google Sheet -> events helpers ----------
  const parseGvizJson = (text) => {
    // Response format: google.visualization.Query.setResponse(<json>);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Unexpected gviz response");
    return JSON.parse(text.slice(start, end + 1));
  };

  const parseGvizDate = (v, f) => {
    // v can be "Date(2026,5,1)" or a string; f may be formatted date
    const s = typeof v === "string" ? v : (v && v.toString ? v.toString() : "");
    if (s.startsWith("Date(")) {
      const nums = s.slice(5, -1).split(",").map((n) => parseInt(n.trim(), 10));
      const [y, m, d] = nums;
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) return new Date(y, m, d);
    }
    const cand = f || v;
    const t = Date.parse(cand);
    return Number.isNaN(t) ? null : new Date(t);
  };

  const sheetRowToEvent = (row) => {
    const c = (row && row.c) || [];
    const cell = (i) => (c[i] ? (c[i].v ?? "") : "");
    const cellF = (i) => (c[i] ? (c[i].f ?? "") : "");
    const title = String(cell(0) || "").trim();
    if (!title) return null;

    // Skip header row if the sheet includes column headings as the first row
    const tLower = title.toLowerCase();
    const c1 = String(cell(1) || "").toLowerCase();
    const c2 = String(cell(2) || "").toLowerCase();
    if (tLower === "title" && (c1.includes("date") || c2.includes("display"))) return null;

    const dateV = cell(1);
    const dateF = cellF(1);
    const sortDate = parseGvizDate(dateV, dateF);

    const displayDate = String(cell(2) || "").trim() || (dateF ? String(dateF) : String(dateV || "").trim());
    const time = String(cell(3) || "").trim();
    const location = String(cell(4) || "").trim();
    const notes = String(cell(5) || "").trim();

    return {
      title,
      date: displayDate,
      time: time && time.toUpperCase() !== "TBD" ? time : (time || "TBD"),
      location,
      details: notes,
      _sort: sortDate ? sortDate.getTime() : Number.POSITIVE_INFINITY,
    };
  };

  async function loadEventsFromSheet() {
    const res = await fetch(EVENTS_SHEET_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const data = parseGvizJson(text);
    const rows = (data && data.table && data.table.rows) || [];
    const items = rows.map(sheetRowToEvent).filter(Boolean);
    // sort by date if possible
    items.sort((a, b) => (a._sort || 0) - (b._sort || 0));
    return items.map(({ _sort, ...rest }) => rest);
  }

  async function loadUpcomingEventsAll() {
    try {
      const items = await loadEventsFromSheet();
      if (items && items.length) return items;
    } catch (e) {
      console.warn("Upcoming events sheet unavailable, falling back to events.json", e);
    }
    return await safeLoad("data/events.json", []);
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


  // ---------- Responsive iframe scaler (keeps embeds readable on mobile portrait) ----------
  function bindScaler(viewportId, frameId, baseW, baseH) {
    const viewport = document.getElementById(viewportId);
    const iframe = document.getElementById(frameId);
    if (!viewport || !iframe) return () => {};

    // Force iframe to render at a "desktop" size, then scale down to viewport width.
    iframe.style.width = `${baseW}px`;
    iframe.style.height = `${baseH}px`;
    iframe.style.transformOrigin = "0 0";

    const apply = () => {
      const w = viewport.clientWidth || baseW;

      // Never upscale above 1 (desktop stays crisp and unchanged).
      const scale = Math.min(1, w / baseW);

      iframe.style.transform = `scale(${scale})`;
      viewport.style.height = `${Math.round(baseH * scale)}px`;
    };

    apply();
    window.addEventListener("resize", apply, { passive: true });
    window.addEventListener("orientationchange", apply, { passive: true });

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }

  // Back-compat: existing calendar code calls this.
  function bindCalendarScaler(baseW, baseH) {
    return bindScaler("calViewport", "calFrame", baseW, baseH);
  }


  // ---------- Pages ----------
  async function renderHome() {
    const app = $("#app");
    const [news, events, igData] = await Promise.all([
      safeLoad("data/news.json", []),
      loadUpcomingEventsAll(),
      safeLoad("data/instagram.json", {}),
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
    const igPostUrl = (igData && igData.postUrl) ? igData.postUrl : "";
    const igImg = (igData && igData.imageUrl) ? igData.imageUrl : "";
    const igDesc = (igData && igData.description) ? igData.description : "";

    // Google Calendar embed (your exact embed base, America/New_York)
    const calBase =
      "https://calendar.google.com/calendar/embed?src=7e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf%40group.calendar.google.com&ctz=America%2FNew_York";
    const calMonth = `${calBase}`; // month grid default
    const calAgenda = `${calBase}&mode=AGENDA`;

    app.innerHTML = `
      ${hero({
        pill: "Member hub",
        title: "Bridgehampton Teachers Association",
        subHtml: missionHtml,
      })}

      <aside class="welcomeBanner" aria-label="Welcome our new French teacher">
        <div class="welcomeBannerIcon" aria-hidden="true">🐝</div>
        <div class="welcomeBannerCopy">
          <div class="welcomeBannerEyebrow">Bienvenue to the Hive</div>
          <div class="welcomeBannerTitle">Welcome, Inna Kucheryavenko!</div>
          <div class="welcomeBannerText">Please join us in welcoming Bridgehampton’s new French teacher.</div>
        </div>
      </aside>

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
                          `<li><b>${escapeHtml(e.title || "")}</b> — ${escapeHtml(e.date || "")}${
                            e.time ? ` (${escapeHtml(e.time)})` : ""
                          }${e.location ? ` · ${escapeHtml(e.location)}` : ""}</li>`
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
                <a class="btn ig" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">Follow us on Instagram</a>
              </div>

              <div class="igReserve" style="margin-top:14px;">
                ${
                  igImg
                    ? `
                      <a href="${escapeHtml(igPostUrl || igUrl)}" target="_blank" rel="noopener" style="display:block;">
                        <img src="${escapeHtml(igImg)}" alt="Latest Instagram post" style="width:100%; height:auto; display:block; border-radius:12px; border:1px solid rgba(255,215,0,.18);" loading="lazy" />
                      </a>
                      <div class="small" style="margin-top:10px; opacity:.92;">
                        ${escapeHtml(igDesc).slice(0, 180)}${(igDesc && igDesc.length > 180) ? "…" : ""}
                      </div>
                      <div style="margin-top:12px;">
                        <a class="btn ig" href="${escapeHtml(igPostUrl || igUrl)}" target="_blank" rel="noopener">View latest post</a>
                      </div>
                    `
                    : `
                      <div class="small" style="opacity:.9; text-align:center;">
                        Instagram preview isn’t available right now.
                      </div>
                      <div style="margin-top:12px; text-align:center;">
                        <a class="btn ig" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">View Instagram</a>
                      </div>
                    `
                }
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

  async function renderEventsPage() {
    const app = $("#app");
    const items = await loadUpcomingEventsAll();
    app.innerHTML = `
      ${hero({ pill: "Events", title: "Events", subHtml: "" })}
      ${divider("Events")}
      <div class="person" style="padding:0;">
        <div class="info">
          <div class="tableWrap"><table class="table">
            <thead><tr><th>Date</th><th>Title</th><th>Details</th></tr></thead>
            <tbody>
              ${(items || [])
                .map(
                  (i) => `
                <tr>
                  <td>${escapeHtml(i.date || "")}${i.time ? ` · ${escapeHtml(i.time)}` : ""}</td>
                  <td><b>${escapeHtml(i.title || "")}</b></td>
                  <td>${escapeHtml(i.location || i.details || "")}</td>
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



  async function renderSalaryLookup() {
    const app = $("#app");
    const data = await safeLoad("data/salary-schedules.json", null);

    if (!data || !Array.isArray(data.schedules) || !data.schedules.length) {
      app.innerHTML = `
        ${hero({
          pill: "Salary schedules",
          title: "Salary lookup",
          subHtml: "The salary schedule data could not be loaded.",
        })}
        ${divider("Unavailable", "left")}
        <div class="person"><div class="info">
          <div class="name">Salary lookup is temporarily unavailable.</div>
          <div class="small" style="margin-top:6px;">Please try again later or contact a BTA officer.</div>
        </div></div>
      `;
      return;
    }

    const schedules = data.schedules;
    const columns = Array.isArray(data.columns) ? data.columns : [];
    const teacherColumns = columns.filter((column) => column !== "TA");
    const today = new Date();
    const currentSchedule =
      schedules.find((schedule) => {
        const start = new Date(`${schedule.effectiveStart}T00:00:00`);
        const end = new Date(`${schedule.effectiveEnd}T23:59:59`);
        return today >= start && today <= end;
      }) || schedules[schedules.length - 1];

    const yearOptions = schedules
      .map(
        (schedule) =>
          `<option value="${escapeHtml(schedule.id)}" ${
            schedule.id === currentSchedule.id ? "selected" : ""
          }>School year ${escapeHtml(schedule.id)}${
            schedule.id === currentSchedule.id ? " (current)" : ""
          }</option>`
      )
      .join("");

    const stepOptions = Array.from({ length: 23 }, (_, index) => index + 1)
      .map((step) => `<option value="${step}">Step ${step}</option>`)
      .join("");

    const columnOptions = columns
      .map(
        (column) =>
          `<option value="${escapeHtml(column)}">${
            column === "TA" ? "TA" : escapeHtml(column)
          }</option>`
      )
      .join("");

    app.innerHTML = `
      ${hero({
        pill: "Finalized schedules",
        title: "Salary lookup",
        subHtml:
          "Search the finalized BTA salary schedules by <b>step and column</b> or by <b>annual base salary</b>.",
      })}

      ${divider("Choose a school year", "left")}

      <section class="salaryShell">
        <div class="salaryToolbar">
          <label class="salaryField salaryYearField" for="salaryYear">
            <span class="salaryLabel">Salary schedule year</span>
            <select id="salaryYear">${yearOptions}</select>
          </label>
          <div class="salaryYearDetails" id="salaryYearDetails"></div>
        </div>

        <div class="salaryModeSwitch" role="tablist" aria-label="Salary lookup method">
          <button class="salaryModeBtn active" type="button" data-mode="placement" role="tab" aria-selected="true">
            Step &amp; column → salary
          </button>
          <button class="salaryModeBtn" type="button" data-mode="amount" role="tab" aria-selected="false">
            Salary → step &amp; column
          </button>
          <button class="salaryModeBtn" type="button" data-mode="schedule" role="tab" aria-selected="false">
            Full schedule
          </button>
        </div>

        <section class="salaryPanel" id="salaryPlacementPanel" data-panel="placement" role="tabpanel">
          <div class="salaryFormGrid">
            <label class="salaryField" for="salaryColumn">
              <span class="salaryLabel">Column</span>
              <select id="salaryColumn">${columnOptions}</select>
            </label>
            <label class="salaryField" for="salaryStep">
              <span class="salaryLabel">Step</span>
              <select id="salaryStep">${stepOptions}</select>
              <span class="salaryHelp" id="salaryStepHelp"></span>
            </label>
          </div>
          <div class="salaryResult" id="salaryPlacementResult" aria-live="polite"></div>
        </section>

        <section class="salaryPanel" id="salaryAmountPanel" data-panel="amount" role="tabpanel" hidden>
          <div class="salaryAmountSearch">
            <label class="salaryField" for="salaryAmount">
              <span class="salaryLabel">Annual contractual base salary</span>
              <input
                class="input salaryAmountInput"
                id="salaryAmount"
                inputmode="decimal"
                autocomplete="off"
                placeholder="Example: $105,414"
              />
              <span class="salaryHelp">Enter the annual amount, not a paycheck amount.</span>
            </label>
            <button class="btn" type="button" id="salarySearchBtn">Find matches</button>
          </div>
          <div class="salarySearchResults" id="salarySearchResults" aria-live="polite"></div>
        </section>

        <section class="salaryPanel" id="salarySchedulePanel" data-panel="schedule" role="tabpanel" hidden>
          <div class="salaryScheduleTopline">
            <div>
              <div class="name">Full salary schedule</div>
              <div class="small">Scroll horizontally to view every column.</div>
            </div>
            <a class="btn salaryPdfLink" id="salaryPdfLink" target="_blank" rel="noopener">Open official PDF</a>
          </div>
          <div class="salaryTableWrap" id="salaryTableWrap"></div>
        </section>
      </section>

      <div class="salaryNotice">
        <b>Base salary only.</b> These schedules do not include stipends, extra classes, coaching,
        summer work, health-insurance buyback, retroactive pay, or other individual compensation.
        Use the official PDF or contact BTA leadership when placement is unclear.
      </div>
    `;

    const yearSelect = $("#salaryYear");
    const yearDetails = $("#salaryYearDetails");
    const columnSelect = $("#salaryColumn");
    const stepSelect = $("#salaryStep");
    const stepHelp = $("#salaryStepHelp");
    const placementResult = $("#salaryPlacementResult");
    const amountInput = $("#salaryAmount");
    const searchButton = $("#salarySearchBtn");
    const searchResults = $("#salarySearchResults");
    const pdfLink = $("#salaryPdfLink");
    const tableWrap = $("#salaryTableWrap");
    const modeButtons = Array.from(document.querySelectorAll(".salaryModeBtn"));
    const panels = Array.from(document.querySelectorAll(".salaryPanel"));

    const currency = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency || "USD",
      maximumFractionDigits: 0,
    });

    const getSchedule = () =>
      schedules.find((schedule) => schedule.id === yearSelect.value) || schedules[0];

    const formatDate = (iso) => {
      if (!iso) return "";
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${iso}T12:00:00`));
    };

    const parseSalary = (value) => {
      const cleaned = String(value || "")
        .replace(/[$,\s]/g, "")
        .trim();
      if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
      const amount = Number(cleaned);
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    };

    const flattenSchedule = (schedule) => {
      const entries = [];
      (schedule.rows || []).forEach((row) => {
        columns.forEach((column) => {
          if (typeof row[column] === "number") {
            entries.push({ step: row.step, column, salary: row[column] });
          }
        });
      });
      return entries;
    };

    function renderYearDetails() {
      const schedule = getSchedule();
      yearDetails.innerHTML = `
        <div class="salaryYearName">${escapeHtml(schedule.id)}</div>
        <div class="small">Effective ${escapeHtml(formatDate(schedule.effectiveStart))} - ${escapeHtml(
          formatDate(schedule.effectiveEnd)
        )}</div>
      `;
    }

    function renderPlacement() {
      const schedule = getSchedule();
      const column = columnSelect.value;
      if (column === "TA") {
        stepSelect.value = "1";
        stepSelect.disabled = true;
        stepHelp.textContent = "The finalized schedule lists one TA salary under Step 1.";
      } else {
        stepSelect.disabled = false;
        stepHelp.textContent = "";
      }

      const step = Number(stepSelect.value);
      const row = (schedule.rows || []).find((item) => Number(item.step) === step);
      const salary = row && row[column];

      if (typeof salary !== "number") {
        placementResult.innerHTML = `
          <div class="salaryResultLabel">No listed salary</div>
          <div class="small">This step and column combination is blank on the official schedule.</div>
        `;
        return;
      }

      placementResult.innerHTML = `
        <div class="salaryResultLabel">Annual contractual base salary</div>
        <div class="salaryBigAmount">${escapeHtml(currency.format(salary))}</div>
        <div class="salaryResultMeta">
          School year ${escapeHtml(schedule.id)} · ${escapeHtml(column)} · Step ${escapeHtml(step)}
        </div>
      `;
    }

    function renderSalarySearch() {
      const schedule = getSchedule();
      const amount = parseSalary(amountInput.value);

      if (amount === null) {
        searchResults.innerHTML = `
          <div class="salaryInlineMessage">Enter a valid annual salary amount.</div>
        `;
        return;
      }

      const entries = flattenSchedule(schedule);
      const exactMatches = entries.filter((entry) => Math.abs(entry.salary - amount) < 0.005);

      if (exactMatches.length) {
        searchResults.innerHTML = `
          <div class="salarySearchHeading">
            ${exactMatches.length} exact ${exactMatches.length === 1 ? "match" : "matches"} in ${escapeHtml(
              schedule.id
            )}
          </div>
          <div class="salaryMatchGrid">
            ${exactMatches
              .map(
                (entry) => `
                  <div class="salaryMatchCard exact">
                    <div class="salaryMatchAmount">${escapeHtml(currency.format(entry.salary))}</div>
                    <div><b>${escapeHtml(entry.column)}</b> · Step ${escapeHtml(entry.step)}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        `;
        return;
      }

      const closest = entries
        .map((entry) => ({ ...entry, difference: Math.abs(entry.salary - amount) }))
        .sort((a, b) => a.difference - b.difference || a.salary - b.salary)
        .slice(0, 6);

      searchResults.innerHTML = `
        <div class="salarySearchHeading">No exact match in ${escapeHtml(schedule.id)}</div>
        <div class="salaryInlineMessage warning">
          The entries below are only the closest schedule amounts. They do not confirm a member's placement.
        </div>
        <div class="salaryMatchGrid">
          ${closest
            .map(
              (entry) => `
                <div class="salaryMatchCard">
                  <div class="salaryMatchAmount">${escapeHtml(currency.format(entry.salary))}</div>
                  <div><b>${escapeHtml(entry.column)}</b> · Step ${escapeHtml(entry.step)}</div>
                  <div class="small">${escapeHtml(currency.format(entry.difference))} away</div>
                </div>
              `
            )
            .join("")}
        </div>
      `;
    }

    function renderFullSchedule() {
      const schedule = getSchedule();
      pdfLink.href = schedule.sourcePdf || "#";
      pdfLink.hidden = !schedule.sourcePdf;

      tableWrap.innerHTML = `
        <table class="salaryTable">
          <thead>
            <tr>
              <th scope="col">Step</th>
              ${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${(schedule.rows || [])
              .map(
                (row) => `
                  <tr>
                    <th scope="row">${escapeHtml(row.step)}</th>
                    ${columns
                      .map(
                        (column) =>
                          `<td>${typeof row[column] === "number" ? escapeHtml(currency.format(row[column])) : "—"}</td>`
                      )
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    function setMode(mode) {
      modeButtons.forEach((button) => {
        const active = button.dataset.mode === mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== mode;
      });
      if (mode === "schedule") renderFullSchedule();
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    yearSelect.addEventListener("change", () => {
      renderYearDetails();
      renderPlacement();
      renderFullSchedule();
      if (amountInput.value.trim()) renderSalarySearch();
    });
    columnSelect.addEventListener("change", renderPlacement);
    stepSelect.addEventListener("change", renderPlacement);
    searchButton.addEventListener("click", renderSalarySearch);
    amountInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") renderSalarySearch();
    });
    amountInput.addEventListener("blur", () => {
      const amount = parseSalary(amountInput.value);
      if (amount !== null) amountInput.value = currency.format(amount);
    });

    // Teacher columns are listed in the same order as the official schedules.
    if (teacherColumns.length && columns[0] === "TA") {
      columnSelect.value = teacherColumns[0];
    }
    renderYearDetails();
    renderPlacement();
    renderFullSchedule();
  }

  async function renderContract() {
    const app = $("#app");
    const config = await safeLoad("data/contract-assistant.json", {
      title: "2025-2030 BTA Agreement",
      pdfPath: "https://drive.google.com/file/d/1lnoJ27j9RpkF0gTwzAdNUCjTH04ML0H-/preview",
      citationPdfPath: "https://drive.google.com/uc?export=view&id=1lnoJ27j9RpkF0gTwzAdNUCjTH04ML0H-",
      assistantEndpoint: "",
      versionLabel: "Official signed agreement — executed September 11, 2026",
    });

    const pdfPath = config.pdfPath || "https://drive.google.com/file/d/1lnoJ27j9RpkF0gTwzAdNUCjTH04ML0H-/preview";
    const citationPdfPath = String(config.citationPdfPath || pdfPath).trim();
    const endpoint = String(config.assistantEndpoint || "").trim();
    const assistantReady = /^https?:\/\//i.test(endpoint);
    const suggestions = [
      "How many personal days do I get?",
      "What are the grievance deadlines?",
      "How much is a full-year extra class?",
      "What is the health insurance contribution for 2027-28?",
      "When do I qualify for longevity?",
      "What does the contract say about prep periods?",
    ];

    app.innerHTML = `
      ${hero({
        pill: "2025-2030 agreement",
        title: "Contract center",
        subHtml:
          "Read the official agreement or ask the BTA Contract Assistant a question and jump directly to the supporting contract language.",
      })}

      <div class="contractNotice">
        <b>The agreement controls.</b> The AI assistant is a faster way to locate and understand provisions; it does not replace the actual contract or BTA guidance on an individual situation.
      </div>

      <section class="contractShell">
        <div class="contractModeSwitch" role="tablist" aria-label="Contract tools">
          <button class="contractModeBtn active" type="button" data-contract-mode="read" role="tab" aria-selected="true">
            Read the contract
          </button>
          <button class="contractModeBtn" type="button" data-contract-mode="ask" role="tab" aria-selected="false">
            Ask the contract
          </button>
        </div>

        <section class="contractPanel" data-contract-panel="read" role="tabpanel">
          <div class="contractReaderTopline">
            <div>
              <div class="name">${escapeHtml(config.title || "2025-2030 BTA Agreement")}</div>
              <div class="small">${escapeHtml(config.versionLabel || "Official contract copy")} · July 1, 2025 - June 30, 2030</div>
            </div>
            <div class="contractReaderActions">
              <a class="btn" href="${escapeHtml(pdfPath)}" target="_blank" rel="noopener">Open full screen</a>
              <a class="btn secondaryBtn" href="${escapeHtml(pdfPath)}" download>Download PDF</a>
            </div>
          </div>

          <div class="contractPdfWrap">
            <iframe
              class="contractPdfFrame"
              src="${escapeHtml(pdfPath)}#view=FitH"
              title="Bridgehampton BTA Agreement 2025-2030"
            ></iframe>
          </div>
          <div class="small contractPdfFallback">
            If your browser does not display PDFs inside the page, use <a href="${escapeHtml(pdfPath)}" target="_blank" rel="noopener">Open full screen</a>.
          </div>
        </section>

        <section class="contractPanel" data-contract-panel="ask" role="tabpanel" hidden>
          <div class="contractAssistantHeader">
            <div>
              <div class="name">Ask the BTA Contract Assistant</div>
              <div class="small">Grounded only in the 2025-2030 agreement and verified contract tables.</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
              <button class="btn secondaryBtn" type="button" id="contractPrintBtn">Print conversation</button>
              <button class="btn secondaryBtn" type="button" id="contractClearBtn">Clear conversation</button>
            </div>
          </div>

          <div class="contractSuggestionWrap" aria-label="Example contract questions">
            ${suggestions
              .map((question) => `<button type="button" class="contractSuggestion" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`)
              .join("")}
          </div>

          <div class="contractChat" id="contractChat" aria-live="polite">
            <div class="contractMessage assistant">
              <div class="contractMessageRole">BTA Contract Assistant</div>
              <div class="contractMessageText">Ask me about working conditions, leave, benefits, salary provisions, stipends, grievance timelines, extra classes, or another provision in the 2025-2030 agreement. I will cite the section and PDF page I used.</div>
            </div>
          </div>

          ${
            assistantReady
              ? ""
              : `<div class="contractSetupMessage" id="contractSetupMessage"><b>AI connection pending.</b> The contract reader is ready, but the secure assistant endpoint still needs to be connected before questions can be submitted.</div>`
          }

          <form class="contractAskForm" id="contractAskForm">
            <label class="salaryField" for="contractQuestion">
              <span class="salaryLabel">Your contract question</span>
              <textarea
                class="contractQuestion"
                id="contractQuestion"
                rows="3"
                maxlength="1600"
                enterkeyhint="send"
                placeholder="Example: Can I be required to give up my preparation period for a meeting?"
                ${assistantReady ? "" : "disabled"}
              ></textarea>
            </label>
            <div class="contractAskActions">
              <div class="small">Do not enter sensitive student information or other confidential personal information. Press <b>Enter</b> to send; use <b>Shift+Enter</b> for a new line.</div>
              <button class="btn" id="contractAskBtn" type="submit" ${assistantReady ? "" : "disabled"}>Ask the contract</button>
            </div>
          </form>

          <div class="contractAiDisclaimer">
            AI can make mistakes. Verify important answers using the cited contract page. If the agreement is silent or ambiguous, contact a BTA officer rather than relying on the assistant alone.
          </div>
        </section>
      </section>
    `;

    const modeButtons = Array.from(document.querySelectorAll(".contractModeBtn"));
    const panels = Array.from(document.querySelectorAll(".contractPanel"));
    const chat = $("#contractChat");
    const form = $("#contractAskForm");
    const textarea = $("#contractQuestion");
    const askButton = $("#contractAskBtn");
    const printButton = $("#contractPrintBtn");
    const clearButton = $("#contractClearBtn");
    let history = [];

    function callContractAssistant(question, priorHistory) {
      return new Promise((resolve, reject) => {
        const callbackName = `__btaContractCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const context = (priorHistory || [])
          .slice(-4)
          .map((item) => `${item.role === "assistant" ? "Assistant" : "Member"}: ${String(item.text || "").slice(0, 550)}`)
          .join("\n")
          .slice(0, 2200);

        const params = new URLSearchParams({
          q: question,
          callback: callbackName,
        });
        if (context) params.set("context", context);

        const script = document.createElement("script");
        const separator = endpoint.includes("?") ? "&" : "?";
        script.src = `${endpoint}${separator}${params.toString()}`;
        script.async = true;

        let finished = false;
        const cleanup = () => {
          if (script.parentNode) script.parentNode.removeChild(script);
          try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
        };

        const timer = window.setTimeout(() => {
          if (finished) return;
          finished = true;
          cleanup();
          reject(new Error("The Contract Assistant took too long to respond. Please try again."));
        }, 45000);

        window[callbackName] = (result) => {
          if (finished) return;
          finished = true;
          window.clearTimeout(timer);
          cleanup();
          if (result && result.error) {
            reject(new Error(result.error));
            return;
          }
          resolve(result || {});
        };

        script.onerror = () => {
          if (finished) return;
          finished = true;
          window.clearTimeout(timer);
          cleanup();
          reject(new Error("The Contract Assistant could not connect. Please try again."));
        };

        document.head.appendChild(script);
      });
    }

    function setContractMode(mode) {
      modeButtons.forEach((button) => {
        const active = button.dataset.contractMode === mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.contractPanel !== mode;
      });
      if (mode === "ask" && assistantReady) setTimeout(() => textarea && textarea.focus(), 0);
    }

    function textHtml(text) {
      return escapeHtml(text || "").replaceAll("\n", "<br>");
    }

    function addUserMessage(text) {
      const div = document.createElement("div");
      div.className = "contractMessage user";
      div.innerHTML = `
        <div class="contractMessageRole">You</div>
        <div class="contractMessageText">${textHtml(text)}</div>
      `;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function sourceHtml(source) {
      const parts = [];
      if (source.article) parts.push(source.article);
      if (source.section) parts.push(source.section);
      if (source.label && !parts.includes(source.label)) parts.push(source.label);
      const label = parts.filter(Boolean).join(" · ") || "Contract source";
      const page = Number(source.pdf_page);
      if (Number.isInteger(page) && page >= 1 && page <= 44) {
        const citationUrl = `contract-citation.html?page=${page}&label=${encodeURIComponent(label)}`;
        return `<a class="contractSource" href="${escapeHtml(citationUrl)}" target="_blank" rel="noopener"><span>${escapeHtml(label)}</span><b>PDF p. ${page}</b></a>`;
      }
      return `<span class="contractSource"><span>${escapeHtml(label)}</span></span>`;
    }

    function addAssistantMessage(result) {
      const div = document.createElement("div");
      div.className = `contractMessage assistant ${result.found_in_contract === false ? "notFound" : ""}`;
      const sources = Array.isArray(result.sources) ? result.sources : [];
      div.innerHTML = `
        <div class="contractMessageRole">BTA Contract Assistant</div>
        <div class="contractMessageText">${textHtml(result.answer || "I could not produce an answer.")}</div>
        ${sources.length ? `<div class="contractSources"><div class="contractSourcesLabel">Sources</div>${sources.map(sourceHtml).join("")}</div>` : ""}
        ${result.caveat ? `<div class="contractCaveat">${textHtml(result.caveat)}</div>` : ""}
        ${result.needs_bta_followup ? `<div class="contractFollowup">This question may need BTA review because the language is silent, ambiguous, deadline-sensitive, or fact-dependent.</div>` : ""}
      `;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function printConversation() {
      const clone = chat.cloneNode(true);
      clone.querySelectorAll(".thinking").forEach((el) => el.remove());

      const printWindow = window.open("", "btaContractPrint", "width=900,height=700");
      if (!printWindow) {
        window.alert("Your browser blocked the print window. Please allow pop-ups for this site and try again.");
        return;
      }
      try { printWindow.opener = null; } catch {}

      const printedAt = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html><head><meta charset="utf-8"><title>BTA Contract Assistant Conversation</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:36px;line-height:1.45}
          h1{font-size:22px;margin:0 0 4px}.meta{color:#555;font-size:12px;margin-bottom:24px}
          .contractMessage{border-top:1px solid #ddd;padding:14px 0;break-inside:avoid}
          .contractMessageRole{font-weight:700;margin-bottom:6px}
          .contractMessageText{white-space:normal}.contractSources{margin-top:10px}.contractSourcesLabel{font-weight:700;font-size:12px;margin-bottom:4px}
          .contractSource{display:block;color:#0645ad;margin:3px 0;text-decoration:none}.contractSource b{margin-left:8px}
          .contractCaveat,.contractFollowup{margin-top:10px;padding:8px 10px;background:#f4f4f4;border-left:3px solid #777;font-size:13px}
          .footer{margin-top:26px;padding-top:12px;border-top:1px solid #bbb;font-size:11px;color:#555}
          @media print{body{margin:.4in}a{color:#000;text-decoration:none}}
        </style></head><body>
        <h1>Bridgehampton Teachers Association</h1>
        <div class="meta">Contract Assistant conversation · ${escapeHtml(printedAt)}</div>
        ${clone.innerHTML}
        <div class="footer">The 2025–2030 signed agreement controls. AI-generated explanations should be verified against the cited contract language. Contact a BTA officer for individualized guidance.</div>
        </body></html>`);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 250);
    }

    function addErrorMessage(message) {
      const div = document.createElement("div");
      div.className = "contractMessage assistant error";
      div.innerHTML = `
        <div class="contractMessageRole">BTA Contract Assistant</div>
        <div class="contractMessageText">${textHtml(message)}</div>
      `;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => setContractMode(button.dataset.contractMode));
    });

    document.querySelectorAll(".contractSuggestion").forEach((button) => {
      button.addEventListener("click", () => {
        setContractMode("ask");
        if (!assistantReady || !textarea) return;
        textarea.value = button.dataset.question || button.textContent || "";
        textarea.focus();
      });
    });

    if (printButton) {
      printButton.addEventListener("click", printConversation);
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        history = [];
        chat.innerHTML = `
          <div class="contractMessage assistant">
            <div class="contractMessageRole">BTA Contract Assistant</div>
            <div class="contractMessageText">Conversation cleared. Ask another question about the 2025-2030 agreement.</div>
          </div>
        `;
        if (textarea && assistantReady) textarea.focus();
      });
    }

    if (form && textarea && assistantReady) {
      textarea.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          if (!textarea.disabled && String(textarea.value || "").trim()) {
            form.requestSubmit();
          }
        }
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const question = String(textarea.value || "").trim();
        if (!question) {
          textarea.focus();
          return;
        }

        const priorHistory = history.slice(-8);
        addUserMessage(question);
        textarea.value = "";
        textarea.disabled = true;
        askButton.disabled = true;
        askButton.textContent = "Checking contract…";

        const thinking = document.createElement("div");
        thinking.className = "contractMessage assistant thinking";
        thinking.innerHTML = `
          <div class="contractMessageRole">BTA Contract Assistant</div>
          <div class="contractMessageText">Reviewing the agreement and contract tables…</div>
        `;
        chat.appendChild(thinking);
        chat.scrollTop = chat.scrollHeight;

        try {
          const result = await callContractAssistant(question, priorHistory);
          thinking.remove();

          addAssistantMessage(result);
          history.push({ role: "user", text: question });
          history.push({ role: "assistant", text: result.answer || "" });
          history = history.slice(-8);
        } catch (error) {
          thinking.remove();
          addErrorMessage(error && error.message ? error.message : "The contract assistant is unavailable right now.");
        } finally {
          textarea.disabled = false;
          askButton.disabled = false;
          askButton.textContent = "Ask the contract";
          textarea.focus();
        }
      });
    }
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
  window.addEventListener("resize", () => {
    const navEl = $("#nav");
    ensureNavScrollReset(navEl);
  });
  route();
})();
