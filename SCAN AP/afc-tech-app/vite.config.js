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
    host:true,
    proxy:{
      "/api":{
        target:"http://192.168.1.167:5000",
        changeOrigin:true,
        secure:false,
      },
    },
  },
})
