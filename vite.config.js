import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'fs';
import { resolve } from 'path';

/** Copy folders referenced by string paths (not Vite imports) into dist/ */
function copyStaticDirs(dirs) {
  return {
    name: 'copy-static-dirs',
    closeBundle() {
      const outDir = resolve('dist');
      for (const dir of dirs) {
        const src = resolve(dir);
        const dest = resolve(outDir, dir);
        if (existsSync(src)) {
          cpSync(src, dest, { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  plugins: [copyStaticDirs(['sounds', 'onlinesounds', 'img'])],
});
