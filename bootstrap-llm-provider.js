// Minimal OpenAI config modal for browser apps (Bootstrap style)
// ESM, browser-only, no dependencies

/**
 * Prompt for OpenAI API config, save to storage, fetch models.
 * @param {Object} opts
 * @param {Storage} opts.storage - Storage API (e.g. window.localStorage)
 * @param {string} opts.key - Storage key
 * @param {string[]} [opts.defaultBaseUrls] - Default base URLs
 * @param {boolean} [opts.show] - Force prompt even if config exists
 * @returns {Promise<{baseURL: string, apiKey: string, models: string[]}>}
 */
export const openaiConfig = async (options = {}) => {
  // Set defaults
  options = {
    storage: localStorage,
    key: "bootstrapLLMProvider_openaiConfig",
    defaultBaseUrls: ["https://api.openai.com/v1"],
    show: false,
    title: "OpenAI API Configuration",
    baseURLLabel: "API Base URL",
    apiKeyLabel: "API Key",
    buttonLabel: "Save & Test",
    ...options,
  };
  const saved = parseConfig(options.storage.getItem(options.key));
  if (saved && !options.show) {
    const models = await fetchModels(saved.baseURL, saved.apiKey);
    return { ...saved, models };
  }
  return await promptConfig(saved, options);
}

function parseConfig(val) {
  try {
    const c = JSON.parse(val);
    if (c && typeof c.baseURL === "string" && typeof c.apiKey === "string") return c;
  } catch {}
}

async function fetchModels(baseURL, apiKey) {
  if (!/^https?:\/\//.test(baseURL)) throw new Error("Invalid URL");
  const r = await fetch(baseURL.replace(/\/$/, "") + "/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error("Invalid API key or URL");
  const { data } = await r.json();
  if (!data || !Array.isArray(data)) throw new Error("Invalid response");
  return data.map((m) => (typeof m === "string" ? m : m.id || "")).filter(Boolean);
}

function promptConfig(saved, { storage, key, defaultBaseUrls, title, baseURLLabel, apiKeyLabel, buttonLabel }) {
  return new Promise((resolve, reject) => {
    removeModal();
    const id = "llm-provider-modal";
    const base = saved?.baseURL || defaultBaseUrls[0];
    const api = saved?.apiKey || "";
    const datalist = defaultBaseUrls.map((u) => `<option value="${u}">`).join("");
    document.body.insertAdjacentHTML(
      "beforeend",
      /* html */ `
<div class="modal fade show" id="${id}" tabindex="-1" style="display:block;background:rgba(0,0,0,.4);z-index:1050;">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content shadow-sm">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
      </div>
      <div class="modal-body bg-light">
        <div class="mb-3">
          <label class="form-label">${baseURLLabel}</label>
          <input name="baseURL" type="url" class="form-control" required list="llm-provider-dl" placeholder="https://api.openai.com/v1" value="${base}">
          <datalist id="llm-provider-dl">${datalist}</datalist>
        </div>
        <div class="mb-3">
          <label class="form-label">${apiKeyLabel}</label>
          <input name="apiKey" type="password" class="form-control" required autocomplete="off" value="${api}">
        </div>
        <div class="text-danger small" style="display:none"></div>
      </div>
      <div class="modal-footer bg-light">
        <button type="submit" class="btn btn-primary w-100">${buttonLabel}</button>
      </div>
    </form>
  </div>
</div>`
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
      const baseURL = form.baseURL.value.trim();
      const apiKey = form.apiKey.value.trim();
      if (!/^https?:\/\//.test(baseURL)) return showError("Enter a valid URL");
      if (!apiKey) return showError("Enter API key");
      form.querySelector("button[type=submit]").disabled = true;
      try {
        const models = await fetchModels(baseURL, apiKey);
        storage.setItem(key, JSON.stringify({ baseURL, apiKey }));
        cleanup();
        resolve({ baseURL, apiKey, models });
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
