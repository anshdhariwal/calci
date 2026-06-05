# calci

Intelligent semester grade calculator and result parser.

Live at: [`Github Pages`](https://anshdhariwal.github.io/calci/)

* 100 percent client side result parsing with no data logging
* Crop and scan grade sheet photos using browser character recognition
* Edit and verify grades dynamically in an editable results table
* Export a customized report card image to download or share

## how we process data

* Client Side Processing: All image parsing and calculations run directly in your browser. Your result sheet never touches any external server.
* Pre Processing: Canvas API adjusts contrast and rescales images to optimize character clarity before OCR.
* Table Reconstruction: Analyzes word coordinates to group extracted text into logical rows and columns.
* Cleanups: Automatically filters out course codes and extra performance labels.

## technical stack

* `React` and `Vite` for the interface
* `Tesseract.js` for client side character recognition
* `Framer Motion` for animations
* `Canvas API` for report card image generation

## components and structure

* Root Info Button: Stands independent from the navbar to prevent unnecessary re renders.
* Like Button: Uses `CounterAPI` to track total likes with localStorage duplicate prevention.
* Custom Crop Tool: Provides precise crop selection with responsive touch support.
* Unified Likes State: Lifted to the navbar to synchronize desktop and mobile counters in real time.

## animations

* Smooth Loading Paint: Deferment timeout allows the browser to paint layouts and spin the CSS loader before WebAssembly executes.
* Shiny Text loop: Seam free infinite looping background gradients.
* Spring Transitions: Physics based springs for layout entry and exit.

## local setup

Clone the repository and install dependencies:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## contributors

Crafted by [`@anshdhariwal`](https://github.com/anshdhariwal) and [`@jigyasaphogat`](https://github.com/jigyasaphogat) with love
