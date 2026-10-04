import { createRequire } from 'node:module'
import { Worker } from 'node:worker_threads'

export const MAX_PDF_PAGES = 100
export const MAX_EXTRACTED_CHARACTERS = 300_000
export const PDF_TIMEOUT_MS = 5_000
const MAX_PDF_WORKERS = 2
let activeWorkers = 0
const require = createRequire(import.meta.url)

// This program is static. File bytes are worker data, never executable source.
// Parser work is isolated from the HTTP event loop, with a deadline, bounded
// V8 heap and no inherited environment. Native/external allocations are not
// covered by V8's heap limit, so input, output and concurrent work are capped too.
const program = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const parse = require(workerData.parser);
  let characters = 0;
  let limitExceeded = false;
  const result = await parse(new Uint8Array(workerData.buffer), {
    max: workerData.maxPages + 1,
    pagerender: async (page) => {
      const content = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      const parts = [];
      for (const item of content.items) {
        const text = String(item.str || '');
        characters += text.length + 1;
        if (characters > workerData.maxCharacters) { limitExceeded = true; throw new Error('limit'); }
        parts.push(text);
      }
      return parts.join(' ');
    }
  });
  // pdf-parse catches pagerender rejections, so retain the limit flag.
  parentPort.postMessage(limitExceeded ? { limit: true } : { text: result.text, pages: result.numpages });
})().catch(() => parentPort.postMessage({ failed: true }));
`

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('This PDF could not be read.')
  if (activeWorkers >= MAX_PDF_WORKERS) throw new Error('PDF processing is busy. Please try again.')
  activeWorkers++
  try {
    return await new Promise<string>((resolve, reject) => {
      const worker = new Worker(program, {
        eval: true,
        env: {},
        stdout: true,
        stderr: true,
        resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
        workerData: { parser: require.resolve('pdf-parse'), buffer, maxPages: MAX_PDF_PAGES, maxCharacters: MAX_EXTRACTED_CHARACTERS },
      })
      let settled = false
      const finish = (error?: Error, text?: string) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        void worker.terminate().catch(() => {}).then(() => {
          if (error) reject(error)
          else resolve(text!)
        })
      }
      const timer = setTimeout(() => finish(new Error('PDF processing time limit exceeded.')), PDF_TIMEOUT_MS)
      worker.once('message', (result: unknown) => {
        const value = result as { text?: unknown; pages?: unknown; limit?: unknown } | null
        if (value?.limit === true) {
          finish(new Error('PDF page or text limit exceeded.'))
        } else if (!value || typeof value.text !== 'string' || typeof value.pages !== 'number' || !Number.isInteger(value.pages) || value.pages < 1) {
          finish(new Error('This PDF could not be read.'))
        } else if (value.text.length > MAX_EXTRACTED_CHARACTERS || value.pages > MAX_PDF_PAGES) {
          finish(new Error('PDF page or text limit exceeded.'))
        } else finish(undefined, value.text)
      })
      worker.once('error', () => finish(new Error('This PDF could not be read.')))
      worker.once('exit', () => finish(new Error('This PDF could not be read.')))
    })
  } finally {
    activeWorkers--
  }
}
