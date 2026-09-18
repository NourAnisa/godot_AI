// Godot AI - Game Dev Assistant v3.5 Pro Studio
// Compatible with ChatGPT, Claude, DeepSeek, Gemini

(function() {
  if (window.__GODOT_AI_LOADED_V35__) return;
  window.__GODOT_AI_LOADED_V35__ = true;

  const DAEMON_URL = 'http://127.0.0.1:32124';
  let isCollapsed = false;
  let activeTab = 'prompts';
  let projectContextCache = null;
  let activeConfig = null;
  let isGameRunning = false;
  let eventSource = null;

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
  // AI Input Injector (Multi-Platform: ChatGPT, Claude, DeepSeek, Gemini)
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
  // Code Analysis Helpers (Filename Guess & InputMap Extraction)
  // -------------------------------------------------------------
  function guessFilenameFromCode(code) {
    const pathMatch = code.match(/#\s*(?:res:\/\/|path:\s*|file:\s*)?([A-Za-z0-9_\-\/]+\.(?:gd|tscn|gdshader))/i);
    if (pathMatch) return pathMatch[1];

    if (code.includes('shader_type')) {
      if (code.includes('diffuse_toon') || code.includes('rim_color')) return 'shaders/toon_shading.gdshader';
      if (code.includes('wind') || code.includes('grass')) return 'shaders/wind_grass.gdshader';
      if (code.includes('water') || code.includes('wave')) return 'shaders/stylized_water.gdshader';
      return 'shaders/custom_shader.gdshader';
    }

    const classMatch = code.match(/class_name\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      const snakeCase = classMatch[1].replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      return 'scripts/' + snakeCase + '.gd';
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
    if (code.includes('CameraShake') || (code.includes('trauma') && code.includes('h_offset'))) {
      return 'scripts/camera_shake.gd';
    }
    if (code.includes('SaveManager') || code.includes('user://savegame.json')) {
      return 'scripts/save_manager.gd';
    }
    if (code.includes('AudioManager') || code.includes('sfx_pool')) {
      return 'scripts/audio_manager.gd';
    }
    if (code.includes('PauseMenu') || code.includes('toggle_pause')) {
      return 'scripts/pause_menu.gd';
    }

    return 'scripts/ai_generated_script.gd';
  }

  function extractInputActions(code) {
    const actions = new Set();
    const regexes = [
      /Input\.is_action_just_pressed\(\s*["']([^"']+)["']\s*\)/g,
      /Input\.is_action_pressed\(\s*["']([^"']+)["']\s*\)/g,
      /Input\.is_action_just_released\(\s*["']([^"']+)["']\s*\)/g,
      /Input\.get_axis\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g,
      /event\.is_action_pressed\(\s*["']([^"']+)["']\s*\)/g,
      /event\.is_action_released\(\s*["']([^"']+)["']\s*\)/g
    ];

    for (const reg of regexes) {
      let m;
      while ((m = reg.exec(code)) !== null) {
        if (m[1] && !m[1].startsWith('ui_')) actions.add(m[1]);
        if (m[2] && !m[2].startsWith('ui_')) actions.add(m[2]);
      }
    }
    return Array.from(actions);
  }

  // -------------------------------------------------------------
  // 1-Click "Apply to Godot" & "InputMap Injector" on Code Blocks
  // -------------------------------------------------------------
  function injectApplyButtonsToCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      if (pre.dataset.gaiInjected) return;
      pre.dataset.gaiInjected = 'true';

      const codeEl = pre.querySelector('code') || pre;
      const codeText = codeEl.innerText || codeEl.textContent || '';

      const isGodotCode = codeText.includes('extends ') ||
                          codeText.includes('func _ready') ||
                          codeText.includes('func _physics_process') ||
                          codeText.includes('var ') ||
                          codeText.includes('CharacterBody') ||
                          codeText.includes('@export') ||
                          codeText.includes('shader_type');

      if (!isGodotCode) return;

      const guessedFile = guessFilenameFromCode(codeText);
      const inputActions = extractInputActions(codeText);

      const bar = document.createElement('div');
      bar.className = 'gai-code-action-bar';
      bar.style.gap = '6px';

      let inputBtnHtml = '';
      if (inputActions.length > 0) {
        inputBtnHtml = `
          <button class="gai-input-btn" title="Daftarkan input actions ini otomatis ke project.godot">
            ⌨️ Daftarkan Input (${inputActions.join(', ')})
          </button>
        `;
      }

      bar.innerHTML = `
        ${inputBtnHtml}
        <button class="gai-apply-btn" title="Simpan kode ini langsung ke folder proyek Godot & Git commit">
          ⚡ Terapkan ke Godot (${guessedFile.split('/').pop()})
        </button>
      `;

      // Apply button handler
      const btnApply = bar.querySelector('.gai-apply-btn');
      btnApply.addEventListener('click', async () => {
        btnApply.disabled = true;
        btnApply.textContent = '⏳ Menyimpan...';

        try {
          const res = await fetch(`${DAEMON_URL}/apply-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: guessedFile,
              code: codeText,
              commitMessage: `AI Code applied: ${guessedFile} via Godot AI Studio`
            })
          });

          if (!res.ok) throw new Error();
          const data = await res.json();

          btnApply.textContent = `✅ Tersimpan: ${data.file}`;
          btnApply.classList.add('applied');
          const notice = data.sanitized ? ' (GDScript 4 otomatis disesuaikan)' : '';
          showToast(`🎉 Berhasil diterapkan ke ${data.file}${notice} & di-commit!`);
          updateGitStatus();
          loadGitTimeline();
        } catch {
          btnApply.textContent = '❌ Gagal Menyimpan';
          btnApply.disabled = false;
          showToast('⚠️ Gagal terhubung ke sync daemon port 32124!', true);
        }
      });

      // Input Map button handler
      if (inputActions.length > 0) {
        const btnInput = bar.querySelector('.gai-input-btn');
        btnInput.addEventListener('click', async () => {
          btnInput.disabled = true;
          btnInput.textContent = '⏳ Menambahkan...';
          try {
            const res = await fetch(`${DAEMON_URL}/inject-inputs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actions: inputActions })
            });
            const data = await res.json();
            if (data.success) {
              btnInput.textContent = `✅ Input Terdaftar (${data.added.length} baru)`;
              showToast(`🎮 InputMap berhasil didaftarkan: ${inputActions.join(', ')}`);
            } else {
              btnInput.textContent = '❌ Gagal';
              btnInput.disabled = false;
            }
          } catch {
            btnInput.textContent = '❌ Offline';
            btnInput.disabled = false;
            showToast('⚠️ Sync daemon belum aktif!', true);
          }
        });
      }

      pre.parentNode.insertBefore(bar, pre);
    });
  }

  // -------------------------------------------------------------
  // SHADER PRESETS DATA
  // -------------------------------------------------------------
  const SHADER_PRESETS = [
    {
      id: 'toon',
      filename: 'shaders/toon_shading.gdshader',
      title: '🎨 Toon Cel-Shading',
      desc: 'Pencahayaan kartun/anime dengan Rim Light edge glow',
      code: `shader_type spatial;
render_mode diffuse_toon, specular_toon;

uniform vec4 albedo_color : source_color = vec4(0.4, 0.6, 0.9, 1.0);
uniform sampler2D texture_albedo : source_color, filter_linear_mipmap;
uniform float roughness : hint_range(0.0, 1.0) = 0.5;
uniform float rim_threshold : hint_range(0.0, 1.0) = 0.6;
uniform vec4 rim_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
	vec4 tex_color = texture(texture_albedo, UV);
	ALBEDO = albedo_color.rgb * tex_color.rgb;
	ROUGHNESS = roughness;

	// Rim Light effect (Stylized Edge Glow)
	float rim = 1.0 - dot(NORMAL, VIEW);
	if (rim > rim_threshold) {
		ALBEDO += rim_color.rgb * (rim - rim_threshold) * 1.5;
	}
}`
    },
    {
      id: 'grass',
      filename: 'shaders/wind_grass.gdshader',
      title: '🌿 Wind Sway Grass',
      desc: 'Simulasi goyangan rumput tertiup angin (Vertex Displacement)',
      code: `shader_type spatial;
render_mode cull_disabled, diffuse_toon;

uniform vec4 grass_color_top : source_color = vec4(0.3, 0.8, 0.4, 1.0);
uniform vec4 grass_color_bottom : source_color = vec4(0.15, 0.4, 0.2, 1.0);
uniform float wind_speed : hint_range(0.1, 5.0) = 1.5;
uniform float wind_strength : hint_range(0.0, 1.0) = 0.25;

void vertex() {
	// Only bend the top part of the blade (UV.y < 0.5)
	float bend = (1.0 - UV.y) * wind_strength;
	float wave = sin(TIME * wind_speed + VERTEX.x * 2.0 + VERTEX.z * 1.5);
	VERTEX.x += wave * bend;
	VERTEX.z += wave * bend * 0.5;
}

void fragment() {
	ALBEDO = mix(grass_color_bottom.rgb, grass_color_top.rgb, 1.0 - UV.y);
	ROUGHNESS = 0.8;
}`
    },
    {
      id: 'water',
      filename: 'shaders/stylized_water.gdshader',
      title: '🌊 Stylized Water Surface',
      desc: 'Permukaan air dinamis dengan gelombang trigonometrik & refleksi',
      code: `shader_type spatial;
render_mode specular_toon;

uniform vec4 water_color : source_color = vec4(0.1, 0.5, 0.8, 0.85);
uniform vec4 foam_color : source_color = vec4(0.9, 0.95, 1.0, 1.0);
uniform float wave_speed : hint_range(0.1, 4.0) = 1.0;
uniform float wave_height : hint_range(0.0, 1.0) = 0.15;

void vertex() {
	float wave = sin(TIME * wave_speed + VERTEX.x * 3.0) * cos(TIME * wave_speed + VERTEX.z * 2.5);
	VERTEX.y += wave * wave_height;
}

void fragment() {
	ALBEDO = water_color.rgb;
	ALPHA = water_color.a;
	ROUGHNESS = 0.1;
	SPECULAR = 0.8;
}`
    }
  ];

  // -------------------------------------------------------------
  // ESSENTIAL PRODUCTION SYSTEMS PRESETS (V3.5)
  // -------------------------------------------------------------
  const SYSTEM_PRESETS = [
    {
      id: 'pause_menu',
      filename: 'scripts/pause_menu.gd',
      title: '⏸ Menu Jeda & Pengaturan',
      desc: 'Pause runtime, AudioServer volume slider, Fullscreen toggle, dan Mouse Capture toggle',
      code: `# res://scripts/pause_menu.gd
class_name PauseMenu
extends Control

signal resumed()
signal quit_requested()

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		toggle_pause()

func toggle_pause() -> void:
	var is_paused = not get_tree().paused
	get_tree().paused = is_paused
	visible = is_paused
	if is_paused:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		resumed.emit()

func set_master_volume(volume_percent: float) -> void:
	var bus_idx = AudioServer.get_bus_index("Master")
	if bus_idx >= 0:
		var db = linear_to_db(clamp(volume_percent / 100.0, 0.0001, 1.0))
		AudioServer.set_bus_volume_db(bus_idx, db)

func toggle_fullscreen(enable: bool) -> void:
	if enable:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)`
    },
    {
      id: 'save_manager',
      filename: 'scripts/save_manager.gd',
      title: '💾 Save & Load Manager (JSON)',
      desc: 'Serialisasi data game ke user://savegame.json dengan validasi dan parsing aman',
      code: `# res://scripts/save_manager.gd
class_name SaveManager
extends Node

const SAVE_PATH: String = "user://savegame.json"

signal game_saved()
signal game_loaded(data: Dictionary)

static func save_data(data: Dictionary) -> bool:
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if not file:
		push_error("Gagal membuka file penyimpanan: " + str(FileAccess.get_open_error()))
		return false
	var json_string = JSON.stringify(data, "\\t")
	file.store_string(json_string)
	file.close()
	print("[SaveManager] Data berhasil disimpan ke " + SAVE_PATH)
	return true

static func load_data() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		print("[SaveManager] File save belum ada, mengembalikan dictionary kosong.")
		return {}
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not file:
		return {}
	var content = file.get_as_text()
	file.close()
	var json = JSON.new()
	var parse_result = json.parse(content)
	if parse_result != OK:
		push_error("[SaveManager] Gagal membaca JSON savegame.")
		return {}
	return json.data`
    },
    {
      id: 'audio_manager',
      filename: 'scripts/audio_manager.gd',
      title: '🎵 3D Audio Manager & SFX Pool',
      desc: 'BGM crossfade otomatis & object pool 8 channel SFX non-blocking untuk performa optimal',
      code: `# res://scripts/audio_manager.gd
class_name AudioManager
extends Node

var bgm_player: AudioStreamPlayer
var sfx_pool: Array[AudioStreamPlayer] = []
const POOL_SIZE: int = 8

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	bgm_player = AudioStreamPlayer.new()
	bgm_player.bus = "Music"
	add_child(bgm_player)

	for i in range(POOL_SIZE):
		var p = AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		sfx_pool.append(p)

func play_bgm(stream: AudioStream, fade_in_sec: float = 1.0) -> void:
	if not stream:
		return
	if bgm_player.playing:
		var tween = create_tween()
		tween.tween_property(bgm_player, "volume_db", -80.0, fade_in_sec)
		tween.tween_callback(func():
			bgm_player.stream = stream
			bgm_player.volume_db = 0.0
			bgm_player.play()
		)
	else:
		bgm_player.stream = stream
		bgm_player.volume_db = 0.0
		bgm_player.play()

func play_sfx(stream: AudioStream, pitch_scale: float = 1.0) -> void:
	if not stream:
		return
	for p in sfx_pool:
		if not p.playing:
			p.stream = stream
			p.pitch_scale = pitch_scale
			p.play()
			return
	sfx_pool[0].stream = stream
	sfx_pool[0].pitch_scale = pitch_scale
	sfx_pool[0].play()`
    },
    {
      id: 'camera_shake',
      filename: 'scripts/camera_shake.gd',
      title: '📳 Trauma Camera Shake 3D',
      desc: 'Screen shake berbasis trauma kuadratik untuk impact pukulan, ledakan, dan dash',
      code: `# res://scripts/camera_shake.gd
class_name CameraShake
extends Camera3D

@export var trauma_decay: float = 1.2
@export var max_offset: Vector2 = Vector2(0.3, 0.3)
@export var max_roll: float = 0.05

var trauma: float = 0.0
var time: float = 0.0

func _process(delta: float) -> void:
	if trauma > 0.0:
		trauma = max(trauma - trauma_decay * delta, 0.0)
		time += delta * 30.0
		var shake_amount = trauma * trauma
		h_offset = max_offset.x * shake_amount * sin(time * 1.3)
		v_offset = max_offset.y * shake_amount * cos(time * 1.7)
		rotation.z = max_roll * shake_amount * sin(time * 0.9)
	else:
		h_offset = 0.0
		v_offset = 0.0
		rotation.z = 0.0

func add_trauma(amount: float) -> void:
	trauma = clamp(trauma + amount, 0.0, 1.0)`
    }
  ];

  // -------------------------------------------------------------
  // WIDGET UI CREATION (V3.5 PRO STUDIO)
  // -------------------------------------------------------------
  const widget = document.createElement('div');
  widget.id = 'godot-ai-widget';

  widget.innerHTML = `
    <div class="gai-card" id="gai-card">
      <div class="gai-header" id="gai-header">
        <div class="gai-title">
          <span>🎮</span>
          <span>Godot AI Studio v3.5</span>
        </div>
        <div class="gai-runner-controls">
          <button id="gai-btn-play" class="gai-run-btn" title="Jalankan game Godot langsung dari browser">▶ Play</button>
          <button id="gai-btn-stop" class="gai-stop-btn" style="display:none;" title="Hentikan game yang sedang berjalan">⏹ Stop</button>
          <button id="gai-btn-toggle" class="gai-btn-toggle" title="Minimize / Expand">_</button>
        </div>
      </div>

      <div class="gai-body" id="gai-body">
        <!-- Navigation Tabs -->
        <div class="gai-tabs">
          <button class="gai-tab active" data-tab="prompts">⚡ Prompts</button>
          <button class="gai-tab" data-tab="console">📜 Console</button>
          <button class="gai-tab" data-tab="systems">🧩 Sistem</button>
          <button class="gai-tab" data-tab="tree">🌳 Hierarchy</button>
          <button class="gai-tab" data-tab="shaders">🎨 Shaders</button>
          <button class="gai-tab" data-tab="wizard">🧙 Wizard</button>
          <button class="gai-tab" data-tab="debug">🩺 Debug</button>
          <button class="gai-tab" data-tab="git">🐙 Git</button>
          <button class="gai-tab" data-tab="project">⚙️ Proyek</button>
        </div>

        <!-- TAB: PROMPTS -->
        <div class="gai-tab-content" id="tab-prompts">
          <div class="gai-prompts">
            <button class="gai-prompt-btn" data-type="player">🏃 Player Controller 3D Lengkap</button>
            <button class="gai-prompt-btn" data-type="enemy">👾 Finite State Machine AI Musuh</button>
            <button class="gai-prompt-btn" data-type="inventory">🎒 Sistem Inventory & Item Pickup 3D</button>
            <button class="gai-prompt-btn" data-type="daynight">🌅 Siklus Siang-Malam & Langit Prosedural</button>
            <button class="gai-prompt-btn" data-type="dungeon">🏰 Level / Dungeon Blockout Prosedural</button>
            <button class="gai-prompt-btn" data-type="camera">🎥 Kamera Third-Person SpringArm3D</button>
          </div>
        </div>

        <!-- TAB: LIVE CONSOLE STREAMER (V3.5) -->
        <div class="gai-tab-content" id="tab-console" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; color:#94a3b8;" id="gai-console-status">Live Stream: Menghubungkan...</span>
            <button id="gai-btn-clear-console" class="gai-tab" style="padding:2px 8px; font-size:10px; background:rgba(255,255,255,0.06);">🧹 Bersihkan</button>
          </div>
          <div class="gai-console-container" id="gai-console-logs">
            <div style="color:#64748b; font-size:11px; padding:6px; text-align:center;">
              Jalankan game (▶ Play) untuk melihat output konsol realtime di sini.
            </div>
          </div>
        </div>

        <!-- TAB: PRODUCTION SYSTEMS PALETTE (V3.5) -->
        <div class="gai-tab-content" id="tab-systems" style="display:none;">
          <div class="gai-system-grid" id="gai-system-list">
            <!-- Rendered by JS -->
          </div>
        </div>

        <!-- TAB: VISUAL SCENE TREE HIERARCHY -->
        <div class="gai-tab-content" id="tab-tree" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; color:#94a3b8;" id="gai-tree-title">Scene Tree: Memuat...</span>
            <button id="gai-btn-refresh-tree" class="gai-tab" style="padding:2px 8px; font-size:10px;">🔄 Refresh</button>
          </div>
          <div class="gai-tree-container" id="gai-tree-nodes">
            <div style="color:#94a3b8; font-size:11px; padding:6px;">Memindai hierarki node Godot...</div>
          </div>
          <button id="gai-btn-send-context" class="gai-btn-primary" style="margin-top:8px; font-size:11.5px;">
            📋 Masukkan Konteks Proyek Lengkap ke AI
          </button>
        </div>

        <!-- TAB: SHADER PRESETS -->
        <div class="gai-tab-content" id="tab-shaders" style="display:none;">
          <div class="gai-shader-grid" id="gai-shader-list">
            <!-- Rendered by JS -->
          </div>
        </div>

        <!-- TAB: GAME MECHANICS WIZARD -->
        <div class="gai-tab-content" id="tab-wizard" style="display:none;">
          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Genre Game:</label>
          <select id="gai-wiz-genre" class="gai-select">
            <option value="Action RPG 3D">Action RPG 3D</option>
            <option value="Open World Survival">Open World Survival</option>
            <option value="Platformer 3D">Platformer 3D</option>
            <option value="FPS / Shooter">FPS / Shooter</option>
            <option value="Roguelike Dungeon">Roguelike Dungeon</option>
            <option value="Horror Atmosphere">Horror Atmosphere</option>
          </select>

          <label style="font-size:11px; color:#94a3b8; display:block; margin:8px 0 4px;">Pilih Mekanik Game:</label>
          <div class="gai-checkbox-grid">
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-sprint" checked> Sprint & Stamina</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-jump" checked> Double Jump</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-dash" checked> Dash / Dodge</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-crouch"> Crouch Collision</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-hp" checked> HP & Health Bar</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-inventory" checked> 3D Inventory</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-fsm" checked> Musuh FSM AI</label>
            <label class="gai-chk-label"><input type="checkbox" id="wiz-chk-daynight"> Siang / Malam</label>
          </div>

          <button id="gai-btn-generate-wizard" class="gai-btn-primary" style="margin-top:10px;">
            🚀 Generate Arsitektur & Script ke AI
          </button>
        </div>

        <!-- TAB: DEBUG & ERROR FIXER -->
        <div class="gai-tab-content" id="tab-debug" style="display:none;">
          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Tempelkan Error Godot:</label>
          <textarea id="gai-error-input" class="gai-error-textarea" placeholder="Invalid get index 'position' on base 'Nil'..."></textarea>
          <button id="gai-btn-fix-error" class="gai-btn-primary" style="margin-top:6px; background:#dc2626;">
            🩺 Analisis & Perbaiki Error dengan AI
          </button>
        </div>

        <!-- TAB: GIT SYNC, ROLLBACK & TIMELINE -->
        <div class="gai-tab-content" id="tab-git" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; color:#94a3b8;">Status Git:</span>
            <span id="gai-git-badge" class="gai-badge gai-badge-offline">Checking...</span>
          </div>
          <div id="gai-git-status-text" style="font-size:11px; color:#cbd5e1; margin-bottom:8px;">Memeriksa daemon...</div>

          <div class="gai-actions" style="margin-bottom:8px;">
            <button id="gai-btn-pull" class="gai-btn-pull">⬇️ Pull AI</button>
            <button id="gai-btn-push" class="gai-btn-push">⬆️ Push</button>
            <button id="gai-btn-rollback" class="gai-btn-rollback" title="Kembalikan file sebelum kode AI terakhir diterapkan">⏮ Rollback Terakhir (.bak)</button>
            <button id="gai-btn-sync" class="gai-btn-sync">🔄 Refresh Status</button>
          </div>

          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Riwayat Commit Terakhir:</span>
          <div class="gai-timeline" id="gai-git-timeline">
            <div style="color:#94a3b8; font-size:11px; padding:4px;">Memuat riwayat commit...</div>
          </div>
        </div>

        <!-- TAB: PROJECT SWITCHER & CONFIG -->
        <div class="gai-tab-content" id="tab-project" style="display:none;">
          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Pilih Proyek Aktif:</label>
          <select id="gai-sel-project" class="gai-select" style="margin-bottom:8px;">
            <option value="godot_ai">Proyek Aktif</option>
            <option value="custom">+ Atur Folder / Repo Lain</option>
          </select>

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:2px;">Folder Proyek di Laptop:</label>
          <input type="text" id="gai-inp-local-path" class="gai-select" style="margin-bottom:6px;" />

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:2px;">URL Repository GitHub:</label>
          <input type="text" id="gai-inp-repo-url" class="gai-select" style="margin-bottom:6px;" />

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:2px;">Executable Godot 4 (.exe):</label>
          <div style="display:flex; gap:6px; margin-bottom:8px; align-items:center;">
            <input type="text" id="gai-inp-godot-exe" class="gai-select" style="flex:1;" placeholder="Otomatis terdeteksi atau C:\Path\Godot.exe" />
            <span id="gai-godot-badge" style="font-size:10px; padding:3px 6px; border-radius:4px; white-space:nowrap; background:rgba(16,185,129,0.2); color:#34d399;">Terdeteksi ✅</span>
          </div>

          <div style="display:flex; gap:6px;">
            <button id="gai-btn-save-project" class="gai-btn-primary" style="background:#10b981; flex:1;">
              💾 Terapkan & Simpan Proyek
            </button>
            <button id="gai-btn-del-project" class="gai-btn-primary" style="background:#ef4444; width:auto; padding:8px 12px; display:none;" title="Hapus proyek ini dari daftar">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div class="gai-footer">
        <span id="gai-footer-proj">Godot 4.x</span>
        <span>Daemon: 127.0.0.1:32124</span>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  // -------------------------------------------------------------
  // Header Controls: Drag, Toggle, Play & Stop
  // -------------------------------------------------------------
  const card = document.getElementById('gai-card');
  const btnToggle = document.getElementById('gai-btn-toggle');
  const btnPlay = document.getElementById('gai-btn-play');
  const btnStop = document.getElementById('gai-btn-stop');

  btnToggle.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    card.classList.toggle('gai-collapsed', isCollapsed);
    btnToggle.textContent = isCollapsed ? '+' : '_';
  });

  async function updateGameStatus() {
    try {
      const res = await fetch(`${DAEMON_URL}/game-status`);
      if (!res.ok) return;
      const data = await res.json();
      isGameRunning = data.running;
      if (isGameRunning) {
        btnPlay.style.display = 'none';
        btnStop.style.display = 'inline-flex';
      } else {
        btnPlay.style.display = 'inline-flex';
        btnStop.style.display = 'none';
      }
    } catch {}
  }

  btnPlay.addEventListener('click', async () => {
    btnPlay.disabled = true;
    btnPlay.textContent = '⏳ Launching...';
    try {
      const res = await fetch(`${DAEMON_URL}/run-game`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Game Godot diluncurkan!');
        updateGameStatus();
      } else {
        showToast('❌ Gagal meluncurkan game: ' + (data.error || ''), true);
      }
    } catch {
      showToast('⚠️ Sync daemon belum aktif!', true);
    } finally {
      btnPlay.disabled = false;
      btnPlay.textContent = '▶ Play';
    }
  });

  btnStop.addEventListener('click', async () => {
    btnStop.disabled = true;
    btnStop.textContent = '⏳ Stopping...';
    try {
      const res = await fetch(`${DAEMON_URL}/stop-game`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('⏹ Game Godot dihentikan.');
        updateGameStatus();
      }
    } catch {
      showToast('⚠️ Sync daemon belum aktif!', true);
    } finally {
      btnStop.disabled = false;
      btnStop.textContent = '⏹ Stop';
    }
  });

  // Draggable Header
  const header = document.getElementById('gai-header');
  let isDragging = false, startX, startY, initialX, initialY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
    widget.style.left = initialX + 'px';
    widget.style.top = initialY + 'px';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    widget.style.left = (initialX + dx) + 'px';
    widget.style.top = (initialY + dy) + 'px';
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  // -------------------------------------------------------------
  // Tabs Navigation
  // -------------------------------------------------------------
  const tabs = document.querySelectorAll('.gai-tab');
  const tabContents = {
    prompts: document.getElementById('tab-prompts'),
    console: document.getElementById('tab-console'),
    systems: document.getElementById('tab-systems'),
    tree: document.getElementById('tab-tree'),
    shaders: document.getElementById('tab-shaders'),
    wizard: document.getElementById('tab-wizard'),
    debug: document.getElementById('tab-debug'),
    git: document.getElementById('tab-git'),
    project: document.getElementById('tab-project')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (!target || !tabContents[target]) return;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.values(tabContents).forEach(c => { if (c) c.style.display = 'none'; });
      tabContents[target].style.display = 'block';
      activeTab = target;

      if (target === 'console') loadConsoleLogs();
      if (target === 'systems') renderSystemsPalette();
      if (target === 'tree') loadVisualSceneTree();
      if (target === 'git') loadGitTimeline();
      if (target === 'project') loadProjectConfig();
    });
  });

  // -------------------------------------------------------------
  // TAB: PROMPTS IMPLEMENTATION
  // -------------------------------------------------------------
  const PROMPTS = {
    player: `Buatkan script CharacterBody3D lengkap di Godot Engine 4 (GDScript) untuk karakter pemain 3D:
