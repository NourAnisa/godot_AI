// Godot AI - Asisten Mahasiswa Content Script
// Supports ChatGPT, Claude, DeepSeek, Gemini

(function() {
  if (window.__GODOT_AI_LOADED__) return;
  window.__GODOT_AI_LOADED__ = true;

  const DAEMON_URL = 'http://127.0.0.1:32124';
  let isCollapsed = false;
  let activeTab = 'prompts'; // 'prompts' | 'git' | 'debug'

  // Toast
  const toast = document.createElement('div');
  toast.id = 'gai-toast';
  document.body.appendChild(toast);

  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.style.background = isError ? '#dc2626' : '#4f46e5';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // Inject Text into AI Input Box (Supports ChatGPT, Claude, DeepSeek, Gemini)
  function insertTextToAI(text) {
    let inputEl = null;

    // ChatGPT
    inputEl = document.querySelector('#prompt-textarea') ||
              document.querySelector('div[contenteditable="true"][data-placeholder]') ||
              // Claude
              document.querySelector('div[contenteditable="true"].ProseMirror') ||
              // DeepSeek
              document.querySelector('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]') ||
              // Gemini
              document.querySelector('rich-textarea div[contenteditable="true"]') ||
              // Generic fallback
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
      // ContentEditable (ChatGPT, Claude, Gemini)
      inputEl.innerText = text;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }

    showToast('✨ Prompt berhasil dimasukkan ke chatbox AI!');
  }

  // Floating Widget
  const widget = document.createElement('div');
  widget.id = 'godot-ai-widget';
  widget.innerHTML = `
    <div class="gai-card" id="gai-card">
      <div class="gai-header" id="gai-header">
        <div class="gai-title">
          <span>🎓</span>
          <span>Godot AI Mahasiswa</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="gai-git-badge" class="gai-badge gai-badge-offline">Offline</span>
          <button id="gai-btn-toggle" class="gai-btn-toggle">▼</button>
        </div>
      </div>

      <div class="gai-body" id="gai-body">
        <!-- Tabs Navigation -->
        <div class="gai-tabs">
          <button class="gai-tab active" data-tab="prompts">📚 Asisten Prompt</button>
          <button class="gai-tab" data-tab="debug">🐞 Fix Error</button>
          <button class="gai-tab" data-tab="git">🔄 Git Sync</button>
        </div>

        <!-- TAB 1: PROMPTS -->
        <div id="gai-tab-prompts" class="gai-tab-content">
          <div class="gai-prompts">
            <button class="gai-prompt-btn" data-type="movement">
              <span class="gai-prompt-icon">🏃</span>
              <div>
                <strong>Player 3D Controller</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">WASD, sprint, jump, mouse look + komentar</div>
              </div>
            </button>

            <button class="gai-prompt-btn" data-type="fsm">
              <span class="gai-prompt-icon">⚔️</span>
              <div>
                <strong>AI Enemy State Machine</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Patroli, kejar pemain, serang (FSM edukatif)</div>
              </div>
            </button>

            <button class="gai-prompt-btn" data-type="inventory">
              <span class="gai-prompt-icon">🎒</span>
              <div>
                <strong>Sistem Inventory & Pick-Up</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Ambil item 3D, simpan data & tampilkan di UI</div>
              </div>
            </button>

            <button class="gai-prompt-btn" data-type="laporan">
              <span class="gai-prompt-icon">📝</span>
              <div>
                <strong>Format Laporan / Tugas Kuliah</strong>
                <div style="font-size: 10.5px; color: #94a3b8;">Jelaskan arsitektur & dokumentasi kode</div>
              </div>
            </button>
          </div>
        </div>

        <!-- TAB 2: DEBUG -->
        <div id="gai-tab-debug" class="gai-tab-content" style="display: none;">
          <div class="gai-error-box">
            <label style="font-size: 11px; color: #94a3b8;">Tempel Pesan Error dari Konsol Godot:</label>
            <textarea id="gai-error-input" class="gai-error-textarea" placeholder="Contoh: Invalid call to function 'move_and_slide' in base 'null instance'..."></textarea>
            <button id="gai-btn-fix-error" class="gai-btn-fix">🔍 Analisis & Tanyakan Solusi ke AI</button>
          </div>
        </div>

        <!-- TAB 3: GIT SYNC -->
        <div id="gai-tab-git" class="gai-tab-content" style="display: none;">
          <div class="gai-git-info">
            <div class="gai-git-row">
              <span>Repo:</span>
              <a href="https://github.com/NourAnisa/godot_AI" target="_blank" style="color: #818cf8; text-decoration: none;">NourAnisa/godot_AI</a>
            </div>
            <div class="gai-git-row">
              <span>Status:</span>
              <span id="gai-git-status-text" class="gai-git-val">-</span>
            </div>
          </div>
          <div class="gai-actions" style="margin-top: 8px;">
            <button id="gai-btn-pull" class="gai-btn gai-btn-pull">⬇️ Pull dari AI</button>
            <button id="gai-btn-push" class="gai-btn gai-btn-push">⬆️ Push Tugas</button>
            <button id="gai-btn-sync" class="gai-btn gai-btn-sync">🔄 Cek Sinkronisasi</button>
          </div>
        </div>
      </div>

      <div class="gai-footer">
        <span>godot_AI Student Toolkit v1.0</span>
        <a href="https://github.com/NourAnisa/godot_AI" target="_blank" style="color: #818cf8; text-decoration: none;">GitHub</a>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  const card = document.getElementById('gai-card');
  const header = document.getElementById('gai-header');
  const btnToggle = document.getElementById('gai-btn-toggle');
  const gitBadge = document.getElementById('gai-git-badge');
  const gitStatusText = document.getElementById('gai-git-status-text');
  const tabs = document.querySelectorAll('.gai-tab');

  // Toggle Collapse
  function toggle() {
    isCollapsed = !isCollapsed;
    card.classList.toggle('gai-collapsed', isCollapsed);
    btnToggle.textContent = isCollapsed ? '▲' : '▼';
  }
  btnToggle.addEventListener('click', toggle);
  header.addEventListener('dblclick', toggle);

  // Switch Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');
      document.getElementById('gai-tab-prompts').style.display = activeTab === 'prompts' ? 'block' : 'none';
      document.getElementById('gai-tab-debug').style.display = activeTab === 'debug' ? 'block' : 'none';
      document.getElementById('gai-tab-git').style.display = activeTab === 'git' ? 'block' : 'none';
    });
  });

  // Prompt Templates Dictionary
  const PROMPTS = {
    movement: `Buatkan script CharacterBody3D (GDScript Godot 4) lengkap untuk pergerakan karakter 3D:
- Kontrol WASD untuk navigasi
- Shift untuk Sprint (lari lebih cepat)
- Space untuk Melompat dengan simulasi gravitasi
- Mouse look (kamera third-person atau first-person)
Sertakan komentar penjelasan pada setiap baris logika agar mudah dipahami untuk keperluan laporan praktikum game dev.`,

    fsm: `Tolong buatkan implementasi AI Musuh (Enemy AI 3D) di Godot 4 menggunakan konsep Finite State Machine (FSM):
1. State IDLE / PATROL: Bergerak secara berkala ke titik patroli acak.
2. State CHASE: Mendeteksi jika player berada dalam radius tertentu lalu mengejar.
3. State ATTACK: Menyerang player saat sudah berada di jarak dekat.
Jelaskan alur transisi antar state ini secara edukatif agar mahasiswa bisa memahaminya.`,

    inventory: `Buatkan sistem Inventory dan Item Pick-up sederhana di Godot 4:
1. Item di dunia 3D (Area3D) yang dapat diambil saat player menyentuh / menekan tombol interaksi E.
2. Data inventory disimpan menggunakan Dictionary / Resource GDScript.
3. UI sederhana (CanvasLayer) untuk menampilkan daftar item dan jumlahnya di layar.
Tuliskan kodenya secara modular dan bersih.`,

    laporan: `Tolong buatkan draf dokumentasi / laporan teknis untuk tugas kuliah pengembangan game Godot 4 dari script/fitur yang baru saja kita diskusikan:
1. Tujuan dan fungsi modul/skrip.
2. Struktur Scene dan Node yang digunakan.
3. Penjelasan fungsi utama (_ready, _process, _physics_process) dan sinyal (signal).
4. Analisis efisiensi algoritma.`
  };

  // Bind Prompt Buttons
  document.querySelectorAll('.gai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (PROMPTS[type]) {
        insertTextToAI(PROMPTS[type]);
      }
    });
  });

  // Debug Error Fixer
  const errorInput = document.getElementById('gai-error-input');
  document.getElementById('gai-btn-fix-error').addEventListener('click', () => {
    const err = errorInput.value.trim();
    if (!err) {
      showToast('⚠️ Silakan tempelkan pesan error terlebih dahulu!', true);
      return;
    }
    const prompt = `Saya menemui error berikut di Godot Engine 4:\n\n\`\`\`text\n${err}\n\`\`\`\n\nTolong bantu mahasiswa ini:\n1. Jelaskan mengapa error ini terjadi dalam bahasa yang mudah dipahami.\n2. Berikan kode perbaikan lengkapnya.\n3. Berikan tips agar tidak mengulangi kesalahan serupa.`;
    insertTextToAI(prompt);
  });

  // Git Sync Logic
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
        gitStatusText.textContent = `${data.uncommittedCount} file tugas dimodifikasi`;
      } else {
        gitBadge.className = 'gai-badge gai-badge-synced';
        gitBadge.textContent = 'Tersinkron';
        gitStatusText.textContent = 'Lokal & GitHub sama persis';
      }
    } catch (e) {
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
      } else {
        showToast('❌ Gagal pull: ' + data.error, true);
      }
    } catch {
      showToast('❌ Daemon offline', true);
    }
  });

  document.getElementById('gai-btn-push').addEventListener('click', async () => {
    showToast('⏳ Menyimpan & Push tugas ke GitHub...');
    try {
      const res = await fetch(`${DAEMON_URL}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Update tugas Godot AI mahasiswa [${new Date().toLocaleTimeString()}]` })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Berhasil push tugas ke GitHub!');
        updateGitStatus();
      } else {
        showToast('❌ Gagal push: ' + data.error, true);
      }
    } catch {
      showToast('❌ Daemon offline', true);
    }
  });

  document.getElementById('gai-btn-sync').addEventListener('click', updateGitStatus);

  // Check periodically
  updateGitStatus();
  setInterval(updateGitStatus, 10000);

  console.log('[Godot AI Mahasiswa] Content script active.');
})();