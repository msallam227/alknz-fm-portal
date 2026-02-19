# ALKNZ Extension — Architecture & Backend Requirements

---

## What the Extension Is

A Chrome side panel extension (Manifest V3) used internally by the ALKNZ team to capture investor profiles from LinkedIn and other web pages. It runs entirely in the browser — no bundler, no framework — just plain JS split across 22 files loaded in order via `sidepanel.html`.

Current version: **11.0.0**

---

## Extension Architecture

```
sidepanel.html          ← Main UI shell (3 tabs: Research, Batch, Saved)
│
├── state.js            ← Global state + storage key constants
├── storage.js          ← chrome.storage read/write helpers
├── translations.js     ← EN + AR strings
├── utils.js            ← escapeHtml, showToast, generateLocalId, buildAuthHeader
├── mode_controller.js  ← MODE_CONFIG + Person / Company / Bulk mode switching
├── form_person.js      ← getFormData(), setFormData(), clearForm(), buildPayload()
├── form_company.js     ← getFirmFormData(), setFirmFormData(), uploadFirm()
├── form_bulk.js        ← Bulk team member list, queue rendering, per-person upload
├── enrichment.js       ← Inline enrichment panel (Apply/Dismiss per field)
├── bulk_enrich.js      ← Sequential enrichment queue: runBulkEnrichmentQueue(), updateQueueCard()
├── suggestions.js      ← AI extract suggestion cards (Accept/Ignore)
├── scraper.js          ← Batch scrape tab logic
├── saved.js            ← Address book + search history (Saved tab)
├── content_bridge.js   ← Sends messages to content_script.js; captureFromPage()
├── api.js              ← ALL fetch calls to backend (upload, draft, recommendations, next-steps)
└── init.js             ← DOMContentLoaded wiring, tab switching

content_script.js       ← Injected into every page
                           3-layer extraction: JSON-LD → LinkedIn DOM → meta tags
                           Detects: person_profile | company_profile | team_page | unknown

options.html/js         ← Settings page: Login, Backend URL, API Key
service_worker.js       ← Opens side panel on extension icon click
```

### Script loading order (sidepanel.html)

```
xlsx.min.js → translations.js → state.js → utils.js → storage.js →
form_person.js → form_company.js → suggestions.js → enrichment.js →
form_bulk.js → bulk_enrich.js → mode_controller.js → content_bridge.js →
api.js → scraper.js → saved.js → init.js
```

> **Note:** The IDE (TypeScript checker) will flag functions like `getSettings` and `buildAuthHeader` as "not found" in files that call them. This is expected — those functions are global, defined in earlier scripts, and resolve correctly at runtime. There is no bundler.

---

## How Data Flows

```
User on LinkedIn
      ↓
content_script.js extracts profile data
      ↓
sidepanel receives it via chrome.runtime.sendMessage
      ↓
User fills/edits the form → clicks Upload
      ↓
api.js → POST /api/v1/people (with Bearer token + captured_by)
      ↓
Backend stores it, returns { id, action: "created"|"updated" }
      ↓
Extension calls GET /api/v1/people/{id}/recommendations
Extension calls GET /api/v1/people/{id}/next-steps
      ↓
Cards appear in the side panel
```

---

## What the Backend Must Implement

