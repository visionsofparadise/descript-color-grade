#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	copyFileSync,
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(root, ".tools");
const manifestPath = path.join(root, "tools.json");

function platformKey() {
	const { platform, arch } = process;
	if (platform === "win32" && arch === "x64") return "windows-64bit";
	if (platform === "linux" && arch === "x64") return "Linux-64bit";
	if (platform === "darwin" && arch === "arm64") return "macOS-ARM64";
	console.error(`unsupported platform: ${platform}/${arch}`);
	process.exit(1);
}

function loadManifest() {
	if (!existsSync(manifestPath)) {
		console.error(`missing tools.json at ${manifestPath}`);
		process.exit(1);
	}
	return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function binaryPath(platformSpec) {
	return path.join(toolsDir, platformSpec.binary);
}

function markerPath(toolName) {
	return path.join(toolsDir, `${toolName}.sha256`);
}

function isInstalled(toolName, platformSpec) {
	const bin = binaryPath(platformSpec);
	const marker = markerPath(toolName);
	if (!existsSync(bin) || !existsSync(marker)) return false;
	return readFileSync(marker, "utf8").trim() === platformSpec.sha256;
}

async function download(url, dest) {
	const response = await fetch(url);
	if (!response.ok) {
		console.error(`download failed: ${url} (${response.status})`);
		process.exit(1);
	}
	await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

function sha256File(filePath) {
	const hash = createHash("sha256");
	hash.update(readFileSync(filePath));
	return hash.digest("hex");
}

function tarBinary() {
	if (process.platform === "win32") {
		const systemTar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
		if (existsSync(systemTar)) return systemTar;
	}
	return "tar";
}

function unpack(archivePath, destDir) {
	mkdirSync(destDir, { recursive: true });
	const archiveDir = path.dirname(archivePath);
	const archiveName = path.basename(archivePath);
	const relativeDest = path.relative(archiveDir, destDir) || ".";
	const result = spawnSync(tarBinary(), ["-xf", archiveName, "-C", relativeDest], {
		stdio: "inherit",
		shell: false,
		cwd: archiveDir,
	});
	if (result.error || result.status !== 0) {
		console.error(`unpack failed: ${archivePath}`);
		process.exit(1);
	}
}

function locateBinary(extractDir, binaryName) {
	const direct = path.join(extractDir, binaryName);
	if (existsSync(direct)) return direct;
	const stack = [extractDir];
	while (stack.length > 0) {
		const dir = stack.pop();
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) {
				stack.push(full);
			} else if (entry === binaryName) {
				return full;
			}
		}
	}
	return null;
}

async function installTool(toolName, toolSpec, key) {
	const platformSpec = toolSpec.platforms[key];
	if (!platformSpec) {
		console.error(`no asset for ${toolName} on ${key}`);
		process.exit(1);
	}
	if (isInstalled(toolName, platformSpec)) {
		return;
	}
	mkdirSync(toolsDir, { recursive: true });
	const workDir = path.join(tmpdir(), `tools-install-${toolName}-${process.pid}`);
	rmSync(workDir, { recursive: true, force: true });
	mkdirSync(workDir, { recursive: true });
	const archivePath = path.join(workDir, platformSpec.archive);
	try {
		await download(platformSpec.url, archivePath);
		const digest = sha256File(archivePath);
		if (digest !== platformSpec.sha256) {
			console.error(`checksum mismatch for ${toolName}: got ${digest}, expected ${platformSpec.sha256}`);
			process.exit(1);
		}
		const extractDir = path.join(workDir, "extract");
		unpack(archivePath, extractDir);
		const found = locateBinary(extractDir, platformSpec.binary);
		if (!found) {
			console.error(`binary ${platformSpec.binary} not found in ${platformSpec.archive}`);
			process.exit(1);
		}
		const dest = binaryPath(platformSpec);
		copyFileSync(found, dest);
		if (process.platform !== "win32") {
			chmodSync(dest, 0o755);
		}
		writeFileSync(markerPath(toolName), `${platformSpec.sha256}\n`);
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

async function install() {
	const manifest = loadManifest();
	const key = platformKey();
	for (const [toolName, toolSpec] of Object.entries(manifest)) {
		await installTool(toolName, toolSpec, key);
	}
}

function run(toolName, args) {
	const manifest = loadManifest();
	const toolSpec = manifest[toolName];
	if (!toolSpec) {
		console.error(`unknown tool: ${toolName}`);
		process.exit(1);
	}
	const key = platformKey();
	const platformSpec = toolSpec.platforms[key];
	if (!platformSpec) {
		console.error(`no asset for ${toolName} on ${key}`);
		process.exit(1);
	}
	if (!isInstalled(toolName, platformSpec)) {
		console.error(`${toolName} is not installed or checksum marker mismatches; run: node tools.mjs install`);
		process.exit(1);
	}
	const bin = binaryPath(platformSpec);
	const result = spawnSync(bin, args, {
		stdio: "inherit",
		shell: false,
	});
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	process.exit(result.status ?? 1);
}

const [command, ...rest] = process.argv.slice(2);

if (command === "install") {
	await install();
} else if (command === "run") {
	const [toolName, ...toolArgs] = rest;
	if (!toolName) {
		console.error("usage: node tools.mjs run <tool> [args...]");
		process.exit(1);
	}
	run(toolName, toolArgs);
} else {
	console.error("usage: node tools.mjs install | node tools.mjs run <tool> [args...]");
	process.exit(1);
}
