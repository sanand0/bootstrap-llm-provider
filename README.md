# Bootstrap LLM Provider

[![npm version](https://img.shields.io/npm/v/bootstrap-llm-provider.svg)](https://www.npmjs.com/package/bootstrap-llm-provider)
[![Bootstrap](https://img.shields.io/badge/Framework-Bootstrap%205-7952b3)](https://getbootstrap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![bundle size](https://img.shields.io/bundlephobia/minzip/bootstrap-llm-provider)](https://bundlephobia.com/package/bootstrap-llm-provider)

Let users pick their OpenAI compatible API provider (e.g. OpenRouter, Ollama) via a Bootstrap modal

## Installation

To use locally, install via `npm`:

```bash
npm install bootstrap-llm-provider@1.1
```

... and add this to your script:

```js
import { openaiConfig } from "./node_modules/bootstrap-llm-provider/dist/bootstrap-llm-provider.js";
```

To use via CDN, add this to your script:

```js
import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1.1";
```

## Quick Start

```js
import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1.1";

// Basic Config - Opens a model and asks user for provider details
const { baseUrl, apiKey, models } = await openaiConfig();

// API key is optional if your provider doesn't require one

// Always Show Modal - even if user has provided information before
const { baseUrl, apiKey, models } = await openaiConfig({ show: true });

// Custom Base URLs (datalist)
const { baseUrl, apiKey, models } = await openaiConfig({
  defaultBaseUrls: ["https://api.openai.com/v1", "https://openrouter.com/api/v1"],
});

// Base URL Options (select)
const { baseUrl, apiKey, models } = await openaiConfig({
  baseUrls: [
    { url: "https://api.openai.com/v1", name: "OpenAI" },
    { url: "https://openrouter.com/api/v1", name: "OpenRouter" },
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
```

[](bootstrap-llm-provider.html ":include")

## API Reference

```js
async function openaiConfig({
  storage: localStorage,                          // where to store, e.g. sessionStorage
  key: "bootstrapLLMProvider_openaiConfig",       // key name for storage
  defaultBaseUrls: ["https://api.openai.com/v1"], // array of URL strings for user to pick from
  baseUrls: undefined,                            // array of { url, name } objects
  show: false,                                    // true will force prompt even if config exists
  title: "OpenAI API Configuration",              // modal dialog title
  baseUrlLabel: "API Base URL",                   // base URL label
  apiKeyLabel: "API Key",                         // api key label
  buttonLabel: "Save & Test",                     // submit button label
})
// Returns: { baseUrl, baseURL, apiKey, models: string[] }
```

- If there's no valid config, or `show` is true, it displays a Bootstrap modal with:
  - Base URL input with datalist of `defaultBaseUrls`, or a select of `baseUrls`
  - API key input, may be empty, prefilled from storage if present
  - On submit, it:
    1. Fetches `${baseUrl}/models` using the API key
    2. On success, save `{ baseUrl, apiKey }` to storage under `key`; return `{ baseUrl, baseURL, apiKey, models }`
    3. On failure, throws an Error
  - `baseUrls` overrides `defaultBaseUrls` if both are provided
- If config exists, it skips the prompt, fetches models and returns

## Development

```bash
# Clone the repository
git clone https://github.com/sanand0/bootstrap-llm-provider.git
cd bootstrap-llm-provider

npm install
npm run lint
npm run build
npm test
npm publish
```

## Changelog

- **1.1.0** - 2025-07-25 - optional API key, `baseUrls` select, `baseUrl` renamed (returns `baseURL` for compatibility)
- **1.0.0** - 2025-07-20 - initial release

## License

[MIT](LICENSE)
