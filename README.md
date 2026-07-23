# DocuChat

An AI knowledge assistant. Upload documents, ask questions in chat, and get
answers drawn only from those documents, with citations back to the source.

Answering from the model's own training data instead of the uploaded documents
is the specific failure this project is built to prevent. When the documents do
not contain an answer, the assistant says so rather than guessing.

## Stack

React + Vite + TypeScript, Express + TypeScript, MongoDB Atlas with Vector
Search, LangChain.js, Gemini 2.0 Flash and text-embedding-004.

Generation and embeddings sit behind a provider interface in
`server/src/rag/provider.ts`. Switching to OpenAI means changing that one file.

## Running locally

Requirements: Node 20+, a free MongoDB Atlas cluster, a free Gemini API key.

```bash
# API
cd server
cp .env.example .env      # fill in MONGODB_URI, GEMINI_API_KEY, JWT_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run verify:vector     # confirms Atlas vector search works
npm run seed              # demo account and sample documents
npm run dev

```

`SEED_ADMIN_PASSWORD` sets the password for the admin account created by
`npm run seed`. It has no default and must be chosen by the operator.

```bash
# Web
cd client
cp .env.example .env
npm install
npm run dev
```

Create the vector search index on the `chunks` collection before first use:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" }
  ]
}
```

Name it `chunk_vector_index`.

## Tests

```bash
cd server
npm test              # unit tests, no credentials needed
npm run test:integration   # live Gemini grounding checks
```

## Deployment

Frontend builds to static files for Cloudflare Pages or Netlify. The API runs on
Render's free tier, which sleeps after inactivity, so the first request after an
idle period takes several seconds to wake. That is a free-tier characteristic,
not a fault.

Set `VITE_API_URL` on the frontend to the deployed API URL.
