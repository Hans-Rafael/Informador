/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTA: Acá le decimos a Tailwind qué carpetas deben buscar lod estilos.
  // Las pantallas van a estar en la carpeta "./app"
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
