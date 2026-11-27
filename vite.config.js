import { defineConfig } from 'vite';

// Relative asset paths allow the build to work both at a domain root
// and under a GitHub Pages repository path (/<repository>/).
export default defineConfig({
  base: './',
});
