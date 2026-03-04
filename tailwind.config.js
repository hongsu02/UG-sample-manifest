/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'psomagen-blue': '#0A3D91',
                'psomagen-slate': '#475569',
            }
        },
    },
    plugins: [],
}
