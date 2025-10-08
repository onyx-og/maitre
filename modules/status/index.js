export async function init() {
  console.log("Executing init")
  process.send(JSON.stringify({ type: "registerRoute", id: "statusRoute", path: "/status" }));
  process.send(JSON.stringify({ type: "log", message: "Status module loaded" }));
}

export async function test() {
   process.send(JSON.stringify({ type: "log", message: "Test succeeded" }));
}

export async function handleHttpRequest(msg_) {
  process.send(JSON.stringify({ type: "log", message: "Executing handleHttpRequest"  }));
  const msg = JSON.parse(msg_)
  if (msg.routeId === "statusRoute") {
    const data = await commands["status.json"]();
    //process.send(JSON.stringify({ id: msg.id, type: "log", data:  JSON.stringify(data)}));
    if (msg.path.endsWith(".json")) {
      return process.send(JSON.stringify({ id: msg.id, status: 200, output: JSON.stringify(data, null, 2) }));
    }
    return process.send(JSON.stringify({
      id: msg.id,
      status: 200,
      output: `
        <html>
          <head><title>Status</title></head>
          <body>
            <h1>System Status</h1>
            
            <p>Memory used: ${(data.memory.used / 1024 / 1024).toFixed(2)} MB</p>
            <p>Uptime: ${(data.uptime / 3600).toFixed(2)} h</p>
          </body>
        </html>`
    }));
  }
  return process.send(JSON.stringify({ id: msg.id, status: 404, output: "Not found" }));
}

export const commands = {
  "status.json": async () => ({
    cpu: os.loadavg(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    },
    uptime: os.uptime()
  })
};

global.test = test;

global.init = init;
global.handleHttpRequest = handleHttpRequest;