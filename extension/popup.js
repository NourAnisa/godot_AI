const DAEMON_URL = 'http://127.0.0.1:32124';
const daemonBadge = document.getElementById('daemon-badge');

async function check() {
  try {
    const res = await fetch(`${DAEMON_URL}/status`);
    if (res.ok) {
      daemonBadge.textContent = 'Online (Port 32124)';
      daemonBadge.className = 'badge-ok';
    } else {
      throw new Error();
    }
  } catch {
    daemonBadge.textContent = 'Offline (Jalankan start-sync.bat)';
    daemonBadge.className = 'badge-err';
  }
}

document.getElementById('btn-pull').addEventListener('click', async () => {
  try {
    await fetch(`${DAEMON_URL}/pull`, { method: 'POST' });
    check();
  } catch {}
});

document.getElementById('btn-push').addEventListener('click', async () => {
  try {
    await fetch(`${DAEMON_URL}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Update proyek dari popup' })
    });
    check();
  } catch {}
});

document.getElementById('btn-refresh').addEventListener('click', check);
check();