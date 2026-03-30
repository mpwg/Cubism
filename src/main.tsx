import "@fontsource-variable/rubik/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/three/configureThree";
import { App } from "@/app/App";
import "@/styles.css";
import "@/pwa/register";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root-Element #root wurde nicht gefunden.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
