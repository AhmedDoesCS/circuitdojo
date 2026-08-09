import { cp, access } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Ship the manual with the app.
 *
 * Vite builds the entry HTML and whatever that imports. The manual is nine
 * hand-written pages that nothing imports, so it was simply absent from the
 * build and every link into it would have 404'd on a deployed site.
 *
 * Copying rather than adding nine more Vite inputs, because these pages want
 * no bundling: they are plain HTML with one stylesheet and one script, all
 * referenced relatively, so they work unchanged under any base path.
 */
function publishManual() {
  return {
    name: 'publish-manual',
    apply: 'build',
    async closeBundle() {
      try {
        await access('docs');
      } catch {
        return;
      }
      await cp('docs', 'dist/docs', { recursive: true });
      this.info('manual copied to dist/docs');
    },
  };
}

export default defineConfig({
  plugins: [react(), publishManual()],
  /**
   * Where the built site will be served from.
   *
   * Almost every host serves from the domain root, which is the default and
   * needs no configuration. The exception is a host that puts the site in a
   * subdirectory, such as a GitHub Pages project site at /<repository>/: there
   * every asset URL needs that prefix, or the page loads and then fetches its
   * JavaScript from the wrong path. Set BASE_PATH at build time for those.
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
