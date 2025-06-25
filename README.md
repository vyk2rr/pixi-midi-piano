### 🎹 pixijs-vs-react-draft

A minimal interactive piano built with PixiJS and Tone.js.
It receives MIDI input (or clicks), processes it, and plays sound.

### Why PixiJS?
After struggling with React re-renders for 15 days, I rebuilt the same logic in PixiJS in under 30 minutes.
The result:

- No unnecessary re-renders
- Real-time performance
- Smooth integration with Tone.js
- Works with MIDI or mouse input
- This is just a draft, not a polished product.

### 🔧 How it works

MIDI / Click → App → Tone.js → Sound

### 🚀 Getting Started

Install dependencies
`npm install`

Run the app
`npm run dev`

Then open `http://localhost:5173` in your browser.

### 🧰 Tech Stack

- PixiJS – GPU-accelerated rendering
- Tone.js – Audio synthesis
- Vite – Dev/build tool
- Custom MIDI input – Plug and play

### ⚠️ Disclaimer

This is a quick experiment for learning and prototyping.
It’s not production-ready — but it works.