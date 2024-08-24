/** @type {import('vite').UserConfig} */
export default {
  build: {
    outDir: "./dist/lib",
    copyPublicDir: false,
    lib: {
      entry: "cognate.js",
      name: "cognate.js",
      fileName: "cognate",
    },
    rollupOptions: {
      external: ['@codemirror/autocomplete', 'web-tree-sitter'],
      output: {
        globals: {
          '@codemirror/autocomplete': 'snippetCompletion',
          'web-tree-sitter': 'TreeSitter',
        },
      }
    }
  }
}
