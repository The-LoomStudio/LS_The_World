import { build } from 'esbuild'

await build({
  entryPoints: ['src/client/index.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/client.js',
  sourcemap: false,
  legalComments: 'none',
  loader: { '.css': 'text' },
})
