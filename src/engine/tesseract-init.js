let worker = null

export async function initTess(log, prog) {
  if (worker) return worker

  log?.('Loading Tesseract OCR engine...')

  if (!window.Tesseract) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = () => reject(new Error('Tesseract failed to load. Check internet.'))
      document.head.appendChild(script)
    })
  }

  worker = await window.Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        prog?.(55 + Math.round(m.progress * 35), 'OCR in progress...')
      }
    },
  })

  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
  })

  log?.('Tesseract ready', 'ok')
  return worker
}

export function getWorker() {
  return worker
}
