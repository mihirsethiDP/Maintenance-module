// Build config for the STATIC Tailwind CSS shipped as tailwind.css.
// This replaces the Play CDN (<script src="https://cdn.tailwindcss.com">),
// which compiled CSS at runtime in the browser: one poisoned service-worker
// cache entry on plant Wi-Fi and every Tailwind class on the page silently
// died. Build with:  npx tailwindcss@3 -i tw-input.css -o tailwind.css --minify
module.exports = {
  content: ['./index.html', './app.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        brand: {
          DEFAULT: '#193458',
          50:  '#f1f4f9',
          100: '#dde4ee',
          200: '#bac9dc',
          500: '#3d5a83',
          600: '#26456e',
          700: '#193458',
          800: '#132846',
          900: '#0d1c33',
        }
      }
    }
  }
};
