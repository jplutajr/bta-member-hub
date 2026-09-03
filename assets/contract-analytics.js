(() => {
  const STORAGE_KEY = "bta_contract_anonymous_user_v1";

  function makeAnonymousId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `bta_${window.crypto.randomUUID()}`;
    }
    return `bta_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  }

  function getAnonymousId() {
    try {
      let id = window.localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = makeAnonymousId();
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      if (!window.__btaContractSessionId) window.__btaContractSessionId = makeAnonymousId();
      return window.__btaContractSessionId;
    }
  }

  const anonymousId = getAnonymousId();
  const NativeURLSearchParams = window.URLSearchParams;

  // The Contract Assistant currently builds its JSONP request with URLSearchParams.
  // Add only an anonymous browser ID to those contract requests; leave all other
  // URLSearchParams usage untouched.
  function BTAURLSearchParams(init) {
    const params = new NativeURLSearchParams(init);
    try {
      if (params.has("q") && params.has("callback") && !params.has("uid")) {
        params.set("uid", anonymousId);
      }
    } catch {
      // Never interfere with normal site behavior if analytics enrichment fails.
    }
    return params;
  }

  BTAURLSearchParams.prototype = NativeURLSearchParams.prototype;
  try { Object.setPrototypeOf(BTAURLSearchParams, NativeURLSearchParams); } catch {}
  window.URLSearchParams = BTAURLSearchParams;

  function applyDisclosureAndBlankStates() {
    const form = document.querySelector("#contractAskForm");
    if (form) {
      const note = form.querySelector(".contractAskActions .small");
      if (note && !note.dataset.btaAnalyticsDisclosure) {
        note.textContent = "Questions are anonymously logged so BTA can measure usage and identify common contract concerns. No name or email is collected. Do not enter student names or other confidential personal information.";
        note.dataset.btaAnalyticsDisclosure = "true";
      }
    }

    // Keep the two requested home-page sections visually blank when no content is posted.
    document.querySelectorAll(".person .name").forEach((heading) => {
      const label = String(heading.textContent || "").trim();
      if (label !== "Upcoming events" && label !== "Latest updates") return;
      const info = heading.closest(".info");
      if (!info) return;
      const list = info.querySelector("ul");
      const emptyText = String(list && list.textContent || "").trim();
      const isEmpty = emptyText === "No events posted yet." || emptyText === "No updates posted yet.";
      if (!isEmpty) return;
      if (list) list.innerHTML = "";
      const small = info.querySelector(".small");
      if (small) small.style.display = "none";
    });
  }

  const observer = new MutationObserver(applyDisclosureAndBlankStates);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", applyDisclosureAndBlankStates);
})();
