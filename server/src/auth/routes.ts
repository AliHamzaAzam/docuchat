import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User.js'
import { BootstrapModel, ADMIN_CLAIM_ID } from '../models/Bootstrap.js'
import { signToken } from './jwt.js'
import { authRateLimiter, demoLoginRateLimiter } from '../config/rateLimit.js'
import { cleanupExpiredDemoUploads } from '../documents/cleanup.js'

export const authRouter = Router()

const DEMO_EMAIL = 'demo@docuchat.app'

/**
 * Decide whether this registration becomes the admin.
 *
 * Reading a count and then writing would be a time-of-check-to-time-of-use
 * race: two concurrent first registrations could both observe an empty
 * collection and both become admin. Instead the claim is a single insert of a
 * fixed-id sentinel. The unique _id means exactly one insert can ever succeed,
 * so exactly one account is ever promoted at bootstrap.
 *
 * Any failure returns 'user', so the failure mode is too few admins rather
 * than too many. If a claim is consumed without a user being created, delete
 * the sentinel document to allow the next registration to claim it.
 */
async function claimAdminRole(): Promise<'admin' | 'user'> {
  try {
    await BootstrapModel.create({ _id: ADMIN_CLAIM_ID })
    return 'admin'
  } catch {
    return 'user'
  }
}

authRouter.post('/register', authRateLimiter, async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const existing = await UserModel.findOne({ email: String(email).toLowerCase() })
  if (existing) return res.status(409).json({ error: 'That email is already registered.' })

  const role = await claimAdminRole()

  let user
  try {
    user = await UserModel.create({
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(String(password), 10),
      role,
    })
  } catch (err: any) {
    // Creation failed after the claim was taken. The likeliest cause is a
    // concurrent registration of the same email winning the unique index,
    // because the duplicate check above is itself a read-then-write race.
    // Release the claim so a later registration can still bootstrap an admin.
    // Without this the collection could end up with no admin at all and no
    // recovery short of manually deleting the sentinel.
    if (role === 'admin') {
      await BootstrapModel.deleteOne({ _id: ADMIN_CLAIM_ID })
    }
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'That email is already registered.' })
    }
    throw err
  }

  res.status(201).json({
    token: signToken({ userId: String(user._id), role: user.role as 'admin' | 'user' }),
    user: { email: user.email, role: user.role },
  })
})

authRouter.post('/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body ?? {}
  const user = await UserModel.findOne({ email: String(email ?? '').toLowerCase() })
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' })
  }
  res.json({
    token: signToken({ userId: String(user._id), role: user.role as 'admin' | 'user' }),
    user: { email: user.email, role: user.role },
  })
})

authRouter.post('/demo', demoLoginRateLimiter, async (_req, res) => {
  await cleanupExpiredDemoUploads()
  const user = await UserModel.findOne({ email: DEMO_EMAIL, isDemo: true })
  if (!user) return res.status(503).json({ error: 'The demo account is not available.' })
  const demoSessionId = randomUUID()
  res.json({
    token: signToken({ userId: String(user._id), role: user.role as 'admin' | 'user', demoSessionId }),
    user: { email: user.email, role: user.role },
  })
})
