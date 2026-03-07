import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA + Push
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((reg) => console.log('SW registered:', reg.scope))
    .catch((err) => console.log('SW registration failed:', err));
}

createRoot(document.getElementById("root")!).render(<App />);
