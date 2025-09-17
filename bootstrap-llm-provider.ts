/**
 * Minimal OpenAI config modal for browser apps (Bootstrap style)
 * ESM, browser-only, no dependencies
 */

export interface StoredConfig {
  baseUrl: string;
  apiKey: string;
}

export interface BaseUrlOption {
  url: string;
  name: string;
}

export type FetchModels = (baseUrl: string, apiKey: string) => Promise<string[]>;

export interface ConfigOptions {
  storage?: Storage;
  key?: string;
  defaultBaseUrls?: string[];
  baseUrls?: BaseUrlOption[];
  show?: boolean;
  title?: string;
  baseUrlLabel?: string;
  apiKeyLabel?: string;
  buttonLabel?: string;
  fetchModels?: FetchModels;
  help?: string;
}

export interface ConfigState extends StoredConfig {
  baseURL: string;
  models: string[];
}

export interface ResolvedConfigOptions {
  storage: Storage;
  key: string;
  defaultBaseUrls: string[];
  baseUrls?: BaseUrlOption[];
  show: boolean;
  title: string;
  baseUrlLabel: string;
  apiKeyLabel: string;
  buttonLabel: string;
  fetchModels: FetchModels;
  help: string;
}

export const openaiConfig = async (options: ConfigOptions = {}): Promise<ConfigState> => {
  const config: ResolvedConfigOptions = {
    storage: options.storage ?? localStorage,
    key: options.key ?? "bootstrapLLMProvider_openaiConfig",
    defaultBaseUrls: options.defaultBaseUrls ?? ["https://api.openai.com/v1"],
    baseUrls: options.baseUrls,
    show: options.show ?? false,
    title: options.title ?? "OpenAI API Configuration",
    baseUrlLabel: options.baseUrlLabel ?? "API Base URL",
    apiKeyLabel: options.apiKeyLabel ?? "API Key",
    buttonLabel: options.buttonLabel ?? "Save & Test",
    fetchModels: options.fetchModels ?? fetchOpenAIModels,
    help: options.help ?? "",
  };
  const saved = parseConfig(config.storage.getItem(config.key));
  if (saved && !config.show) {
    const models = await config.fetchModels(saved.baseUrl, saved.apiKey);
    return { ...saved, baseURL: saved.baseUrl, models };
  }
  return promptConfig(saved, config);
};

export const geminiConfig = async (options: ConfigOptions = {}): Promise<ConfigState> => {
  const config: ResolvedConfigOptions = {
    storage: options.storage ?? localStorage,
    key: options.key ?? "bootstrapLLMProvider_geminiConfig",
    defaultBaseUrls: options.defaultBaseUrls ?? [
      "https://generativelanguage.googleapis.com/v1beta",
      "https://aipipe.org/geminiv1beta",
      "https://llmfoundry.straive.com/gemini/v1beta",
      "https://llmfoundry.straivedemo.com/gemini/v1beta",
    ],
    baseUrls: options.baseUrls,
    show: options.show ?? false,
    title: options.title ?? "Google Gemini API Configuration",
    baseUrlLabel: options.baseUrlLabel ?? "Gemini API Base URL",
    apiKeyLabel: options.apiKeyLabel ?? "API Key or Token",
    buttonLabel: options.buttonLabel ?? "Save & Test",
    fetchModels: options.fetchModels ?? fetchGeminiModels,
    help: options.help ?? "",
  };
  const saved = parseConfig(config.storage.getItem(config.key));
  if (saved && !config.show) {
    const models = await config.fetchModels(saved.baseUrl, saved.apiKey);
    return { ...saved, baseURL: saved.baseUrl, models };
  }
  return promptConfig(saved, config);
};

