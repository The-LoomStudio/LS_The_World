import { build } from 'esbuild'

await build({
  entryPoints: ['src/client/index.js'],
  bundle: true,
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@loom-studio/ui'],
  define: { 'process.env.NODE_ENV': '"production"' },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/client.js',
  sourcemap: false,
  legalComments: 'none',
  loader: { '.css': 'text' },
})
