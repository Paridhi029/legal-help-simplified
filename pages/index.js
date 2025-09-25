import { useState } from 'react'
import dynamic from 'next/dynamic'

export default function Home() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [previewSrc, setPreviewSrc] = useState(null)

  async function fileToImageBlob(file) {
    const name = file.name.toLowerCase()
    if (name.endsWith('.txt')) {
      return file // send as-is
    }
    if (name.endsWith('.pdf')) {
      // dynamic import of pdfjs only on client
      const pdfjsLib = await import('pdfjs-dist/build/pdf')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(1) // first page
      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      // preview
      const dataUrl = canvas.toDataURL('image/png')
      setPreviewSrc(dataUrl)
      // convert to blob
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      // create a File-like object
      return new File([blob], file.name.replace('.pdf','.png'), { type: 'image/png' })
    }
    // if image already, return file
    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader()
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      setPreviewSrc(dataUrl)
      return file
    }
    // fallback
    return file
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError(null)
    if (!file) return setError('Please select a file (image, PDF or .txt).')
    setLoading(true)
    setResult(null)

    try {
      const blobOrFile = await fileToImageBlob(file)
      const form = new FormData()
      form.append('file', blobOrFile)
      const res = await fetch('/api/process', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Processing failed')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="flex items-center gap-4 mb-6">
        <img src="/logo.svg" alt="logo" width={64} height={64} />
        <div>
          <h1 className="text-2xl font-bold">Legal Help Simplified</h1>
          <p className="text-sm text-gray-600">Upload an image, PDF (first page converted) or text file — OCR + NLP will simplify legal text for demo.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select file</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={e => { setFile(e.target.files[0]); setPreviewSrc(null); setResult(null); }} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">PDFs: first page will be rendered and sent to OCR. For multi-page support, use server-side conversion in production.</p>
          </div>

          {previewSrc && <div className="mt-2"><img src={previewSrc} alt="preview" className="rounded shadow max-h-64" /></div>}

          <div className="flex items-center gap-3">
            <button className="button" type="submit" disabled={loading}>{loading ? 'Processing...' : 'Process Document'}</button>
            <button type="button" className="px-3 py-2 border rounded" onClick={() => { setFile(null); setResult(null); setError(null); setPreviewSrc(null) }}>Reset</button>
          </div>

          {error && <p className="text-red-500">{error}</p>}
        </form>
      </div>

      {result && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-2">Simplified Summary</h3>
          <p className="mb-4">{result.summary}</p>

          <h4 className="font-medium">Key Points</h4>
          <ul className="list-disc list-inside mb-4">
            {result.key_points.map((k,i) => <li key={i}>{k}</li>)}
          </ul>

          <h4 className="font-medium">Original Extract</h4>
          <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded mt-2">{result.original_extract}</pre>
        </div>
      )}

      <div className="card mt-6">
        <h4 className="font-medium mb-2">Deployment & Demo</h4>
        <ol className="list-decimal list-inside text-sm">
          <li>Run <code>npm install</code> and <code>npm run dev</code>.</li>
          <li>Set <code>OPENAI_API_KEY</code> in your environment if you want improved summaries.</li>
          <li>Push to GitHub and import to Vercel. In Vercel, add the OPENAI_API_KEY env var.</li>
        </ol>
      </div>

      <footer className="text-xs text-gray-500 mt-6">NOTE: For production, use a dedicated OCR/API service for reliability and multi-page PDFs.</footer>
    </div>
  )
}
