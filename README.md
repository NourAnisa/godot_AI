# 🎓 Godot AI - Toolkit & Ekstensi untuk Mahasiswa

Toolkit lengkap berbasis **Browser Extension + Git Auto-Sync Daemon + Godot 4 Starter Kit** yang dirancang untuk mempermudah mahasiswa dalam belajar membuat game dengan **Godot Engine 4** dibantu AI (**ChatGPT, Claude, DeepSeek, dan Google Gemini**).

Repository: [https://github.com/NourAnisa/godot_AI](https://github.com/NourAnisa/godot_AI)

---

## 🌟 Fitur Unggulan untuk Mahasiswa

1. **Dukungan Multi-AI Terlengkap**:
   - Berfungsi langsung di antarmuka web:
     - 🤖 **ChatGPT** (`chatgpt.com`)
     - 🧠 **Claude** (`claude.ai`)
     - ⚡ **DeepSeek** (`chat.deepseek.com`)
     - 💎 **Google Gemini** (`gemini.google.com`)

2. **Asisten Prompt Tugas Kuliah (1-Click Prompt Assistant)**:
   - Tombol sekali klik yang langsung memasukkan template prompt rapi ke chatbox AI:
     - 🏃 **Player Controller 3D**: Karakter dengan WASD, sprint, gravitasi, lompat, mouse look, dan komentar edukatif.
     - ⚔️ **AI Enemy State Machine**: Implementasi Finite State Machine (FSM) musuh (Patrol, Chase, Attack).
     - 🎒 **Sistem Inventory & Pick-Up**: Mengambil item 3D dan menampilkan di UI.
     - 📝 **Generator Format Laporan Tugas**: Minta AI membuat draf laporan teknis / praktikum dari kode yang dibuat.

3. **Godot Error Fixer (Tanya Error Konsol ke AI)**:
   - Mahasiswa cukup menyalin (*copy-paste*) pesan error dari debugger Godot ke widget, lalu klik **Analisis & Tanyakan Solusi ke AI**. Prompt akan diformat secara otomatis agar AI menjelaskan penyebab dan kode perbaikannya.

4. **1-Click Git & Auto-Sync**:
   - Tidak perlu pusing menghafal baris perintah Git di terminal.
   - Tombol `⬇️ Pull` untuk menarik kode buatan AI ke laptop dalam 1 klik.
   - Tombol `⬆️ Push` untuk mengunggah hasil tugas mahasiswa ke GitHub.

5. **Starter Kit Godot 4 Edukatif**:
   - Berisi contoh scene 3D siap jalan (`scenes/main.tscn`) dengan script yang memiliki dokumentasi konsep game development dalam bahasa Indonesia.

---

## 🚀 Panduan Instalasi (Hanya Perlu Sekali)

### 1. Pasang Ekstensi di Browser (Chrome / Brave / Edge)
1. Buka browser favoritmu (Chrome, Brave, atau Edge).
2. Kunjungi halaman ekstensi:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Aktifkan saklar **Developer mode** di pojok kanan atas.
4. Klik tombol **Load unpacked** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder:
   ```text
   C:\Users\Nor Anisa\godot_AI\extension
   ```
6. Selesai! Ekstensi **Godot AI Mahasiswa** sudah aktif.

### 2. Menjalankan Sync Daemon di Laptop
1. Klik 2x shortcut **`Godot AI Mahasiswa Sync`** di Desktop (atau jalankan file `start-sync.bat`).
2. Daemon akan berjalan di latar belakang pada port `32124`.

---

## 🎮 Menjalankan Starter Project di Godot 4
1. Buka **Godot Engine 4**.
2. Klik **Import** -> Pilih file `C:\Users\Nor Anisa\godot_AI\godot_project\project.godot`.
3. Klik **Import & Edit**.
4. Tekan **F5** untuk langsung memainkan dan mencoba simulasi karakter, AI musuh, dan item interaktif!

---

## 📂 Struktur Direktori Proyek

```text
godot_AI/
├── extension/          # Ekstensi browser (Manifest V3) untuk ChatGPT, Claude, DeepSeek, Gemini
│   ├── content.js      # Widget asisten prompt & error fixer
│   ├── styles.css      # Desain tema gelap edukatif
│   ├── popup.html      # Menu kontrol ekstensi
│   └── manifest.json
├── daemon/             # Backend service lokal (Node.js) untuk git sync otomatis (Port 32124)
│   ├── server.js
│   └── config.json
├── godot_project/      # Template proyek Godot 4 ramah mahasiswa
│   ├── scenes/main.tscn
│   ├── scripts/
│   │   ├── player_controller_3d.gd  # Kinematika, gravitasi, lerp
│   │   ├── simple_enemy_ai.gd       # Finite State Machine (FSM) AI
│   │   └── item_pickup.gd           # Sinyal & interaksi 3D
│   └── addons/godot_ai/             # Plugin toolbar sync di Godot
├── start-sync.bat      # Skrip menjalankan daemon 1-klik
├── stop-sync.bat       # Skrip mematikan daemon
└── README.md
```