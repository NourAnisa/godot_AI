const http = require('http');
const { execFile, execFileSync, spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// -------------------------------------------------------------
// UNIVERSAL DETECTORS: Auto-detect Git & Godot on Any Computer
// -------------------------------------------------------------
function isGitWorking(gitPath) {
  if (!gitPath) return false;
  try {
    execFileSync(gitPath, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findGitExecutable() {
  const candidates = [
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe'
  ];

  const ghDir = path.join(process.env.LOCALAPPDATA || '', 'GitHubDesktop');
  if (fs.existsSync(ghDir)) {
    try {
      for (const f of fs.readdirSync(ghDir)) {
        if (f.startsWith('app-')) {
          candidates.push(path.join(ghDir, f, 'resources', 'app', 'git', 'cmd', 'git.exe'));
        }
      }
    } catch {}
  }

  for (const c of candidates) {
    if (fs.existsSync(c) && isGitWorking(c)) return c;
  }

  try {
    const out = execSync('where git', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (out) {
      const first = out.split(/\r?\n/)[0].trim();
      if (isGitWorking(first)) return first;
    }
  } catch {}

  if (isGitWorking('git')) return 'git';
  return 'git';
}

function findGodotExecutable() {
  try {
    const out = execSync('where godot', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (out) return out.split(/\r?\n/)[0].trim();
  } catch {}
  try {
    const out = execSync('where godot4', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (out) return out.split(/\r?\n/)[0].trim();
  } catch {}

  const searchDirs = [
    path.join(process.env.USERPROFILE || '', 'Downloads'),
    path.join(process.env.USERPROFILE || '', 'Desktop'),
    'C:\\Program Files\\Godot',
    'C:\\Program Files (x86)\\Godot',
    'C:\\Godot',
    path.join(REPO_ROOT, 'tools'),
    REPO_ROOT
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        if (item.toLowerCase().startsWith('godot') && item.endsWith('.exe') && !item.toLowerCase().includes('console')) {
          return full;
        }
        if (fs.statSync(full).isDirectory() && item.toLowerCase().startsWith('godot')) {
          try {
            const subitems = fs.readdirSync(full);
            for (const sub of subitems) {
              if (sub.toLowerCase().startsWith('godot') && sub.endsWith('.exe') && !sub.toLowerCase().includes('console')) {
                return path.join(full, sub);
              }
            }
          } catch {}
        }
      }
    } catch {}
  }
  return '';
}

function detectRemoteRepoUrl(gitExe) {
  try {
    const out = execFileSync(gitExe, ['config', '--get', 'remote.origin.url'], { encoding: 'utf8', cwd: REPO_ROOT }).trim();
    if (out) return out;
  } catch {}
  return "https://github.com/NourAnisa/godot_AI.git";
}

function loadConfig() {
  const detectedGit = findGitExecutable();
  const detectedGodot = findGodotExecutable();
  const detectedRepo = detectRemoteRepoUrl(detectedGit);

  let conf = {
    port: 32124,
    localPath: REPO_ROOT,
    godotProjectPath: path.join(REPO_ROOT, 'godot_project'),
    repoUrl: detectedRepo,
    gitPath: detectedGit,
    godotExe: detectedGodot,
    autoSync: true,
    autoSyncInterval: 10,
    activeProject: "godot_ai",
    projects: [
      {
        id: "godot_ai",
        name: "godot_AI (Starter Kit)",
        localPath: REPO_ROOT,
        godotProjectPath: path.join(REPO_ROOT, 'godot_project'),
        repoUrl: detectedRepo
      }
    ]
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      conf = { ...conf, ...saved };
    }
  } catch (e) {
    console.error("Config error:", e);
  }

  // SELF-HEALING / PORTABLE FALLBACK:
  // If localPath doesn't exist on this computer, automatically reset to REPO_ROOT!
  if (!conf.localPath || !fs.existsSync(conf.localPath)) {
    conf.localPath = REPO_ROOT;
  }
  if (!conf.godotProjectPath || !fs.existsSync(conf.godotProjectPath)) {
    conf.godotProjectPath = path.join(REPO_ROOT, 'godot_project');
  }
  if (!conf.repoUrl) {
    conf.repoUrl = detectedRepo;
  }
  if (!conf.gitPath || !isGitWorking(conf.gitPath)) {
    conf.gitPath = detectedGit;
  }
  if (!conf.godotExe || !fs.existsSync(conf.godotExe)) {
    conf.godotExe = detectedGodot || "";
  }

  // Ensure projects array has valid paths
  if (Array.isArray(conf.projects)) {
    conf.projects = conf.projects.filter(p => p.id !== 'fading_dawn');
    const gai = conf.projects.find(p => p.id === 'godot_ai');
    if (gai) {
      if (!gai.localPath || !fs.existsSync(gai.localPath)) gai.localPath = REPO_ROOT;
      if (!gai.godotProjectPath || !fs.existsSync(gai.godotProjectPath)) gai.godotProjectPath = path.join(REPO_ROOT, 'godot_project');
      if (!gai.repoUrl) gai.repoUrl = detectedRepo;
    } else {
      conf.projects.unshift({
        id: "godot_ai",
        name: "godot_AI (Starter Kit)",
        localPath: REPO_ROOT,
        godotProjectPath: path.join(REPO_ROOT, 'godot_project'),
        repoUrl: detectedRepo
      });
    }
  }

  return conf;
}

let config = loadConfig();
let resolvedGit = config.gitPath;
let resolvedGodot = config.godotExe;

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
      resolve({ success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

// -------------------------------------------------------------
// V3.0 PRO FEATURE 1: 1-Click Game Runner & Process Controller
// -------------------------------------------------------------
let activeGameProcess = null;

function isGameRunning() {
  return activeGameProcess !== null && !activeGameProcess.killed;
}

function runGame() {
  if (isGameRunning()) {
    return { success: true, message: "Game sudah berjalan", pid: activeGameProcess.pid };
  }

  if (!resolvedGodot || !fs.existsSync(resolvedGodot)) {
    resolvedGodot = findGodotExecutable();
    if (!resolvedGodot || !fs.existsSync(resolvedGodot)) {
      return {
        success: false,
        error: "Executable Godot 4 (.exe) belum terdeteksi di laptop ini.\n\nTips:\n1. Unduh Godot 4 dari https://godotengine.org\n2. Ekstrak di folder Downloads atau Desktop (akan otomatis terdeteksi!)\n3. Atau masukkan path file Godot.exe di tab '⚙️ Proyek' pada widget browser."
      };
    }
    config.godotExe = resolvedGodot;
  }

  const projDir = resolveGodotProjectDir();
  console.log(`[Game Runner] Meluncurkan game: "${resolvedGodot}" --path "${projDir}"`);

  try {
    activeGameProcess = spawn(resolvedGodot, ['--path', projDir], {
      detached: true,
      stdio: 'ignore'
    });

    activeGameProcess.unref();

    activeGameProcess.on('exit', () => {
      console.log('[Game Runner] Game process selesai.');
      activeGameProcess = null;
      broadcast('game-status', { running: false });
    });

    broadcast('game-status', { running: true, pid: activeGameProcess.pid });
    return { success: true, pid: activeGameProcess.pid };
  } catch (err) {
    console.error("[Game Runner Error]", err);
    return { success: false, error: err.message };
  }
}

function stopGame() {
  if (activeGameProcess) {
    try {
      process.kill(activeGameProcess.pid);
    } catch {}
    activeGameProcess = null;
  }
  exec('taskkill /F /IM Godot_v4* /FI "WINDOWTITLE ne *Godot Engine*"', () => {});
  broadcast('game-status', { running: false });
  return { success: true };
}

// -------------------------------------------------------------
// V3.0 PRO FEATURE 2: Hierarchical Scene Tree Inspector
// -------------------------------------------------------------
function parseSceneTree() {
  const projDir = resolveGodotProjectDir();
  const mainScenePath = path.join(projDir, 'scenes', 'main.tscn');
  const fallbackScenePath = path.join(projDir, 'main.tscn');
  const targetScene = fs.existsSync(mainScenePath) ? mainScenePath : (fs.existsSync(fallbackScenePath) ? fallbackScenePath : null);

  if (!targetScene) return { name: "Root", type: "Node3D", children: [] };

  const content = fs.readFileSync(targetScene, 'utf8');
  const nodeLines = [...content.matchAll(/\[node name="([^"]+)" type="([^"]+)"(?:\s+parent="([^"]*)")?/g)];

  const nodeMap = new Map();
  let rootNode = null;

  nodeLines.forEach(m => {
    const name = m[1];
    const type = m[2];
    const parent = m[3] || null;
    const nodeObj = { name, type, parent, children: [] };
    nodeMap.set(name, nodeObj);

    if (parent === null || parent === "" || parent === ".") {
      if (!rootNode) rootNode = nodeObj;
    }
  });

  nodeLines.forEach(m => {
    const name = m[1];
    const parent = m[3];
    if (parent && parent !== "." && parent !== "") {
      const parentName = parent.replace(/^\.\/?/, '').split('/').pop();
      if (nodeMap.has(parentName)) {
        nodeMap.get(parentName).children.push(nodeMap.get(name));
      } else if (rootNode) {
        rootNode.children.push(nodeMap.get(name));
      }
    } else if (rootNode && name !== rootNode.name) {
      rootNode.children.push(nodeMap.get(name));
    }
  });

  return rootNode || { name: "Root", type: "Node3D", children: [] };
}

// -------------------------------------------------------------
// V3.0 PRO FEATURE 3: Project Context Scanner
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

  const projGodotPath = path.join(projDir, 'project.godot');
  if (fs.existsSync(projGodotPath)) {
    const content = fs.readFileSync(projGodotPath, 'utf8');
    const nameMatch = content.match(/config\/name="([^"]+)"/);
    if (nameMatch) context.projectName = nameMatch[1];
    const sceneMatch = content.match(/run\/main_scene="([^"]+)"/);
    if (sceneMatch) context.mainScene = sceneMatch[1];
  }

  function scanScenes(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      if (item === '.godot' || item === '.git') continue;
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        scanScenes(full, path.join(rel, item));
      } else if (item.endsWith('.tscn')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const nodeMatches = [...content.matchAll(/\[node name="([^"]+)" type="([^"]+)"/g)];
          context.scenes.push({
            file: `res://${path.join(rel, item).replace(/\\/g, '/')}`,
            nodes: nodeMatches.map(m => ({ name: m[1], type: m[2] }))
          });
        } catch {}
      }
    }
  }

  function scanScripts(dir, rel = '') {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      if (item === '.godot' || item === '.git') continue;
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        scanScripts(full, path.join(rel, item));
      } else if (item.endsWith('.gd')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const classMatch = content.match(/class_name\s+([A-Za-z0-9_]+)/);
          const extendsMatch = content.match(/extends\s+([A-Za-z0-9_"]+)/);
          const exportMatches = [...content.matchAll(/@export(?:\([^\)]*\))?\s+var\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)/g)];
          const signalMatches = [...content.matchAll(/signal\s+([A-Za-z0-9_]+)/g)];

          context.scripts.push({
            file: `res://${path.join(rel, item).replace(/\\/g, '/')}`,
            className: classMatch ? classMatch[1] : null,
            extends: extendsMatch ? extendsMatch[1] : 'Node',
            exportedVars: exportMatches.map(m => `${m[1]}: ${m[2]}`),
            signals: signalMatches.map(m => m[1]),
            contentPreview: content.slice(0, 300)
          });
        } catch {}
      }
    }
  }

  scanScenes(projDir);
  scanScripts(projDir);

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
  context.sceneTree = parseSceneTree();
  return context;
}

// -------------------------------------------------------------
// V3.0 PRO FEATURE 4: 1-Click Apply Code / Shaders to Godot
// -------------------------------------------------------------
async function applyCodeToFile(filename, code, commitMsg) {
  const projDir = resolveGodotProjectDir();
  let cleanFilename = filename.replace(/^res:\/\//, '').replace(/^[\\\/]+/, '');
  if (!cleanFilename.endsWith('.gd') && !cleanFilename.endsWith('.tscn') && !cleanFilename.endsWith('.gdshader')) {
    cleanFilename += '.gd';
  }
  if (!cleanFilename.includes('/') && !cleanFilename.includes('\\')) {
    const subfolder = cleanFilename.endsWith('.gdshader') ? 'shaders' : 'scripts';
    cleanFilename = path.join(subfolder, cleanFilename);
  }

  const targetPath = path.join(projDir, cleanFilename);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let cleanCode = code.trim();
  if (cleanCode.startsWith('```')) {
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

// -------------------------------------------------------------
// V3.0 PRO FEATURE 5: Git Log & Timeline
// -------------------------------------------------------------
async function getGitLog(count = 8) {
  const res = await runGit(['log', `-${count}`, '--format=%h|||%an|||%s|||%cr']);
  if (!res.success || !res.stdout) return [];
  return res.stdout.split('\n').filter(Boolean).map(line => {
    const [hash, author, subject, time] = line.split('|||');
    return { hash, author, subject, time };
  });
}

const sseClients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch {}
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
    gameRunning: isGameRunning(),
    godotExe: resolvedGodot || "",
    godotDetected: !!(resolvedGodot && fs.existsSync(resolvedGodot)),
    gitPath: resolvedGit,
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
    return res.end(JSON.stringify({
      ok: true,
      name: "Godot-AI-Studio-Daemon",
      version: "3.0.0",
      godotDetected: !!(resolvedGodot && fs.existsSync(resolvedGodot)),
      godotExe: resolvedGodot,
      localPath: config.localPath
    }));
  }

  // GAME RUNNER ENDPOINTS
  if (req.method === 'POST' && parsedUrl.pathname === '/run-game') {
    const result = runGame();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/stop-game') {
    const result = stopGame();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/game-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      running: isGameRunning(),
      godotDetected: !!(resolvedGodot && fs.existsSync(resolvedGodot)),
      godotExe: resolvedGodot
    }));
  }

  // GIT LOG ENDPOINT
  if (req.method === 'GET' && parsedUrl.pathname === '/git-log') {
    const logs = await getGitLog(8);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(logs));
  }

  // CONFIGURATION ENDPOINTS
  if (req.method === 'GET' && parsedUrl.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      config,
      activeProject: config.activeProject,
      projects: config.projects || [],
      godotDetected: !!(resolvedGodot && fs.existsSync(resolvedGodot)),
      godotExe: resolvedGodot
    }));
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/config') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);

        if (payload.switchProjectId && Array.isArray(config.projects)) {
          const found = config.projects.find(p => p.id === payload.switchProjectId);
          if (found) {
            config.activeProject = found.id;
            config.localPath = found.localPath;
            config.repoUrl = found.repoUrl;
            config.godotProjectPath = found.godotProjectPath || found.localPath;
          }
        }

        if (payload.deleteProjectId && Array.isArray(config.projects)) {
          config.projects = config.projects.filter(p => p.id !== payload.deleteProjectId);
          if (config.activeProject === payload.deleteProjectId) {
            const first = config.projects[0] || {
              id: "godot_ai",
              name: "godot_AI (Starter Kit)",
              localPath: REPO_ROOT,
              godotProjectPath: path.join(REPO_ROOT, 'godot_project'),
              repoUrl: detectRemoteRepoUrl(resolvedGit)
            };
            config.activeProject = first.id;
            config.localPath = first.localPath;
            config.repoUrl = first.repoUrl;
            config.godotProjectPath = first.godotProjectPath || first.localPath;
          }
        }

        if (payload.localPath) config.localPath = payload.localPath.trim();
        if (payload.repoUrl) config.repoUrl = payload.repoUrl.trim();
        if (payload.godotExe) {
          config.godotExe = payload.godotExe.trim();
          resolvedGodot = config.godotExe;
        }
        if (payload.gitPath) {
          config.gitPath = payload.gitPath.trim();
          resolvedGit = config.gitPath;
        }

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
          if (idx >= 0) config.projects[idx] = projectEntry;
          else config.projects.push(projectEntry);
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
  console.log(`[Godot AI Studio Daemon v3.0] Berjalan di http://127.0.0.1:${PORT}`);
  console.log(`Folder Proyek : ${config.localPath}`);
  console.log(`Executable Git: ${resolvedGit}`);
  console.log(`Executable Godot: ${resolvedGodot || '(Belum terdeteksi - dapat diatur di tab Proyek)'}`);
});