1. Pergerakan WASD smooth dengan akselerasi dan deselerasi lerp.
2. Mekanik Lompat (Jump) dengan gravitasi realistis.
3. Fitur Lari (Sprint) menggunakan tombol Shift.
4. Rotasi karakter menghadap arah pandang kamera SpringArm3D.
5. Kode GDScript terstruktur rapi dengan static typing (Vector3, float) dan komentar penjelas.`,

    enemy: `Buatkan Finite State Machine (FSM) AI Musuh 3D di Godot Engine 4 (GDScript):
1. State: PATROL (berkeliling titik acak), CHASE (mengejar pemain saat terdeteksi jarak pandang Area3D), ATTACK (menyerang saat dalam jangkauan serangan).
2. Gunakan CharacterBody3D dengan NavigationAgent3D untuk pathfinding yang mulus.
3. Berikan penanganan animasi atau sinyal saat menyerang atau terkena hit.
4. Kode modular dan mudah diintegrasikan dengan collision shape.`,

    inventory: `Buatkan sistem Inventory dan Pengambilan Item 3D (Item Pickup) di Godot Engine 4:
1. Script ItemPickup (Area3D) yang berputar perlahan dan naik-turun (floating animation).
2. Sistem Autoload/Singleton InventoryManager untuk menyimpan daftar item (Array of Dictionaries atau Resource).
3. Logika deteksi interaksi tombol 'E' saat pemain mendekati item.
4. Lengkap dengan contoh signal 'item_collected(item_name, amount)'.`,

    daynight: `Buatkan sistem Siklus Siang dan Malam (Day and Night Cycle) di Godot Engine 4:
