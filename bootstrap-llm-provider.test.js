import { describe, it, expect, vi, beforeEach } from "vitest";
import { Browser } from "happy-dom";

const browser = new Browser({
  console,
  settings: { fetch: { virtualServers: [{ url: "https://test/", directory: "." }] } },
});

describe("bootstrap-llm-provider demo UI", () => {
  let page = browser.newPage();
  let document, window;

  beforeEach(async () => {
    await page.goto("https://test/bootstrap-llm-provider.html");
    await page.waitUntilComplete();
    document = page.mainFrame.document;
    window = page.mainFrame.window;
    // Ensure happy-dom's page uses vitest's setTimeout
    window.setTimeout = setTimeout;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  function fillAndSubmitModal({ baseURL, apiKey }) {
    const baseField = document.querySelector("[name=baseURL]");
    baseField.value = baseURL;
    const keyField = document.querySelector("input[name=apiKey]");
    keyField.value = apiKey;
    document.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  }

  it("basicConfig: opens modal, validates, fetches, saves, renders", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: [{ id: "m1" }, { id: "m2" }] }) }));
    document.querySelector("#basicConfig").click();
    // Modal appears
    expect(document.querySelector("#llm-provider-modal")).toBeTruthy();
    // Invalid URL
    fillAndSubmitModal({ baseURL: "bad", apiKey: "" });
    expect(document.querySelector(".text-danger").textContent).toMatch(/valid url/i);
    // Valid URL, empty key
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "" });
    await vi.waitFor(() => expect(document.querySelector("#llm-provider-modal")).toBeFalsy());
    expect(window.fetch.mock.calls[0][1].headers).toEqual({});
    expect(window.localStorage.getItem("bootstrapLLMProvider_openaiConfig")).toMatch(/"apiKey":""/);
    // Valid input
    document.querySelector("#alwaysShowModal").click();
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "sk-test" });
    await vi.waitFor(() => expect(document.querySelector("#llm-provider-modal")).toBeFalsy());
    expect(document.querySelector("#result").textContent).toMatch(/m1/);
    // Saved to localStorage
    expect(window.localStorage.getItem("bootstrapLLMProvider_openaiConfig")).toMatch(/sk-test/);
  });

  it("basicConfig: skips modal if config exists, fetches models", async () => {
    window.localStorage.setItem(
      "bootstrapLLMProvider_openaiConfig",
      JSON.stringify({ baseURL: "https://api.openai.com/v1", apiKey: "sk-test" }),
    );
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m1", "m2"] }) }));
    document.querySelector("#basicConfig").click();
    expect(document.querySelector("#result").textContent).toMatch(/Checking/);
    await vi.waitFor(() => expect(document.querySelector("#result").textContent).toMatch(/m1/));
  });

  it("alwaysShowModal: always opens modal, validates, fetches", async () => {
    window.localStorage.setItem(
      "bootstrapLLMProvider_openaiConfig",
      JSON.stringify({ baseURL: "https://api.openai.com/v1", apiKey: "sk-old" }),
    );
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m3"] }) }));
    document.querySelector("#alwaysShowModal").click();
    expect(document.querySelector("#llm-provider-modal")).toBeTruthy();
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "sk-new" });
    await vi.waitFor(() => expect(document.querySelector("#result").textContent).toMatch(/m3/));
    expect(window.localStorage.getItem("bootstrapLLMProvider_openaiConfig")).toMatch(/sk-new/);
  });

  it("customBaseURL: uses custom base URLs in datalist", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m4"] }) }));
    document.querySelector("#customBaseURL").click();
    const datalist = document.querySelector("#llm-provider-dl");
    expect(datalist.innerHTML).toContain("openrouter.ai");
    fillAndSubmitModal({ baseURL: "https://openrouter.ai/api/v1", apiKey: "sk-x" });
    await vi.waitFor(() => expect(document.querySelector("#result").textContent).toMatch(/m4/));
  });

  it("baseUrlsSelect: renders select instead of input", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m7"] }) }));
    document.querySelector("#baseUrlsSelect").click();
    const select = document.querySelector("select[name=baseURL]");
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
    fillAndSubmitModal({ baseURL: "https://openrouter.com/api/v1", apiKey: "" });
    await vi.waitFor(() => expect(document.querySelector("#result").textContent).toMatch(/m7/));
  });

  it("customStorage: uses sessionStorage and custom key", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m5"] }) }));
    document.querySelector("#customStorage").click();
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "sk-sess" });
    await vi.waitFor(() => expect(window.sessionStorage.getItem("llmProvider")).toMatch(/sk-sess/));
    expect(document.querySelector("#result").textContent).toMatch(/m5/);
  });

  it("customLabels: uses custom labels and button text", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ data: ["m6"] }) }));
    document.querySelector("#customLabels").click();
    expect(document.querySelector(".modal-title").textContent).toBe("Pick a provider");
    expect(document.querySelector("label.form-label").textContent).toBe("Your URL");
    expect(document.querySelectorAll("label.form-label")[1].textContent).toBe("Your Key");
    expect(document.querySelector("button[type=submit]").textContent).toBe("Save");
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "sk-lbl" });
    await vi.waitFor(() => expect(window.sessionStorage.getItem("llmProvider")).toMatch(/sk-lbl/));
    expect(document.querySelector("#result").textContent).toMatch(/m6/);
  });

  it("shows error on fetch failure", async () => {
    window.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    document.querySelector("#basicConfig").click();
    fillAndSubmitModal({ baseURL: "https://api.openai.com/v1", apiKey: "bad" });
    await vi.waitFor(() => expect(document.querySelector(".text-danger").textContent).toMatch(/invalid/i));
  });

  it("modal closes on cancel", async () => {
    document.querySelector("#basicConfig").click();
    await vi.waitFor(() => expect(document.querySelector(".btn-close")).toBeTruthy());
    document.querySelector(".btn-close").click();
    await vi.waitFor(() => expect(document.querySelector("#llm-provider-modal")).toBeFalsy());
    await vi.waitFor(() => expect(document.querySelector("#result").textContent).toMatch(/cancelled|Error/));
  });
});
