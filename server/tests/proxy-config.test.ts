import { describe, expect, it } from 'vitest'
import { parseTrustedProxyCidrs } from '../src/config/proxy.js'
describe('trusted proxy configuration', () => {
  it('defaults to trusting no forwarding headers', () => expect(parseTrustedProxyCidrs('')).toEqual([]))
  it('accepts explicit IPs and CIDRs', () => expect(parseTrustedProxyCidrs('127.0.0.1, ::1/128,192.0.2.0/24')).toEqual(['127.0.0.1', '::1/128', '192.0.2.0/24']))
  it.each(['1', 'true', '0.0.0.0/0', '::/0', '127.0.0.1/33', '::1/129', '::1/', '127.0.0.1/8/2', 'localhost'])('rejects ambiguous or universal trust: %s', value => expect(() => parseTrustedProxyCidrs(value)).toThrow())
})