1. Mengendalikan rotasi DirectionalLight3D (Matahari dan Bulan) sepanjang waktu secara dinamis.
2. Mengubah warna cahaya matahari (warna fajar/dawn oranye kemerahan, siang terang, dan malam biru redup).
3. Pengaturan WorldEnvironment procedural sky sesuai waktu dalam game.
4. Export variabel 'day_speed' untuk kemudahan konfigurasi waktu.`,

    dungeon: `Buatkan script Procedural Level / Dungeon Generator sederhana di Godot Engine 4 menggunakan GridMap atau Instantiated Node3D:
1. Menghasilkan ruangan (rooms) dan lorong penghubung (corridors) secara acak berbasis algoritma sederhana.
2. Menempatkan spawn point pemain di ruangan pertama dan tangga keluar di ruangan terakhir.
3. Menyediakan fungsi regenerasi peta secara runtime dengan seed acak.`,

    camera: `Buatkan script SpringArm3D Third-Person Orbit Camera di Godot Engine 4:
1. Mouse look orbit (horizontal & vertikal) dengan clamping sudut elevasi (-80 hingga 70 derajat).
2. Fitur Zoom kamera menggunakan scroll mouse (min_distance & max_distance).
3. Mouse capture otomatis saat klik layar dan release saat tombol Escape.
4. Smooth camera collision agar kamera tidak tembus dinding.`
  };

  document.querySelectorAll('.gai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (PROMPTS[type]) insertTextToAI(PROMPTS[type]);
    });
  });

  // -------------------------------------------------------------
  // TAB: LIVE CONSOLE STREAMER (V3.5)
  // -------------------------------------------------------------
  const consoleStatus = document.getElementById('gai-console-status');
  const consoleLogs = document.getElementById('gai-console-logs');
  const btnClearConsole = document.getElementById('gai-btn-clear-console');

  function appendConsoleLine(entry) {
    if (!consoleLogs) return;

    const placeholder = consoleLogs.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();

    const line = document.createElement('div');
    const isError = entry.type === 'error' || entry.text.toLowerCase().includes('error:') || entry.text.toLowerCase().includes('failed');
    const isWarn = entry.type === 'warn' || entry.text.toLowerCase().includes('warning:');

    line.className = 'gai-console-line' + (isError ? ' error' : (isWarn ? ' warn' : ''));

    const textSpan = document.createElement('span');
    textSpan.textContent = `[${entry.time || new Date().toLocaleTimeString()}] ${entry.text}`;
    line.appendChild(textSpan);

    if (isError) {
      const fixBtn = document.createElement('button');
      fixBtn.className = 'gai-console-fix-btn';
      fixBtn.textContent = '🩺 Perbaiki';
      fixBtn.title = 'Tanyakan ke AI perbaikan untuk error ini';
      fixBtn.addEventListener('click', () => {
        const prompt = `Saya menemukan error berikut saat menjalankan game di Godot Engine 4:

