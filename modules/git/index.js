import { add, mul } from './lib/math-utils.js';

export async function init() {
  const sum = add(2, 3);
  const product = mul(4, 5);
  console.log('Sum:'+ sum);
  process.send(JSON.stringify({ type: "registerRoute", id: "gitRoute", path: "/git" }));
  process.send(JSON.stringify({ type: "log", message: "Git module initialized" }));
}

export async function handleHttpRequest(msg) {
  return JSON.stringify({ status: 200, output: "Git module active" });
}

export async function ping() {
  process.send(JSON.stringify({ type: "log", message: "ping" }));
}

export const commands = {
  clone: (repo) => new Promise((resolve, reject) => {
    child_process.exec(`git clone ${repo}`, (err, stdout, stderr) => {
      if (err) reject(stderr); else resolve(stdout);
    });
  }),
  status: () => new Promise((resolve, reject) => {
    child_process.exec("git status", (err, stdout, stderr) => {
      if (err) reject(stderr); else resolve(stdout);
    });
  })
};

global.init = init;
global.ping = ping;
global.handleHttpRequest = handleHttpRequest;
