# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

秋招自动填写 (Qiuzhao Auto-Fill) — a Chrome Extension (Manifest V3) that uses LLM to intelligently fill Chinese job application forms (秋招网申). Built with TypeScript, React 18, Vite, and @crxjs/vite-plugin.

## Commands

```bash
npm run dev          # Dev mode with HMR
npm run build        # TypeScript check + production build → dist/
npm run typecheck    # TypeScript type checking only
```

After building, load the `dist/` directory as an unpacked Chrome extension at `chrome://extensions/` (Developer mode required).

## Architecture

### Extension Contexts (3 separate JS contexts)

1. **Background Service Worker** (`src/background/`) — Long-running process. Handles message routing, LLM API calls via fetch, chrome.storage read/write, and the `Ctrl+Shift+F` keyboard shortcut via `chrome.commands`. Does NOT have DOM access.

2. **Content Script** (`src/content/`) — Injected into every page at `document_idle`. Has DOM access. Scans forms, fills fields, shows feedback overlay. Communicates with background via `chrome.runtime.sendMessage`.

3. **UI Pages** (`src/popup/`, `src/options/`) — React apps. Popup is the toolbar popup (320px wide). Options is a full-page settings UI opened via `chrome.runtime.openOptionsPage()`.

### Data Flow

```
Popup/Shortcut → Content Script (scanFormFields)
  → Background (matchFields via LLM)
  → Content Script (fillFields + showFillResult overlay)
```

### Key Files

- `src/content/scanner.ts` — DOM form scanning with label resolution priority: `<label for>`, wrapping `<label>`, `aria-label`, `placeholder`, preceding text node, `name` attribute
- `src/content/filler.ts` — Value injection using native setters + `input`/`change`/`focus`/`blur` event dispatch for React/Vue compatibility
- `src/background/field-matcher.ts` — LLM prompt construction (system + user messages with profile JSON + field descriptors) and response parsing
- `src/background/llm-client.ts` — Provider-agnostic fetch to OpenAI-compatible chat completions API (works with DeepSeek, OpenAI, Moonshot, ZhipuAI)
- `src/background/storage.ts` — chrome.storage.local wrapper for profile, LLM settings, and fill history
- `src/shared/types.ts` — All TypeScript interfaces: Profile, BasicInfo, EducationEntry, ExperienceEntry, OtherInfo, FieldDescriptor, FieldMatch, FillResult, LLMSettings

### Important Constraints

- Content scripts and background workers run in separate contexts; all communication is via `chrome.runtime.sendMessage` with async response (return `true` to keep channel open)
- Service workers in Manifest V3 cannot use XMLHttpRequest — use `fetch`
- For React-controlled inputs, the native value setter + event dispatching pattern is used (not React's synthetic event system, which we can't access from content scripts)
- Profile data uses `null` to distinguish "not provided" from empty string — the LLM prompt relies on this distinction
- Form field selectors are CSS-based with fallback chain: `#id` → `[name="..."]` → CSS path
- LLM matching results are cached per (hostname + field signature + profile version) for 24 hours
