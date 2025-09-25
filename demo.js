import { geminiConfig, openaiConfig } from "./bootstrap-llm-provider.js";

const attach = (id, options = {}, runner = openaiConfig) => {
  document.getElementById(id).addEventListener("click", () => {
    showResult({ ...options }, runner);
  });
};

const resultElement = document.querySelector("#result");
async function showResult(config = {}, runner = openaiConfig) {
  resultElement.textContent = "Checking...";
  try {
    const result = await runner(config);
    resultElement.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    resultElement.textContent = String(error);
  }
}

attach("basicConfig");
attach("alwaysShowModal", { show: true });
attach("customBaseURL", {
  defaultBaseUrls: ["https://api.openai.com/v1", "https://openrouter.ai/api/v1"],
  show: true,
});
attach("customStorage", { storage: sessionStorage, key: "llmProvider", show: true });
attach("customLabels", {
  storage: sessionStorage,
  key: "llmProvider",
  title: "Pick a provider",
  baseUrlLabel: "Your URL",
  apiKeyLabel: "Your Key",
  buttonLabel: "Save",
  show: true,
});
attach("baseUrlsSelect", {
  baseUrls: [
    { url: "https://api.openai.com/v1", name: "OpenAI" },
    { url: "https://openrouter.com/api/v1", name: "OpenRouter" },
  ],
  show: true,
});
attach("helpHtml", {
  help: '<div class="alert alert-info">Get your key from <a href="/">here</a></div>',
  show: true,
});
attach("geminiConfig", {}, geminiConfig);
