(() => {
  const EVENTS_SHEET_ID = "19gTGcoFG9UnlW8m1ZEuGxuFZ_5cG5Tmem2Md5ROotp8";
  const nativeFetch = window.fetch.bind(window);

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function isEventsSheetUrl(url) {
    return String(url || "").includes(`docs.google.com/spreadsheets/d/${EVENTS_SHEET_ID}/gviz/tq`);
  }

  function parseGviz(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) return null;
    return {
      start,
      end,
      prefix: text.slice(0, start),
      suffix: text.slice(end + 1),
      data: JSON.parse(text.slice(start, end + 1)),
    };
  }

  function cell(row, index) {
    const c = row && row.c && row.c[index];
    if (!c) return { raw: "", formatted: "" };
    return {
      raw: c.v ?? "",
      formatted: c.f ?? "",
    };
  }

  function cleanValue(value) {
    return String(value ?? "").trim();
  }

  function normalizeRows(data) {
    const rows = data?.table?.rows || [];
    return rows.map((row) => {
      const title = cleanValue(cell(row, 0).formatted || cell(row, 0).raw);
      if (!title || title.toLowerCase() === "title") return null;

      const dateCell = cell(row, 1);
      const displayDateCell = cell(row, 2);
      const timeCell = cell(row, 3);
      const locationCell = cell(row, 4);
      const notesCell = cell(row, 5);

      return {
        title,
        date: cleanValue(displayDateCell.formatted || displayDateCell.raw || dateCell.formatted || dateCell.raw),
        time: cleanValue(timeCell.formatted || timeCell.raw),
        location: cleanValue(locationCell.formatted || locationCell.raw),
        notes: cleanValue(notesCell.formatted || notesCell.raw),
      };
    }).filter(Boolean);
  }

  // Google Visualization returns machine values such as Date(2026,8,22).
  // app.js historically displayed those raw values. Replace only the display
  // date/time cells with the formatted values from Google Sheets while leaving
  // the true Date column untouched for sorting.
  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const response = await nativeFetch(input, init);
    if (!isEventsSheetUrl(url)) return response;

    try {
      const originalText = await response.clone().text();
      const parsed = parseGviz(originalText);
      if (!parsed) return response;

      const rows = parsed.data?.table?.rows || [];
      window.__btaFormattedEvents = normalizeRows(parsed.data);

      rows.forEach((row) => {
        const c = row?.c || [];
        // C = DisplayDate, D = Time. Prefer Google Sheets' formatted value.
        [2, 3].forEach((index) => {
          if (c[index] && c[index].f !== undefined && c[index].f !== null && String(c[index].f).trim()) {
            c[index].v = c[index].f;
          }
        });
      });

      const fixedText = parsed.prefix + JSON.stringify(parsed.data) + parsed.suffix;
      return new Response(fixedText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.warn("BTA event formatting fallback used", error);
      return response;
    }
  };

  function enhanceEventDisplay() {
    const events = window.__btaFormattedEvents;
    if (!Array.isArray(events) || !events.length) return;

    const hash = location.hash || "#home";

    if (hash === "#home") {
      const heading = Array.from(document.querySelectorAll("#app .person .name"))
        .find((el) => el.textContent.trim() === "Upcoming events");
      const info = heading && heading.closest(".info");
      const list = info && info.querySelector("ul");
      if (list) {
        const signature = JSON.stringify(events.slice(0, 3));
        if (list.dataset.eventSignature !== signature) {
          list.dataset.eventSignature = signature;
          list.innerHTML = events.slice(0, 3).map((event) => `
            <li>
              <b>${esc(event.title)}</b>${event.date ? ` — ${esc(event.date)}` : ""}${event.time ? ` (${esc(event.time)})` : ""}${event.location ? ` · ${esc(event.location)}` : ""}
              ${event.notes ? `<div class="small" style="margin-top:4px;">${esc(event.notes)}</div>` : ""}
            </li>
          `).join("");
        }
      }
    }

    if (hash === "#events") {
      const tbody = document.querySelector("#app .table tbody");
      if (tbody) {
        const signature = JSON.stringify(events);
        if (tbody.dataset.eventSignature !== signature) {
          tbody.dataset.eventSignature = signature;
          tbody.innerHTML = events.map((event) => {
            const details = [event.location, event.notes].filter(Boolean).join(" · ");
            return `
              <tr>
                <td>${esc(event.date)}${event.time ? ` · ${esc(event.time)}` : ""}</td>
                <td><b>${esc(event.title)}</b></td>
                <td>${esc(details)}</td>
              </tr>
            `;
          }).join("");
        }
      }
    }
  }

  const observer = new MutationObserver(enhanceEventDisplay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(enhanceEventDisplay, 0));
})();
