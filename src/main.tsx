import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";

// Apply saved theme immediately to avoid flash
const savedTheme = localStorage.getItem("shell-theme") || "dark";
const applyTheme = (themeSetting: string) => {
  let actualTheme = themeSetting;
  if (themeSetting === "system") {
    actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (actualTheme === "light") {
    document.documentElement.classList.add("light-theme");
    document.body.style.backgroundColor = "#f5f5f5";
    document.body.style.color = "#1e1e1e";
  }
};
applyTheme(savedTheme);

// Apply saved accent color
const savedAccent = localStorage.getItem("shell-accent-color");
if (savedAccent) {
  document.documentElement.style.setProperty("--accent-color", savedAccent);
  const hex = savedAccent.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  document.documentElement.style.setProperty("--accent-color-rgb", `${r}, ${g}, ${b}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
