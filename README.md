# Free Models

> **Make more. Spend less.**  
> Free AI models for whatever you’re building.

Free Models is a catalogue and web explorer for free AI models, API providers, rate limits, and capabilities.

## Overview

- **Free AI Models**: Catalogue covering models across reasoning, coding, conversational chat, embeddings, and multimodal tasks.
- **API Providers**: Directory of services offering free inference tiers, zero-priced endpoints, and developer allowances (including Groq, Cloudflare Workers AI, Google Gemini API, Mistral, OpenRouter, Cohere, NVIDIA Build, and others).
- **Model Publishers**: Index of organisations building models (such as Meta, Google, Mistral, DeepSeek, and Qwen) and where to access their free tiers.
- **Usage Limits**: Request quotas, token rates, and allowance terms tracked per provider.
- **Model Details**: Context windows, modalities, reasoning support, tool calling, and official documentation links.

## Repository Structure

The project is structured as a Bun workspace:

- [`apps/web`](apps/web): Next.js web application built with Turbopack, Tailwind CSS, and Base UI. Pre-rendered with static page generation (SSG) and verified parity between visible UI text and SEO metadata (OpenGraph cards, JSON-LD schemas, and breadcrumbs).
- [`packages/json`](packages/json): Catalogue data engine that discovers free model offers from provider APIs, reconciles identities, refreshes metadata, and renders the deterministic catalogue JSON.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (version pinned in `package.json`)

### Installation

```sh
bun install
```

### Development

Run the web application locally (this automatically renders the catalogue on startup):

```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Production Build

Render the current catalogue and generate the static production build:

```sh
bun run build
```

### Quality and Testing

Run test suites, type checking, Biome formatting, and linting across the workspace:

```sh
bun test              # Run all unit and integration tests
bun run typecheck     # Type-check apps/web and packages/json
bun run format:check  # Verify code formatting
bun run lint          # Run Biome linter
bun run quality       # Run complete quality gate
bun run --filter web seo:check # Verify SEO and UI content parity
```

## License

This project is licensed under the [MIT License](LICENSE).
