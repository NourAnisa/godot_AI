# 🎮 Godot AI v3.5 Pro Studio - Game Development Toolkit & Assistant

Toolkit tingkat lanjut berbasis **Browser Extension + Smart Sync Daemon + Godot 4 Integration** yang dirancang untuk mempermudah, mempercepat, dan menyempurnakan alur kerja pembuatan game di **Godot Engine 4** dengan bantuan kecerdasan buatan (**ChatGPT, Claude, DeepSeek, dan Google Gemini**).

Repository GitHub: [https://github.com/NourAnisa/godot_AI](https://github.com/NourAnisa/godot_AI)

---

## ⚡ Fitur Utama v3.5 Pro Studio

### 1. 📜 Live Godot Console Streamer & Error Interceptor *(Baru di v3.5)*
- Menangkap output konsol game (`stdout` & `stderr`) secara real-time langsung dari Godot Engine melalui Server-Sent Events (SSE).
- Log otomatis diberi penanda warna (kuning untuk peringatan, merah menyala untuk error).
- **Tombol `🩺 Perbaiki`**: Muncul di setiap baris error. Satu kali klik langsung mengirimkan konteks error ke chatbox AI untuk meminta analisis penyebab dan kode perbaikan GDScript 4.
- Tombol **`🧹 Bersihkan`** untuk mereset log konsol kapan saja.

### 2. 🧩 Essential Systems Palette *(Baru di v3.5)*
Modul sistem game siap pakai (production-ready) yang dapat langsung dipasang ke dalam proyek dengan tombol **`⚡ Pasang`** atau didiskusikan via tombol **`💬 Tanya AI`**:
- **⏸ Menu Jeda & Pengaturan**: Pause runtime, slider volume AudioServer (dB conversion), Fullscreen toggle, dan Mouse Capture toggle.
- **💾 Save & Load Manager (JSON)**: Serialisasi dictionary game ke `user://savegame.json` dengan validasi file aman dan parsing error handling.
- **🎵 3D Audio Manager & SFX Pool**: BGM crossfade tween otomatis & object pool 8 channel SFX non-blocking untuk performa tanpa stutter.
- **📳 Trauma Camera Shake 3D**: Screen shake berbasis formula trauma kuadratik untuk benturan, tembakan, ledakan, dan dash.

### 3. 🛡️ GDScript 4 Syntax Auto-Sanitizer *(Baru di v3.5)*
- Mencegah error sintaks usang saat AI menghasilkan kode bergaya Godot 3.
- Secara otomatis mengonversi:
  - `KinematicBody` / `Spatial` ➔ `CharacterBody3D` / `Node3D`
  - `yield(obj, "signal")` ➔ `await obj.signal`
  - `yield(get_tree().create_timer(x), "timeout")` ➔ `await get_tree().create_timer(x).timeout`
  - `export var` ➔ `@export var`
  - `onready var` ➔ `@onready var`
  - `.instance()` ➔ `.instantiate()`
  - `rand_range()` ➔ `randf_range()`

### 4. ⌨️ 1-Click InputMap Auto-Injector *(Baru di v3.5)*
- Mendeteksi pemanggilan aksi input seperti `Input.is_action_just_pressed("dash")` atau `Input.get_axis(...)` di dalam blok kode AI.
- Menampilkan tombol **`⌨️ Daftarkan Input`** di atas blok kode yang secara otomatis menambahkan input action tersebut ke dalam `project.godot` lengkap dengan binding keyboard default (WASD, Space, Shift, E, Escape, dsb.) tanpa perlu membuka Project Settings secara manual.

### 5. ⏮️ 1-Click Backup & Rollback System *(Baru di v3.5)*
- Setiap kali kode baru dari AI diterapkan ke proyek, versi file sebelumnya otomatis dicadangkan ke folder terproteksi `.godot_ai_backups/`.
- Tombol **`⏮ Rollback Terakhir (.bak)`** di tab Git memungkinkan pengembang mengembalikan file ke kondisi sebelum kode AI diterapkan dengan satu klik.

### 6. ▶️ 1-Click Game Runner & Process Controller
- Jalankan dan uji game Godot langsung dari browser:
  - Tombol **`▶ Play`** meluncurkan executable Godot 4 dengan path scene aktif.
  - Tombol **`⏹ Stop`** mematikan proses game Godot dengan sekali klik saat pengujian selesai.

### 7. 🌳 Visual Scene Tree Hierarchy Inspector
- Memindai hierarki node scene `.tscn` aktif secara interaktif dengan ikon visual (🏃 *CharacterBody3D*, 📷 *Camera3D*, ☀️ *DirectionalLight3D*, 📦 *CollisionShape3D*, 🔷 *MeshInstance3D*, dsb.).
- Klik salah satu node untuk memasukkan instruksi kontekstual ke AI.
- Tombol **`📋 Masukkan Konteks Proyek Lengkap ke AI`** untuk mengirim seluruh hierarki scene & script ke AI.

### 8. 🎨 Built-in Shader Presets Gallery
- **🎨 Toon Cel-Shading**: Shading gaya anime/kartun dengan step band pencahayaan dan Rim Light edge glow.
- **🌿 Wind Sway Grass**: Shader rumput bergoyang alami tertiup angin menggunakan vertex displacement.
- **🌊 Stylized Water Surface**: Permukaan air dinamis dengan gelombang trigonometrik, transparansi, dan refleksi specular.

### 9. 🐙 Git Sync & Commit Timeline
- Panel Git interaktif dengan indikator status (*Tersinkron*, *Update AI Siap Di-pull*, *File Lokal Diubah*, atau *Offline*).
- Riwayat commit interaktif (**Commit Timeline**) dengan hash, author, waktu, dan pesan commit.
- Tombol **`⬇️ Pull AI`**, **`⬆️ Push`**, dan **`🔄 Refresh Status`**.

### 10. 🧙 Game Mechanics Wizard & 🩺 Debug Fixer
- **Wizard**: Pilih genre game dan centang mekanik yang diinginkan (Sprint, Double Jump, Dash, HP Bar, Inventory, AI Musuh, Siklus Waktu) untuk menghasilkan arsitektur kode lengkap.
- **Debug Fixer**: Tempelkan error stack trace Godot dan dapatkan penjelasan serta kode perbaikan instan.

### 11. 📁 Multi-Project Switcher & Universal Auto-Detect
- Mendukung banyak folder proyek Godot di satu komputer.
- Deteksi otomatis Git dan Godot 4 tanpa konfigurasi rumit.

---

## 🚀 Panduan Penggunaan (Universal Setup)

Aplikasi ini didesain **Plug & Play** untuk siapa saja.

### 1. Pasang Ekstensi di Browser
1. Buka halaman ekstensi browser:
   * Chrome: `chrome://extensions`
   * Brave: `brave://extensions`
   * Edge: `edge://extensions`
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik **Load unpacked** dan pilih subfolder `extension/` dari folder repositori ini.

### 2. Jalankan Daemon Sinkronisasi
* Klik 2x file **`pasang-shortcut-desktop.bat`** untuk membuat shortcut di Desktop laptopmu.
* Atau langsung klik 2x file **`start-sync.bat`**.
* Daemon akan otomatis mendeteksi Git dan Godot Engine 4 di komputermu dan berjalan di port `32124`.

### 3. Mulai Mengembangkan Game Bersama AI
1. Buka AI pilihanmu (**ChatGPT**, **Claude**, **DeepSeek**, atau **Gemini**).
2. Floating widget **Godot AI Studio v3.5** akan muncul di layar.
3. Tekan **`▶ Play`** untuk menjalankan game, pantau output di tab **`📜 Console`**, pasang modul di tab **`🧩 Sistem`**, dan terapkan kode AI ke proyekmu dengan satu klik!

---

## 📂 Struktur Direktori Proyek

```text
godot_AI/
├── extension/          # Ekstensi browser v3.5 Pro Studio (ChatGPT, Claude, DeepSeek, Gemini)
│   ├── content.js      # Game Runner, Live Console, Systems Palette, Code Injector, Tree
│   ├── styles.css      # Tema gelap modern Glassmorphism
│   ├── popup.html      # Popup konfigurasi proyek & status sync
│   ├── popup.js        # Controller popup ekstensi
│   └── manifest.json   # Manifest V3
├── daemon/             # Smart Sync Daemon (Node.js) port 32124
│   ├── server.js       # Live Console Streamer, GDScript Sanitizer, Input Injector, Git Sync
│   └── config.json     # Konfigurasi multi-project & executable Godot
├── godot_project/      # Template proyek Godot 4 siap pakai
│   ├── scenes/
│   │   └── main.tscn   # Scene utama 3D dengan Player, Musuh AI, Item, & Lighting
│   ├── scripts/
│   │   ├── player_controller_3d.gd  # Karakter 3D (kinematika, gravitasi, lerp)
│   │   ├── simple_enemy_ai.gd       # AI Musuh FSM (Patrol, Chase, Attack)
│   │   ├── item_pickup.gd           # Interaksi 3D & Sinyal
│   │   ├── pause_menu.gd            # Menu Jeda, Volume, & Fullscreen
│   │   ├── save_manager.gd          # Save/Load JSON Persistence
│   │   ├── audio_manager.gd         # BGM Crossfade & SFX Pool
│   │   └── camera_shake.gd          # Screen Shake 3D Trauma-based
│   ├── shaders/        # Preset Shader Godot 4
│   │   ├── toon_shading.gdshader    # Toon Cel-Shading + Rim Light
│   │   ├── wind_grass.gdshader      # Vertex Wind Sway Grass
│   │   └── stylized_water.gdshader  # Stylized Water Surface
│   └── addons/godot_ai/             # Addon toolbar di dalam Godot
├── start-sync.bat      # Script peluncur daemon
├── stop-sync.bat       # Script penghenti daemon
└── README.md
```