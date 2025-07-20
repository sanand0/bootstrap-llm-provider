# Bootstrap LLM Provider

Let users pick their OpenAI compatible API provider (e.g. OpenRouter, Ollama) via a Bootstrap modal

## Installation

To use locally, install via `npm`:

```bash
npm install bootstrap-llm-provider@1
```

... and add this to your script:

```js
import { openaiConfig } from "./node_modules/bootstrap-llm-provider/dist/bootstrap-llm-provider.js;
```

To use via CDN, add this to your script:

```js
import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";
```

## Quick Start

```js
import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";

// Basic Config - Opens a model and asks user for provider details
const { baseURL, apiKey, models } = await openaiConfig();

// Always Show Modal - even if user has provided information before
const { baseURL, apiKey, models } = await openaiConfig({ show: true });

// Custom Base URLs
const { baseURL, apiKey, models } = await openaiConfig({
  defaultBaseUrls: ['https://api.openai.com/v1', 'https://openrouter.com/api/v1'],
});

// Custom Storage - store in sessionStorage.llmProvider
const { baseURL, apiKey, models } = await openaiConfig({ storage: sessionStorage, key: 'llmProvider' })

// Custom Babels
const { baseURL, apiKey, models } = await openaiConfig({
  title: "Pick a provider",
  baseURLLabel: "Your URL",
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
  show: false                                     // true will force prompt even if config exists
  title: "OpenAI API Configuration",              // modal dialog title
  baseURLLabel: "API Base URL",                   // base URL label
  apiKeyLabel: "API Key",                         // api key label
  buttonLabel: "Save & Test",                     // submit button label
})
// Returns: { baseURL, apiKey, models: string[] }
```

- If there's no valid config, or `show` is true, it displays a Bootstrap modal with:
  - Base URL input, prefilled from storage or empty, with a datalist of `defaultBaseUrls`
  - API key input, prefilled from storage if present
  - On submit, it:
    1. Fetches `${baseURL}/models` using the API key
    2. On success, save `{ baseURL, apiKey }` to storage under `key`; return `{ baseURL, apiKey, models }`
    3. On failure, throws an Error
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

## License

[MIT](LICENSE)
