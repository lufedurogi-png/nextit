module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#FF8000',
                    hover: '#e67300',
                    soft: 'rgba(255, 128, 0, 0.12)',
                },
                /** Fondos tienda (oscuro): gris carbón, menos “negro puro” */
                tienda: {
                    canvas: '#1c1c1c',
                    elevated: '#262626',
                    sidebar: '#202020',
                },
            },
            keyframes: {
                'loading-bar': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(350%)' },
                },
            },
            animation: {
                'loading-bar': 'loading-bar 0.8s ease-in-out infinite',
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
