import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

const Preview = forwardRef(function Preview({ image }, ref) {
  const el = useRef(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => el.current,
  }))

  useEffect(() => {
    if (!image || !el.current) return
    const c = el.current
    c.width = image.width
    c.height = image.height
    c.getContext('2d').drawImage(image, 0, 0)
  }, [image])

  if (!image) return null

  return <canvas ref={el} style={{ width: '100%', maxHeight: 300, border: '1px solid #222' }} />
})

export default Preview
