/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#101720',
        panelSoft: '#162231',
        accent: '#62ffd3',
        accentWarm: '#ffb562',
        ink: '#e6f1ff',
        mute: '#8ca5bf',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(98,255,211,0.2), 0 24px 64px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        mesh:
          'radial-gradient(circle at top left, rgba(98,255,211,0.15), transparent 30%), radial-gradient(circle at top right, rgba(255,181,98,0.12), transparent 26%), linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
