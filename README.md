# 🎮 Godot AI v3.0 Pro Studio - Game Development Toolkit & Assistant

Toolkit tingkat lanjut berbasis **Browser Extension + Smart Sync Daemon + Godot 4 Integration** yang dirancang untuk mempermudah dan mempercepat alur kerja pengembangan game di **Godot Engine 4** dengan bantuan kecerdasan buatan (**ChatGPT, Claude, DeepSeek, dan Google Gemini**).

Repository GitHub: [https://github.com/NourAnisa/godot_AI](https://github.com/NourAnisa/godot_AI)

---

## ⚡ Fitur Utama v3.0 Pro Studio

### 1. ▶️ 1-Click Game Runner & Process Controller
- Jalankan dan uji game Godot langsung dari tab browser chat AI tanpa perlu berpindah jendela aplikasi.
- Tombol **`▶ Play`** meluncurkan executable Godot 4 dengan path scene aktif.
- Tombol **`⏹ Stop`** mematikan proses game Godot dengan sekali klik saat pengujian selesai.
- Status proses game disinkronkan secara real-time via status polling port 32124.

### 2. 🌳 Visual Scene Tree Hierarchy Inspector
- Memindai file `.tscn` aktif dan menampilkan hierarki pohon node secara interaktif dengan ikon khusus (🏃 *CharacterBody3D*, 📷 *Camera3D*, ☀️ *DirectionalLight3D*, 📦 *CollisionShape3D*, 🔷 *MeshInstance3D*, dsb.).
- Klik salah satu node untuk langsung memasukkan instruksi kontekstual ke AI agar AI membuatkan script GDScript yang presisi untuk node tersebut.
- Tombol **`📋 Masukkan Konteks Proyek Lengkap ke AI`** untuk mengirim seluruh arsitektur scene & script ke AI.

### 3. 🎨 Built-in Shader Presets Gallery
Koleksi shader Godot 4 berkualitas tinggi yang siap dipasang ke dalam game hanya dengan 1 kali klik:
- **🎨 Toon Cel-Shading**: Shading gaya anime/kartun dengan step band pencahayaan dan efek Rim Light edge glow.
- **🌿 Wind Sway Grass**: Shader rumput alami yang bergoyang tertiup angin menggunakan vertex displacement dan per-blade bending.
- **🌊 Stylized Water Surface**: Permukaan air dinamis dengan gelombang trigonometrik, transparansi, dan refleksi specular.
- Setiap shader dilengkapi tombol **`⚡ Terapkan`** (menulis langsung ke `res://shaders/*.gdshader`) dan tombol **`💬 Tanya AI`** untuk konsultasi modifikasi shader.

### 4. ⚡ 1-Click "Terapkan ke Godot" (Apply to Godot) pada Code Block
- Tombol aksi **`⚡ Terapkan ke Godot`** otomatis diinjeksi di atas setiap blok kode GDScript atau GDShader yang dihasilkan AI di ChatGPT, Claude, DeepSeek, dan Gemini.
- Otomatis mendeteksi nama file target dari header komentar (`# res://scripts/...`) atau class name, menulis ke folder lokal, dan langsung melakukan Git commit.

### 5. 🐙 Git Sync & Commit Log Timeline
- Panel Git interaktif dengan indikator status sinkronisasi (*Tersinkron*, *Update AI Siap Di-pull*, *File Lokal Diubah*, atau *Offline*).
- Riwayat commit interaktif (**Commit Timeline**) yang menampilkan hash, author, waktu relatif, dan pesan commit terbaru.
- Tombol 1-Click **`⬇️ Pull AI`**, **`⬆️ Push`**, dan **`🔄 Refresh Status`**.

### 6. 🧙 Game Mechanics Wizard
- Generator spesifikasi gameplay otomatis:
  - **Pilih Genre**: Action RPG 3D, Open World Survival, Platformer 3D, FPS / Shooter, Roguelike Dungeon, Horror Atmosphere.
  - **Pilih Mekanik**: Sprint & Stamina, Double Jump, Dash/Dodge, Crouch Collision, HP & Health Bar UI, 3D Inventory, Enemy FSM AI, Siklus Siang & Malam.
  - Menghasilkan rancangan arsitektur game dan kode GDScript standar Godot 4.

### 7. 🩺 Debug & Error Fixer
- Kotak analisis error debugger Godot: tempelkan stack trace error merah, dan AI akan menganalisis penyebab, memberikan kode solusi, dan tips pencegahan.

### 8. 📁 Multi-Project Switcher & Custom Path
- Mendukung penambahan dan peralihan instan antara berbagai proyek game Godot di komputermu.
- Pengguna dapat menentukan sendiri path folder lokal di laptop dan URL repositori GitHub melalui tab **⚙️ Proyek** atau popup ekstensi.

---

## 🚀 Panduan Penggunaan untuk Siapa Saja (Universal Setup)

Aplikasi ini didesain **Plug & Play** (Auto-Detect). Tidak ada konfigurasi rumit yang perlu diatur secara manual.

### 1. Pasang Ekstensi di Browser
1. Buka halaman ekstensi browser:
   * Chrome: `chrome://extensions`
   * Brave: `brave://extensions`
   * Edge: `edge://extensions`
2. Aktifkan saklar **Developer mode** di pojok kanan atas.
3. Klik tombol **Load unpacked** dan pilih subfolder `extension/` dari folder repositori ini.

### 2. Jalankan Daemon Sinkronisasi
* Klik 2x file **`pasang-shortcut-desktop.bat`** untuk otomatis membuat shortcut di Desktop laptopmu.
* Atau langsung klik 2x file **`start-sync.bat`**.
* *Catatan*: Pastikan laptopmu sudah memiliki **Node.js** (unduh gratis dari [nodejs.org](https://nodejs.org) jika belum ada). Daemon akan otomatis mendeteksi Git dan Godot Engine 4 di laptopmu!

### 3. Mulai Mengembangkan Game Bersama AI
1. Buka AI favoritmu di browser (**ChatGPT**, **Claude**, **DeepSeek**, atau **Gemini**).
2. Widget **Godot AI Studio** akan otomatis muncul di pojok kanan bawah.
3. Buka proyek `godot_project/project.godot` di Godot Engine 4, atau klik tombol **`▶ Play`** langsung dari browser untuk mulai menguji game!

---

## 📂 Struktur Direktori Proyek

```text
godot_AI/
├── extension/          # Ekstensi browser v3.0 Pro Studio (ChatGPT, Claude, DeepSeek, Gemini)
│   ├── content.js      # Game Runner, Visual Scene Tree, Shaders, Code Injector, Wizard
│   ├── styles.css      # Desain tema gelap modern (Glassmorphism & Neon accents)
│   ├── popup.html      # Popup konfigurasi proyek & status sync
│   ├── popup.js        # Controller popup ekstensi
│   └── manifest.json   # Manifest V3
├── daemon/             # Smart Sync Daemon (Node.js) port 32124
│   ├── server.js       # Game Runner, Scene Tree Parser, Git Log, Context Scanner, Auto-Sync
│   └── config.json     # Konfigurasi multi-project & executable Godot
├── godot_project/      # Template proyek Godot 4 siap pakai
│   ├── scenes/
│   │   └── main.tscn   # Scene utama 3D dengan Player, Musuh AI, Item, & Lighting
│   ├── scripts/
│   │   ├── player_controller_3d.gd  # Karakter 3D (kinematika, gravitasi, lerp)
│   │   ├── simple_enemy_ai.gd       # AI Musuh FSM (Patrol, Chase, Attack)
│   │   └── item_pickup.gd           # Interaksi 3D & Sinyal
│   ├── shaders/        # Preset Shader Godot 4
│   │   ├── toon_shading.gdshader    # Toon Cel-Shading + Rim Light
│   │   ├── wind_grass.gdshader      # Vertex Wind Sway Grass
│   │   └── stylized_water.gdshader  # Stylized Water Surface
│   └── addons/godot_ai/             # Addon toolbar di dalam Godot
├── start-sync.bat      # Script peluncur daemon
├── stop-sync.bat       # Script penghenti daemon
└── README.md
```