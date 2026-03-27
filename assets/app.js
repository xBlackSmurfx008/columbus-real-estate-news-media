const STORAGE_KEYS = {
  consent: "crem_consent",
  follows: "crem_follow_preferences",
  leads: "crem_leads",
  events: "crem_event_log",
};

function trackEvent(name, payload = {}) {
  const item = {
    name,
    payload,
    ts: new Date().toISOString(),
    page: window.location.pathname,
  };
  const log = JSON.parse(localStorage.getItem(STORAGE_KEYS.events) || "[]");
  log.push(item);
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(log.slice(-500)));
  if (window.dataLayer) {
    window.dataLayer.push(item);
  }
}

function setConsent(value) {
  localStorage.setItem(STORAGE_KEYS.consent, value);
  const banner = document.querySelector("[data-consent-banner]");
  if (banner) {
    banner.remove();
  }
  trackEvent("consent_updated", { value });
}

function renderConsentBanner() {
  const consent = localStorage.getItem(STORAGE_KEYS.consent);
  if (consent) return;
  const wrapper = document.createElement("div");
  wrapper.className = "consent-banner panel";
  wrapper.setAttribute("data-consent-banner", "true");
  wrapper.innerHTML = `
    <h3>Privacy and tracking</h3>
    <p class="muted">We use first-party analytics for page engagement and subscriptions to improve local coverage and advertiser reporting.</p>
    <div style="display:flex; gap: 8px; margin-top: 10px;">
      <button id="consent-accept">Accept</button>
      <button id="consent-essential">Essential only</button>
    </div>
  `;
  document.body.appendChild(wrapper);
  document.getElementById("consent-accept").addEventListener("click", () => setConsent("accepted"));
  document.getElementById("consent-essential").addEventListener("click", () => setConsent("essential"));
}

function bindFollowForm() {
  const form = document.querySelector("[data-follow-form]");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const area = String(data.get("area") || "");
    const topic = String(data.get("topic") || "");
    const frequency = String(data.get("frequency") || "weekly");

    if (!email || !area || !topic) return;

    const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.follows) || "[]");
    follows.push({ email, area, topic, frequency, ts: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.follows, JSON.stringify(follows));
    const leads = JSON.parse(localStorage.getItem(STORAGE_KEYS.leads) || "[]");
    leads.push({ email, source: "follow_form", area, topic });
    localStorage.setItem(STORAGE_KEYS.leads, JSON.stringify(leads));

    const success = document.querySelector("[data-follow-success]");
    if (success) {
      success.textContent = `You are now following ${area} / ${topic}.`;
    }
    form.reset();
    trackEvent("follow_submitted", { area, topic, frequency });
  });
}

function bindCTATracking() {
  document.querySelectorAll("[data-track-click]").forEach((el) => {
    el.addEventListener("click", () => {
      trackEvent("cta_click", { id: el.getAttribute("data-track-click") });
    });
  });
}

function bindScrollTracking() {
  let fired50 = false;
  let fired90 = false;
  window.addEventListener("scroll", () => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (height <= 0) return;
    const pct = Math.round((window.scrollY / height) * 100);
    if (!fired50 && pct >= 50) {
      fired50 = true;
      trackEvent("scroll_depth", { percent: 50 });
    }
    if (!fired90 && pct >= 90) {
      fired90 = true;
      trackEvent("scroll_depth", { percent: 90 });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderConsentBanner();
  bindFollowForm();
  bindCTATracking();
  bindScrollTracking();
  trackEvent("page_view");
});
