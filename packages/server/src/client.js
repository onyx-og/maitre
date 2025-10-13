import React from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./views/App/index.jsx";

hydrateRoot(document.getElementById("root"), <App />);
