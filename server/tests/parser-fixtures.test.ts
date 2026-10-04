import { describe, expect, it } from 'vitest'
import { extractText, MIME_DOCX, MIME_PDF } from '../src/documents/parse.js'
import { deflateRawSync } from 'node:zlib'

function pdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let result = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((value, index) => { offsets.push(Buffer.byteLength(result)); result += `${index + 1} 0 obj\n${value}\nendobj\n` })
  const start = Buffer.byteLength(result)
  result += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  result += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  result += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(result)
}

function docx(): Buffer {
  const entries = {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Readable DOCX</w:t></w:r></w:p></w:body></w:document>',
  }
  const locals: Buffer[] = [], directory: Buffer[] = []
  let offset = 0
  for (const [filename, text] of Object.entries(entries)) {
    const name = Buffer.from(filename), data = Buffer.from(text), compressed = deflateRawSync(data)
    const local = Buffer.alloc(30), central = Buffer.alloc(46)
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26)
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(8, 10); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42)
    locals.push(local, name, compressed); directory.push(central, name); offset += local.length + name.length + compressed.length
  }
  const dir = Buffer.concat(directory), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(3, 8); end.writeUInt16LE(3, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, dir, end])
}

describe('real parser smoke fixtures without external services', () => {
  it('extracts a valid PDF through the actual worker', async () => {
    await expect(extractText(pdf('Readable PDF'), MIME_PDF)).resolves.toContain('Readable PDF')
  })
  it('rejects extracted PDF text above the output budget', async () => {
    await expect(extractText(pdf('x'.repeat(300_001)), MIME_PDF)).rejects.toThrow(/PDF.*limit/i)
  })
  it('extracts a valid DOCX through bounded ZIP preflight and Mammoth', async () => {
    await expect(extractText(docx(), MIME_DOCX)).resolves.toContain('Readable DOCX')
  })
  it.each([Buffer.from('not PDF'), Buffer.from('%PDF-1.7\nbroken')])('rejects malformed PDFs with a stable public message', async input => {
    await expect(extractText(input, MIME_PDF)).rejects.toThrow('This PDF could not be read.')
  })
})