### Authentication

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/auth/login` | POST | `{ email, password }` | `{ token, user_id, display_name, expires_at }` |
| `/api/auth/me` | GET | Bearer token in header | `{ user_id, display_name, email }` |

The extension stores the token in `chrome.storage.sync` and sends it as `Authorization: Bearer {token}` on every request via `buildAuthHeader(settings)` in `utils.js`, which prefers `authToken` over the legacy `apiKey`.

---

### Core Data Endpoints (already partially exist)

| Endpoint | Method | Notes |
|---|---|---|
| `/api/v1/people` | POST | Stores a captured person. Must accept `captured_by` field (string — the user's name/email). Must return `{ id, action }` |
| `/api/v1/companies` | POST | Stores a captured company/firm |
| `/api/v1/people/lookup` | GET | Query param: `?linkedin_url=`. Must return `{ exists: bool, captured_by_others: [{ name, captured_at }] }` |
| `/api/v1/enrichment` | POST | Takes profile data, returns enriched fields per-key with confidence |
| `/api/v1/extract` | POST | Takes page text/HTML, returns extracted form fields |
| `/api/v1/scrape` | POST | Takes a company/team URL, returns list of people found |
| `/api/metrics` | GET | Returns `{ data: { total_investors, total_captures } }` — used by Test Connection |
| `/api/drafts` | POST | Stores a local draft server-side for central visibility. Body: `{ profile, captured_by, source_urls }` |
| `/api/capture-log/batch` | POST | Logs a batch scrape session. Body: `{ profiles, organization, captured_by, scrape_session_id, source_urls }` |

---

### New Endpoints Needed for Recommendations & Next Steps

#### `GET /api/v1/people/{id}/recommendations?limit=5`

Returns a list of similar investors the team hasn't captured yet.

```json
[
  {
    "person_name": "Sarah Johal",
    "job_title": "Managing Partner",
    "firm_name": "Sequoia",
    "linkedin_url": "https://linkedin.com/in/sarahjohal"
  }
]
```

Scoring logic (server-side):
- Match investment sectors → weight 0.4
- Match investment stage → weight 0.3
- Match geography → weight 0.2
- Match firm type → weight 0.1
- Only surface profiles not yet captured by anyone on the team

---

#### `GET /api/v1/people/{id}/next-steps`

Returns a suggested outreach approach for the captured person.

```json
{
  "intro_path": "Warm intro via LinkedIn mutual",
  "key_topic": "FinTech + MENA alignment",
  "reference_point": "Their investment in Careem",
  "timing": "Tuesday–Thursday, morning"
}
```

Rule-based initially:
- `intro_path`: if `relationship_strength === "Warm"` → warm intro, else direct LinkedIn
- `key_topic`: first 2 matching investment sectors
- `reference_point`: a known portfolio company in matching sector
- `timing`: can be static for now ("Tuesday–Thursday, morning")

---

### Admin Dashboard (Platform-side only, no extension changes needed)

The platform needs a contacts view that shows:
- Every person captured, with a "Captured By" column
- Flag rows where 2+ different team members have captured the same person (matched by LinkedIn URL)
- Filter: "Show contacts with 2+ team members"

```
┌── Contact: Sarah Johal ─────────────────────────────┐
│  Role: Managing Partner, Sequoia                     │
│  ─────────────────────────────────────────────────  │
│  • Mariam Sallam — Jan 15 · Status: Draft            │
│  • Khaled Al-Mutairi — Jan 16 · Status: Reached Out  │
│  ⚠️ Multiple team members on this contact            │
└──────────────────────────────────────────────────────┘
```

---

## Authentication Flow Summary

1. User opens Options → enters Backend URL + email + password → clicks Log In
2. Extension calls `POST /api/auth/login` → receives token → stored in `chrome.storage.sync`
3. Every API call uses `buildAuthHeader(settings)` → `Authorization: Bearer {token}`
4. `captured_by` is automatically set to the logged-in user's display name
5. If no token, falls back to the raw API key (backward compatible)
6. Log Out clears the token from storage

---

## Fallback Strategy (backward compat)

Every primary endpoint has a legacy fallback built into the extension:

| Primary | Fallback |
|---|---|
| `/api/v1/people` | `/api/capture` |
| `/api/v1/companies` | `/api/organizations` |
| `/api/v1/enrichment` | `/api/deep-search` |
| `/api/v1/scrape` | `/api/batch-scrape` |
| `/api/v1/extract` | `/api/extract` |

If a v1 endpoint returns a non-2xx response, the extension automatically retries on the fallback URL. This means the existing backend continues to work while the new endpoints are being built.

---

## Known Limitations / IDE Notes

- **No bundler**: all files are plain `<script src="...">` tags. Globals defined in earlier scripts are available to later scripts but invisible to the TypeScript/IDE checker. Ignore "Could not find name" hints for cross-file globals.
- **`options.js` duplicates `STORAGE_KEYS`**: `options.html` runs in a separate browser page context and cannot import from `state.js`, so the storage key strings are duplicated there. If a key name changes, update both `state.js` and `options.js`.
