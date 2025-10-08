import ivm from 'isolated-vm';
import fs from 'fs';
import path from 'path';
import os from "os";
import chalk from 'chalk';
chalk.level = 3; 
const modPath = process.argv[2];
if (!modPath) {
    console.error(`${chalk.red('[isolated]')} No module path provided`);
    process.exit(1);
}

console.log(`${chalk.green('[worker]')} started for module:`, modPath);

// Read module code
let code;
try {
    const modEntry = path.join(modPath, "index.js");
    code = fs.readFileSync(modEntry, 'utf-8');
} catch (err) {
    console.error(`${chalk.red('[isolated]')} failed to read module:`, err);
    process.exit(1);
}

// Create isolate with 8 MB memory limit
const isolate = new ivm.Isolate({ memoryLimit: 8 });
const context = await isolate.createContext();
const jail = context.global;
await jail.set('global', jail.derefInto());

const parseJSONSafe = (...args) => {
    return args
        .map(arg => {
            if (typeof arg !== "string") return null; // discard non-strings
            try {
                return JSON.parse(arg); // parse valid JSON
            } catch (e) {
                return arg; // discard unparseable
            }
        })
        .filter(arg => arg !== null); // remove discarded
}

const injected = {
    "console.log": new ivm.Reference((...args) =>
        console.log(`${chalk.cyan('[isolated]')}`, parseJSONSafe(...args))
    ),
    "process.send": new ivm.Reference((msg) => {
        const msg_ = parseJSONSafe(msg)[0]
        console.log(`${chalk.cyan('[isolated, process.send]')} `, msg_)
        process.send(msg_);
    }),
    'fetch': new ivm.Reference((url, type, config = {}) => (
        new Promise((resolve, reject) => {
            fetch(url, config)
                .then((res) => res[type || 'text']())
                .then(obj => resolve(new ivm.ExternalCopy(obj).copyInto()))
                .catch(reject);
        })
    )),
};

await jail.set("injected", new ivm.ExternalCopy(injected).copyInto());

await context.eval(`
  for (const [key, fnRef] of Object.entries(global.injected)) {
    const parts = key.split(".");
    let target = global;
    for (let i = 0; i < parts.length; i++) {
      if (i == 0 && i === (parts.length -1)) {
        // parts is composed of only 1 part
        // and this is the first iteration
        if (target[parts[i]] === undefined) {
          target[parts[i]] = target[parts[i]] = (args) => fnRef.applySyncPromise(undefined, [args]);
        } // else avoid overriding current value
      } else if (i === 0) {
        // this is the first iteration (= first part) of more to come
        if (target[parts[i]] === undefined) {
          target[parts[i]] = {};
        } // else avoid overriding current value
      } else if (i !== (parts.length -1)) {
        // this is not the first part nor the last one
        if (target[parts[i]] === undefined) {
          target[parts[i]] = {};
        } // else avoid overriding current value
      } else {
        // this should be the last part
        target[parts[i]] = (args) => fnRef.applySyncPromise(undefined, [args]);
      }
      target = target[parts[i]];
    }
  }
`);

const callbacks = {
    "os.loadavg": new ivm.Callback(() => {
        return (new ivm.ExternalCopy(os.loadavg())).copyInto()
    }),
    "os.totalmem": new ivm.Callback(() => {
        return os.totalmem()
    }),
    "os.freemem": new ivm.Callback(() => {
        return os.freemem()
    }),
    "os.uptime": new ivm.Callback(() => {
        return os.uptime()
    }),
}

await jail.set("callbacks", new ivm.ExternalCopy(callbacks).copyInto());

await context.eval(`
  for (const [key, fnCb] of Object.entries(global.callbacks)) {
    const parts = key.split(".");
    let target = global;
    for (let i = 0; i < parts.length; i++) {
      if (i == 0 && i === (parts.length -1)) {
        // parts is composed of only 1 part
        // and this is the first iteration
        if (target[parts[i]] === undefined) {
          target[parts[i]] = target[parts[i]] = (args) => fnCb(args);
        } // else avoid overriding current value
      } else if (i === 0) {
        // this is the first iteration (= first part) of more to come
        if (target[parts[i]] === undefined) {
          target[parts[i]] = {};
        } // else avoid overriding current value
      } else if (i !== (parts.length -1)) {
        // this is not the first part nor the last one
        if (target[parts[i]] === undefined) {
          target[parts[i]] = {};
        } // else avoid overriding current value
      } else {
        // this should be the last part
        target[parts[i]] = (args) => fnCb(args);
      }
      target = target[parts[i]];
    }
  }
`);

let module;

try {
    module = await isolate.compileModule(code, {});
} catch (err) {
    console.error(`${chalk.red('[worker]')} compileModule error:`, err);
    process.exit(1);
}

try {
    await module.instantiate(context, async (specifier, referencingModule) => {
        // Get absolute path of the importing module
        const basePath = path.resolve(referencingModule.filename || modPath);

        // Resolve relative or absolute import specifier
        const depPath = path.resolve(basePath, specifier);

        // 🔒 Optional: enforce sandbox root (so modules can’t import system files)
        const sandboxRoot = path.resolve(modPath)
        if (!depPath.startsWith(sandboxRoot)) {
            throw new Error(`Import outside sandbox not allowed: ${depPath}`);
        }

        // Read and compile the dependency
        const depCode = fs.readFileSync(depPath, "utf8");
        const depModule = await isolate.compileModule(depCode, { filename: depPath });

        // Recursively instantiate dependencies
        await depModule.instantiate(context, async (s, m) => {
            const subPath = path.resolve(path.dirname(m.filename), s);
            const subCode = fs.readFileSync(subPath, "utf8");
            const subModule = await isolate.compileModule(subCode, { filename: subPath });
            await subModule.instantiate(context, async () => {});
            return subModule;
        });

        return depModule;
        // return referencingModule;
    });
} catch (err) {
    console.error(`${chalk.red('[worker]')} instantiate error:`, err);
}

// evaluate module
try {
    await module.evaluate();
    console.log(`${chalk.green('[worker]')} module evaluated`);
} catch (err) {
    console.error(`${chalk.red('[worker]')} evaluate error:`, err);
    process.exit(1);
}

// Handle messages from parent
process.on('message', async (msg) => {
    if (msg.type === 'init') {
        try {
            await context.evalClosure('init()', [], { result: { promise: true } });
            console.log(`${chalk.green('[worker]')} init() completed`);
        } catch (err) {
            console.error(`${chalk.red('[worker]')} init() failed:`, err);
            process.send({ type: 'log', message: `init() failed: ${err.message}` });
        }
    } else if (msg.type === 'httpRequest') {
        try {
            console.log(`${chalk.green('[worker]')} Relaying http request`, { msg });
            await context.evalClosure('handleHttpRequest($0)', [JSON.stringify(msg)], { result: { promise: true } });
        } catch (err) {
            console.error(`${chalk.red('[worker]')} handleHttpRequest failed:`, err);
            process.send({ id: msg.id, status: 500, output: err.message });
        }
    }
});
