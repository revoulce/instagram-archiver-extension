chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SEND_URL') {
        handleSendUrl(request.url).then(sendResponse);
        return true; // Важно для асинхронного ответа
    }
});

async function handleSendUrl(url) {
    try {
        const data = await chrome.storage.local.get(['serverUrl', 'secretKey']);
        const serverUrl = data.serverUrl || 'http://localhost:3000';
        const secretKey = data.secretKey || '';

        const response = await fetch(`${serverUrl}/api/v1/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': secretKey
            },
            body: JSON.stringify({ url })
        });

        const result = await response.json();

        // 3. Логируем результат (для статистики)
        const logEntry = {
            id: Date.now(),
            url: url,
            status: response.ok ? 'success' : 'error',
            msg: response.ok ? 'Queued' : (result.error || 'Unknown Error'),
            date: new Date().toLocaleString()
        };
        await saveLog(logEntry);

        if (!response.ok) throw new Error(result.error || 'Server Error');

        return { success: true };

    } catch (error) {
        // Логируем ошибку сети
        await saveLog({
            id: Date.now(),
            url: url,
            status: 'error',
            msg: error.message,
            date: new Date().toLocaleString()
        });
        return { success: false, error: error.message };
    }
}

async function saveLog(entry) {
    const data = await chrome.storage.local.get(['logs']);
    const logs = data.logs || [];
    logs.unshift(entry);
    if (logs.length > 20) logs.pop();
    await chrome.storage.local.set({ logs });
}