function parseConfig(val: string | null): StoredConfig | undefined {
  if (!val) return undefined;
  try {
    const data = JSON.parse(val) as Partial<StoredConfig> & { baseURL?: string };
    if (data && typeof data.baseUrl === "string" && typeof data.apiKey === "string") {
      return { baseUrl: data.baseUrl, apiKey: data.apiKey };
    }
    if (data && typeof data.baseURL === "string" && typeof data.apiKey === "string") {
      return { baseUrl: data.baseURL, apiKey: data.apiKey };
    }
  } catch {
    // no-op
  }
  return undefined;
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<string[]> {
  if (!/^https?:\/\//.test(baseUrl)) throw new Error("Invalid URL");
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const endpoint = baseUrl.replace(/\/$/, "") + "/models";
  const response = await fetch(endpoint, { headers });
  if (!response.ok) throw new Error("Invalid API key or URL");
  const payload = (await response.json()) as { data?: Array<{ id?: string } | string> };
  const list = payload.data;
  if (!list || !Array.isArray(list)) throw new Error("Invalid response");
  return list.map((item) => (typeof item === "string" ? item : (item.id ?? ""))).filter(Boolean);
}

async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<string[]> {
  if (!/^https?:\/\//.test(baseUrl)) throw new Error("Enter a valid URL");
  const endpoint = new URL(baseUrl.replace(/\/$/, "") + "/models");
  const headers: Record<string, string> = {};
  if (endpoint.hostname === "generativelanguage.googleapis.com") {
    if (apiKey) {
      endpoint.searchParams.set("key", apiKey);
      headers["x-goog-api-key"] = apiKey;
    }
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const response = await fetch(endpoint.toString(), { headers });
  if (!response.ok) throw new Error("Invalid API key or URL");
  type GeminiModel = { id?: string; name?: string } | string;
  const payload = (await response.json()) as { models?: GeminiModel[]; data?: GeminiModel[] };
  const list = payload.models ?? payload.data;
  if (!list || !Array.isArray(list)) throw new Error("Invalid response");
  return list
    .map((item) => {
      if (typeof item === "string") return item;
      return item.name ?? item.id ?? "";
    })
    .map((name) => name.replace(/^models\//, ""))
    .filter(Boolean);
}

function promptConfig(saved: StoredConfig | undefined, options: ResolvedConfigOptions): Promise<ConfigState> {
  const { storage, key, defaultBaseUrls, baseUrls, title, baseUrlLabel, apiKeyLabel, buttonLabel, help, fetchModels } =
    options;
  return new Promise<ConfigState>((resolve, reject) => {
    removeModal();
    const id = "llm-provider-modal";
    const base = saved?.baseUrl ?? baseUrls?.[0]?.url ?? defaultBaseUrls[0] ?? "";
    const api = saved?.apiKey ?? "";
    const datalist = defaultBaseUrls.map((url) => `<option value="${url}">`).join("");
    const selectOptions = (baseUrls ?? [])
      .map(({ url, name }) => `<option value="${url}" ${url === base ? "selected" : ""}>${name}</option>`)
      .join("");
    const baseInput = baseUrls
      ? `<select name="baseUrl" class="form-select">${selectOptions}</select>`
      : `<input name="baseUrl" type="url" class="form-control" list="llm-provider-dl" placeholder="https://api.openai.com/v1" value="${base}"><datalist id="llm-provider-dl">${datalist}</datalist>`;
    document.body.insertAdjacentHTML(
      "beforeend",
      `
<div class="modal fade show" id="${id}" tabindex="-1" style="display:block;background:rgba(0,0,0,.4);z-index:1050;">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content shadow-sm">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${help ?? ""}
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
    if (!modal) {
      reject(new Error("Failed to create modal"));
      return;
    }
    const form = modal.querySelector("form");
    const closeBtn = modal.querySelector(".btn-close");
    const errorDiv = modal.querySelector(".text-danger");
    const submitBtn = modal.querySelector<HTMLButtonElement>("button[type=submit]");
    if (
      !(form instanceof HTMLFormElement) ||
      !(closeBtn instanceof HTMLButtonElement) ||
      !(errorDiv instanceof HTMLDivElement) ||
      !submitBtn
    ) {
      removeModal();
      reject(new Error("Invalid modal structure"));
      return;
    }
    const baseField = form.elements.namedItem("baseUrl");
    if (!(baseField instanceof HTMLInputElement || baseField instanceof HTMLSelectElement)) {
      removeModal();
      reject(new Error("Missing base URL field"));
      return;
    }
    const apiField = form.elements.namedItem("apiKey");
    if (!(apiField instanceof HTMLInputElement)) {
      removeModal();
      reject(new Error("Missing API key field"));
      return;
    }

    const cleanup = (): void => {
      removeModal();
      window.removeEventListener("keydown", onKeyDown);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        cleanup();
        reject(new Error("cancelled"));
      }
    };

    closeBtn.onclick = () => {
      cleanup();
      reject(new Error("cancelled"));
    };

    window.addEventListener("keydown", onKeyDown);

    form.onsubmit = async (event) => {
      event.preventDefault();
      errorDiv.style.display = "none";
      const baseUrl = baseField.value.trim();
      const apiKey = apiField.value.trim();
      if (!/^https?:\/\//.test(baseUrl)) {
        showError("Enter a valid URL");
        return;
      }
      submitBtn.disabled = true;
      try {
        const models = await fetchModels(baseUrl, apiKey);
        const storedConfig: StoredConfig = { baseUrl, apiKey };
        storage.setItem(key, JSON.stringify(storedConfig));
        cleanup();
        resolve({ baseUrl, baseURL: baseUrl, apiKey, models });
      } catch (error) {
        showError(error instanceof Error ? error.message : String(error));
        submitBtn.disabled = false;
      }
    };

    const showError = (message: string): void => {
      errorDiv.textContent = message;
      errorDiv.style.display = "";
    };
  });
}

function removeModal(): void {
  const modal = document.getElementById("llm-provider-modal");
  if (modal) modal.remove();
}
