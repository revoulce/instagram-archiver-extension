// Иконка для нашей кнопки
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

function init() {
    injectButtons();

    let timeout;
    const observer = new MutationObserver((mutations) => {
        // 1. ИГНОРИРУЕМ изменения внутри наших кнопок
        // Если изменение произошло внутри .ia-btn (смена иконки), мы ничего не делаем.
        const isInternalChange = mutations.some(m => m.target.closest && m.target.closest('.ia-btn'));
        if (isInternalChange) return;

        clearTimeout(timeout);
        timeout = setTimeout(injectButtons, 200);
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function injectButtons() {
    injectReelAndFeedButtons();
    injectStoryButtons();
}

function injectReelAndFeedButtons() {
    const svgs = document.querySelectorAll('svg[height="24"], svg[width="24"]');

    svgs.forEach(svg => {
        if (svg.classList.contains('ia-icon') || svg.closest('.ia-btn')) return;
        if (svg.closest('nav') || svg.closest('header')) return;

        const btn = svg.closest('div[role="button"], button');
        if (!btn) return;

        const containerInfo = findContainer(btn);

        if (containerInfo) {
            const { container, isReel } = containerInfo;

            // 2. ПРОВЕРКА ПО КЛАССУ КОНТЕЙНЕРА (Надежнее чем querySelector)
            if (container.classList.contains('ia-has-btn')) return;

            // Проверяем валидность (минимум 2 большие кнопки рядом)
            const siblingSvgs = container.querySelectorAll('svg[height="24"]');
            if (siblingSvgs.length < 2) return;

            const newBtn = createButton(isReel);

            newBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newBtn.dataset.loading === "true") return;
                const url = getPostUrl(newBtn);
                await sendTask(url, newBtn);
            };

            container.appendChild(newBtn);
            // Помечаем контейнер, что в нем уже есть кнопка
            container.classList.add('ia-has-btn');
        }
    });
}

function findContainer(triggerBtn) {
    let currentEl = triggerBtn.parentElement;

    for (let i = 0; i < 5; i++) {
        if (!currentEl) break;

        const style = window.getComputedStyle(currentEl);

        // REELS
        if (style.display === 'flex' && style.flexDirection === 'column') {
            if (currentEl.childElementCount >= 3) {
                return { container: currentEl, isReel: true };
            }
        }

        // FEED
        if (style.display === 'flex' && style.flexDirection === 'row') {
            if (currentEl.childElementCount >= 3 && currentEl.clientWidth > currentEl.clientHeight) {
                return { container: currentEl, isReel: false };
            }
        }
        currentEl = currentEl.parentElement;
    }
    return null;
}

function getPostUrl(element) {
    const article = element.closest('article');
    if (article) {
        const links = article.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
        for (const link of links) {
            if (link.href.match(/\/(p|reel)\/[\w-]+\//)) {
                return link.href;
            }
        }
    }
    return window.location.href;
}

function injectStoryButtons() {
    const menuBtns = document.querySelectorAll('div[role="button"] svg circle');
    menuBtns.forEach(circle => {
        const btnContainer = circle.closest('div[role="button"]')?.parentElement;
        if (!btnContainer || btnContainer.querySelector('.ia-story-btn')) return;

        const rect = btnContainer.getBoundingClientRect();
        if (rect.top > 150) return;

        const btn = createButton(true);
        btn.classList.add('ia-story-btn');

        btn.onclick = async (e) => {
            e.stopPropagation();
            await sendTask(window.location.href, btn);
        };

        btnContainer.insertBefore(btn, btnContainer.firstChild);
    });
}

function createButton(isReel) {
    const btn = document.createElement('div');
    btn.className = 'x1i10hfl ia-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = DOWNLOAD_ICON;

    if (isReel) {
        btn.classList.add('ia-btn-reel');
    } else {
        btn.classList.add('ia-btn-post');
    }
    return btn;
}

async function sendTask(url, btnElement) {
    btnElement.dataset.loading = "true";
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = LOADING_ICON;

    try {
        const urlObj = new URL(url);
        url = urlObj.origin + urlObj.pathname;
    } catch(e) {}

    const response = await chrome.runtime.sendMessage({ type: 'SEND_URL', url });

    if (response.success) {
        btnElement.style.color = '#0095f6';
        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.style.color = '';
            btnElement.dataset.loading = "false";
        }, 2000);
    } else {
        btnElement.style.color = '#ed4956';
        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.style.color = '';
            btnElement.dataset.loading = "false";
        }, 2000);
    }
}

init();