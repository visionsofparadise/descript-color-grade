#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

const zeroSha = "0".repeat(40);
const commitCap = 20;

function git(args, options = {}) {
	const result = spawnSync("git", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		...options,
	});
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	if (result.status !== 0) {
		const err = (result.stderr || result.stdout || "").trim();
		if (err) console.error(err);
		process.exit(result.status ?? 1);
	}
	return (result.stdout ?? "").trim();
}

function gitOk(args) {
	const result = spawnSync("git", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	return result.status === 0;
}

const repoRoot = git(["rev-parse", "--show-toplevel"]);
const trivyConfig = path.join(repoRoot, "trivy.yaml");
if (!existsSync(trivyConfig)) {
	console.error(`missing trivy.yaml at ${trivyConfig}`);
	process.exit(1);
}

const toolsMjs = path.join(repoRoot, "tools.mjs");
if (!existsSync(toolsMjs)) {
	console.error(`missing tools.mjs at ${toolsMjs}`);
	process.exit(1);
}

function runTrivy(scanDir) {
	const result = spawnSync(
		process.execPath,
		[toolsMjs, "run", "trivy", "fs", "--config", trivyConfig, "--exit-code", "1", "."],
		{
			cwd: scanDir,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	if (result.error) {
		console.error(result.error.message);
		return 1;
	}
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	return result.status ?? 1;
}

function listCommits(localSha, remoteSha) {
	if (remoteSha === zeroSha || !gitOk(["cat-file", "-e", `${remoteSha}^{commit}`])) {
		return git(["rev-list", localSha, "--not", "--remotes"]).split("\n").filter(Boolean);
	}
	return git(["rev-list", `${remoteSha}..${localSha}`])
		.split("\n")
		.filter(Boolean);
}

function scanCommit(sha) {
	const workDir = mkdtempSync(path.join(tmpdir(), `pre-push-trivy-${sha.slice(0, 8)}-`));
	try {
		const archive = spawnSync("git", ["archive", sha], {
			cwd: repoRoot,
			encoding: "buffer",
			maxBuffer: 1024 * 1024 * 512,
			stdio: ["ignore", "pipe", "pipe"],
		});
		if (archive.error || archive.status !== 0) {
			const err = archive.error?.message || (archive.stderr?.toString() ?? "").trim() || "git archive failed";
			console.error(`${sha}: ${err}`);
			return 1;
		}
		const extract = spawnSync("tar", ["-x"], {
			cwd: workDir,
			input: archive.stdout,
			stdio: ["pipe", "pipe", "pipe"],
		});
		if (extract.error || extract.status !== 0) {
			const err = extract.error?.message || (extract.stderr?.toString() ?? "").trim() || "tar extract failed";
			console.error(`${sha}: ${err}`);
			return 1;
		}
		const status = runTrivy(workDir);
		if (status !== 0) {
			console.error(`trivy failed for commit ${sha}`);
			return status;
		}
		return 0;
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

const lines = [];
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
	if (line.trim()) lines.push(line.trim());
}

if (lines.length === 0) {
	process.exit(0);
}

for (const line of lines) {
	const parts = line.split(/\s+/);
	if (parts.length < 4) {
		console.error(`malformed pre-push ref line: ${line}`);
		process.exit(1);
	}
	const [, localSha, , remoteSha] = parts;
	if (localSha === zeroSha) {
		continue;
	}
	const commits = listCommits(localSha, remoteSha);
	if (commits.length > commitCap) {
		const skipped = commits.filter((sha) => sha !== localSha);
		console.error(
			`pre-push: ${commits.length} commits exceeds cap of ${commitCap}; scanning tip tree ${localSha} only. Skipped: ${skipped.join(" ")}`,
		);
		const status = scanCommit(localSha);
		if (status !== 0) process.exit(status);
		continue;
	}
	for (const sha of commits) {
		const status = scanCommit(sha);
		if (status !== 0) process.exit(status);
	}
}

process.exit(0);
