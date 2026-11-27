# Mikro Fraktal — MVP

React + Vite browser fractal explorer. MVP includes Mandelbrot/Julia rendering via a Web Worker, interactive zoom, Julia parameter controls, iterations, simple palettes, saved explorations (local storage), and PNG export.

## Run

```bash
npm install
npm run dev
```

## Notes / limitations
- Current MVP implements Mandelbrot and Julia only; Burning Ship, Tricorn, Newton, IFS/L-systems and 3D fractals are not included.
- Pan, selection zoom, deep-zoom precision, progressive/tiled render scheduling, palette editing, animations, and gallery metadata sidecars are future work.
- Worker keeps computation off the main UI thread; a new render terminates the previous one.
- Rendering uses standard JS floating point, so extreme zooms are limited.
- PNG export is the canvas result at the current render dimensions; larger export presets are not yet implemented.
- Saved presets are stored locally in the browser.
