
export async function init() {
  console.log("Executing init")
  process.send(JSON.stringify({ type: "registerRoute", id: "publicIP", path: "/publicIP" }));
  process.send(JSON.stringify({ type: "log", message: "PublicIP module loaded" }));
}

const fetchServerInfo = async () => {
    console.log("Executing fetc")
    const response = await fetch("https://ipinfo.io/json", "json");
    return response
}

export const ping = () => {
  process.send(JSON.stringify({ type: "ping", message: "pong" }));
}

export async function handleHttpRequest(msg_) {
    const msg = JSON.parse(msg_)
    const data = await fetchServerInfo()
    return process.send(JSON.stringify({ id: msg.id, status: 200, output: data }));
}

global.init = init;
global.ping = ping;
global.handleHttpRequest = handleHttpRequest;