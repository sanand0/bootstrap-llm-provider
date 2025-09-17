import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiConfig, openaiConfig } from "./bootstrap-llm-provider.ts";

type OpenAIOptions = NonNullable<Parameters<typeof openaiConfig>[0]>;

const submitForm = (form: HTMLFormElement): void => {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

const getModalElements = () => {
  const modal = document.getElementById("llm-provider-modal");
  if (!modal) throw new Error("Modal not found");
  const form = modal.querySelector("form");
  const errorDiv = modal.querySelector(".text-danger");
  const submitBtn = modal.querySelector("button[type=submit]");
  const closeBtn = modal.querySelector(".btn-close");
  if (
    !(form instanceof HTMLFormElement) ||
    !(errorDiv instanceof HTMLDivElement) ||
    !(submitBtn instanceof HTMLButtonElement) ||
    !(closeBtn instanceof HTMLButtonElement)
  ) {
    throw new Error("Modal structure unexpected");
  }
  const baseField = form.elements.namedItem("baseUrl");
  const apiField = form.elements.namedItem("apiKey");
  if (
    !(baseField instanceof HTMLInputElement || baseField instanceof HTMLSelectElement) ||
    !(apiField instanceof HTMLInputElement)
  ) {
    throw new Error("Modal fields missing");
  }
  return { modal, form, baseField, apiField, errorDiv, submitBtn, closeBtn };
};

const expectMockCall = <Args extends unknown[]>(mock: { mock: { calls: unknown[][] } }, index = 0): Args => {
  const call = mock.mock.calls[index];
  if (!call) throw new Error("Expected mock to have been called");
  return call as Args;
};

describe("bootstrap-llm-provider", () => {
  const cleanupDom = () => {
    document.body.innerHTML = "";
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanupDom();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("openaiConfig", () => {
    it("returns stored config without prompting when available", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue({ ok: true, json: async () => ({ data: ["model-a"] }) } as Response);
      localStorage.setItem(
        "bootstrapLLMProvider_openaiConfig",
        JSON.stringify({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-test" }),
      );

      const result = await openaiConfig();

      expect(document.getElementById("llm-provider-modal")).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = expectMockCall<[string, RequestInit | undefined]>(fetchSpy);
      expect(url).toBe("https://api.openai.com/v1/models");
      expect(init?.headers).toEqual({ Authorization: "Bearer sk-test" });
      expect(result.models).toEqual(["model-a"]);
    });

    it("prompts, validates, fetches, and saves configuration", async () => {
      const fetchModels = vi.fn(async (baseUrl: string, apiKey: string) => {
        expect(baseUrl).toMatch(/^https?:\/\//);
        return apiKey ? ["m1", "m2"] : ["m1"];
      });
      const options: OpenAIOptions = { show: true, fetchModels };
      const promise = openaiConfig(options);

      const { form, baseField, apiField, errorDiv } = getModalElements();

      baseField.value = "bad";
      apiField.value = "";
      submitForm(form);
      expect(fetchModels).not.toHaveBeenCalled();
      expect(errorDiv.textContent).toMatch(/valid url/i);

      baseField.value = "https://api.openai.com/v1";
      apiField.value = "sk-test";
      submitForm(form);
      const result = await promise;

      expect(fetchModels).toHaveBeenCalledWith("https://api.openai.com/v1", "sk-test");
      expect(localStorage.getItem("bootstrapLLMProvider_openaiConfig")).toMatch(/sk-test/);
      expect(result.models).toEqual(["m1", "m2"]);
      expect(document.getElementById("llm-provider-modal")).toBeNull();
    });

    it("skips modal when config exists and show is false", async () => {
      const fetchModels = vi.fn(async () => ["m1"]);
      localStorage.setItem(
        "bootstrapLLMProvider_openaiConfig",
        JSON.stringify({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-test" }),
      );

      const result = await openaiConfig({ fetchModels });

      expect(fetchModels).toHaveBeenCalledWith("https://api.openai.com/v1", "sk-test");
      expect(document.getElementById("llm-provider-modal")).toBeNull();
      expect(result.models).toEqual(["m1"]);
    });

    it("opens modal when show is true even if config exists", async () => {
      localStorage.setItem(
        "bootstrapLLMProvider_openaiConfig",
        JSON.stringify({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-old" }),
      );
      const promise = openaiConfig({ show: true, fetchModels: async () => ["m3"] });

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://api.openai.com/v1";
      apiField.value = "sk-new";
      submitForm(form);
      const result = await promise;

      expect(result.apiKey).toBe("sk-new");
    });

    it("renders custom default base URLs in datalist", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => ["m4"],
        defaultBaseUrls: ["https://api.openai.com/v1", "https://openrouter.ai/api/v1"],
      });

      const datalist = document.getElementById("llm-provider-dl");
      expect(datalist?.innerHTML).toContain("openrouter.ai");

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://openrouter.ai/api/v1";
      apiField.value = "sk-x";
      submitForm(form);
      await promise;
    });

    it("renders select when baseUrls options are provided", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => ["m7"],
        baseUrls: [
          { url: "https://api.openai.com/v1", name: "OpenAI" },
          { url: "https://openrouter.ai/api/v1", name: "OpenRouter" },
        ],
      });

      const { modal, form, baseField, apiField } = getModalElements();
      expect(baseField.tagName).toBe("SELECT");
      expect((baseField as HTMLSelectElement).options.length).toBe(2);

      (baseField as HTMLSelectElement).value = "https://openrouter.ai/api/v1";
      apiField.value = "";
      submitForm(form);
      await promise;

      expect(modal.isConnected).toBe(false);
    });

    it("renders provided help HTML", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => ["m8"],
        help: '<div class="alert alert-info">Help here</div>',
      });

      const body = document.querySelector("#llm-provider-modal .modal-body");
      expect(body?.innerHTML.trim().startsWith('<div class="alert alert-info">')).toBe(true);

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://api.openai.com/v1";
      apiField.value = "";
      submitForm(form);
      await promise;
    });

    it("stores configuration in custom storage with custom key", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => ["m5"],
        storage: sessionStorage,
        key: "llmProvider",
      });

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://api.openai.com/v1";
      apiField.value = "sk-sess";
      submitForm(form);
      await promise;

      expect(sessionStorage.getItem("llmProvider")).toMatch(/sk-sess/);
    });

    it("uses custom labels and button text", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => ["m6"],
        storage: sessionStorage,
        key: "llmProvider",
        title: "Pick a provider",
        baseUrlLabel: "Your URL",
        apiKeyLabel: "Your Key",
        buttonLabel: "Save",
      });

      expect(document.querySelector(".modal-title")?.textContent).toBe("Pick a provider");
      const labels = Array.from(document.querySelectorAll("label.form-label")).map((node) => node.textContent);
      expect(labels).toEqual(["Your URL", "Your Key"]);
      expect(document.querySelector("button[type=submit]")?.textContent).toBe("Save");

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://api.openai.com/v1";
      apiField.value = "sk-lbl";
      submitForm(form);
      await promise;

      expect(sessionStorage.getItem("llmProvider")).toMatch(/sk-lbl/);
    });

    it("shows error when fetchModels rejects", async () => {
      const promise = openaiConfig({
        show: true,
        fetchModels: async () => {
          throw new Error("Invalid API key or URL");
        },
      });

      const { form, baseField, apiField, errorDiv, closeBtn } = getModalElements();
      baseField.value = "https://api.openai.com/v1";
      apiField.value = "sk-bad";
      submitForm(form);

      await vi.waitFor(() => expect(errorDiv.textContent).toMatch(/invalid/i));

      closeBtn.click();
      await expect(promise).rejects.toThrow(/cancelled/i);
    });

    it("rejects when modal is closed without submitting", async () => {
      const promise = openaiConfig({ show: true });
      const { closeBtn } = getModalElements();
      closeBtn.click();

      await expect(promise).rejects.toThrow(/cancelled/i);
      expect(document.getElementById("llm-provider-modal")).toBeNull();
    });
  });

  describe("geminiConfig", () => {
    it("uses Google endpoint auth style and strips model prefix", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }, { name: "models/gemini-pro" }],
        }),
      } as Response);

      const promise = geminiConfig({ show: true });

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://generativelanguage.googleapis.com/v1beta";
      apiField.value = "native-key";
      submitForm(form);
      const result = await promise;

      const [requestUrl, init] = expectMockCall<[string, RequestInit | undefined]>(fetchSpy);
      const parsed = new URL(requestUrl);
      expect(parsed.origin + parsed.pathname).toBe("https://generativelanguage.googleapis.com/v1beta/models");
      expect(parsed.searchParams.get("key")).toBe("native-key");
      expect(init?.headers).toMatchObject({ "x-goog-api-key": "native-key" });
      expect(localStorage.getItem("bootstrapLLMProvider_geminiConfig")).toMatch(/native-key/);
      expect(result.models).toEqual(["gemini-1.5-flash", "gemini-pro"]);
    });

    it("uses bearer tokens for proxy endpoints", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: "g1" }, { name: "models/g2" }] }),
      } as Response);

      const promise = geminiConfig({ show: true });

      const { form, baseField, apiField } = getModalElements();
      baseField.value = "https://aipipe.org/geminiv1beta";
      apiField.value = "proxy-token";
      submitForm(form);
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalled();
      const lastIndex = fetchSpy.mock.calls.length - 1;
      expect(lastIndex).toBeGreaterThanOrEqual(0);
      const [, init] = expectMockCall<[string, RequestInit | undefined]>(fetchSpy, lastIndex);
      expect(init?.headers).toEqual({ Authorization: "Bearer proxy-token" });
      expect(result.models).toEqual(["g1", "g2"]);
      expect(localStorage.getItem("bootstrapLLMProvider_geminiConfig")).toMatch(/proxy-token/);
    });

    it("skips modal when config exists", async () => {
      localStorage.setItem(
        "bootstrapLLMProvider_geminiConfig",
        JSON.stringify({ baseUrl: "https://aipipe.org/geminiv1beta", apiKey: "stored" }),
      );
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ name: "models/gemini-store" }] }),
      } as Response);

      const result = await geminiConfig();

      expect(document.getElementById("llm-provider-modal")).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.models).toEqual(["gemini-store"]);
    });
  });
});