\`\`\`text
${entry.text}
\`\`\`

Tolong jelaskan penyebabnya dan berikan kode perbaikan GDScript 4 yang tepat:`;
        insertTextToAI(prompt);
      });
      line.appendChild(fixBtn);
    }

    consoleLogs.appendChild(line);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
  }

  async function loadConsoleLogs() {
    try {
      const res = await fetch(`${DAEMON_URL}/console-logs`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const logs = Array.isArray(data) ? data : (data.logs || []);
      consoleLogs.innerHTML = '';
      if (logs.length > 0) {
        logs.forEach(appendConsoleLine);
      } else {
        consoleLogs.innerHTML = '<div style="color:#64748b; font-size:11px; padding:6px; text-align:center;">Belum ada log konsol terbaru. Jalankan game untuk melihat output.</div>';
      }
    } catch {
      consoleLogs.innerHTML = '<div style="color:#f87171; font-size:11px; padding:6px;">Daemon offline.</div>';
    }
  }

  btnClearConsole.addEventListener('click', async () => {
    try {
      await fetch(`${DAEMON_URL}/clear-console`, { method: 'POST' });
      consoleLogs.innerHTML = '<div style="color:#64748b; font-size:11px; padding:6px; text-align:center;">Konsol dibersihkan.</div>';
      showToast('🧹 Output konsol dibersihkan.');
    } catch {
      showToast('⚠️ Gagal membersihkan konsol', true);
    }
  });

  // Setup Server-Sent Events (SSE) for Real-Time Console Streaming
  function connectEventSource() {
    if (eventSource) {
      try { eventSource.close(); } catch {}
    }

    try {
      eventSource = new EventSource(`${DAEMON_URL}/events`);
      eventSource.onopen = () => {
        if (consoleStatus) {
          consoleStatus.textContent = 'Live Stream: Terhubung 🟢';
          consoleStatus.style.color = '#34d399';
        }
      };

      eventSource.addEventListener('console-log', (e) => {
        try {
          const entry = JSON.parse(e.data);
          appendConsoleLine(entry);
        } catch {}
      });

      eventSource.onerror = () => {
        if (consoleStatus) {
          consoleStatus.textContent = 'Live Stream: Terputus 🔴';
          consoleStatus.style.color = '#f87171';
        }
        eventSource.close();
        setTimeout(connectEventSource, 4000);
      };
    } catch {
      setTimeout(connectEventSource, 5000);
    }
  }

  connectEventSource();

  // -------------------------------------------------------------
  // TAB: PRODUCTION SYSTEMS PALETTE (V3.5)
  // -------------------------------------------------------------
  const systemsContainer = document.getElementById('gai-system-list');

  function renderSystemsPalette() {
    if (!systemsContainer) return;
    systemsContainer.innerHTML = SYSTEM_PRESETS.map(sys => `
      <div class="gai-system-card">
        <div class="gai-system-info">
          <div class="gai-system-title">${sys.title}</div>
          <div class="gai-system-desc">${sys.desc}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:3px; flex-shrink:0;">
          <button class="gai-apply-btn" data-system-id="${sys.id}" style="padding:3px 8px; font-size:10px;">
            ⚡ Pasang
          </button>
          <button class="gai-tab" data-ask-system-id="${sys.id}" style="padding:2px 6px; font-size:9.5px; background:rgba(255,255,255,0.06);">
            💬 Tanya AI
          </button>
        </div>
      </div>
    `).join('');

    systemsContainer.querySelectorAll('[data-system-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.systemId;
        const system = SYSTEM_PRESETS.find(x => x.id === id);
        if (!system) return;

        btn.disabled = true;
        btn.textContent = '⏳ Menulis...';

        try {
          const res = await fetch(`${DAEMON_URL}/apply-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: system.filename,
              code: system.code,
              commitMessage: `Install system preset: ${system.filename}`
            })
          });
          const data = await res.json();
          if (data.success) {
            btn.textContent = '✅ Terpasang!';
            showToast(`🎉 Sistem berhasil dipasang ke ${system.filename}!`);
            updateGitStatus();
            loadGitTimeline();
          }
        } catch {
          btn.textContent = '❌ Gagal';
          btn.disabled = false;
          showToast('⚠️ Gagal terhubung ke daemon!', true);
        }
      });
    });

    systemsContainer.querySelectorAll('[data-ask-system-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.askSystemId;
        const system = SYSTEM_PRESETS.find(x => x.id === id);
        if (!system) return;

        const prompt = `Saya ingin mengintegrasikan modul sistem "${system.title}" (${system.filename}) ini ke game Godot 4 saya:

\`\`\`gdscript
${system.code}
\`\`\`

Tolong beri panduan langkah demi langkah cara memasang node atau Autoload Singleton-nya dan bagaimana cara memanggil fungsinya di scene game saya.`;
        insertTextToAI(prompt);
      });
    });
  }

  // -------------------------------------------------------------
  // TAB: VISUAL SCENE TREE INSPECTOR
  // -------------------------------------------------------------
  const treeContainer = document.getElementById('gai-tree-nodes');
  const treeTitle = document.getElementById('gai-tree-title');
  const btnRefreshTree = document.getElementById('gai-btn-refresh-tree');

  function getNodeIcon(type) {
    if (type.includes('Character') || type.includes('Body')) return '🏃';
    if (type.includes('Camera')) return '📷';
    if (type.includes('Light')) return '☀️';
    if (type.includes('Collision')) return '📦';
    if (type.includes('Mesh')) return '🔷';
    if (type.includes('Area')) return '⭕';
    if (type.includes('Environment')) return '🌄';
    if (type.includes('Animation')) return '🎬';
    if (type.includes('UI') || type.includes('Control') || type.includes('Label') || type.includes('Button')) return '🖥️';
    return '📁';
  }

  function renderTreeRecursive(node, depth = 0) {
    if (!node) return '';
    const indent = depth * 14;
    const icon = getNodeIcon(node.type || '');
    let html = `
      <div class="gai-tree-node" style="padding-left: ${indent + 4}px;" data-node-name="${node.name}" data-node-type="${node.type || 'Node'}">
        <div style="display:flex; align-items:center; gap:5px; overflow:hidden;">
          <span>${icon}</span>
          <span style="font-weight:600; color:#f1f5f9; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${node.name}</span>
        </div>
        <span class="gai-node-badge">${node.type || 'Node'}</span>
      </div>
    `;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        html += renderTreeRecursive(child, depth + 1);
      }
    }
    return html;
  }

  async function loadVisualSceneTree() {
    treeContainer.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:6px;">Memuat hierarki node...</div>';
    try {
      const res = await fetch(`${DAEMON_URL}/project-context`);
      if (!res.ok) throw new Error();
      projectContextCache = await res.json();

      treeTitle.textContent = `Scene: ${projectContextCache.projectName || 'Godot AI'}`;

      if (projectContextCache.sceneTree) {
        treeContainer.innerHTML = renderTreeRecursive(projectContextCache.sceneTree);

        treeContainer.querySelectorAll('.gai-tree-node').forEach(el => {
          el.addEventListener('click', () => {
            const name = el.dataset.nodeName;
            const type = el.dataset.nodeType;
            const prompt = `Saya sedang mengerjakan node '${name}' (Tipe: ${type}) di scene Godot 4 saat ini.
Tolong berikan rekomendasi script GDScript atau konfigurasi terbaik untuk node ini agar berfungsi optimal dalam gameplay.`;
            insertTextToAI(prompt);
          });
        });
      } else {
        treeContainer.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:6px;">Tidak ada node yang terdeteksi di scene utama.</div>';
      }
    } catch {
      treeTitle.textContent = 'Daemon Offline';
      treeContainer.innerHTML = '<div style="color:#f87171; font-size:11px; padding:6px;">Pastikan start-sync.bat aktif di laptop!</div>';
    }
  }

  btnRefreshTree.addEventListener('click', loadVisualSceneTree);

  document.getElementById('gai-btn-send-context').addEventListener('click', async () => {
    if (!projectContextCache) await loadVisualSceneTree();
    if (projectContextCache && projectContextCache.formattedPrompt) {
      insertTextToAI(projectContextCache.formattedPrompt);
    } else {
      showToast('⚠️ Pastikan sync daemon aktif di laptop!', true);
    }
  });

  // -------------------------------------------------------------
  // TAB: SHADER PRESETS IMPLEMENTATION
  // -------------------------------------------------------------
  const shaderListContainer = document.getElementById('gai-shader-list');

  function renderShaderPresets() {
    shaderListContainer.innerHTML = SHADER_PRESETS.map(s => `
      <div class="gai-shader-card">
        <div>
          <div class="gai-shader-title">${s.title}</div>
          <div class="gai-shader-desc">${s.desc}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <button class="gai-apply-btn" data-shader-id="${s.id}" style="padding:3px 8px; font-size:10px;">
            ⚡ Terapkan
          </button>
          <button class="gai-tab" data-ask-shader-id="${s.id}" style="padding:2px 6px; font-size:9.5px; background:rgba(255,255,255,0.06);">
            💬 Tanya AI
          </button>
        </div>
      </div>
    `).join('');

    shaderListContainer.querySelectorAll('[data-shader-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.shaderId;
        const preset = SHADER_PRESETS.find(x => x.id === id);
        if (!preset) return;

        btn.disabled = true;
        btn.textContent = '⏳ Menulis...';

        try {
          const res = await fetch(`${DAEMON_URL}/apply-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: preset.filename,
              code: preset.code,
              commitMessage: `Install preset shader: ${preset.filename}`
            })
          });
          const data = await res.json();
          if (data.success) {
            btn.textContent = '✅ Terpasang!';
            showToast(`🎉 Shader terpasang di ${preset.filename}!`);
            updateGitStatus();
            loadGitTimeline();
          }
        } catch {
          btn.textContent = '❌ Gagal';
          btn.disabled = false;
        }
      });
    });

    shaderListContainer.querySelectorAll('[data-ask-shader-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.askShaderId;
        const preset = SHADER_PRESETS.find(x => x.id === id);
        if (!preset) return;

        const prompt = `Saya sedang menggunakan shader Godot 4 berikut (${preset.filename}):
\`\`\`gdshader
${preset.code}
\`\`\`

Tolong bantu saya mengembangkan atau menambahkan efek visual menarik pada shader ini:`;
        insertTextToAI(prompt);
      });
    });
  }

  renderShaderPresets();

  // -------------------------------------------------------------
  // TAB: GAME MECHANICS WIZARD
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

