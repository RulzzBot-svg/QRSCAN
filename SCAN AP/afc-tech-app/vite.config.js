import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from "vite-plugin-mkcert";



// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    mkcert()
  ],
  server:{
    htpps:true,
    host:true,
    port:5173,
  },
})
