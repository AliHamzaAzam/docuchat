# Demo uploads and API limits

This change is server-side only. The client can continue using the existing
document and chat routes, but demo sessions now receive a private upload scope
and the API returns rate-limit errors when a client exceeds a configured limit.

## Demo authentication

`POST /api/auth/demo` still returns:

```json
{
  "token": "<jwt>",
  "user": { "email": "demo@docuchat.app", "role": "user" }
}
```

Every successful demo login creates a fresh UUID and places it in the JWT as
the `demoSessionId` claim. The claim is not added to ordinary register or
password-login tokens. The frontend should keep using the returned bearer
token for all subsequent requests. Two browsers using the shared demo account
therefore have different document scopes.

Expired demo uploads are removed during demo login and by a server cleanup
sweep every 15 minutes. An upload expires two hours after its document was
created.

## Document routes

`GET /api/documents` returns shared documents for ordinary authenticated users.
A demo session receives shared documents plus documents whose scope belongs to
its own `demoSessionId`. It never receives another demo session's documents.
The response fields are unchanged:

```json
[
  {
    "id": "<document-id>",
    "filename": "notes.txt",
    "status": "processing|ready|error",
    "error": null,
    "chunkCount": 0,
    "size": 1234,
    "createdAt": "<iso-date>"
  }
]
```

`GET /api/documents/:id/status` applies the same scope and returns 404 when a
document is not visible to the caller. Its response fields are unchanged:
`id`, `status`, `error`, and `chunkCount`.

`POST /api/documents` continues to accept a multipart form field named
`file`. Administrators can upload unlimited documents and all administrator
uploads are shared. Demo sessions can upload only PDF, DOCX, and TXT files,
with these caps:

- 3 active documents per demo session. Processing and ready documents count;
  errored documents do not.
- 2 MB per file.

The existing 10 MB Multer transport guard remains as the general parser safety
limit. Demo files are rejected at 2 MB with HTTP 413. Reaching the active demo
document cap returns HTTP 409. The successful 202 response remains:
`{ "id", "filename", "status" }`.

`DELETE /api/documents/:id` remains available to administrators for any
document. A demo session may delete only its own demo upload. Ordinary users
cannot delete documents, and a demo session cannot delete shared or another
session's documents. A successful delete returns `{ "ok": true }`.

## Chat and retrieval

`POST /api/conversations/chat` keeps its existing request fields:

```json
{ "question": "What is the refund policy?", "conversationId": "<optional-id>" }
```

Vector retrieval now filters chunks to `scopeKey: "shared"` for ordinary
authenticated users and administrators. Demo retrieval filters to
`scopeKey: "shared"` or the current session UUID. Chat sources therefore
cannot cite another demo session's chunks. The response shape is unchanged.

## Rate limits

Limits are per client IP. `trust proxy` is set to `1` for the Render proxy.
The health check is not rate limited.

| Route | Limit |
| --- | --- |
| `POST /api/conversations/chat` | 15 requests per 10 minutes |
| `POST /api/documents` | 5 requests per hour |
| `POST /api/auth/demo` | 10 requests per 10 minutes |
| `POST /api/auth/login` | 10 requests per 10 minutes |
| `POST /api/auth/register` | 10 requests per 10 minutes |

Every rate-limited route returns HTTP 429 with this JSON shape:

```json
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMITED"
}
```

## Storage and Atlas index

Documents and chunks now carry:

- `demoSessionId`: `null` for shared records or the UUID of the owning demo
  browser session.
- `scopeKey`: `shared` for shared records or the owning demo session UUID.

The migration chose to backfill legacy records as shared instead of relying on
missing-field behavior in Atlas Vector Search. The live run backfilled 2
documents and 2 chunks.

`chunk_vector_index` is recreated by:

```bash
cd server
npm run recreate:chunk-index
```

Its definition is:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "scopeKey" }
  ]
}
```

The script drops the prior index, creates this definition, polls
`listSearchIndexes`, and exits successfully only after Atlas reports
`queryable=true`. The live cluster run completed successfully.

## Verification

- `cd server && npx tsc --noEmit`: passed.
- `cd server && npm test -- --run`: 9 test files, 53 tests passed.
- Live Atlas index migration: completed; `chunk_vector_index` is queryable.
