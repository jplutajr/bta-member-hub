const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfXsuucGYGRnUdDwCy19LoHy6DIQdOlsTKDILaBGo09HlsJIg/viewform?embedded=true";

const routes = {
  home: renderHome,
  documents: renderDocuments,
  officers: renderOfficers,
  directory: renderDirectory,
  contact: renderContact
};

const navItems = [
  { hash: "#home", label: "Home" },
  { hash: "#documents", label: "Documents" },
  { hash: "#officers", label: "Union Officers" },
  { hash: "#directory", label: "Staff Directory" },
  { hash: "#contact", label: "Update Contact Info" }
];

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = navItems
    .map(item => `<a href="${item.hash}">${item.label}</a>`)
    .join("");
}

function renderHome() {
  return `
    <section>
      <h2>Latest Updates</h2>
      <ul class="list">
        <li>
          <strong>BTA Meeting — Virtual</strong><br>
          Today at 8:00 PM
        </li>
      </ul>
    </section>

    <section>
      <h2>Upcoming Events</h2>
      <ul class="list">
        <li>
          <strong>End of the Year Party</strong><br>
          June — Date & Time TBD
        </li>
      </ul>
    </section>
  `;
}

function renderDocuments() {
  return `
    <section>
      <h2>Member Documents 🔒</h2>
      <p>Documents require Gmail access.</p>
      <a href="#contact" class="btn">Request Access / Update Contact Info</a>
    </section>
  `;
}

function renderOfficers() {
  return `
    <section>
      <h2>Union Officers</h2>
      <p>Officer data loads from staff.json</p>
    </section>
  `;
}

function renderDirectory() {
  return `
    <section>
      <h2>Staff Directory</h2>
      <p>Staff photos preserved from staff.json</p>
    </section>
  `;
}

function renderContact() {
  return `
    <section>
      <h2>Update Contact Info</h2>
      <p>
        All members must use a Gmail account for union business in order to access
        Google Drive documents and join Google Meet meetings.
      </p>

      <p>
        Need to create a Gmail?
        <a href="https://accounts.google.com/signup" target="_blank">
          Click here to create one
        </a>
      </p>

      <div style="margin-top:20px;">
        <iframe 
          src="${FORM_EMBED_URL}" 
          width="100%" 
          height="1300" 
          frameborder="0" 
          marginheight="0" 
          marginwidth="0"
          style="border:0;">
        </iframe>
      </div>
    </section>
  `;
}

function router() {
  const hash = location.hash.replace("#", "") || "home";
  const view = routes[hash] || renderHome;
  document.getElementById("app").innerHTML = view();
}

window.addEventListener("hashchange", router);
window.addEventListener("load", () => {
  renderNav();
  router();
});
