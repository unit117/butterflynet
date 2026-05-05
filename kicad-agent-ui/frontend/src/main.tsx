import React from "react";
import { createRoot } from "react-dom/client";
import { PhaseViewer } from "./PhaseViewer";
import "./style.css";
import "./phases.css";
import "./provenance.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PhaseViewer />
  </React.StrictMode>
);
