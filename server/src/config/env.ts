import 'dotenv/config'
import { z } from 'zod'

const schema = z
  .object({
    MONGODB_URI: z.string().min(1),
    AI_PROVIDER: z.enum(['gemini', 'workers-ai']).default('gemini'),
    GEMINI_API_KEY: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    JWT_SECRET: z.string().min(1),
    PORT: z.coerce.number().default(4000),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.AI_PROVIDER === 'gemini' && !cfg.GEMINI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is required when AI_PROVIDER=gemini',
      })
    }
    if (cfg.AI_PROVIDER === 'workers-ai' && (!cfg.CLOUDFLARE_ACCOUNT_ID || !cfg.CLOUDFLARE_API_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLOUDFLARE_ACCOUNT_ID'],
        message: 'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required when AI_PROVIDER=workers-ai',
      })
    }
  })

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
