import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { LlmProvider } from "./context/LlmContext";
import "@xyflow/react/dist/style.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LlmProvider>
      <App />
    </LlmProvider>
  </React.StrictMode>,
);
