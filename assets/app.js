(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const navItems = [
    { id:"home", label:"Home" },
    { id:"news", label:"News" },
    { id:"events", label:"Events" },
    { id:"documents", label:"Documents" },
    { id:"officers", label:"Union Officers" },
    { id:"directory", label:"Staff Directory" },
    { id:"resources", label:"NYSUT & Links" },
  ];

  function setNav(){
    const cur = (location.hash || "#home").slice(1);
    $("#nav").innerHTML = navItems.map(n =>
      `<a href="#${n.id}" class="${n.id===cur?"active":""}">${n.label}</a>`
    ).join("");
  }

  function hero(title, sub){
    return `<section class="hero"><h2>${title}</h2><p>${sub}</p></section>`;
  }

  function route(){
    const id = (location.hash || "#home").slice(1);
    setNav();
    if(id==="home") renderHome();
    else $("#app").innerHTML = hero("Page","Content coming soon.");
  }

  function renderHome(){
    $("#app").innerHTML = `
      ${hero(
        "Bridgehampton Teachers Association",
        "Mission: The BTA champions fairness, democracy, economic opportunity, and high-quality public education."
      )}

      <div class="staff-grid">
        <div class="person">
          <div class="info">
            <h3>Follow us on Instagram</h3>
            <a class="btn ig" href="https://www.instagram.com/bhsteachersassociation/" target="_blank">
              Follow us on Instagram
            </a>

            <!-- Reserved space for future Instagram preview -->
            <div style="margin-top:16px; min-height:220px; opacity:.6;">
              Instagram preview coming soon
            </div>
          </div>
        </div>

        <div class="person">
          <div class="info">
            <h3>Union Calendar</h3>
            <div class="calWrap">
              <iframe
                class="calFrame"
                src="https://calendar.google.com/calendar/embed?src=5e799d3cb530dec90c54e3e39f608d213d756dda4b474b3bbeb84f08e01278bf%40group.calendar.google.com&ctz=America%2FNew_York">
              </iframe>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.addEventListener("hashchange", route);
  route();
})();
