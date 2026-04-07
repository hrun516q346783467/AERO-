const startAero = () => {
    // 1. Load config: localStorage first (editor real-time sync), then config.js
    let config = window.AERO_CONFIG;
    const backup = localStorage.getItem('aero_config_backup');
    if (backup) {
        try { config = JSON.parse(backup); } catch(e) { /* use config.js */ }
    }
    
    if (!config) {
        // Retry once after 100ms if config.js is still loading
        setTimeout(() => {
            if (!window.AERO_CONFIG) {
                console.error('CRITICAL: Config not found after retry!');
            } else {
                startAero();
            }
        }, 100);
        return;
    }

    // Elements
    const entranceScreen = document.getElementById('entrance-screen');
    const mainContent = document.getElementById('main-content');

    // Real-time sync: editor saves to localStorage, we reload
    window.addEventListener('storage', (e) => {
        if (e.key === 'aero_config_backup') window.location.reload();
    });

    // Apply site settings
    document.title = config.settings.siteTitle;
    document.querySelector('.logo-animation').innerText = config.settings.entrance.logo;
    document.querySelector('.subtitle-animation').innerText = config.settings.entrance.subtitle;
    document.getElementById('header-logo-text').innerText = config.settings.headerLogo;

    // Render gallery
    const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'aero';
    renderGallery(config.animations, config.settings.whatsappNumber, isAdmin);

    // Link validation logic (anim/key params)
    const urlParams = new URLSearchParams(window.location.search);
    const animId = urlParams.get('anim');
    const key = urlParams.get('key');
    if (animId && key) {
        try {
            const expiresAt = parseInt(atob(key));
            if (isNaN(expiresAt) || Date.now() > expiresAt) {
                showStatus('Erişim Süresi Doldu', 'Bu animasyon linkinin 24 saatlik kullanım süresi sona ermiştir.');
            } else {
                filterGallery(animId);
            }
        } catch(e) {
            showStatus('Geçersiz Link', 'Girdiğiniz link hatalı veya bozulmuş.');
        }
    }

    // Entrance animation transition
    setTimeout(() => {
        if (!entranceScreen) return;
        entranceScreen.style.opacity = '0';
        entranceScreen.style.visibility = 'hidden';
        setTimeout(() => {
            entranceScreen.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('hidden');
                void mainContent.offsetWidth; // Trigger reflow
                mainContent.classList.add('visible');
            }
        }, 1000);
    }, 2800);
};

// Handle dynamic script loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAero);
} else {
    startAero();
}


/**
 * Render gallery — each animation uses Shadow DOM for TOTAL CSS isolation.
 * Animation CSS can NEVER leak out and affect the site theme.
 */
function renderGallery(animations, waNumber, isAdmin) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';

    animations.forEach(anim => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-id', anim.id);

        const waText = encodeURIComponent(`Merhabalar, ${anim.title} animasyonunu (${anim.price || '0.00'}$) satın almak istiyorum 😊`);
        const waLink = `https://wa.me/${waNumber}?text=${waText}`;

        // Card structure — animation-container will host Shadow DOM
        const animContainer = document.createElement('div');
        animContainer.className = 'animation-container';

        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        cardInfo.innerHTML = `
            <h2>${anim.title}</h2>
            <div class="price-tag">$${anim.price || '0.00'}</div>
            <div class="card-actions">
                <a href="${waLink}" target="_blank" class="wa-btn">
                    <i class="fab fa-whatsapp"></i> Satın Al
                </a>
                <button class="admin-btn ${isAdmin ? '' : 'hidden'}" onclick="generateLink('${anim.id}')">
                    <i class="fas fa-link"></i> 24s Link Al
                </button>
            </div>
        `;

        card.appendChild(animContainer);
        card.appendChild(cardInfo);
        container.appendChild(card);

        // === SHADOW DOM ISOLATION ===
        // Create a shadow root — CSS inside here CANNOT affect anything outside
        const shadow = animContainer.attachShadow({ mode: 'open' });

        // Get built-in CSS for default animations (ANM1-ANM5)
        const builtInCss = getBuiltInCss(anim.id);

        // Build isolated content
        shadow.innerHTML = `
            <style>
                :host {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    height: 100%;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                ${builtInCss}
                ${anim.css || ''}
            </style>
            <div class="anim-root ${anim.id.toLowerCase()}">
                ${anim.html}
            </div>
        `;
    });
}


