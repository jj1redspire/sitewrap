import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sw: {
          amber: "#EA580C",
          charcoal: "#1C1917",
          success: "#16A34A",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1100px",
      },
    },
  },
  plugins: [],
};
export default config;
