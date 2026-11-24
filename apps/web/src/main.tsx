import React from "react";
import { createRoot } from "react-dom/client";
import "./nocturne-theme.css";
import { App } from "./App";

if (
  typeof window !== "undefined" &&
  window.location.hostname !== "127.0.0.1" &&
  window.location.hostname !== "localhost"
) {
  const lanApiOrigin = `${window.location.protocol}//${window.location.hostname}:8000`;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === "string") {
      const rewritten = input.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000/i, lanApiOrigin);
      return originalFetch(rewritten, init);
    }
    if (input instanceof URL) {
      const rewritten = input.toString().replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000/i, lanApiOrigin);
      return originalFetch(rewritten, init);
    }
    return originalFetch(input, init);
  };
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

