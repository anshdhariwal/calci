let ready = false
let pending = null

export function cvOk() {
  return ready
}

export function loadCV(log) {
  if (pending) return pending

  pending = new Promise((resolve) => {
    if (typeof cv !== 'undefined' && cv.Mat) {
      log?.('OpenCV.js ready', 'ok')
      ready = true
      resolve(true)
      return
    }

    const s = document.createElement('script')
    s.src = 'https://docs.opencv.org/4.8.0/opencv.js'
    s.async = true

    s.onload = () => {
      const wait = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.Mat) {
          clearInterval(wait)
          log?.('OpenCV.js ready', 'ok')
          ready = true
          resolve(true)
        }
      }, 50)

      setTimeout(() => {
        clearInterval(wait)
        if (!ready) {
          log?.('OpenCV timed out, using canvas fallback', 'warn')
          resolve(false)
        }
      }, 15000)
    }

    s.onerror = () => {
      log?.('OpenCV failed to load, using canvas fallback', 'warn')
      resolve(false)
    }

    document.head.appendChild(s)
  })

  return pending
}
