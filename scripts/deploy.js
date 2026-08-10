#!/usr/bin/env node
/**
 * Deploy the theme to darlinghome.bg, and PROVE it landed.
 *
 * WHY THIS GOES THROUGH CI AND NOT rsync FROM A LAPTOP
 *
 *  1. `infra/deploy.sh` ALREADY deploys the theme - `rsync -a --delete
 *     $REPO_DIR/theme/darling/ -> wp-content/themes/darling/`, then
 *     `chown -R 33:33` so php-fpm still owns its own files, plus a `php -l`
 *     gate over the plugin. A second, laptop-side path would duplicate all of
 *     that and then drift from it. What was actually broken was narrower: the
 *     WORKFLOW only fired on `paths: ['infra/**']`, so a theme-only commit
 *     deployed nothing. Fixed in .github/workflows/deploy.yml, same commit as
 *     this file.
 *  2. The box pulls from git, so every file arrives LF-normalised by
 *     .gitattributes (`* text=auto eol=lf`). Piping bytes from PowerShell has
 *     corrupted them four times in this project (`tr -d "\r"` ate every `r`;
 *     `tr -d "\015"` ate every `0` and `1`). Deploying by git removes that
 *     class of bug rather than working around it.
 *  3. `woo_deploy_key` carries a forced command server-side. We never open a
 *     shell with it. The verify pass below uses ~/.ssh/id_ed25519, read-only.
 *
 * So this script is a GATE plus a PROOF, not a transport:
 *
 *   preflight  branch, fresh build, clean tree, nothing unpushed
 *   fire       gh workflow run deploy.yml, then wait for that run
 *   box        repo HEAD == local HEAD, and sha256 of the files we care about
 *              matches the sha256 of the git BLOB - the exact bytes sent
 *   live       darling.build.css is actually in the page's stylesheet list
 *
 * The last step is the one that matters. On 2026-08-10 the deploy had
 * succeeded, the file was on disk, and the page loaded it NOWHERE: it was
 * enqueued by nothing. A deploy check that stops at the filesystem would have
 * said "ok" for as long as we let it.
 *
 *   node scripts/deploy.js              build, gate, deploy, verify
 *   node scripts/deploy.js --skip-build build is already fresh
 *   node scripts/deploy.js --verify     verify only, deploy nothing
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ROOT = path.dirname(__dirname);
const BOX = process.env.DEPLOY_BOX || 'darling@169.58.89.40';
const KEY = (process.env.DEPLOY_KEY || path.join(os.homedir(), '.ssh', 'id_ed25519')).replace(/\\/g, '/');
const THEME = '/srv/darling/prod/wordpress/wp-content/themes/darling';
const SITE = process.env.DEPLOY_SITE || 'https://darlinghome.bg';

// files whose bytes we assert end to end. Not the whole tree: these are the
// ones that decide whether the design system is live at all.
const WATCH = [
	'theme/darling/darling.build.css',
	'theme/darling/functions.php',
	'theme/darling/theme.json',
];

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);

function step(s) { console.log('\n== ' + s); }
function ok(s) { console.log('   ok    ' + s); }
function die(s) { console.log('   FAIL  ' + s); process.exit(1); }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function git(a, opt) { return execFileSync('git', ['-C', ROOT].concat(a), Object.assign({ encoding: 'utf8', maxBuffer: 1 << 28 }, opt || {})); }
function gh(a) { return execFileSync('gh', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).trim(); }

// *** Windows System32 OpenSSH is BROKEN on this laptop *** - ssh.exe exits 255
// with no output at all, even for `ssh -V`. Git ships its own and that one
// works. Resolve it rather than leaving a 255 that looks like a refused login.
function sshExe() {
	if (process.env.DEPLOY_SSH) return process.env.DEPLOY_SSH;
	const g = 'C:\\Program Files\\Git\\usr\\bin\\ssh.exe';
	if (process.platform === 'win32' && fs.existsSync(g)) return g;
	return 'ssh';
}
function box(cmd) {
	return execFileSync(sshExe(), ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-i', KEY, BOX, cmd],
		{ encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
}

// the bytes the box will receive: the committed blob, already LF-normalised.
// NOT the working copy, which on Windows may hold CRLF for text files.
function blobSha(p) {
	const buf = git(['cat-file', 'blob', 'HEAD:' + p], { encoding: 'buffer' });
	return crypto.createHash('sha256').update(buf).digest('hex');
}

function get(url) {
	return new Promise((res, rej) => {
		https.get(url, { headers: { 'user-agent': 'darling-deploy/1' } }, (r) => {
			if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
				r.resume(); return res(get(r.headers.location));
			}
			let b = '';
			r.setEncoding('utf8');
			r.on('data', (d) => { b += d; });
			r.on('end', () => res({ code: r.statusCode, body: b }));
		}).on('error', rej);
	});
}

(async () => {
	const verifyOnly = flag('--verify');

	step('preflight');
	const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
	if (branch !== 'main') die('on branch ' + branch + ', deploy runs from main');
	ok('branch main');

	if (!verifyOnly && !flag('--skip-build')) {
		step('build');
		// so the box gets a darling.build.css that matches src/, and a theme.json
		// regenerated from src/tokens - gen-theme-json.js is step 4 of build.js.
		execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js')], { cwd: ROOT, stdio: 'inherit' });
	}

	if (!verifyOnly) {
		const dirty = git(['status', '--porcelain', '--', 'theme', 'plugin', 'infra']).trim();
		if (dirty) die('uncommitted changes under theme/ plugin/ infra/:\n' + dirty);
		ok('theme/ plugin/ infra/ clean (a fresh build changed nothing)');

		const ahead = git(['rev-list', '--count', '@{u}..HEAD']).trim();
		if (ahead !== '0') die(ahead + ' commit(s) not pushed - the box deploys from origin/main, not from here');
		ok('nothing unpushed');
	}

	const head = git(['rev-parse', 'HEAD']).trim();
	const want = {};
	for (const p of WATCH) want[p] = blobSha(p);
	console.log('   HEAD ' + head.slice(0, 7));
	for (const p of WATCH) console.log('        ' + want[p].slice(0, 16) + '  ' + p);

	if (!verifyOnly) {
		step('fire');
		const before = new Set(JSON.parse(gh(['run', 'list', '--workflow=deploy.yml', '--limit', '10', '--json', 'databaseId']))
			.map((r) => r.databaseId));
		gh(['workflow', 'run', 'deploy.yml', '--ref', 'main']);
		let run = null;
		const t0 = Date.now();
		while (Date.now() - t0 < 15 * 60 * 1000) {
			sleep(6000);
			const list = JSON.parse(gh(['run', 'list', '--workflow=deploy.yml', '--limit', '10',
				'--json', 'databaseId,status,conclusion,headSha']));
			const mine = list.find((r) => !before.has(r.databaseId));
			if (!mine) { process.stdout.write('.'); continue; }
			if (!run) console.log('\n   run ' + mine.databaseId + ' on ' + String(mine.headSha).slice(0, 7));
			run = mine;
			if (mine.status === 'completed') break;
			process.stdout.write('.');
		}
		if (!run) die('no workflow run appeared within 15 minutes');
		if (run.status !== 'completed') die('run ' + run.databaseId + ' still ' + run.status + ' after 15 minutes');
		if (run.conclusion !== 'success') die('run ' + run.databaseId + ' concluded ' + run.conclusion);
		ok('workflow run ' + run.databaseId + ' succeeded');
	}

	step('box');
	const boxHead = box('git -C /srv/darling/repo rev-parse HEAD');
	if (boxHead !== head) die('box repo is at ' + boxHead.slice(0, 7) + ', we are at ' + head.slice(0, 7));
	ok('box repo at ' + head.slice(0, 7));

	const paths = WATCH.map((p) => THEME + '/' + p.replace('theme/darling/', '')).join(' ');
	const sums = box('sha256sum ' + paths + ' 2>&1');
	const got = {};
	for (const line of sums.split('\n')) {
		const m = line.trim().match(/^([0-9a-f]{64})\s+(\S+)$/);
		if (m) got[path.posix.basename(m[2])] = m[1];
	}
	for (const p of WATCH) {
		const base = path.posix.basename(p);
		if (!got[base]) die(base + ' is not on the box: ' + sums);
		if (got[base] !== want[p]) die(base + ' differs - box ' + got[base].slice(0, 16) + ', repo ' + want[p].slice(0, 16));
		ok(base + ' byte-identical to the committed blob');
	}

	step('live');
	const r = await get(SITE + '/');
	if (r.code !== 200) die(SITE + ' returned ' + r.code);
	const sheets = [];
	const re = /<link[^>]+rel=['"]stylesheet['"][^>]*>/gi;
	let m;
	while ((m = re.exec(r.body))) {
		const href = /href=['"]([^'"]+)['"]/i.exec(m[0]);
		if (href && /\/themes\/darling\//.test(href[1])) sheets.push(href[1].split('/wp-content/')[1] || href[1]);
	}
	console.log('   darling stylesheets on the page:');
	for (const s of sheets) console.log('        ' + s);
	if (!sheets.some((s) => /darling\.build\.css/.test(s))) {
		die('darling.build.css is on disk but the page does not load it - it is enqueued by nothing');
	}
	ok('darling.build.css is enqueued and served');

	console.log('\ndeployed ' + head.slice(0, 7) + ' to ' + SITE);
})().catch((e) => {
	console.log('\n   FAIL  ' + (e && e.message ? e.message : e));
	if (e && e.stdout) console.log(String(e.stdout));
	if (e && e.stderr) console.log(String(e.stderr));
	process.exit(1);
});