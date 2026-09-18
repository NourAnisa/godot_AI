// Godot AI - Game Dev Assistant v2.1 (Multi-Project Edition)
// Compatible with ChatGPT, Claude, DeepSeek, Gemini

(function() {
  if (window.__GODOT_AI_LOADED_V21__) return;
  window.__GODOT_AI_LOADED_V21__ = true;

  const DAEMON_URL = 'http://127.0.0.1:32124';
  let isCollapsed = false;
  let activeTab = 'prompts';
  let projectContextCache = null;
  let activeConfig = null;

  // -------------------------------------------------------------
  // Toast Notification
  // -------------------------------------------------------------
  const toast = document.createElement('div');
  toast.id = 'gai-toast';
  document.body.appendChild(toast);

  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.style.background = isError ? '#dc2626' : '#4f46e5';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // -------------------------------------------------------------
  // AI Input Injector (Multi-Platform)
  // -------------------------------------------------------------
  function insertTextToAI(text) {
    let inputEl = document.querySelector('#prompt-textarea') ||
                  document.querySelector('div[contenteditable="true"][data-placeholder]') ||
                  document.querySelector('div[contenteditable="true"].ProseMirror') ||
                  document.querySelector('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]') ||
                  document.querySelector('rich-textarea div[contenteditable="true"]') ||
                  document.querySelector('textarea') ||
                  document.querySelector('div[contenteditable="true"]');

    if (!inputEl) {
      navigator.clipboard.writeText(text);
      showToast('📋 Prompt disalin ke clipboard! (Tempelkan dengan Ctrl+V)');
      return;
    }

    inputEl.focus();

    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = text;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      inputEl.innerText = text;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }

    showToast('✨ Berhasil dimasukkan ke chatbox AI!');
  }

  // -------------------------------------------------------------
  // SMART FEATURE 1: 1-Click "Apply to Godot" Button on Code Blocks
  // -------------------------------------------------------------
  function guessFilenameFromCode(code) {
    const pathMatch = code.match(/#\s*(?:res:\/\/|path:\s*|file:\s*)?([A-Za-z0-9_\-\/]+\.(?:gd|tscn))/i);
    if (pathMatch) return pathMatch[1];

    const classMatch = code.match(/class_name\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      const snakeCase = classMatch[1].replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      return `scripts/${snakeCase}.gd`;
    }

    if (code.includes('extends CharacterBody3D') && code.includes('velocity')) {
      return 'scripts/player_controller_3d.gd';
    }
    if (code.includes('SimpleEnemyAI') || code.includes('enum State')) {
      return 'scripts/simple_enemy_ai.gd';
    }
    if (code.includes('ItemPickup') || code.includes('Area3D')) {
      return 'scripts/item_pickup.gd';
    }

    return 'scripts/ai_generated_script.gd';
  }

  function injectApplyButtonsToCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      if (pre.dataset.gaiInjected) return;
      pre.dataset.gaiInjected = 'true';

      const codeEl = pre.querySelector('code') || pre;
      const codeText = codeEl.innerText || codeEl.textContent || '';

      const isGdscript = codeText.includes('extends ') ||
                         codeText.includes('func _ready') ||
                         codeText.includes('func _physics_process') ||
                         codeText.includes('var ') ||
                         codeText.includes('CharacterBody') ||
                         codeText.includes('@export');

      if (!isGdscript) return;

      const bar = document.createElement('div');
      bar.className = 'gai-code-action-bar';
      
      const btn = document.createElement('button');
      btn.className = 'gai-apply-btn';
      btn.innerHTML = '<span>⚡</span> Pasang ke Godot';
      btn.title = 'Tulis kode ini langsung ke folder proyek Godot di laptop';

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Memasang...';

        const guessedFile = guessFilenameFromCode(codeText);
        const filename = prompt('Simpan kode GDScript ini ke file:', guessedFile);
        if (!filename) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡</span> Pasang ke Godot';
          return;
        }

        try {
          const res = await fetch(`${DAEMON_URL}/apply-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, code: codeText })
          });
          const data = await res.json();
          if (data.success) {
            btn.innerHTML = '<span>✅</span> Terpasang di Godot!';
            btn.classList.add('applied');
            showToast(`🚀 File tersimpan di ${data.file}! Siap diuji di Godot.`);
            setTimeout(() => {
              btn.innerHTML = '<span>⚡</span> Pasang ke Godot';
              btn.classList.remove('applied');
              btn.disabled = false;
            }, 3000);
          } else {
            showToast('❌ Gagal: ' + data.error, true);
            btn.disabled = false;
            btn.innerHTML = '<span>⚡</span> Pasang ke Godot';
          }
        } catch (err) {
          showToast('❌ Tidak dapat terhubung ke daemon (Pastikan start-sync.bat aktif)', true);
          btn.disabled = false;
          btn.innerHTML = '<span>⚡</span> Pasang ke Godot';
        }
      });

      bar.appendChild(btn);
      pre.parentNode.insertBefore(bar, pre);
    });
  }

  // -------------------------------------------------------------
  // Main Floating Widget UI
  // -------------------------------------------------------------
  const widget = document.createElement('div');
  widget.id = 'godot-ai-widget';
  widget.innerHTML = `
    <div class="gai-card" id="gai-card">
      <div class="gai-header" id="gai-header">
        <div class="gai-title">
          <span>⚡</span>
          <span id="gai-header-proj-name">Godot AI</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="gai-git-badge" class="gai-badge gai-badge-offline">Offline</span>
          <button id="gai-btn-toggle" class="gai-btn-toggle">▼</button>
        </div>
      </div>

      <div class="gai-body" id="gai-body">
        <!-- Tabs Navigation -->
        <div class="gai-tabs">
          <button class="gai-tab active" data-tab="prompts">📚 Prompt</button>
          <button class="gai-tab" data-tab="context">🧠 Konteks</button>
          <button class="gai-tab" data-tab="wizard">🎮 Wizard</button>
          <button class="gai-tab" data-tab="project">📂 Proyek</button>
          <button class="gai-tab" data-tab="debug">🐞 Error</button>
          <button class="gai-tab" data-tab="git">🔄 Git</button>
        </div>

        <!-- TAB 1: QUICK PROMPTS -->
        <div id="gai-tab-prompts" class="gai-tab-content">
          <div class="gai-prompts">
            <button class="gai-prompt-btn" data-type="movement">
              <span style="font-size: 15px;">🏃</span>
              <div>
                <strong>Player 3D Controller</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">WASD, sprint, jump, mouse look + komentar</div>
              </div>
            </button>
            <button class="gai-prompt-btn" data-type="fsm">
              <span style="font-size: 15px;">⚔️</span>
              <div>
                <strong>AI Enemy FSM (State Machine)</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Patroli, kejar pemain, serang</div>
              </div>
            </button>
            <button class="gai-prompt-btn" data-type="inventory">
              <span style="font-size: 15px;">🎒</span>
              <div>
                <strong>Sistem Inventory & Pick-Up</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Ambil item 3D & tampilkan di UI</div>
              </div>
            </button>
            <button class="gai-prompt-btn" data-type="laporan">
              <span style="font-size: 15px;">📝</span>
              <div>
                <strong>Dokumentasi Teknis Proyek</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Penjelasan arsitektur & dokumentasi kode</div>
              </div>
            </button>
          </div>
        </div>

        <!-- TAB 2: SMART PROJECT CONTEXT -->
        <div id="gai-tab-context" class="gai-tab-content" style="display: none;">
          <div class="gai-context-box">
            <div class="gai-context-item">
              <span>Proyek:</span>
              <strong id="gai-ctx-proj-name">Memindai...</strong>
            </div>
            <div class="gai-context-item">
              <span>Scenes:</span>
              <span id="gai-ctx-scenes-count">-</span>
            </div>
            <div class="gai-context-item">
              <span>Scripts:</span>
              <span id="gai-ctx-scripts-count">-</span>
            </div>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin: 6px 0;">
            Kirim struktur seluruh scene, node, dan variabel proyek Godotmu ke AI agar balasan AI 100% tepat dan nyambung dengan kodinganmu!
          </p>
          <button id="gai-btn-send-context" class="gai-btn-primary">
            📋 Kirim Konteks Proyek ke AI
          </button>
        </div>

        <!-- TAB 3: GAME MECHANICS WIZARD -->
        <div id="gai-tab-wizard" class="gai-tab-content" style="display: none;">
          <div class="gai-wizard-section">
            <span class="gai-wizard-label">1. Tipe / Genre Game:</span>
            <select id="gai-wiz-genre" class="gai-select">
              <option value="3D Survival Open World">3D Survival Open World</option>
              <option value="3D Action Platformer">3D Action Platformer</option>
              <option value="First-Person Shooter (FPS)">First-Person Shooter (FPS)</option>
              <option value="2D Top-Down RPG">2D Top-Down RPG</option>
              <option value="2D Metroidvania Platformer">2D Metroidvania Platformer</option>
            </select>

            <span class="gai-wizard-label">2. Pilih Mekanik Karakter:</span>
            <div class="gai-checkbox-grid">
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-sprint" checked /> Sprint & Stamina</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-jump" checked /> Double Jump</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-dash" /> Dash / Dodge</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-crouch" /> Crouch / Nunduk</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-hp" checked /> Health Bar UI</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-inventory" checked /> Inventory Item</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-fsm" checked /> Enemy FSM AI</label>
              <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-daynight" /> Day/Night Sky</label>
            </div>

            <button id="gai-btn-generate-wizard" class="gai-btn-primary" style="margin-top: 6px;">
              ✨ Buat Prompt Spesifikasi Otomatis
            </button>
          </div>
        </div>

        <!-- TAB 4: CHOOSE FOLDER & REPO (PROJECT SETTINGS) -->
        <div id="gai-tab-project" class="gai-tab-content" style="display: none;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <label style="font-size: 11px; color: #818cf8; font-weight: 600;">Pilih Proyek Game Aktif:</label>
              <select id="gai-proj-select" class="gai-select" style="margin-top: 3px;">
                <option value="godot_ai">godot_AI (Starter Kit)</option>
                <option value="fading_dawn">fading-dawn-godot</option>
                <option value="custom">+ Atur Folder Lain</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8;">Path Folder Lokal Laptop:</label>
              <input type="text" id="gai-inp-local-path" class="gai-select" style="font-size: 11px; margin-top: 3px;" placeholder="C:\Users\...\FolderGodot" />
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8;">URL Repository GitHub:</label>
              <input type="text" id="gai-inp-repo-url" class="gai-select" style="font-size: 11px; margin-top: 3px;" placeholder="https://github.com/Username/repo.git" />
            </div>

            <button id="gai-btn-save-project" class="gai-btn-primary" style="background: #059669;">
              💾 Terapkan & Simpan Proyek
            </button>
          </div>
        </div>

        <!-- TAB 5: DEBUG ERROR FIXER -->
        <div id="gai-tab-debug" class="gai-tab-content" style="display: none;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 11px; color: #94a3b8;">Tempel Pesan Error dari Konsol Godot:</label>
            <textarea id="gai-error-input" class="gai-error-textarea" placeholder="Paste error merah dari Godot debugger di sini..."></textarea>
            <button id="gai-btn-fix-error" class="gai-btn-primary" style="background: #dc2626;">🔍 Analisis & Tanyakan Solusi ke AI</button>
          </div>
        </div>

        <!-- TAB 6: GIT SYNC -->
        <div id="gai-tab-git" class="gai-tab-content" style="display: none;">
          <div class="gai-context-box">
            <div class="gai-context-item">
              <span>Repo:</span>
              <a id="gai-git-repo-link" href="#" target="_blank" style="color: #818cf8; text-decoration: none;">-</a>
            </div>
            <div class="gai-context-item">
              <span>Status:</span>
              <span id="gai-git-status-text">-</span>
            </div>
          </div>
          <div class="gai-actions" style="margin-top: 8px;">
            <button id="gai-btn-pull" class="gai-btn gai-btn-pull">⬇️ Pull dari AI</button>
            <button id="gai-btn-push" class="gai-btn gai-btn-push">⬆️ Push Perubahan</button>
            <button id="gai-btn-sync" class="gai-btn gai-btn-sync">🔄 Cek Sinkronisasi</button>
          </div>
        </div>
      </div>

      <div class="gai-footer">
        <span id="gai-footer-proj-info">Folder: godot_AI</span>
        <a id="gai-footer-github-link" href="https://github.com/NourAnisa/godot_AI" target="_blank" style="color: #818cf8; text-decoration: none;">GitHub</a>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  const card = document.getElementById('gai-card');
  const header = document.getElementById('gai-header');
  const btnToggle = document.getElementById('gai-btn-toggle');
  const gitBadge = document.getElementById('gai-git-badge');
  const gitStatusText = document.getElementById('gai-git-status-text');
  const headerProjName = document.getElementById('gai-header-proj-name');
  const footerProjInfo = document.getElementById('gai-footer-proj-info');
  const footerGithubLink = document.getElementById('gai-footer-github-link');
  const gitRepoLink = document.getElementById('gai-git-repo-link');
  const tabs = document.querySelectorAll('.gai-tab');

  // Project Selection Elements
  const projSelect = document.getElementById('gai-proj-select');
  const inpLocalPath = document.getElementById('gai-inp-local-path');
  const inpRepoUrl = document.getElementById('gai-inp-repo-url');
  const btnSaveProject = document.getElementById('gai-btn-save-project');

  function toggle() {
    isCollapsed = !isCollapsed;
    card.classList.toggle('gai-collapsed', isCollapsed);
    btnToggle.textContent = isCollapsed ? '▲' : '▼';
  }
  btnToggle.addEventListener('click', toggle);
  header.addEventListener('dblclick', toggle);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');

      ['prompts', 'context', 'wizard', 'project', 'debug', 'git'].forEach(t => {
        const el = document.getElementById(`gai-tab-${t}`);
        if (el) el.style.display = activeTab === t ? 'block' : 'none';
      });

      if (activeTab === 'context') loadProjectContext();
      if (activeTab === 'project') loadProjectConfig();
    });
  });

  const PROMPTS = {
    movement: `Buatkan script CharacterBody3D (GDScript Godot 4) lengkap untuk pergerakan karakter 3D:
- Kontrol WASD untuk navigasi
- Shift untuk Sprint (lari lebih cepat)
- Space untuk Melompat dengan simulasi gravitasi
- Mouse look (kamera third-person atau first-person)
Sertakan komentar penjelasan pada setiap baris logika agar mudah dipahami.`,

    fsm: `Tolong buatkan implementasi AI Musuh (Enemy AI 3D) di Godot 4 menggunakan konsep Finite State Machine (FSM):
1. State IDLE / PATROL: Bergerak secara berkala ke titik patroli acak.
2. State CHASE: Mendeteksi jika player berada dalam radius tertentu lalu mengejar.
3. State ATTACK: Menyerang player saat sudah berada di jarak dekat.
Jelaskan alur transisi antar state ini secara terstruktur.`,

    inventory: `Buatkan sistem Inventory dan Item Pick-up sederhana di Godot 4:
1. Item di dunia 3D (Area3D) yang dapat diambil saat player menyentuh / menekan tombol E.
2. Data inventory disimpan menggunakan Dictionary / Resource GDScript.
3. UI sederhana (CanvasLayer) untuk menampilkan daftar item dan jumlahnya di layar.
Tuliskan kodenya secara modular dan bersih.`,

    laporan: `Tolong buatkan draf dokumentasi / laporan teknis pengembangan game Godot 4 dari script/fitur yang baru saja kita diskusikan:
1. Tujuan dan fungsi modul/skrip.
2. Struktur Scene dan Node yang digunakan.
3. Penjelasan fungsi utama (_ready, _physics_process) dan sinyal (signals).
4. Analisis efisiensi algoritma.`
  };

  document.querySelectorAll('.gai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (PROMPTS[type]) insertTextToAI(PROMPTS[type]);
    });
  });

  // -------------------------------------------------------------
  // SMART TAB: Project Config (Choose Folder & Repo)
  // -------------------------------------------------------------
  async function loadProjectConfig() {
    try {
      const res = await fetch(`${DAEMON_URL}/config`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      activeConfig = data.config;

      inpLocalPath.value = activeConfig.localPath || '';
      inpRepoUrl.value = activeConfig.repoUrl || '';

      const folderName = (activeConfig.localPath || '').split(/[\\\/]/).filter(Boolean).pop() || 'Godot AI';
      headerProjName.textContent = folderName;
      footerProjInfo.textContent = `Folder: ${folderName}`;
      footerGithubLink.href = activeConfig.repoUrl || '#';
      gitRepoLink.textContent = (activeConfig.repoUrl || '').replace('.git', '').split('/').slice(-2).join('/');
      gitRepoLink.href = activeConfig.repoUrl || '#';

      if (data.projects && data.projects.length) {
        projSelect.innerHTML = '';
        data.projects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          if (p.id === data.activeProject) opt.selected = true;
          projSelect.appendChild(opt);
        });
        const customOpt = document.createElement('option');
        customOpt.value = 'custom';
        customOpt.textContent = '+ Atur Folder / Repo Lain';
        projSelect.appendChild(customOpt);
      }
    } catch {}
  }

  projSelect.addEventListener('change', () => {
    const val = projSelect.value;
    if (val === 'custom') {
      inpLocalPath.value = '';
      inpRepoUrl.value = '';
      inpLocalPath.focus();
      return;
    }
    if (activeConfig && activeConfig.projects) {
      const p = activeConfig.projects.find(x => x.id === val);
      if (p) {
        inpLocalPath.value = p.localPath || '';
        inpRepoUrl.value = p.repoUrl || '';
      }
    }
  });

  btnSaveProject.addEventListener('click', async () => {
    const localPath = inpLocalPath.value.trim();
    const repoUrl = inpRepoUrl.value.trim();
    if (!localPath) {
      showToast('⚠️ Silakan isi path folder lokal!', true);
      return;
    }

    btnSaveProject.disabled = true;
    btnSaveProject.textContent = 'Menyimpan...';

    try {
      const folderName = localPath.split(/[\\\/]/).filter(Boolean).pop() || 'MyGame';
      const res = await fetch(`${DAEMON_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPath, repoUrl, projectName: folderName })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`✅ Proyek aktif diganti ke: ${folderName}!`);
        btnSaveProject.textContent = '✅ Tersimpan!';
        setTimeout(() => {
          btnSaveProject.textContent = '💾 Terapkan & Simpan Proyek';
          btnSaveProject.disabled = false;
        }, 2000);
        loadProjectConfig();
        updateGitStatus();
      }
    } catch (e) {
      showToast('❌ Gagal menyimpan proyek', true);
      btnSaveProject.disabled = false;
      btnSaveProject.textContent = '💾 Terapkan & Simpan Proyek';
    }
  });

  // -------------------------------------------------------------
  // SMART TAB: Project Context Loader
  // -------------------------------------------------------------
  async function loadProjectContext() {
    const projNameEl = document.getElementById('gai-ctx-proj-name');
    const scenesEl = document.getElementById('gai-ctx-scenes-count');
    const scriptsEl = document.getElementById('gai-ctx-scripts-count');

    try {
      const res = await fetch(`${DAEMON_URL}/project-context`);
      if (!res.ok) throw new Error();
      projectContextCache = await res.json();

      projNameEl.textContent = projectContextCache.projectName || 'Godot AI';
      scenesEl.textContent = `${projectContextCache.scenes.length} scene (${projectContextCache.scenes.map(s => s.file.split('/').pop()).join(', ')})`;
      scriptsEl.textContent = `${projectContextCache.scripts.length} script (${projectContextCache.scripts.map(s => s.className || s.file.split('/').pop()).join(', ')})`;
    } catch {
      projNameEl.textContent = 'Daemon Offline';
      scenesEl.textContent = '-';
      scriptsEl.textContent = '-';
    }
  }

  document.getElementById('gai-btn-send-context').addEventListener('click', async () => {
    if (!projectContextCache) await loadProjectContext();
    if (projectContextCache && projectContextCache.formattedPrompt) {
      insertTextToAI(projectContextCache.formattedPrompt);
    } else {
      showToast('⚠️ Pastikan sync daemon aktif di laptop!', true);
    }
  });

  // -------------------------------------------------------------
  // SMART TAB: Game Mechanics Wizard
  // -------------------------------------------------------------
  document.getElementById('gai-btn-generate-wizard').addEventListener('click', () => {
    const genre = document.getElementById('gai-wiz-genre').value;
    const mechanics = [];

    if (document.getElementById('wiz-chk-sprint').checked) mechanics.push('Sistem Lari Sprint (Shift) dengan konsumsi Stamina Bar');
    if (document.getElementById('wiz-chk-jump').checked) mechanics.push('Double Jump (Lompat Dua Kali)');
    if (document.getElementById('wiz-chk-dash').checked) mechanics.push('Dash / Dodge cepat dengan cooldown');
    if (document.getElementById('wiz-chk-crouch').checked) mechanics.push('Crouch / Berjongkok mengubah tinggi collision');
    if (document.getElementById('wiz-chk-hp').checked) mechanics.push('Sistem HP Karakter + Tampilan Health Bar di UI');
    if (document.getElementById('wiz-chk-inventory').checked) mechanics.push('Sistem Inventory & Pengambilan Item 3D');
    if (document.getElementById('wiz-chk-fsm').checked) mechanics.push('AI Musuh Berbasis Finite State Machine (Patrol, Chase, Attack)');
    if (document.getElementById('wiz-chk-daynight').checked) mechanics.push('Siklus Siang dan Malam (Procedural Sky + Sun Rotation)');

    const prompt = `Saya sedang mengembangkan game bergenre "${genre}" di Godot Engine 4.
Tolong buatkan arsitektur dan script GDScript lengkap untuk mengimplementasikan fitur-fitur berikut:

${mechanics.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Persyaratan Khusus:
- Gunakan standar GDScript Godot 4 terbaru (static typing: float, int, Vector3, dll.).
- Cantumkan nama file yang disarankan di baris pertama script (contoh: # res://scripts/...).
- Berikan komentar jelas yang menjelaskan logika kodenya.`;

    insertTextToAI(prompt);
  });

  // Debug Error Fixer
  const errorInput = document.getElementById('gai-error-input');
  document.getElementById('gai-btn-fix-error').addEventListener('click', () => {
    const err = errorInput.value.trim();
    if (!err) {
      showToast('⚠️ Silakan tempelkan pesan error terlebih dahulu!', true);
      return;
    }
    const prompt = `Saya menemui error berikut di Godot Engine 4:\n\n\`\`\`text\n${err}\n\`\`\`\n\nTolong bantu selesaikan masalah ini:\n1. Jelaskan mengapa error ini terjadi dalam bahasa yang mudah dipahami.\n2. Berikan kode perbaikan lengkapnya.\n3. Berikan tips agar tidak mengulangi kesalahan serupa.`;
    insertTextToAI(prompt);
  });

  async function updateGitStatus() {
    try {
      const res = await fetch(`${DAEMON_URL}/status`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.behind > 0) {
        gitBadge.className = 'gai-badge gai-badge-behind';
        gitBadge.textContent = `${data.behind} Update AI`;
        gitStatusText.textContent = `${data.behind} commit dari AI siap di-pull`;
      } else if (data.uncommittedCount > 0 || data.ahead > 0) {
        gitBadge.className = 'gai-badge gai-badge-ahead';
        gitBadge.textContent = 'Ada Perubahan';
        gitStatusText.textContent = `${data.uncommittedCount} file lokal dimodifikasi`;
      } else {
        gitBadge.className = 'gai-badge gai-badge-synced';
        gitBadge.textContent = 'Tersinkron';
        gitStatusText.textContent = 'Lokal & GitHub sama persis';
      }
    } catch {
      gitBadge.className = 'gai-badge gai-badge-offline';
      gitBadge.textContent = 'Offline';
      gitStatusText.textContent = 'start-sync.bat belum aktif';
    }
  }

  document.getElementById('gai-btn-pull').addEventListener('click', async () => {
    showToast('⏳ Menarik kode dari GitHub...');
    try {
      const res = await fetch(`${DAEMON_URL}/pull`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Berhasil menarik kode ke folder proyek!');
        updateGitStatus();
      }
    } catch {}
  });

  document.getElementById('gai-btn-push').addEventListener('click', async () => {
    showToast('⏳ Menyimpan & Push ke GitHub...');
    try {
      const res = await fetch(`${DAEMON_URL}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Update proyek Godot AI [${new Date().toLocaleTimeString()}]` })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Berhasil push ke GitHub!');
        updateGitStatus();
      }
    } catch {}
  });

  document.getElementById('gai-btn-sync').addEventListener('click', updateGitStatus);

  setInterval(injectApplyButtonsToCodeBlocks, 1500);
  loadProjectConfig();
  updateGitStatus();
  setInterval(updateGitStatus, 10000);

  console.log('[Godot AI v2.1 Multi-Project] Loaded.');
})();