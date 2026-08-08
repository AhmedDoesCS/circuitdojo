import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /**
   * Where the built site will be served from.
   *
   * A GitHub Pages project site lives at /<repository>/, not at the domain
   * root, so every asset URL needs that prefix or the page loads and then
   * fetches its JavaScript from the wrong path. The deploy workflow sets
   * BASE_PATH; everything else (dev server, local preview, a custom domain)
   * keeps the root and needs no configuration.
   */
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173,
    open: true,
    /**
     * Fail if 5173 is taken. Do not quietly move to 5174.
     *
     * Browser storage is scoped to the *origin*, and the port is part of the
     * origin, so `localhost:5174` is a different website from
     * `localhost:5173` as far as localStorage is concerned, with its own empty
     * store. Vite's default is to increment the port on a collision, which
     * silently hands you a blank profile and looks exactly like data loss.
     *
     * A "port already in use" error is the correct behaviour here: it is one
     * stale `npm run dev` away from fixed, and it never costs anyone progress.
     */
    strictPort: true,
  },
});
