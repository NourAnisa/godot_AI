# 🎮 Godot AI v2.0 - Game Development Toolkit & Assistant

Toolkit tingkat lanjut berbasis **Browser Extension + Smart Sync Daemon + Godot 4 Starter Kit** yang dirancang untuk mempermudah dan mempercepat alur kerja pengembangan game di **Godot Engine 4** dengan bantuan kecerdasan buatan (**ChatGPT, Claude, DeepSeek, dan Google Gemini**).

Repository GitHub: [https://github.com/NourAnisa/godot_AI](https://github.com/NourAnisa/godot_AI)

---

## ⚡ Fitur Cerdas (Smart AI Features)

### 1. ⚡ 1-Click "Pasang ke Godot" (Apply to Godot)
- Di antarmuka web AI (ChatGPT, Claude, DeepSeek, Gemini), tombol **`⚡ Pasang ke Godot`** akan otomatis muncul di pojok atas setiap blok kode GDScript yang dibuatkan oleh AI.
- Sekali klik, kodenya **langsung ditulis ke file di folder proyek Godot laptopmu** dan otomatis ter-reload di editor Godot! Tidak perlu lagi repot copy-paste manual.

### 2. 🧠 Project Context Scanner (Kirim Konteks Proyek ke AI)
- Tombol **`📋 Kirim Konteks Proyek ke AI`** di tab Konteks:
  - Memindai seluruh scene (`main.tscn`), node tree, daftar script, kelas, dan variabel `@export` yang ada di proyek Godotmu.
  - Memasukkan ringkasan struktur proyek secara otomatis ke chatbox AI.
  - Hasilnya: Jawaban dan kode dari AI akan **100% akurat** dan menyambung dengan nama node serta variabel yang sudah ada di gamemu!

### 3. 🎮 Interactive Game Mechanics Wizard
- Form pembuat spesifikasi game otomatis:
  - **Pilih Genre**: 3D Survival, 3D Platformer, FPS/TPS, 2D RPG.
  - **Centang Mekanik**: Sprint & Stamina Bar, Double Jump, Wall Run, Dash, Health System UI, AI Enemy FSM, Day/Night Sky, Inventory 3D.
  - Klik **`✨ Buat Prompt Spesifikasi Otomatis`** untuk menghasilkan prompt rekayasa game berstandar profesional.

### 4. 🐞 Godot Debugger Error Fixer
- Kotak khusus untuk menempelkan pesan error merah dari konsol debugger Godot.
- Sekali klik langsung memformat pertanyaan konsultasi agar AI menjelaskan akar masalah dan memberikan kode perbaikannya.

### 5. 🔄 1-Click Git & Auto-Sync
- Tombol `⬇️ Pull dari AI` dan `⬆️ Push Perubahan` tanpa perlu mengetik baris perintah Git di terminal.

---

## 🚀 Panduan Instalasi Cepat

### 1. Pasang / Perbarui Ekstensi di Browser
1. Buka halaman ekstensi browser:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik **Load unpacked** (atau klik tombol reload jika sudah terpasang) dan pilih folder:
   ```text
   C:\Users\Nor Anisa\godot_AI\extension
   ```

### 2. Menjalankan Daemon di Laptop
- Cukup klik 2x shortcut **`Godot AI Sync`** yang ada di **Desktop** (atau jalankan file `start-sync.bat`).
- Daemon berjalan di latar belakang pada port `32124`.

### 3. Membuka Proyek di Godot 4
1. Buka Godot Engine 4.
2. Import file `C:\Users\Nor Anisa\godot_AI\godot_project\project.godot`.
3. Tekan **F5** untuk langsung menguji karakter, musuh AI, dan item collectible!

---

## 📂 Struktur Direktori Proyek

```text
godot_AI/
├── extension/          # Ekstensi browser v2.0 (ChatGPT, Claude, DeepSeek, Gemini)
│   ├── content.js      # Injeksi tombol "Apply to Godot", Wizard, & Context Scanner
│   ├── styles.css      # Desain tema gelap modern
│   ├── popup.html
│   └── manifest.json
├── daemon/             # Smart Sync Daemon (Node.js) port 32124
│   ├── server.js       # Endpoints: /project-context, /apply-code, /pull, /push
│   └── config.json
├── godot_project/      # Template proyek Godot 4 siap pakai
│   ├── scenes/main.tscn
│   ├── scripts/
│   │   ├── player_controller_3d.gd  # Karakter 3D (kinematika, gravitasi, lerp)
│   │   ├── simple_enemy_ai.gd       # AI Musuh FSM (Patrol, Chase, Attack)
│   │   └── item_pickup.gd           # Interaksi 3D & Sinyal
│   └── addons/godot_ai/             # Addon toolbar di dalam Godot
├── start-sync.bat
├── stop-sync.bat
└── README.md
```