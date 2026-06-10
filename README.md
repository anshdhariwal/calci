# calci 🧮

> Scan your result sheet. Verify the grades. Get your SGPA. Done.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-▶%20Try%20CALCI-3B82F6?style=for-the-badge)](https://anshdhariwal.github.io/calci/)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![OCR.Space](https://img.shields.io/badge/OCR.Space-API-FF6B35?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)

Intelligent semester grade calculator and result parser. Crop a photo of your result sheet, let the browser read it, fix anything it missed, and get your SGPA, all without your data touching a server.

---

> [!NOTE]
> **OCR currently uses the OCR.Space API** — your cropped image is sent to their server for processing. SGPA calculation, result verification, and report card export still run entirely in your browser. This is a temporary setup while Tesseract.js is being reconfigured for client-side use.

---

## what it does

- Crop and scan grade sheet photos using browser-based character recognition
- Edit and verify extracted grades in a dynamic, editable results table
- Calculate SGPA from the verified data
- Export a customized report card image to download or share
- Like button powered by CounterAPI with local duplicate prevention


## how we process data

- **OCR pipeline**: cropped image is converted to Base64 and sent to OCR.Space API with table detection enabled
- **Column mapping**: automatically detects subject, credit, and grade columns by scanning headers, supports multiple university result formats
- **Grade normalization**: corrects common OCR misreads before they reach the calculator (e.g. `8` to `B`, `B4` to `B+`, `A4` to `A+`)
- **Credit normalization**: handles comma-for-decimal misreads and maps values like `15` to `1.5`
- **Cleanup**: strips course codes and performance labels like `Outstanding` or `Very Good` from extracted rows
- **Timeout protection**: requests abort after 15 seconds with a retry prompt rather than a silent hang


## technical stack

- `React` and `Vite` for the interface
- `OCR.Space API` for server-side OCR (temporarily replacing Tesseract.js)
- `Framer Motion` for animations
- `Canvas API` for report card image generation


## components and structure

- **Root Info Button**: stands independent from the navbar to prevent unnecessary re-renders
- **Like Button**: uses `CounterAPI` to track total likes with localStorage duplicate prevention
- **Custom Crop Tool**: precise crop selection with responsive touch support
- **Unified Likes State**: lifted to navbar to synchronize desktop and mobile counters in real time


## animations

- **Smooth loading paint**: deferment timeout lets the browser paint layouts and spin the CSS loader before WebAssembly executes
- **Shiny text loop**: seamless infinite looping background gradients
- **Spring transitions**: physics-based springs for layout entry and exit


## local setup

Clone and install:

```bash
git clone https://github.com/anshdhariwal/calci.git
cd calci
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

> [!WARNING]
> OCR requires an API key. Create a `.env` file in the project root and add:
> ```
> VITE_OCR_SPACE_KEY=your_key_here
> ```
> Get a free key at [ocr.space/OCRAPI](https://ocr.space/OCRAPI). Without it, scanning will fail with a missing key error.


## contributing

PRs are welcome. Open an issue first if you're changing something significant.

1. Fork the repo
2. Create a branch: `git checkout -b feature/thing`
3. Commit: `git commit -m 'feat: add thing'`
4. Push: `git push origin feature/thing`
5. Open a pull request


## contributors

Crafted by [`@anshdhariwal`](https://github.com/anshdhariwal) and [`@jigyasaphogat`](https://github.com/jigyasaphogat) with 💕
