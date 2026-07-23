// Unit tests never make real network calls, but importing modules that reach
// config/env.ts triggers its validation, which exits the process when unset.
// These placeholders satisfy validation. Assignment is conditional so a real
// .env still wins for anything that genuinely needs it.
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/docuchat-test'
process.env.GEMINI_API_KEY ??= 'test-key-not-used'
process.env.JWT_SECRET ??= 'test-secret-not-used'
process.env.PORT ??= '4000'
