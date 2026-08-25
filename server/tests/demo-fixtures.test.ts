import { describe, it, expect } from 'vitest'
import { loadDemoConversationFixtures } from '../src/demo/fixtures.js'

describe('demo conversation fixtures', () => {
  it('contains grounded examples with portable seed-document sources', () => {
    const fixtures = loadDemoConversationFixtures()

    expect(fixtures.length).toBeGreaterThan(0)
    expect(fixtures.every((fixture) => fixture.grounded && fixture.answer.length > 0)).toBe(true)
    expect(fixtures.flatMap((fixture) => fixture.sources.map((source) => source.filename))).toEqual(
      expect.arrayContaining(['handbook.txt', 'product-faq.txt']),
    )
    expect(fixtures.every((fixture) => fixture.sources.every((source) => source.snippet.length > 0))).toBe(true)
  })
})
