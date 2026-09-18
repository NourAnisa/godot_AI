const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  const defaults = {
    port: 32124,
    localPath: "C:\\Users\\Nor Anisa\\godot_AI",
    godotProjectPath: "C:\\Users\\Nor Anisa\\godot_AI\\godot_project",
    repoUrl: "https://github.com/NourAnisa/godot_AI.git",
    gitPath: "git",
    godotExe: "C:\\Users\\Nor Anisa\\Downloads\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64_console.exe",
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

// -------------------------------------------------------------
// SMART FEATURE 1: Scan Godot Project Context (Scenes, Nodes, Scripts)
// -------------------------------------------------------------
function getProjectContext() {
  const projDir = config.godotProjectPath || path.join(config.localPath, 'godot_project');
  const context = {
    projectName: "Godot AI Project",
    mainScene: "",
    scenes: [],
    scripts: []
  };

  if (!fs.existsSync(projDir)) {
    return { error: "godot_project folder not found at " + projDir };
  }

  // 1. Parse project.godot
  const projGodotPath = path.join(projDir, 'project.godot');
  if (fs.existsSync(projGodotPath)) {
    const content = fs.readFileSync(projGodotPath, 'utf8');
    const nameMatch = content.match(/config\/name="([^"]+)"/);
    if (nameMatch) context.projectName = nameMatch[1];
    const sceneMatch = content.match(/run\/main_scene="([^"]+)"/);
    if (sceneMatch) context.mainScene = sceneMatch[1];
  }

  // 2. Scan scenes (*.tscn)
  const scenesDir = path.join(projDir, 'scenes');
  if (fs.existsSync(scenesDir)) {
    const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.tscn'));
    for (const f of files) {
      const fullPath = path.join(scenesDir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const nodeMatches = [...content.matchAll(/\[node name="([^"]+)" type="([^"]+)"/g)];
      const nodes = nodeMatches.map(m => ({ name: m[1], type: m[2] }));
      context.scenes.push({ file: `res://scenes/${f}`, nodes });
    }
  }

  // 3. Scan scripts (*.gd)
  const scriptsDir = path.join(projDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.gd'));
    for (const f of files) {
      const fullPath = path.join(scriptsDir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const classMatch = content.match(/class_name\s+([A-Za-z0-9_]+)/);
      const extendsMatch = content.match(/extends\s+([A-Za-z0-9_"]+)/);
      const exportMatches = [...content.matchAll(/@export(?:\([^\)]*\))?\s+var\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)/g)];
      const signalMatches = [...content.matchAll(/signal\s+([A-Za-z0-9_]+)/g)];

      context.scripts.push({
        file: `res://scripts/${f}`,
        className: classMatch ? classMatch[1] : null,
        extends: extendsMatch ? extendsMatch[1] : 'Node',
        exportedVars: exportMatches.map(m => `${m[1]}: ${m[2]}`),
        signals: signalMatches.map(m => m[1])
      });
    }
  }

  // Pre-generate prompt markdown
  let promptText = `[KONTEKS PROYEK GODOT 4 MAHASISWA]\n`;
  promptText += `Nama Proyek: ${context.projectName}\n`;
  promptText += `Main Scene: ${context.mainScene || 'res://scenes/main.tscn'}\n\n`;

  promptText += `Daftar Scene & Node yang ada:\n`;
  for (const s of context.scenes) {
    promptText += `- ${s.file} (Node: ${s.nodes.map(n => `${n.name} [${n.type}]`).join(', ') || 'Root'})\n`;
  }

  promptText += `\nDaftar Script & Variabel yang sudah ada:\n`;
  for (const sc of context.scripts) {
    promptText += `- ${sc.file} (Class: ${sc.className || 'None'}, Extends: ${sc.extends})\n`;
    if (sc.exportedVars.length) promptText += `  Variabel: ${sc.exportedVars.join(', ')}\n`;
    if (sc.signals.length) promptText += `  Signals: ${sc.signals.join(', ')}\n`;
  }
  promptText += `\nInstruksi untuk AI: Mohon berikan kode GDScript yang kompatibel dan sesuai dengan nama node serta variabel yang sudah ada di atas.`;

  context.formattedPrompt = promptText;
  return context;
}

// -------------------------------------------------------------
// SMART FEATURE 2: 1-Click Apply Code to Godot Project
// -------------------------------------------------------------
async function applyCodeToFile(filename, code, commitMsg) {
  const projDir = config.godotProjectPath || path.join(config.localPath, 'godot_project');
  let cleanFilename = filename.replace(/^res:\/\//, '').replace(/^[\\\/]+/, '');
  if (!cleanFilename.endsWith('.gd') && !cleanFilename.endsWith('.tscn')) {
    cleanFilename += '.gd';
  }
  if (!cleanFilename.includes('/') && !cleanFilename.includes('\\')) {
    cleanFilename = path.join('scripts', cleanFilename);
  }

  const targetPath = path.join(projDir, cleanFilename);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Remove potential UTF-8 BOM or markdown backtick wrappers
  let cleanCode = code.trim();
  if (cleanCode.startsWith('```gdscript') || cleanCode.startsWith('```python') || cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/^```[a-z0-9_-]*\r?\n/, '').replace(/\r?\n```$/, '');
  }

  fs.writeFileSync(targetPath, cleanCode, { encoding: 'utf8' });

  // Auto commit & push if git is ready
  const msg = commitMsg || `Apply AI code to ${cleanFilename} via Godot AI Assistant`;
  await runGit(['add', '.']);
  await runGit(['commit', '-m', msg]);
  runGit(['push', 'origin', 'main']).catch(() => {});

  return {
    success: true,
    file: `res://${cleanFilename.replace(/\\/g, '/')}`,
    localPath: targetPath,
    bytesWritten: Buffer.byteLength(cleanCode, 'utf8')
  };
}

// SSE Clients
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
    return res.end(JSON.stringify({ ok: true, name: "Godot-AI-Smart-Daemon", version: "2.0.0" }));
  }

  // SMART ENDPOINT: Get Project Architecture Context
  if (req.method === 'GET' && parsedUrl.pathname === '/project-context') {
    try {
      const ctx = getProjectContext();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(ctx));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // SMART ENDPOINT: Apply Code directly to Godot file
  if (req.method === 'POST' && parsedUrl.pathname === '/apply-code') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.code) throw new Error("Field 'code' is required.");
        const result = await applyCodeToFile(payload.filename || 'scripts/generated_script.gd', payload.code, payload.commitMessage);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
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
  console.log(`[Godot AI Smart Daemon v2] Berjalan di http://127.0.0.1:${PORT}`);
  console.log(`Folder Proyek: ${config.localPath}`);
  console.log(`Remote:        ${config.repoUrl}`);
});