# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the existing product and the user's redesign request: people who need to interrogate a small set of PDFs, DOCX files, or text files quickly, plus an administrator who maintains the shared source library.

## Product Purpose

DocuChat lets a person upload documents, ask questions in a conversation, and receive answers grounded only in those documents. Success means the user can understand where an answer came from and can trust an honest refusal when the documents do not contain it.

## Positioning

The product's meaningful mechanism is source-grounded chat with visible citations and explicit "couldn't find this" behavior, rather than a general-purpose chatbot that may answer from model memory.

## Operating Context

The main workflow is: enter a demo session or sign in, review the available conversations and documents, ask a question, inspect the cited passages, and optionally upload or remove documents. Admins have a dedicated document management view. Demo uploads are private to the session and expire automatically.

## Capabilities and Constraints

- React + Vite + TypeScript client with an Express API.
- Supports PDF, DOCX, and TXT documents.
- Answers can be grounded or explicitly ungrounded; source snippets are expandable in-place.
- The client must remain responsive on mobile, preserve keyboard focus visibility, and respect reduced motion.
- Existing API routes, authentication flows, demo limits, and document-management behavior remain unchanged in this redesign.

## Brand Commitments

The name DocuChat and the existing highlighter-inspired source language are retained. Copy should stay plain, specific, and honest about what the assistant can and cannot answer.

## Evidence on Hand

The repository README and client implementation are the source of truth. No customer testimonials, commercial benchmarks, or external brand assets are present; future work must not fabricate them.

## Product Principles

- Show the source, not just the answer.
- Make uncertainty useful and explicit.
- Keep the document set visible while the user works.
- Make the first question easy to ask.

## Accessibility & Inclusion

Use semantic controls, labels for form fields, visible focus states, sufficient contrast, touch-friendly targets, and a reduced-motion fallback.
