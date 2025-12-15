document.addEventListener('DOMContentLoaded', async () => {
    const tabStats = document.getElementById('tab-stats');
    const tabSettings = document.getElementById('tab-settings');
    const viewStats = document.getElementById('view-stats');
    const viewSettings = document.getElementById('view-settings');

    tabStats.onclick = () => {
        tabStats.classList.add('active');
        tabSettings.classList.remove('active');
        viewStats.style.display = 'block';
        viewSettings.style.display = 'none';
        renderLogs();
    };

    tabSettings.onclick = () => {
        tabSettings.classList.add('active');
        tabStats.classList.remove('active');
        viewStats.style.display = 'none';
        viewSettings.style.display = 'block';
    };

    const serverInput = document.getElementById('serverUrl');
    const secretInput = document.getElementById('secretKey');
    const saveBtn = document.getElementById('save-settings');
    const saveMsg = document.getElementById('save-msg');

    const settings = await chrome.storage.local.get(['serverUrl', 'secretKey']);
    serverInput.value = settings.serverUrl || 'http://localhost:3000';
    secretInput.value = settings.secretKey || '';

    saveBtn.onclick = async () => {
        await chrome.storage.local.set({
            serverUrl: serverInput.value,
            secretKey: secretInput.value
        });
        saveMsg.textContent = 'Saved!';
        setTimeout(() => saveMsg.textContent = '', 2000);
    };

    const logList = document.getElementById('log-list');
    const clearBtn = document.getElementById('clear-logs');

    async function renderLogs() {
        const data = await chrome.storage.local.get(['logs']);
        const logs = data.logs || [];
        logList.innerHTML = '';

        if (logs.length === 0) {
            logList.innerHTML = '<li class="empty">No tasks yet</li>';
            return;
        }

        logs.forEach(log => {
            const li = document.createElement('li');
            li.className = `log-item ${log.status}`;
            li.innerHTML = `
        <div class="log-header">
            <span class="status-dot"></span>
            <span class="date">${log.date}</span>
        </div>
        <div class="log-url">${log.url}</div>
        <div class="log-msg">${log.msg}</div>
      `;
            logList.appendChild(li);
        });
    }

    clearBtn.onclick = async () => {
        await chrome.storage.local.set({ logs: [] });
        renderLogs();
    };

    renderLogs();
});