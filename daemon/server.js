const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  const defaults = {
    port: 32124,
    localPath: "C:\\Users\\Nor Anisa\\godot_AI",
    repoUrl: "https://github.com/NourAnisa/godot_AI.git",
    gitPath: "git",
    autoSync: true,
    autoSyncInterval: 10
  };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaults, ...data };
    }
  } catch (e) {
    console.error("Config error:", e);
  }
  return defaults;
}

let config = loadConfig();
const vsGit = "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe";
let resolvedGit = config.gitPath;
if (resolvedGit === 'git' && fs.existsSync(vsGit)) {
  resolvedGit = vsGit;
}

function runGit(args, cwd = config.localPath) {
  return new Promise((resolve) => {
    execFile(resolvedGit, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return resolve({ success: false, error: stderr || stdout || error.message, stdout, stderr, code: error.code });
      }
      resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

const sseClients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

async function getStatus() {
  await runGit(['fetch', 'origin', 'main']);

  const [headRes, originRes, statusRes, logLocal, logOrigin] = await Promise.all([
    runGit(['rev-parse', 'HEAD']),
    runGit(['rev-parse', 'origin/main']),
    runGit(['status', '--porcelain']),
    runGit(['log', '-1', '--format=%h|||%an|||%s|||%cr']),
    runGit(['log', '-1', 'origin/main', '--format=%h|||%an|||%s|||%cr'])
  ]);

  let behind = 0;
  let ahead = 0;
  if (headRes.success && originRes.success) {
    const behindRes = await runGit(['rev-list', '--count', 'HEAD..origin/main']);
    if (behindRes.success) behind = parseInt(behindRes.stdout, 10) || 0;

    const aheadRes = await runGit(['rev-list', '--count', 'origin/main..HEAD']);
    if (aheadRes.success) ahead = parseInt(aheadRes.stdout, 10) || 0;
  }

  const parseLog = (str) => {
    if (!str) return null;
    const [hash, author, subject, time] = str.split('|||');
    return { hash, author, subject, time };
  };

  const uncommittedFiles = statusRes.success && statusRes.stdout ? statusRes.stdout.split('\n').filter(Boolean) : [];

  return {
    localPath: config.localPath,
    repoUrl: config.repoUrl,
    synced: behind === 0 && ahead === 0,
    behind,
    ahead,
    uncommittedCount: uncommittedFiles.length,
    uncommittedFiles,
    localCommit: parseLog(logLocal.stdout),
    remoteCommit: parseLog(logOrigin.stdout),
    autoSync: config.autoSync,
    autoSyncInterval: config.autoSyncInterval,
    timestamp: new Date().toISOString()
  };
}

async function pullChanges() {
  const res = await runGit(['pull', '--ff-only', 'origin', 'main']);
  const status = await getStatus();
  broadcast('status', status);
  return { ...res, status };
}

async function pushChanges(message) {
  const commitMsg = message && message.trim() ? message.trim() : `Update tugas Godot AI [${new Date().toLocaleTimeString()}]`;
  const addRes = await runGit(['add', '.']);
  if (!addRes.success) return addRes;

  const commitRes = await runGit(['commit', '-m', commitMsg]);
  const pushRes = await runGit(['push', 'origin', 'main']);
  const status = await getStatus();
  broadcast('status', status);
  return { ...pushRes, status, commitOutput: commitRes.stdout };
}

let autoSyncTimer = null;
function startAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (!config.autoSync) return;

  autoSyncTimer = setInterval(async () => {
    try {
      const status = await getStatus();
      if (status.behind > 0) {
        console.log(`[Auto-Sync] Menarik ${status.behind} commit baru dari GitHub...`);
        await pullChanges();
      } else {
        broadcast('status', status);
      }
    } catch (e) {
      console.error("[Auto-Sync error]", e);
    }
  }, (config.autoSyncInterval || 10) * 1000);
}

startAutoSync();

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && parsedUrl.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    sseClients.add(res);
    getStatus().then(s => res.write(`event: status\ndata: ${JSON.stringify(s)}\n\n`));
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, name: "Godot-AI-Student-Daemon", version: "1.0.0" }));
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/status') {
    try {
      const status = await getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(status));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/pull') {
    try {
      const result = await pullChanges();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/push') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await pushChanges(payload.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const PORT = config.port || 32124;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Godot AI Mahasiswa Daemon] Berjalan di http://127.0.0.1:${PORT}`);
  console.log(`Folder: ${config.localPath}`);
  console.log(`Remote: ${config.repoUrl}`);
});