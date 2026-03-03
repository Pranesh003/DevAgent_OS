Remove-Item -Recurse -Force frontend
npx create-vite frontend --template react-ts
Set-Location frontend
npm install
npm install react-router-dom axios zustand lucide-react framer-motion react-hot-toast react-syntax-highlighter clsx tailwind-merge
npm install -D tailwindcss @tailwindcss/vite
