
import { fork } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export class ModuleManager {
    constructor(app) {
        this.app = app;
        this.modules = new Map();
        this.routes = new Map();
    }

    async discoverAndStart() {
        console.log("Calling discover and start");
        const moduleRoot = path.resolve(__dirname, "../modules");
        const entries = fs.readdirSync(moduleRoot, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                await this.loadModule(entry.name, path.join(moduleRoot, entry.name));
            }
        }
    }

    async loadModule(name, modPath) {
        console.log("Loading module", { name, modPath });
        const workerPath = path.resolve("./src/module-worker.js");
        const worker = fork(workerPath, [modPath], {
            execArgv: ["--experimental-specifier-resolution=node"],
            stdio: ["pipe", "pipe", "pipe", "ipc"]
        });

        worker.stdout.on("data", (d) => process.stdout.write(d));
        worker.stderr.on("data", (d) => process.stderr.write(d));
        worker.on("exit", (c) => console.log("child exited", c));
        worker.on("error", (e) => console.log("child error", e));

        this.modules.set(name, worker);

        worker.on("message", (msg) => {
            if (msg.type === "registerRoute") {
                console.log(`Registering route ${msg.path} from module ${name}`);
                this.routes.set(msg.id, { module: name, path: msg.path, worker });
                // this.routes.set(msg.id, { module: name, path: msg.path });
            } else if (msg.type === "log") {
                console.log(`[${name}]`, msg.message);
            }
        });

        // route proxy
        this.app.use(async (req, res, next) => {
            for (const [id, route] of this.routes.entries()) {
                if (req.path.startsWith(route.path)) {
                    const response = await this.send(route.worker, {
                        type: "httpRequest",
                        routeId: id,
                        method: req.method,
                        path: req.path,
                        body: req.body
                    });
                    if (!response) return res.status(500).send("Module error");
                    return res.status(response.status || 200).send(response.output);
                }
            }
            next();
        });
        console.log("Sending init message from main process");
        worker.send({ type: "init" });
    }

    send(worker, message) {
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            const listener = (msg) => {
                if (msg.id === id) {
                    console.log("send received response", msg)
                    worker.off("message", listener);
                    resolve(msg);
                }
            };
            worker.on("message", listener);
            worker.send({ id, ...message });
        });
    }
}
