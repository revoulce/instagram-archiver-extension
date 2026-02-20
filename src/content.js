// --- КОНСТАНТЫ ---
const DOWNLOAD_ICON = `
<svg aria-label="Archive" class="ia-icon" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
  <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
  <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="12" x2="12" y1="15" y2="9"></line>
  <polyline fill="none" points="15 12 12 15 9 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></polyline>
</svg>`;

const LOADING_ICON = `
<svg class="ia-spinner ia-icon" viewBox="0 0 50 50" style="width:24px;height:24px;">
  <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"></circle>
</svg>`;

const processedElements = new WeakSet();

// --- ИНИЦИАЛИЗАЦИЯ ---
function init() {
    runChecks();

    const observer = new MutationObserver((mutations) => {
        const isInternal = mutations.some(m => m.target.closest && m.target.closest('.ia-btn'));
        if (isInternal) return;
        runChecks();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function runChecks() {
    injectFeed();
    injectReels();
    injectStories();
}

// --- 1. FEED ---
function injectFeed() {
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
        if (processedElements.has(article)) return;

        const buttons = article.querySelectorAll('div[role="button"]');
        let targetBtn = null;

        for (const btn of buttons) {
            const svg = btn.querySelector('svg');
            if (!svg || svg.getAttribute('height') !== '24') continue;

            const parent = btn.parentElement;
            const style = window.getComputedStyle(parent);
            if (style.display === 'flex' && style.flexDirection === 'row') {
                targetBtn = parent;
                break;
            }
        }

        if (targetBtn && !targetBtn.querySelector('.ia-btn')) {
            const btn = createButton('post');
            btn.onclick = (e) => handleClick(e, btn, () => getFeedUrl(article));
            targetBtn.appendChild(btn);
            processedElements.add(article);
        }
    });
}

function getFeedUrl(article) {
    // В ленте могут быть ссылки с /p/, /reel/ или /reels/
    const timeLink = article.querySelector('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]');
    if (timeLink) return cleanUrl(timeLink.href);
    return null;
}

// --- 2. REELS ---
function injectReels() {
    const potentialSidebars = document.querySelectorAll('div');

    potentialSidebars.forEach(div => {
        if (processedElements.has(div)) return;
        if (div.className.includes('ia-btn')) return;
        if (div.clientWidth > 100) return;

        const svgs = div.querySelectorAll('svg[height="24"]');
        if (svgs.length < 3) return;

        const style = window.getComputedStyle(div);
        if (style.display === 'flex' && style.flexDirection === 'column') {

            let videoContainer = div.parentElement;
            if (videoContainer && videoContainer.parentElement) {
                videoContainer = videoContainer.parentElement;
            }

            if (videoContainer && !videoContainer.querySelector('.ia-btn-reel')) {
                const btn = createButton('reel');

                if (window.getComputedStyle(videoContainer).position === 'static') {
                    videoContainer.style.position = 'relative';
                }

                btn.onclick = (e) => handleClick(e, btn, () => getReelUrl(videoContainer, div));

                videoContainer.appendChild(btn);
                processedElements.add(div);
                processedElements.add(videoContainer);
            }
        }
    });
}

function getReelUrl(container, sidebar) {
    const loc = window.location.href;

    // 1. АДРЕСНАЯ СТРОКА
    // Исправленная регулярка: (reels?|p) ловит и 'reel', и 'reels', и 'p'
    if (loc.match(/\/(reels?|p)\/[\w-]+\/?/)) {
        return cleanUrl(loc);
    }

    // 2. ПОИСК ВНУТРИ ССЫЛОК
    const allLinks = [
        ...container.querySelectorAll('a'),
        ...(sidebar ? sidebar.querySelectorAll('a') : [])
    ];

    for (const link of allLinks) {
        const href = link.href;
        // Проверяем наличие /reel/, /reels/ или /p/
        // Исключаем мусор
        if ((href.includes('/reel/') || href.includes('/reels/') || href.includes('/p/')) &&
            !href.includes('/audio/') &&
            !href.includes('/original_audio/') &&
            !href.includes('/explore/') &&
            !href.includes('/tags/') &&
            !href.includes('/music/')) {
            return cleanUrl(href);
        }
    }

    return null;
}

// --- 3. STORIES ---
function injectStories() {
    const svgs = document.querySelectorAll('svg');
    svgs.forEach(svg => {
        const btn = svg.closest('div[role="button"]');
        if (!btn || processedElements.has(btn)) return;

        const rect = btn.getBoundingClientRect();
        if (rect.top > 100) return;
        if (rect.right < window.innerWidth - 200) return;

        const header = btn.parentElement;
        if (!header) return;

        if (!header.querySelector('.ia-story-btn')) {
            const newBtn = createButton('story');
            newBtn.onclick = (e) => handleClick(e, newBtn, () => window.location.href);
            header.insertBefore(newBtn, btn);
            processedElements.add(btn);
        }
    });
}

// --- UTILS ---

function createButton(type) {
    const btn = document.createElement('div');
    btn.className = 'x1i10hfl ia-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = DOWNLOAD_ICON;

    if (type === 'reel') btn.classList.add('ia-btn-reel');
    else if (type === 'story') btn.classList.add('ia-story-btn');
    else btn.classList.add('ia-btn-post');

    return btn;
}

async function handleClick(e, btn, urlGetter) {
    e.preventDefault();
    e.stopPropagation();

    if (btn.dataset.loading === "true") return;

    const url = urlGetter();

    if (!url) {
        console.error("InstaArchiver: URL not found", window.location.href);
        indicateStatus(btn, 'error');
        return;
    }

    btn.dataset.loading = "true";
    const originalHtml = btn.innerHTML;
    btn.innerHTML = LOADING_ICON;

    try {
        const response = await chrome.runtime.sendMessage({ type: 'SEND_URL', url });

        if (response && response.success) {
            indicateStatus(btn, 'success', originalHtml);
        } else {
            indicateStatus(btn, 'error', originalHtml);
        }
    } catch (err) {
        console.error(err);
        indicateStatus(btn, 'error', originalHtml);
    }
}

function indicateStatus(btn, status, originalHtml) {
    if (originalHtml) btn.innerHTML = originalHtml;

    if (status === 'success') {
        btn.style.color = '#0095f6';
    } else {
        btn.style.color = '#ed4956';
        if (!originalHtml) btn.innerHTML = DOWNLOAD_ICON;
    }

    setTimeout(() => {
        btn.style.color = '';
        btn.dataset.loading = "false";
    }, 2000);
}

function cleanUrl(url) {
    try {
        const u = new URL(url);
        // Регулярка теперь ищет (reels?|p) - то есть 'reel', 'reels' или 'p'
        // Группа 1: тип, Группа 2: ID
        const match = u.pathname.match(/\/(reels?|p)\/([\w-]+)/);

        if (match) {
            // Нормализуем URL до единственного числа, чтобы gallery-dl не путался
            // Если нашли 'reels', меняем на 'reel'
            let type = match[1];
            if (type === 'reels') type = 'reel';

            const id = match[2];
            return `${u.origin}/${type}/${id}/`;
        }
        return u.origin + u.pathname;
    } catch (e) {
        return url;
    }
}

init();