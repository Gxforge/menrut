import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 plugins:[react(),tailwindcss()],
 resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
 build:{outDir:'build',emptyOutDir:true,target:'es2022',chunkSizeWarningLimit:260},
 server:{host:'0.0.0.0',port:5173,allowedHosts:true,proxy:{'/api':{target:'http://127.0.0.1:8788',changeOrigin:false}}},
});
