import express from 'express'
import request from 'supertest'
import { expect, it } from 'vitest'
import { createRateLimiter } from '../src/config/rateLimit.js'

it('limits repeated requests and returns stable JSON plus retry headers', async () => {
  const app = express()
  app.post('/limited', createRateLimiter({ windowMs: 60_000, max: 2 }), (_req, res) => res.json({ ok: true }))
  expect((await request(app).post('/limited')).status).toBe(200)
  expect((await request(app).post('/limited')).status).toBe(200)
  const result = await request(app).post('/limited')
  expect(result.status).toBe(429)
  expect(result.body).toEqual({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' })
  expect(Number(result.headers['retry-after'])).toBeGreaterThan(0)
  expect(result.headers.ratelimit).toContain('remaining=0')
})

import { createApp } from '../src/app.js'
import { signToken } from '../src/auth/jwt.js'
it('does not let direct clients bypass chat limits by rotating forwarded addresses', async () => {
  const app = createApp()
  const token = signToken({ userId: 'user-a', role: 'user' })
  for (let i = 1; i <= 15; i++) {
    const result = await request(app).post('/api/conversations/chat')
      .set('Authorization', `Bearer ${token}`).set('X-Forwarded-For', `203.0.113.${i}`).send({ question: '' })
    expect(result.status).toBe(400)
  }
  const result = await request(app).post('/api/conversations/chat')
    .set('Authorization', `Bearer ${token}`).set('X-Forwarded-For', '203.0.113.16').send({ question: '' })
  expect(result.status).toBe(429)
  expect(result.body.code).toBe('RATE_LIMITED')
})
