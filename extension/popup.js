const DAEMON_URL = 'http://127.0.0.1:32124';
const daemonBadge = document.getElementById('daemon-badge');
const gitStatus = document.getElementById('git-status');
const selProjects = document.getElementById('sel-projects');
const inpLocalPath = document.getElementById('inp-local-path');
const inpRepoUrl = document.getElementById('inp-repo-url');
const inpGodotExe = document.getElementById('inp-godot-exe');
const btnSaveConfig = document.getElementById('btn-save-config');
const btnPull = document.getElementById('btn-pull');
const btnPush = document.getElementById('btn-push');
const btnRefresh = document.getElementById('btn-refresh');

let configCache = null;

async function loadConfig() {
  try {
    const res = await fetch(`${DAEMON_URL}/config`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    configCache = data.config;

    daemonBadge.textContent = 'Online (Port 32124)';
    daemonBadge.className = 'badge-ok';

    inpLocalPath.value = configCache.localPath || '';
    inpRepoUrl.value = configCache.repoUrl || '';
    if (inpGodotExe) inpGodotExe.value = configCache.godotExe || '';

    // Populate dropdown
    if (data.projects && data.projects.length) {
      selProjects.innerHTML = '';
      data.projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === data.activeProject) opt.selected = true;
        selProjects.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = '+ Tambah / Atur Proyek Baru';
      selProjects.appendChild(customOpt);
    }
  } catch {
    daemonBadge.textContent = 'Offline (Jalankan start-sync.bat)';
    daemonBadge.className = 'badge-err';
  }
}

async function loadStatus() {
  try {
    const res = await fetch(`${DAEMON_URL}/status`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data.behind > 0) {
      gitStatus.textContent = `${data.behind} update AI siap di-pull`;
      gitStatus.style.color = '#fbbf24';
    } else if (data.uncommittedCount > 0) {
      gitStatus.textContent = `${data.uncommittedCount} file lokal diubah`;
      gitStatus.style.color = '#818cf8';
    } else {
      gitStatus.textContent = 'Tersinkron';
      gitStatus.style.color = '#34d399';
    }
  } catch {}
}

selProjects.addEventListener('change', () => {
  const selected = selProjects.value;
  if (selected === 'custom') {
    inpLocalPath.value = '';
    inpRepoUrl.value = '';
    inpLocalPath.focus();
    return;
  }
  if (configCache && configCache.projects) {
    const p = configCache.projects.find(x => x.id === selected);
    if (p) {
      inpLocalPath.value = p.localPath || '';
      inpRepoUrl.value = p.repoUrl || '';
    }
  }
});

btnSaveConfig.addEventListener('click', async () => {
  const localPath = inpLocalPath.value.trim();
  const repoUrl = inpRepoUrl.value.trim();
  if (!localPath) {
    alert('Silakan isi path folder lokal di laptop!');
    return;
  }

  btnSaveConfig.disabled = true;
  btnSaveConfig.textContent = 'Menyimpan...';

  try {
    const payload = {
      localPath,
      repoUrl,
      projectName: localPath.split(/[\\\/]/).filter(Boolean).pop() || 'MyGame'
    };
    if (inpGodotExe && inpGodotExe.value.trim()) {
      payload.godotExe = inpGodotExe.value.trim();
    }

    const res = await fetch(`${DAEMON_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      btnSaveConfig.textContent = '✅ Pengaturan Berhasil Disimpan!';
      setTimeout(() => {
        btnSaveConfig.textContent = '💾 Terapkan & Simpan Pengaturan';
        btnSaveConfig.disabled = false;
      }, 2000);
      loadConfig();
      loadStatus();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    alert('Gagal menyimpan pengaturan: ' + err.message);
    btnSaveConfig.textContent = '💾 Terapkan & Simpan Pengaturan';
    btnSaveConfig.disabled = false;
  }
});

btnPull.addEventListener('click', async () => {
  try {
    await fetch(`${DAEMON_URL}/pull`, { method: 'POST' });
    loadStatus();
  } catch {}
});

btnPush.addEventListener('click', async () => {
  try {
    await fetch(`${DAEMON_URL}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Update proyek dari popup' })
    });
    loadStatus();
  } catch {}
});

btnRefresh.addEventListener('click', () => {
  loadConfig();
  loadStatus();
});

loadConfig();
loadStatus();