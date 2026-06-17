const API_BASE = '';

function showMsg(elId, msg, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = 'msg ' + type;
    setTimeout(() => el.className = 'msg', 4000);
}

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch(API_BASE + '/api/check-auth');
    if (res.status === 401) { window.location.href = '/login'; return; }
    fetchStats();
    setInterval(fetchStats, 30000);

    document.getElementById('guild-id-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') fetchModlogs(); });
    document.getElementById('guild-id')?.addEventListener('keypress', e => { if (e.key === 'Enter') loadGuildSettings(); });
    document.getElementById('bypass-load-guild')?.addEventListener('keypress', e => { if (e.key === 'Enter') loadBypassUsers(); });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function(e) {
            e.preventDefault();
            const t = document.querySelector(this.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth' });
        });
    });
});

async function handleLogout() {
    await fetch(API_BASE + '/api/logout', { method: 'POST' });
    window.location.href = '/login';
}

async function fetchStats() {
    try {
        const res = await fetch(API_BASE + '/api/stats');
        const d = await res.json();
        if (d.status === 'success') {
            document.getElementById('stat-guilds').textContent = d.guilds;
            document.getElementById('stat-warnings').textContent = d.warnings;
            document.getElementById('stat-bans').textContent = d.bans;
            document.getElementById('stat-logs').textContent = d.modlogs;
            document.getElementById('stat-bypass').textContent = d.bypassUsers;
        }
    } catch {}
}

async function fetchModlogs() {
    const gid = document.getElementById('guild-id-input').value.trim();
    if (!gid) return showMsg('settings-message', 'Enter guild ID', 'error');
    const c = document.getElementById('modlogs-container');
    c.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
    try {
        const res = await fetch(API_BASE + '/api/modlogs/' + gid + '?limit=50');
        const d = await res.json();
        if (d.status !== 'success') { c.innerHTML = '<p class="empty-state">Error</p>'; return; }
        if (!d.logs.length) { c.innerHTML = '<p class="empty-state">No logs</p>'; return; }
        let html = '<table><thead><tr><th>Action</th><th>User</th><th>Moderator</th><th>Reason</th><th>Date</th></tr></thead><tbody>';
        d.logs.forEach(l => { html += '<tr><td><strong>' + l.action + '</strong></td><td>' + l.user_id + '</td><td>' + l.moderator_id + '</td><td>' + (l.reason || 'N/A') + '</td><td>' + new Date(l.created_at).toLocaleDateString() + '</td></tr>'; });
        html += '</tbody></table>';
        c.innerHTML = html;
    } catch { c.innerHTML = '<p class="empty-state">Failed</p>'; }
}

async function loadGuildSettings() {
    const gid = document.getElementById('guild-id').value.trim();
    if (!gid) return showMsg('settings-message', 'Enter guild ID', 'error');
    try {
        const res = await fetch(API_BASE + '/api/guild-settings/' + gid);
        const d = await res.json();
        if (d.status === 'success') {
            document.getElementById('prefix').value = d.prefix || '/';
            document.getElementById('mod-log-channel').value = d.mod_log_channel || '';
            document.getElementById('auto-mod-enabled').checked = d.auto_mod_enabled;
            showMsg('settings-message', 'Loaded', 'success');
        } else showMsg('settings-message', d.message, 'error');
    } catch { showMsg('settings-message', 'Failed', 'error'); }
}

async function saveGuildSettings() {
    const gid = document.getElementById('guild-id').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const mlc = document.getElementById('mod-log-channel').value.trim();
    const ame = document.getElementById('auto-mod-enabled').checked;
    if (!gid) return showMsg('settings-message', 'Enter guild ID', 'error');
    try {
        const res = await fetch(API_BASE + '/api/guild-settings/' + gid, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix, mod_log_channel: mlc || null, auto_mod_enabled: ame })
        });
        const d = await res.json();
        showMsg('settings-message', d.status === 'success' ? 'Saved' : d.message, d.status === 'success' ? 'success' : 'error');
    } catch { showMsg('settings-message', 'Failed', 'error'); }
}

async function loadBypassUsers() {
    const gid = document.getElementById('bypass-load-guild').value.trim();
    if (!gid) return showMsg('bypass-message', 'Enter guild ID', 'error');
    const tb = document.getElementById('bypass-tbody');
    tb.innerHTML = '<tr><td colspan="6" class="empty-state">Loading...</td></tr>';
    try {
        const res = await fetch(API_BASE + '/api/bypass-users/' + gid);
        const d = await res.json();
        if (d.status !== 'success') { tb.innerHTML = '<tr><td colspan="6" class="empty-state">' + d.message + '</td></tr>'; return; }
        if (!d.users.length) { tb.innerHTML = '<tr><td colspan="6" class="empty-state">No bypass users</td></tr>'; return; }
        let html = '';
        d.users.forEach(u => { html += '<tr><td>' + u.user_id + '</td><td>' + u.guild_id + '</td><td>' + (u.reason || '-') + '</td><td>' + u.added_by + '</td><td>' + new Date(u.created_at).toLocaleDateString() + '</td><td><button class="btn-delete" onclick="removeBypassUser(' + u.guild_id + ',' + u.user_id + ')">Remove</button></td></tr>'; });
        tb.innerHTML = html;
    } catch { tb.innerHTML = '<tr><td colspan="6" class="empty-state">Error</td></tr>'; }
}

async function addBypassUser() {
    const gid = document.getElementById('bypass-guild-id').value.trim();
    const uid = document.getElementById('bypass-user-id').value.trim();
    const reason = document.getElementById('bypass-reason').value.trim();
    if (!gid || !uid) return showMsg('bypass-message', 'Guild ID and User ID required', 'error');
    try {
        const res = await fetch(API_BASE + '/api/bypass-users/' + gid, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, reason })
        });
        const d = await res.json();
        showMsg('bypass-message', d.message, d.status === 'success' ? 'success' : 'error');
        if (d.status === 'success') {
            document.getElementById('bypass-user-id').value = '';
            document.getElementById('bypass-reason').value = '';
            document.getElementById('bypass-load-guild').value = gid;
            loadBypassUsers();
            fetchStats();
        }
    } catch { showMsg('bypass-message', 'Failed', 'error'); }
}

async function removeBypassUser(gid, uid) {
    if (!confirm('Remove user ' + uid + ' from bypass?')) return;
    try {
        const res = await fetch(API_BASE + '/api/bypass-users/' + gid + '/' + uid, { method: 'DELETE' });
        const d = await res.json();
        showMsg('bypass-message', d.message, d.status === 'success' ? 'success' : 'error');
        if (d.status === 'success') { loadBypassUsers(); fetchStats(); }
    } catch { showMsg('bypass-message', 'Failed', 'error'); }
}
