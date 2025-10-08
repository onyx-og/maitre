
import express from "express";
import { ModuleManager } from "./loader.js";

const app = express();
app.use(express.json());

const manager = new ModuleManager(app);
await manager.discoverAndStart();

app.listen(8000, "0.0.0.0", () => console.log("Maitre running at http://localhost:8000"));
