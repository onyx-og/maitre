#!/usr/bin/env node
import prompts from "prompts";
import { createModule, listRecipeVersions } from "./create-module.js";
import path from "path";
import fs from "fs";

const argv = process.argv.slice(2);

// parse simple args
let moduleName;
const flags: {
    [key: string]: string | true;
} = {};
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
        const key = a.slice(2);
        const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
        flags[key] = val;
        if (val !== true) i++;
    } else if (!moduleName) {
        moduleName = a;
    }
}

(async () => {
    try {
        let name: string = moduleName!;
        let recipe: string = flags.recipe as string;
        let dir: string = flags.dir as string;
        let version: string = flags.version as string;

        // Prompt for module name if missing
        if (!name) {
            const resp = await prompts({
                type: "text",
                name: "name",
                message: "Module name",
                validate: v => v ? true : "Module name cannot be empty"
            });
            name = resp.name;
        }

        // Prompt recipe if missing
        if (!recipe) {
            const resp = await prompts({
                type: "select",
                name: "recipe",
                message: "Choose a recipe template",
                choices: [
                    { title: "typescript", value: "typescript" },
                    { title: "esm", value: "esm" }
                ],
                initial: 0
            });
            recipe = resp.recipe;
        }

        // Determine default dir based on context if dir not provided
        const cwd = process.cwd();
        let defaultDir = `./${name}`;
        try {
            const pkgPath = path.join(cwd, "package.json");
            if (fs.existsSync(pkgPath)) {
                const raw = await fs.promises.readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw || "{}");
                if (pkg && pkg.name === "@maitre-d/server") {
                    defaultDir = path.join("modules", name);
                }
            }
        } catch (e) {
            // ignore
        }

        if (!dir) {
            const resp = await prompts({
                type: "text",
                name: "dir",
                message: "Target directory",
                initial: defaultDir
            });
            dir = resp.dir as string;
        }

        // If version not provided, fetch versions via GitHub and prompt the user
        if (!version) {
            try {
                const versions = await listRecipeVersions(recipe);
                if (versions.length === 0) {
                    const resp = await prompts({
                        type: "text",
                        name: "version",
                        message: "No versions found; enter version or 'latest'",
                        initial: "latest"
                    });
                    version = resp.version;
                } else {
                    const choices = versions.map(v => ({ title: v.label, value: v.label }));
                    // add a 'latest' alias as first option
                    choices.unshift({ title: `latest (${versions[0].label})`, value: "latest" });
                    const resp = await prompts({
                        type: "select",
                        name: "version",
                        message: "Choose a version",
                        choices,
                        initial: 0
                    });
                    version = resp.version;
                }
            } catch (e) {
                console.warn("Warning: failed to fetch versions from remote. Falling back to 'latest'.");
                version = "latest";
            }
        }

        // If all parameters were supplied via CLI flags and positional name, show summary confirmation
        const allProvided = moduleName && flags.recipe && flags.dir && flags.version;
        if (allProvided) {
            const resp = await prompts({
                type: "confirm",
                name: "confirm",
                message: `Proceed with: name=${moduleName}, recipe=${flags.recipe}, dir=${flags.dir}, version=${flags.version}?`,
                initial: true
            });
            if (!resp.confirm) {
                console.log("Aborted.");
                process.exit(0);
            }
        }

        await createModule(name, recipe, dir, version);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