/**
 * Built-in CSS for default animations (ANM1-ANM5).
 * These used to be in style.css globally — now they live INSIDE each Shadow DOM.
 */
function getBuiltInCss(id) {
    const styles = {
        'ANM1': `.anim-root{display:flex;justify-content:center;align-items:center;width:100%;height:100%}.circle{width:80px;height:80px;background:linear-gradient(135deg,#f43f5e,#fb923c);border-radius:50%;animation:anm1Pulse 2s infinite}@keyframes anm1Pulse{0%{transform:scale(.95);box-shadow:0 0 0 0 rgba(244,63,94,.7)}70%{transform:scale(1);box-shadow:0 0 0 20px rgba(244,63,94,0)}100%{transform:scale(.95);box-shadow:0 0 0 0 rgba(244,63,94,0)}}`,

        'ANM2': `.anim-root{display:flex;justify-content:center;align-items:center;width:100%;height:100%;gap:15px}.square{width:50px;height:50px;background:linear-gradient(135deg,#8b5cf6,#d946ef);animation:anm2Rotate 3s ease-in-out infinite alternate}.square:nth-child(2){animation-delay:-1.5s;background:linear-gradient(135deg,#0ea5e9,#3b82f6)}@keyframes anm2Rotate{0%{transform:perspective(200px) rotateX(0) rotateY(0);border-radius:0}50%{transform:perspective(200px) rotateX(-180deg) rotateY(0);border-radius:50%}100%{transform:perspective(200px) rotateX(-180deg) rotateY(-180deg);border-radius:0}}`,

        'ANM3': `.anim-root{display:flex;justify-content:center;align-items:center;width:100%;height:100%;gap:10px}.wave{width:20px;height:40px;background:#10b981;border-radius:10px;animation:anm3Wave 1s ease-in-out infinite alternate}.wave:nth-child(2){animation-delay:.2s;background:#34d399}.wave:nth-child(3){animation-delay:.4s;background:#6ee7b7}@keyframes anm3Wave{0%{transform:scaleY(1)}100%{transform:scaleY(3)}}`,

        'ANM4': `.anim-root{display:flex;justify-content:center;align-items:center;width:100%;height:100%}.dots{display:flex;gap:10px}.dots span{width:20px;height:20px;background-color:#eab308;border-radius:50%;animation:anm4Bounce .6s infinite alternate}.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}@keyframes anm4Bounce{to{transform:translateY(-30px)}}`,

        'ANM5': `.anim-root{display:flex;justify-content:center;align-items:center;width:100%;height:100%}.spinner{width:80px;height:80px;border:8px solid rgba(255,255,255,.1);border-top:8px solid #06b6d4;border-radius:50%;animation:anm5Spin 1s linear infinite}@keyframes anm5Spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`
    };
    return styles[id.toUpperCase()] || '';
}


function filterGallery(id) {
    document.querySelectorAll('.card').forEach(card => {
        if (card.getAttribute('data-id') !== id) card.style.display = 'none';
    });
    const header = document.querySelector('header');
    const gallery = document.querySelector('.gallery');
    if (header) header.style.display = 'none';
    if (gallery) {
        gallery.style.gridTemplateColumns = '1fr';
        gallery.style.maxWidth = '600px';
    }
}

function showStatus(title, subtitle) {
    const overlay = document.getElementById('status-overlay');
    document.getElementById('status-title').innerText = title;
    document.getElementById('status-subtitle').innerText = subtitle;
    overlay.classList.remove('hidden');
}

window.generateLink = function(id) {
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    const token = btoa(expiresAt.toString());
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?anim=${id}&key=${token}`;
    navigator.clipboard.writeText(shareUrl)
        .then(() => alert(`${id} için 24 saatlik link kopyalandı!`))
        .catch(() => prompt('Link:', shareUrl));
};
