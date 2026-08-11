import './style.css';
import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ThemeProvider } from "@/src/components/theme-provider"

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
