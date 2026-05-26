import { useRef, useCallback } from 'react'

function DropZone({ onLoad }) {
  const pick = useRef(null)

  const load = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => onLoad(img)
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }, [onLoad])

  return (
    <div className="input-area">
      <label>Upload a marksheet or grade table image</label>
      <input
        ref={pick}
        type="file"
        accept="image/*"
        onChange={(e) => { if (e.target.files[0]) load(e.target.files[0]) }}
      />
    </div>
  )
}

export default DropZone
