import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: false,
  splitting: false,
  shims: false,
  // Skill markdown is bundled into the binary so `sinas init` can drop the
  // skills into any repo without network access or extra package files.
  loader: { '.md': 'text' },
});
