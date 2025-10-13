
import express from "express";
import ReactDOMServer from "react-dom/server";
import { ModuleManager } from "./loader.js";
import App from "./views/App/index.jsx";
import { Writable } from 'stream';
const app = express();
app.use(express.json());

app.use("/", express.static("dist/client"));

// Function returns a writable that collects chunks and inserts them into a part
const scopedWritable = (res, before, after) => {
  let firstChunk = true;

  return new Writable({
    write(chunk, encoding, callback) {
      if (firstChunk) {
        res.write(before); // write opening HTML once
        firstChunk = false;
      }
      res.write(chunk); // stream React chunk immediately
      callback();
    },
    final(callback) {
      res.write(after); // closing HTML after stream ends
      callback();
    }
  });
}

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    const partialWritable = scopedWritable(res, '<!DOCTYPE html><html><head><title>SSR</title></head><body><div id="root">', '</div></body></html>');

    const { pipe } = ReactDOMServer.renderToPipeableStream(<App />, {
        bootstrapScripts: ['/client.js'],
        onShellReady() {
            res.statusCode = 200;
            pipe(partialWritable);
            // res.write(pa)
        },
        onAllReady() {
            console.log("Finished react stream")
            res.end();
        },
        onError(err) {
            console.error(err);
            res.statusCode = 500;
            res.send("<h1>Internal Server Error</h1>");
        },
    });
})

const manager = new ModuleManager(app);
await manager.discoverAndStart();

app.listen(8000, "0.0.0.0", () => console.log("Maitre running at http://localhost:8000"));
