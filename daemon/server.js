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
    autoSyncInterval: 10,
    activeProject: "godot_ai",
    projects: [
      {
        id: "godot_ai",
        name: "godot_AI (Starter Kit)",
        localPath: "C:\\Users\\Nor Anisa\\godot_AI",
        godotProjectPath: "C:\\Users\\Nor Anisa\\godot_AI\\godot_project",
        repoUrl: "https://github.com/NourAnisa/godot_AI.git"
      },
      {
        id: "fading_dawn",
        name: "fading-dawn-godot",
        localPath: "C:\\Users\\Nor Anisa\\Downloads\\fadingdowngodot",
        godotProjectPath: "C:\\Users\\Nor Anisa\\Downloads\\fadingdowngodot",
        repoUrl: "https://github.com/NourAnisa/fading-dawn-godot.git"
      }
    ]
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

function resolveGodotProjectDir() {
  if (fs.existsSync(path.join(config.localPath, 'project.godot'))) {
    return config.localPath;
  }
  const sub = path.join(config.localPath, 'godot_project');
  if (fs.existsSync(path.join(sub, 'project.godot'))) {
    return sub;
  }
  return config.localPath;
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
  const projDir = resolveGodotProjectDir();
  const context = {
    projectName: path.basename(projDir),
    projectPath: projDir,
    mainScene: "",
    scenes: [],
    scripts: []
  };

  if (!fs.existsSync(projDir)) {
    return { error: "Folder proyek tidak ditemukan di " + projDir };
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

  // 2. Scan scenes recursively (*.tscn)
  function scanScenes(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === '.godot' || item === '.git') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanScenes(full, path.join(rel, item));
      } else if (item.endsWith('.tscn')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const nodeMatches = [...content.matchAll(/\[node name="([^"]+)" type="([^"]+)"/g)];
          const nodes = nodeMatches.map(m => ({ name: m[1], type: m[2] }));
          const relPath = path.join(rel, item).replace(/\\/g, '/');
          context.scenes.push({ file: `res://${relPath}`, nodes });
        } catch {}
      }
    }
  }

  // 3. Scan scripts recursively (*.gd)
  function scanScripts(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === '.godot' || item === '.git') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanScripts(full, path.join(rel, item));
      } else if (item.endsWith('.gd')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const classMatch = content.match(/class_name\s+([A-Za-z0-9_]+)/);
          const extendsMatch = content.match(/extends\s+([A-Za-z0-9_"]+)/);
          const exportMatches = [...content.matchAll(/@export(?:\([^\)]*\))?\s+var\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)/g)];
          const signalMatches = [...content.matchAll(/signal\s+([A-Za-z0-9_]+)/g)];

          const relPath = path.join(rel, item).replace(/\\/g, '/');
          context.scripts.push({
            file: `res://${relPath}`,
            className: classMatch ? classMatch[1] : null,
            extends: extendsMatch ? extendsMatch[1] : 'Node',
            exportedVars: exportMatches.map(m => `${m[1]}: ${m[2]}`),
            signals: signalMatches.map(m => m[1])
          });
        } catch {}
      }
    }
  }

  scanScenes(projDir);
  scanScripts(projDir);

  // Pre-generate prompt markdown
  let promptText = `[KONTEKS PROYEK GODOT 4]\n`;
  promptText += `Nama Proyek: ${context.projectName}\n`;
  promptText += `Main Scene: ${context.mainScene || 'res://main.tscn'}\n\n`;

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
  const projDir = resolveGodotProjectDir();
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

  let cleanCode = code.trim();
  if (cleanCode.startsWith('```gdscript') || cleanCode.startsWith('```python') || cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/^```[a-z0-9_-]*\r?\n/, '').replace(/\r?\n```$/, '');
  }

  fs.writeFileSync(targetPath, cleanCode, { encoding: 'utf8' });

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
    godotProjectPath: resolveGodotProjectDir(),
    repoUrl: config.repoUrl,
    activeProject: config.activeProject,
    projects: config.projects || [],
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
  const commitMsg = message && message.trim() ? message.trim() : `Update Godot AI project [${new Date().toLocaleTimeString()}]`;
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
    return res.end(JSON.stringify({ ok: true, name: "Godot-AI-Smart-Daemon", version: "2.1.0" }));
  }

  // CONFIGURATION ENDPOINTS (Choose Folder & Repo)
  if (req.method === 'GET' && parsedUrl.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      config,
      activeProject: config.activeProject,
      projects: config.projects || []
    }));
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/config') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);

        // 1. Switch existing preset project
        if (payload.switchProjectId && Array.isArray(config.projects)) {
          const found = config.projects.find(p => p.id === payload.switchProjectId);
          if (found) {
            config.activeProject = found.id;
            config.localPath = found.localPath;
            config.repoUrl = found.repoUrl;
            config.godotProjectPath = found.godotProjectPath || found.localPath;
          }
        }

        // 2. Custom folder / repo URL
        if (payload.localPath) config.localPath = payload.localPath.trim();
        if (payload.repoUrl) config.repoUrl = payload.repoUrl.trim();
        if (payload.projectName) {
          const id = payload.projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (!config.projects) config.projects = [];
          const idx = config.projects.findIndex(p => p.id === id || p.localPath === config.localPath);
          const projectEntry = {
            id,
            name: payload.projectName,
            localPath: config.localPath,
            repoUrl: config.repoUrl,
            godotProjectPath: resolveGodotProjectDir()
          };
          if (idx >= 0) {
            config.projects[idx] = projectEntry;
          } else {
            config.projects.push(projectEntry);
          }
          config.activeProject = id;
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        startAutoSync();
        const status = await getStatus();
        broadcast('status', status);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, config, status }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

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
  console.log(`[Godot AI Smart Daemon v2.1] Berjalan di http://127.0.0.1:${PORT}`);
  console.log(`Folder Proyek: ${config.localPath}`);
  console.log(`Remote:        ${config.repoUrl}`);
});