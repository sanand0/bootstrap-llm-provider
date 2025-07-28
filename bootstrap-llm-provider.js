// Minimal OpenAI config modal for browser apps (Bootstrap style)
// ESM, browser-only, no dependencies

/**
 * Prompt for OpenAI API config, save to storage, fetch models.
 * @param {Object} opts
 * @param {Storage} opts.storage - Storage API (e.g. window.localStorage)
 * @param {string} opts.key - Storage key
 * @param {string[]} [opts.defaultBaseUrls] - Datalist URLs
 * @param {{url: string, name: string}[]} [opts.baseUrls] - Select options
 * @param {boolean} [opts.show] - Force prompt even if config exists
 * @param {string} [opts.help] - HTML to show at top of modal
 * @returns {Promise<{baseUrl: string, baseURL: string, apiKey: string, models: string[]}>}
 */
export const openaiConfig = async (options = {}) => {
  // Set defaults
  options = {
    storage: localStorage,
    key: "bootstrapLLMProvider_openaiConfig",
    defaultBaseUrls: ["https://api.openai.com/v1"],
    baseUrls: undefined,
    show: false,
    title: "OpenAI API Configuration",
    baseUrlLabel: "API Base URL",
    apiKeyLabel: "API Key",
    buttonLabel: "Save & Test",
    help: "",
    ...options,
  };
  const saved = parseConfig(options.storage.getItem(options.key));
  if (saved && !options.show) {
    const models = await fetchModels(saved.baseUrl, saved.apiKey);
    return { ...saved, baseURL: saved.baseUrl, models };
  }
  return await promptConfig(saved, options);
};

function parseConfig(val) {
  try {
    const c = JSON.parse(val);
    if (c && typeof c.baseUrl === "string" && typeof c.apiKey === "string") {
      return { baseUrl: c.baseUrl, apiKey: c.apiKey };
    }
    if (c && typeof c.baseURL === "string" && typeof c.apiKey === "string") {
      return { baseUrl: c.baseURL, apiKey: c.apiKey };
    }
  } catch {}
}

async function fetchModels(baseUrl, apiKey) {
  if (!/^https?:\/\//.test(baseUrl)) throw new Error("Invalid URL");
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const r = await fetch(baseUrl.replace(/\/$/, "") + "/models", { headers });
  if (!r.ok) throw new Error("Invalid API key or URL");
  const { data } = await r.json();
  if (!data || !Array.isArray(data)) throw new Error("Invalid response");
  return data.map((m) => (typeof m === "string" ? m : m.id || "")).filter(Boolean);
}

function promptConfig(
  saved,
  { storage, key, defaultBaseUrls, baseUrls, title, baseUrlLabel, apiKeyLabel, buttonLabel, help },
) {
  return new Promise((resolve, reject) => {
    removeModal();
    const id = "llm-provider-modal";
    const base = saved?.baseUrl || baseUrls?.[0]?.url || defaultBaseUrls[0];
    const api = saved?.apiKey || "";
    const datalist = defaultBaseUrls.map((u) => `<option value="${u}">`).join("");
    const selectOpts = (baseUrls || [])
      .map(({ url, name }) => `<option value="${url}" ${url === base ? "selected" : ""}>${name}</option>`)
      .join("");
    const baseInput = baseUrls
      ? `<select name="baseUrl" class="form-select">${selectOpts}</select>`
      : `<input name="baseUrl" type="url" class="form-control" list="llm-provider-dl" placeholder="https://api.openai.com/v1" value="${base}"><datalist id="llm-provider-dl">${datalist}</datalist>`;
    document.body.insertAdjacentHTML(
      "beforeend",
      /* html */ `
<div class="modal fade show" id="${id}" tabindex="-1" style="display:block;background:rgba(0,0,0,.4);z-index:1050;">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content shadow-sm">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${help || ""}
        <div class="mb-3">
          <label class="form-label">${baseUrlLabel}</label>
          ${baseInput}
        </div>
        <div class="mb-3">
          <label class="form-label">${apiKeyLabel}</label>
          <input name="apiKey" type="password" class="form-control" autocomplete="off" value="${api}">
        </div>
        <div class="text-danger small" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button type="submit" class="btn btn-primary w-100">${buttonLabel}</button>
      </div>
    </form>
  </div>
</div>`,
    );
    const modal = document.getElementById(id);
    const form = modal.querySelector("form");
    const closeBtn = modal.querySelector(".btn-close");
    const errorDiv = modal.querySelector(".text-danger");
    const cleanup = () => {
      removeModal();
      window.removeEventListener("keydown", esc);
    };
    function esc(e) {
      if (e.key === "Escape") {
        cleanup();
        reject(new Error("cancelled"));
      }
    }
    closeBtn.onclick = () => {
      cleanup();
      reject(new Error("cancelled"));
    };
    window.addEventListener("keydown", esc);
    form.onsubmit = async (e) => {
      e.preventDefault();
      errorDiv.style.display = "none";
      const baseUrl = form.baseUrl.value.trim();
      const apiKey = form.apiKey.value.trim();
      if (!/^https?:\/\//.test(baseUrl)) return showError("Enter a valid URL");
      form.querySelector("button[type=submit]").disabled = true;
      try {
        const models = await fetchModels(baseUrl, apiKey);
        storage.setItem(key, JSON.stringify({ baseUrl, apiKey }));
        cleanup();
        resolve({ baseUrl, baseURL: baseUrl, apiKey, models });
      } catch (err) {
        showError(err.message);
        form.querySelector("button[type=submit]").disabled = false;
      }
    };
    function showError(msg) {
      errorDiv.textContent = msg;
      errorDiv.style.display = "";
    }
  });
}

function removeModal() {
  const m = document.getElementById("llm-provider-modal");
  if (m) m.remove();
}
