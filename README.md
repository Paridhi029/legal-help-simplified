# Legal Help Simplified — Complete Prototype (Client-side PDF + Tesseract OCR + OpenAI Summaries)

This repository is a complete working prototype you can run locally and deploy to Vercel for demo purposes. It converts **PDF first page → image** in the browser (no PDF server work), runs OCR in the serverless API using **Tesseract.js**, and optionally sends the extracted text to **OpenAI** for better summarization if `OPENAI_API_KEY` is set.

## Key features
- Upload images (.png/.jpg/.jpeg), PDFs (first page converted in-browser), or .txt files.
- Server API performs OCR using `tesseract.js` and attempts OpenAI summarization when API key present.
- Tailwind-based responsive UI with preview and results panel.
- Placeholder screenshots in `/public/screenshots` for slides.

## Run locally
1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file or set environment variable (optional for OpenAI):
```
OPENAI_API_KEY=your_openai_key_here
```

3. Run dev server:
```bash
npm run dev
```

4. Visit http://localhost:3000

## Push to GitHub & Deploy to Vercel (quick commands)
```bash
git init
git add .
git commit -m "Initial prototype: OCR + summarization + UI"
# Create a repo on GitHub (manually or using gh CLI). Then:
git branch -M main
git remote add origin https://github.com/<your-username>/legal-help-simplified.git
git push -u origin main
```

Then go to https://vercel.com/import and import the repository. Set the environment variable `OPENAI_API_KEY` in Vercel Dashboard if you want OpenAI summaries. Vercel should auto-detect Next.js and deploy.

## Notes on production readiness
- Tesseract.js in serverless functions is okay for demos but may be slow or hit memory/time limits. For reliable production:
  - Use Google Cloud Vision / AWS Textract for OCR, OR
  - Run Tesseract on a dedicated server (Render, EC2) and send files there.
- For multi-page PDFs, convert pages server-side (e.g., with `pdf-poppler` or `imagemagick`) and iterate OCR per page.

## Files added/changed
- Client-side PDF-to-image conversion implemented in `pages/index.js`
- `.env.example` added
- Placeholder screenshots in `public/screenshots/`
- README extended with git & deploy commands

