# Bootstrap LLM Provider

[![npm version](https://img.shields.io/npm/v/bootstrap-llm-provider.svg)](https://www.npmjs.com/package/bootstrap-llm-provider)
[![Bootstrap](https://img.shields.io/badge/Framework-Bootstrap%205-7952b3)](https://getbootstrap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![bundle size](https://img.shields.io/bundlephobia/minzip/bootstrap-llm-provider)](https://bundlephobia.com/package/bootstrap-llm-provider)

Let users pick their OpenAI compatible API provider (e.g. OpenRouter, Ollama) via a Bootstrap modal

## Installation

Add this to your script:

```js
import { geminiConfig, openaiConfig } from "bootstrap-llm-provider";
```

To use via CDN, add this to your HTML file:

```html
<script type="importmap">
  {
    "imports": {
      "bootstrap-llm-provider": "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1"
    }
  }
</script>
```

To use locally, install via `npm`:

```bash
npm install bootstrap-llm-provider
```

... and add this to your HTML file:

```html
<script type="importmap">
  {
    "imports": {
      "bootstrap-llm-provider": "./node_modules/bootstrap-llm-provider/dist/bootstrap-llm-provider.js"
    }
  }
</script>
```

## Usage

```js
import { geminiConfig, openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1.2";

// Basic Config - Opens a modal and asks user for provider details
const { baseUrl, apiKey, models } = await openaiConfig();

// API key is optional if your provider doesn't require one

// Always Show Modal - even if user has provided information before
const { baseUrl, apiKey, models } = await openaiConfig({ show: true });

// Custom Base URLs (datalist)
const { baseUrl, apiKey, models } = await openaiConfig({
  defaultBaseUrls: ["https://api.openai.com/v1", "https://openrouter.ai/api/v1"],
});

// Base URL Options (select)
const { baseUrl, apiKey, models } = await openaiConfig({
  baseUrls: [
    { url: "https://api.openai.com/v1", name: "OpenAI" },
    { url: "https://openrouter.ai/api/v1", name: "OpenRouter" },
  ],
  // baseUrls overrides defaultBaseUrls
});

// Custom Storage - store in sessionStorage.llmProvider
const { baseUrl, apiKey, models } = await openaiConfig({ storage: sessionStorage, key: "llmProvider" });

// Custom Labels
const { baseUrl, apiKey, models } = await openaiConfig({
  title: "Pick a provider",
  baseUrlLabel: "Your URL",
  apiKeyLabel: "Your Key",
  buttonLabel: "Save",
});

// Help HTML
const { baseUrl, apiKey, models } = await openaiConfig({
  help: '<div class="alert alert-info">Get your key from <a href="/">here</a></div>',
  show: true,
});

// Gemini Config - defaults to Google endpoint + three proxy hosts
const gemini = await geminiConfig();
console.log(gemini.baseUrl, gemini.apiKey, gemini.models);

// Gemini Proxy example (forces proxy base URL and opens modal)
const proxyResult = await geminiConfig({
  defaultBaseUrls: ["https://aipipe.org/geminiv1beta"],
  show: true,
});
// => { baseUrl: "https://aipipe.org/geminiv1beta", apiKey: "...", models: ["gemini-1.5-flash", ...] }
```

[](bootstrap-llm-provider.html ":include")

## API

```js
async function openaiConfig({
  storage: localStorage,                          // where to store, e.g. sessionStorage
  key: "bootstrapLLMProvider_openaiConfig",       // key name for storage
  defaultBaseUrls: ["https://api.openai.com/v1"], // array of URL strings for user to pick from
  baseUrls: undefined,                            // array of { url, name } objects
  show: false,                                    // true will force prompt even if config exists
  help: "",                                       // HTML rendered at top of modal
  title: "OpenAI API Configuration",              // modal dialog title
  baseUrlLabel: "API Base URL",                   // base URL label
  apiKeyLabel: "API Key",                         // api key label
  buttonLabel: "Save & Test",                     // submit button label
})
// Returns: { baseUrl, apiKey, models: string[] }
```

```js
async function geminiConfig({
  storage: localStorage,
  key: "bootstrapLLMProvider_geminiConfig",
  defaultBaseUrls: [
    "https://generativelanguage.googleapis.com/v1beta",
    "https://aipipe.org/geminiv1beta",
    "https://llmfoundry.straive.com/gemini/v1beta",
    "https://llmfoundry.straivedemo.com/gemini/v1beta",
  ],
  baseUrls: undefined,
  show: false,
  help: "",
  title: "Google Gemini API Configuration",
  baseUrlLabel: "Gemini API Base URL",
  apiKeyLabel: "API Key or Token",
  buttonLabel: "Save & Test",
})
// Returns: { baseUrl, apiKey, models: string[] }
```

- `geminiConfig` auto-detects Google's native host vs. proxies and sends the right auth headers:
  - `https://generativelanguage.googleapis.com` receives both `x-goog-api-key` and `?key=` query params
  - the provided proxy URLs receive `Authorization: Bearer <token>`
- Responses from `{ models: [...] }` or `{ data: [...] }` are normalized and return bare model names (with `models/` stripped)

- If there's no valid config, or `show` is true, it displays a Bootstrap modal with:
  - Base URL input with datalist of `defaultBaseUrls`, or a select of `baseUrls`
  - API key input, may be empty, prefilled from storage if present
  - `help` HTML inserted at the top if provided
  - On submit, it:
    1. Fetches `${baseUrl}/models` using the API key
    2. On success, save `{ baseUrl, apiKey }` to storage under `key`; return `{ baseUrl, apiKey, models }`
    3. On failure, throws an Error
  - `baseUrls` overrides `defaultBaseUrls` if both are provided
- If config exists, it skips the prompt, fetches models and returns

## Development

```bash
git clone https://github.com/sanand0/bootstrap-llm-provider.git
cd bootstrap-llm-provider

npm install
npm run lint && npm run build && npm test

npm publish
git commit . -m"$COMMIT_MSG"; git tag $VERSION; git push --follow-tags
```

## Release notes

- [1.3.1](https://npmjs.com/package/bootstrap-llm-provider/v/1.3.1): 31 Jul 2025. Standardized package.json & README.md
- [1.2.0](https://npmjs.com/package/bootstrap-llm-provider/v/1.2.0): 28 Jul 2025. Optional `help` HTML parameter
- [1.1.0](https://npmjs.com/package/bootstrap-llm-provider/v/1.1.0): 25 Jul 2025. Optional API key, `baseUrls` select, `baseUrl` renamed (returns `baseURL` for compatibility)
- [1.0.0](https://npmjs.com/package/bootstrap-llm-provider/v/1.0.0): 20 Jul 2025. Initial release

## License

[MIT](LICENSE)
