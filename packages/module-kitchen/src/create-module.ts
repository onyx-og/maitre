import fs from "fs";
import path from "path";
import tar from "tar";
import semver from "semver";
import { Readable } from "stream";

const RECIPE_REPO: {
    [key: string]: { owner: string, repo: string, prefix: string}
} = {
    // recipe -> { owner, repo, prefix }
    typescript: { owner: "onyx-og", repo: "maitre-module-recipes", prefix: "typescript-" },
    esm: { owner: "onyx-og", repo: "maitre-module-recipes", prefix: "esm-" }
};

const fetchReleases = async (owner: string, repo: string) => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const headers: Headers = new Headers;
    headers.append( "Accept", "application/vnd.github.v3+json")
    if (process.env.GITHUB_TOKEN) {
        headers.append('Authorization', `token ${process.env.GITHUB_TOKEN}`);
    }
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
        throw new Error(`Failed to query GitHub API: ${res.status} ${res.statusText}`);
    }
    return await res.json();
}

const collectCandidates = (releases: {
    assets: {
        name: string,
        browser_download_url: string
    }[]
}[], prefix: string) => {
    const candidates = [];
    for (const rel of releases) {
        if (!rel.assets) continue;
        for (const asset of rel.assets) {
            if (!asset.name) continue;
            if (!(asset.name.startsWith(prefix) && (asset.name.endsWith('.tar.gz') || asset.name.endsWith('.tgz')))) continue;
            const m = asset.name.match(/(?:-|_)(v?\d+\.\d+\.\d+)/);
            const ver = m ? m[1] : null;
            candidates.push({ asset, version: ver });
        }
    }
    return candidates;
}

export const listRecipeVersions = async (recipe: string) => {
    if (!RECIPE_REPO[recipe]) throw new Error(`Unknown recipe: ${recipe}`);
    const { owner, repo, prefix } = RECIPE_REPO[recipe];
    const releases = await fetchReleases(owner, repo);
    const candidates = collectCandidates(releases, prefix);
    // Map unique versions
    const map = new Map();
    for (const c of candidates) {
        const semver_ = semver.coerce(c.version);
        const verNorm = c.version ? (semver_ ? semver_.version : null) : null;
        const label = c.version || c.asset.name;
        if (!map.has(label)) {
            map.set(label, { label, version: verNorm, downloadUrl: c.asset.browser_download_url, assetName: c.asset.name });
        }
    }
    // convert to array and sort by semver if possible
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
        if (a.version && b.version) {
            return semver.rcompare(a.version, b.version);
        } else if (a.version) return -1;
        else if (b.version) return 1;
        return a.label.localeCompare(b.label);
    });
    return arr;
}

export const createModule = async (moduleName: string, recipe: string, targetDir: string, version: string) => {
    if (!RECIPE_REPO[recipe]) {
        throw new Error(`Unknown recipe "${recipe}". Available: ${Object.keys(RECIPE_REPO).join(", ")}`);
    }

    const cwd = process.cwd();
    const finalTarget = path.resolve(cwd, targetDir);

    if (fs.existsSync(finalTarget)) {
        throw new Error(`Target directory already exists: ${finalTarget}`);
    }

    fs.mkdirSync(finalTarget, { recursive: true });

    const { owner, repo, prefix } = RECIPE_REPO[recipe];

    const releases = await fetchReleases(owner, repo);
    const candidates = collectCandidates(releases, prefix);
    if (candidates.length === 0) {
        throw new Error(`No release assets found for recipe "${recipe}" in ${owner}/${repo}`);
    }

    // choose asset based on version input
    let chosen = null;
    if (version && version !== 'latest') {
        // try to match by exact version token or coercion
        const semver_ = semver.coerce(version);
        const normRequested = semver_ ? semver_.version : null;
        for (const c of candidates) {
            const candidateVer = c.version ? (semver_ ? semver_.version : null) : null;
            if (candidateVer && normRequested && semver.eq(candidateVer, normRequested)) {
                chosen = c;
                break;
            }
            // also try if asset name contains raw version string
            if (version && c.asset.name.includes(version)) {
                chosen = c;
                break;
            }
        }
        if (!chosen) {
            throw new Error(`Requested version "${version}" not found for recipe "${recipe}"`);
        }
    } else {
        // pick latest semver if possible, otherwise first
        const withVer = candidates.filter(c => c.version && semver.coerce(c.version));
        if (withVer.length > 0) {
            withVer.sort((a, b) => {
                const semverA = semver.coerce(a.version);
                const semverB = semver.coerce(b.version);

                if (semverA == null && semverB == null) return 0; // both invalid, keep order
                if (semverA == null) return 1;                     // a invalid → a after b
                if (semverB == null) return -1;                    // b invalid → b after a

                return semver.rcompare(semverA, semverB);         // normal descending
            });
            chosen = withVer[0];
        } else {
            chosen = candidates[0];
        }
    }

    const downloadUrl = chosen.asset.browser_download_url;
    console.log(`Downloading ${downloadUrl} ...`);

    const dl = await fetch(downloadUrl);
    if (!dl.ok) {
        throw new Error(`Failed to download asset: ${dl.status} ${dl.statusText}`);
    }

    const resStream = Readable.fromWeb(dl.body as any);

    // Stream extract the tarball into the target dir, stripping top-level folder if present
    await new Promise((resolve, reject) => {
        const extract = tar.x({ cwd: finalTarget, strip: 1 });
        resStream.pipe(extract);
        resStream.on('error', reject);
        extract.on('error', reject);
        extract.on('close', resolve);
    });

    // After extraction, look for manifest.json and set load=true
    const manifestPath = path.join(finalTarget, "manifest.json");
    if (fs.existsSync(manifestPath)) {
        try {
            const txt = fs.readFileSync(manifestPath, "utf8");
            const manifest = JSON.parse(txt);
            manifest.load = true;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        } catch (e: any) {
            console.warn("Warning: failed to update manifest.json:", e.message);
        }
    } else {
        console.warn("Warning: manifest.json not found in template.");
    }

    console.log(`Module "${moduleName}" created at ${finalTarget}`);
}
