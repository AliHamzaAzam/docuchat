import { isIP } from 'node:net'

export function parseTrustedProxyCidrs(value: string): string[] {
  if (!value.trim()) return []
  const entries = value.split(',').map(entry => entry.trim())
  for (const entry of entries) {
    const [address, prefix, extra] = entry.split('/')
    const family = isIP(address)
    if (!family || extra !== undefined || (prefix !== undefined
      && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128)))) {
      throw new Error('TRUSTED_PROXY_CIDRS must contain explicit IP addresses or nonzero CIDR ranges.')
    }
  }
  return entries
}