Persyaratan Teknis:
- Gunakan standar GDScript Godot 4 terbaru (static typing: float, int, Vector3, dll.).
- Cantumkan nama file yang disarankan di baris pertama script (contoh: # res://scripts/...).
- Berikan komentar jelas yang menjelaskan logika kodenya.`;

    insertTextToAI(prompt);
  });

  // -------------------------------------------------------------
  // TAB: DEBUG & ERROR FIXER
  // -------------------------------------------------------------
  const errorInput = document.getElementById('gai-error-input');
  document.getElementById('gai-btn-fix-error').addEventListener('click', () => {
    const err = errorInput.value.trim();
    if (!err) {
      showToast('⚠️ Silakan tempelkan pesan error terlebih dahulu!', true);
      return;
    }
    const prompt = `Saya menemui error berikut di Godot Engine 4:

\`\`\`text
${err}
\`\`\`

Tolong bantu selesaikan masalah ini:
1. Jelaskan mengapa error ini terjadi dalam bahasa yang mudah dipahami.
2. Berikan kode perbaikan lengkapnya.
3. Berikan tips pencegahan agar tidak terulang.`;

    insertTextToAI(prompt);
  });

  // -------------------------------------------------------------
  // TAB: GIT SYNC, ROLLBACK & TIMELINE
  // -------------------------------------------------------------
  const gitBadge = document.getElementById('gai-git-badge');
  const gitStatusText = document.getElementById('gai-git-status-text');
  const gitTimeline = document.getElementById('gai-git-timeline');
  const btnRollback = document.getElementById('gai-btn-rollback');

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

  async function loadGitTimeline() {
    try {
      const res = await fetch(`${DAEMON_URL}/git-log`);
      if (!res.ok) throw new Error();
      const logs = await res.json();

      if (!logs || logs.length === 0) {
        gitTimeline.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:4px;">Belum ada riwayat commit.</div>';
        return;
      }

      gitTimeline.innerHTML = logs.map(l => `
        <div class="gai-commit-item">
          <div class="gai-commit-header">
            <span class="gai-commit-hash">#${l.hash}</span>
            <span>${l.time}</span>
          </div>
          <div class="gai-commit-msg" title="${l.subject}">${l.subject}</div>
        </div>
      `).join('');
    } catch {
      gitTimeline.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:4px;">Gagal memuat timeline (Daemon offline).</div>';
    }
  }

  btnRollback.addEventListener('click', async () => {
    btnRollback.disabled = true;
    btnRollback.textContent = '⏳ Mengembalikan...';
    try {
      const res = await fetch(`${DAEMON_URL}/rollback`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`⏮ Berhasil me-rollback file: ${data.file}!`);
        updateGitStatus();
        loadGitTimeline();
      } else {
        showToast(`⚠️ Rollback gagal: ${data.error || 'Tidak ada backup'}`, true);
      }
    } catch {
      showToast('⚠️ Gagal terhubung ke daemon!', true);
    } finally {
      btnRollback.disabled = false;
      btnRollback.textContent = '⏮ Rollback Terakhir (.bak)';
    }
  });

  document.getElementById('gai-btn-pull').addEventListener('click', async () => {
    showToast('⏳ Menarik kode dari GitHub...');
    try {
      const res = await fetch(`${DAEMON_URL}/pull`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Berhasil menarik kode ke folder proyek!');
        updateGitStatus();
        loadGitTimeline();
      }
    } catch {
      showToast('❌ Gagal melakukan pull', true);
    }
  });

  document.getElementById('gai-btn-push').addEventListener('click', async () => {
    showToast('⏳ Menyimpan & Push ke GitHub...');
    try {
      const res = await fetch(`${DAEMON_URL}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Update proyek Godot AI Studio [${new Date().toLocaleTimeString()}]` })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Berhasil push ke GitHub!');
        updateGitStatus();
        loadGitTimeline();
      }
    } catch {
      showToast('❌ Gagal melakukan push', true);
    }
  });

  document.getElementById('gai-btn-sync').addEventListener('click', () => {
    updateGitStatus();
    loadGitTimeline();
  });

  // -------------------------------------------------------------
  // TAB: MULTI-PROJECT CONFIGURATION SWITCHER
  // -------------------------------------------------------------
  const selProject = document.getElementById('gai-sel-project');
  const inpLocalPath = document.getElementById('gai-inp-local-path');
  const inpRepoUrl = document.getElementById('gai-inp-repo-url');
  const inpGodotExe = document.getElementById('gai-inp-godot-exe');
  const godotBadge = document.getElementById('gai-godot-badge');
  const btnSaveProject = document.getElementById('gai-btn-save-project');
  const btnDelProject = document.getElementById('gai-btn-del-project');
  const footerProj = document.getElementById('gai-footer-proj');

  function updateDelBtnVisibility() {
    const selected = selProject.value;
    if (btnDelProject) {
      btnDelProject.style.display = (selected !== 'godot_ai' && selected !== 'custom') ? 'block' : 'none';
    }
  }

  async function loadProjectConfig() {
    try {
      const res = await fetch(`${DAEMON_URL}/config`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      activeConfig = data.config;

      inpLocalPath.value = activeConfig.localPath || '';
      inpRepoUrl.value = activeConfig.repoUrl || '';
      if (inpGodotExe) inpGodotExe.value = activeConfig.godotExe || '';
      if (godotBadge) {
        if (data.godotDetected) {
          godotBadge.textContent = 'Terdeteksi ✅';
          godotBadge.style.background = 'rgba(16,185,129,0.2)';
          godotBadge.style.color = '#34d399';
        } else {
          godotBadge.textContent = 'Belum Ada ⚠️';
          godotBadge.style.background = 'rgba(239,68,68,0.2)';
          godotBadge.style.color = '#f87171';
        }
      }
      footerProj.textContent = (activeConfig.localPath || '').split(/[\\\/]/).pop() || 'Godot 4.x';

      if (data.projects && data.projects.length) {
        selProject.innerHTML = '';
        data.projects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          if (p.id === data.activeProject) opt.selected = true;
          selProject.appendChild(opt);
        });
        const customOpt = document.createElement('option');
        customOpt.value = 'custom';
        customOpt.textContent = '+ Tambah / Atur Proyek Baru';
        selProject.appendChild(customOpt);
      }
      updateDelBtnVisibility();
    } catch {
      footerProj.textContent = 'Daemon Offline';
    }
  }

  selProject.addEventListener('change', () => {
    const selected = selProject.value;
    updateDelBtnVisibility();
    if (selected === 'custom') {
      inpLocalPath.value = '';
      inpRepoUrl.value = '';
      inpLocalPath.focus();
      return;
    }
    if (activeConfig && activeConfig.projects) {
      const p = activeConfig.projects.find(x => x.id === selected);
      if (p) {
        inpLocalPath.value = p.localPath || '';
        inpRepoUrl.value = p.repoUrl || '';
      }
    }
  });

  if (btnDelProject) {
    btnDelProject.addEventListener('click', async () => {
      const selected = selProject.value;
      if (selected === 'godot_ai' || selected === 'custom') return;
      if (!confirm('Hapus proyek ini dari daftar?')) return;

      btnDelProject.disabled = true;
      try {
        const res = await fetch(`${DAEMON_URL}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteProjectId: selected })
        });
        if (!res.ok) throw new Error();
        showToast('🗑️ Proyek berhasil dihapus dari daftar.');
        loadProjectConfig();
        updateGitStatus();
      } catch {
        showToast('❌ Gagal menghapus proyek', true);
      } finally {
        btnDelProject.disabled = false;
      }
    });
  }

  btnSaveProject.addEventListener('click', async () => {
    const localPath = inpLocalPath.value.trim();
    const repoUrl = inpRepoUrl.value.trim();
    const selectedId = selProject.value;

    if (!localPath) {
      showToast('⚠️ Masukkan path folder lokal!', true);
      return;
    }

    btnSaveProject.disabled = true;
    btnSaveProject.textContent = '⏳ Menyimpan...';

    try {
      const payload = {
        localPath,
        repoUrl,
        projectName: localPath.split(/[\\\/]/).filter(Boolean).pop() || 'MyGame'
      };
      if (inpGodotExe && inpGodotExe.value.trim()) {
        payload.godotExe = inpGodotExe.value.trim();
      }
      if (selectedId !== 'custom') {
        payload.switchProjectId = selectedId;
      }

      const res = await fetch(`${DAEMON_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();
      await res.json();

      showToast('✅ Pengaturan proyek berhasil disimpan!');
      btnSaveProject.disabled = false;
      btnSaveProject.textContent = '💾 Terapkan & Simpan Proyek';
      loadProjectConfig();
      updateGitStatus();
    } catch {
      showToast('❌ Gagal menyimpan proyek', true);
      btnSaveProject.disabled = false;
      btnSaveProject.textContent = '💾 Terapkan & Simpan Proyek';
    }
  });

  // Polling intervals & Initial triggers
  setInterval(injectApplyButtonsToCodeBlocks, 1500);
  setInterval(updateGameStatus, 3000);
  setInterval(updateGitStatus, 10000);

  loadProjectConfig();
  updateGitStatus();
  updateGameStatus();

  console.log('[Godot AI Studio v3.5 Pro] Initialized successfully.');
})();