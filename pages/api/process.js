import formidable from 'formidable'
import fs from 'fs'
import { fileTypeFromBuffer } from 'file-type'
import { createWorker } from 'tesseract.js'

export const config = { api: { bodyParser: false } }

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm()
    form.keepExtensions = true
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

async function ocrImage(buffer) {
  const worker = await createWorker({ logger: m => {} })
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  const { data: { text } } = await worker.recognize(buffer)
  await worker.terminate()
  return text
}

async function summarizeWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const prompt = `Summarize the following legal text in plain English. Provide a short summary (2-3 sentences) and 4 bullet key points:\n\n${text}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // use a capable model; change if needed
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.2
    })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error('OpenAI error: ' + txt)
  }
  const j = await res.json()
  const reply = j.choices?.[0]?.message?.content || ''
  // Simple parse: split into summary and bullets if possible
  const parts = reply.split('\n')
  const summary = parts.slice(0,3).join(' ').trim() || reply
  const key_points = parts.filter(p => p.trim().startsWith('-') || p.trim().match(/^\d+\.|^•/)).slice(0,4).map(s => s.replace(/^(-|\d+\.|•)\s*/, '').trim())
  return { summary, key_points: key_points.length ? key_points : ['See full summary.'], original_extract: text.slice(0,1500) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { files } = await parseForm(req)
    const uploaded = files.file
    if (!uploaded) return res.status(400).json({ error: 'No file uploaded' })

    const buffer = fs.readFileSync(uploaded.path)
    const ftype = await fileTypeFromBuffer(buffer)

    let text = ''

    if (ftype && ftype.mime.startsWith('image/')) {
      // Run OCR on image
      text = await ocrImage(buffer)
    } else if (uploaded.name && uploaded.name.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf8')
    } else {
      // Unsupported file type for automatic OCR in this serverless demo (e.g., PDF)
      return res.json({
        summary: 'Automatic OCR for this filetype is not supported in the demo. Please upload an image (.png/.jpg) or a .txt file.',
        key_points: [],
        original_extract: ''
      })
    }

    // Try OpenAI summarization if API key present
    try {
      const openaiResult = await summarizeWithOpenAI(text)
      if (openaiResult) return res.json(openaiResult)
    } catch (err) {
      console.error('OpenAI summarization failed:', err.message)
    }

    // Fallback summarization (simple heuristic)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const summary = lines.slice(0,4).join(' ').slice(0,800) || text.slice(0,800)
    const key_points = lines.slice(0,6).slice(0,4)
    return res.json({ summary, key_points: key_points.length ? key_points : ['See document for details.'], original_extract: text.slice(0,1500) })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Processing failed', details: err.message })
  }
}
