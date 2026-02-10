(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const navItems = [
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
    // keeping these placeholders unless you want me to paste the full versions again
    documents: () => renderStub("Documents"),
    officers: () => renderStub("Union Officers"),
    directory: () => renderStub("Staff Directory"),
    resources: () => renderStub("NYSUT & Links"),
  };

  function setNav() {
    const cur = (location.hash || "#home").slice(1);
    $("#nav").innerHTML = navItems
      .map(
        (n) =>
          `<a href="#${n.id}" class="${n.id === cur ? "active" : ""}">${n.label}</a>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function hero({ pill, title, subHtml }) {
    return `
      <section class="hero">
        ${pill ? `<div style="margin-bottom:10px;"><span class="pill">${escapeHtml(pill)}</span></div>` : ""}
        <h2>${escapeHtml(title)}</h2>
        ${subHtml ? `<p class="sub">${subHtml}</p>` : ""}
      </section>
    `;
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
      <b>Mission:</b> The BTA is a union of professionals that champions fairness; democracy; economic opportunity; and high-quality public education, healthcare and public services for our students, their families and our communities. *
      <br><br>
      <em>*We share the same mission as the United Federation of Teachers.</em>
    `;

    app.innerHTML = `
      ${hero({
        pill: "Member hub",
        title: "Bridgehampton Teachers Association",
        subHtml: missionHtml
      })}

      ${divider("Latest")}

      <div class="staff-grid">
        <div class="person">
          <div class="info">
            <div class="name" style="font-weight:800;">Upcoming events</div>
            <ul style="margin:10px 0 0; padding-left:18px;">
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
            <div class="small" style="margin-top:10px;"><a href="#events">View all events →</a></div>
          </div>
        </div>

        <div class="person">
          <div class="info">
            <div class="name" style="font-weight:800;">Latest updates</div>
            <ul style="margin:10px 0 0; padding-left:18px;">
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
            <div class="small" style="margin-top:10px;"><a href="#news">View all updates →</a></div>
          </div>
        </div>
      </div>

      ${divider("Connect")}

      <div class="staff-grid">
        <div class="person">
          <div class="info">
            <div class="name" style="font-weight:800;">Follow us on Instagram</div>

            <div style="margin-top:12px;">
              <a class="btn ig" href="https://www.instagram.com/bhsteachersassociation/" target="_blank" rel="noopener">
                Follow us on Instagram
              </a>
            </div>

            <!-- Reserved space for future Instagram post preview / LightWidget -->
            <div style="margin-top:16px; min-height:220px; opacity:.7;">
              Instagram preview coming soon
            </div>
          </div>
        </div>

        <div class="person">
          <div class="info">
            <div class="name" style="font-weight:800;">Union Calendar</div>

            <div style="margin-top:12px;" class="calWrap">
              <iframe
                class="calFrame"
                src="https://calendar.google.com/calendar/embed?src=7e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf%40group.calendar.google.com&ctz=America%2FNew_York"
                style="border:0"
                frameborder="0"
                scrolling="no"
                title="BTA Calendar"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    `;
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
          </table>
        </div>
      </div>
    `;
  }

  function renderStub(title) {
    $("#app").innerHTML = hero({
      pill: title,
      title,
      subHtml: "This section is still wired up in your full build. If you want, paste your current app.js and I’ll merge these home fixes into it without losing any tabs.",
    });
  }

  function route() {
    const id = (location.hash || "#home").slice(1);
    setNav();
    (routes[id] || routes.home)();
  }

  window.addEventListener("hashchange", route);
  route();
})();
