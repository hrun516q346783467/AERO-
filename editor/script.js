document.addEventListener('DOMContentLoaded', () => {
    let config = window.AERO_CONFIG;
    let currentAnimId = null;

    // Elements
    const animList = document.getElementById('anim-list');
    const addAnimBtn = document.getElementById('add-anim-btn');
    const applyAllBtn = document.getElementById('save-all-btn');
    const exportFileBtn = document.getElementById('export-file-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const editView = document.getElementById('edit-view');
    const deleteAnimBtn = document.getElementById('delete-anim-btn');
    const toastContainer = document.getElementById('toast-container');

    // Form Elements
    const animIdInput = document.getElementById('anim-id');
    const animTitleInput = document.getElementById('anim-title');
    const animPriceInput = document.getElementById('anim-price');
    const animHtmlInput = document.getElementById('anim-html');
    const animCssInput = document.getElementById('anim-css');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // === LOGIN & SECURITY ===
    const loginOverlay = document.getElementById('login-overlay');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const editorContainer = document.querySelector('.editor-container');

    const CORRECT_KEY = 'AERO VARNA';

    async function init() {
        const sessionKey = sessionStorage.getItem('aero_session_active');
        if (sessionKey === 'true') {
            unlockEditor();
        } else {
            setupLogin();
        }
        setupEventListeners();
    }

    function setupLogin() {
        loginBtn.onclick = () => {
            const val = loginPasswordInput.value.trim();
            if (val === CORRECT_KEY) {
                unlockEditor();
            } else {
                loginError.classList.remove('hidden');
                setTimeout(() => loginError.classList.add('hidden'), 3000);
            }
        };

        loginPasswordInput.onkeydown = (e) => {
            if (e.key === 'Enter') loginBtn.click();
        };
    }

    function unlockEditor() {
        sessionStorage.setItem('aero_session_active', 'true');
        loginOverlay.style.display = 'none';
        editorContainer.classList.remove('hidden-editor');
        
        // Load data only after unlocking
        loadFromLocalStorage();
        renderList();
        
        // Auto-fill admin key input for saving
        document.getElementById('admin-key-input').value = CORRECT_KEY;
        console.log('--- AERO Editor Authenticated ---');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'danger') icon = 'fa-exclamation-triangle';
        
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    function saveToLocalStorage() {
        localStorage.setItem('aero_config_backup', JSON.stringify(config));
        localStorage.setItem('aero_config_timestamp', Date.now());
    }

    function loadFromLocalStorage() {
        const backup = localStorage.getItem('aero_config_backup');
        if (backup) {
            try {
                config = JSON.parse(backup);
                console.log('Real-time sync: Active');
            } catch (e) {
                console.error("Local storage sync error", e);
            }
        }
    }

    function renderList() {
        animList.innerHTML = '';
        config.animations.forEach(anim => {
            const li = document.createElement('li');
            li.className = `anim-item ${currentAnimId === anim.id ? 'active' : ''}`;
            li.innerHTML = `<i class="fas fa-play-circle"></i> ${anim.title}`;
            li.onclick = () => selectAnim(anim.id);
            animList.appendChild(li);
        });
    }

    function selectAnim(id) {
        currentAnimId = id;
        const anim = config.animations.find(a => a.id === id);
        if (!anim) return;

        welcomeScreen.classList.add('hidden');
        editView.classList.remove('hidden');
        document.getElementById('edit-title-display').innerText = `Animasyon Düzenle: ${anim.title}`;

        animIdInput.value = anim.id;
        animTitleInput.value = anim.title;
        animPriceInput.value = anim.price || '0.00';
        animHtmlInput.value = anim.html;
        animCssInput.value = anim.css || '';

        updatePreview();
        renderList();
        
        // Close sidebar on mobile after selection
        if (window.innerWidth < 992 && sidebar.classList.contains('open')) {
            menuToggle.click();
        }
    }

    /**
     * Updated updatePreview to use Shadow DOM for total isolation.
     * This mimics how the main site renders animations.
     */
    function updatePreview() {
        if (!currentAnimId) return;
        const html = animHtmlInput.value;
        const css = animCssInput.value;
        const iframe = document.getElementById('preview-frame');
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        // Clean slate for the iframe
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #020617; color: white; font-family: sans-serif; overflow: hidden; }
                    #shadow-host { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
                </style>
            </head>
            <body>
                <div id="shadow-host"></div>
                <script>
                    const host = document.getElementById('shadow-host');
                    const shadow = host.attachShadow({mode: 'open'});
                    
                    const update = (h, c, builtIn) => {
                        shadow.innerHTML = \`
                            <style>
                                :host { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; }
                                * { box-sizing: border-box; margin: 0; padding: 0; }
                                \${builtIn}
                                \${c}
                            </style>
                            <div class="anim-root">
                                \${h}
                            </div>
                        \`;
                    };
                    window.updateContent = update;
                </script>
            </body>
            </html>
        `);
        doc.close();

        // Call the update function inside the iframe
        const builtIn = getBuiltInCss(currentAnimId);
        if (iframe.contentWindow.updateContent) {
            iframe.contentWindow.updateContent(html, css, builtIn);
        } else {
            // Wait for iframe to load script
            iframe.onload = () => {
                iframe.contentWindow.updateContent(html, css, builtIn);
            };
        }
    }

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

    function setupEventListeners() {
        // Mobile Menu Toggle
        if (menuToggle) {
            menuToggle.onclick = () => {
                sidebar.classList.toggle('open');
                const icon = menuToggle.querySelector('i');
                if (sidebar.classList.contains('open')) {
                    icon.classList.replace('fa-bars', 'fa-times');
                } else {
                    icon.classList.replace('fa-times', 'fa-bars');
                }
            };
        }

        [animIdInput, animTitleInput, animPriceInput, animHtmlInput, animCssInput].forEach(input => {
            input.oninput = () => {
                const anim = config.animations.find(a => a.id === currentAnimId);
                if (anim) {
                    anim.id = animIdInput.value;
                    anim.title = animTitleInput.value;
                    anim.price = animPriceInput.value;
                    anim.html = animHtmlInput.value;
                    anim.css = animCssInput.value;
                }
                updatePreview();
                saveToLocalStorage();
            };
        });

        addAnimBtn.onclick = () => {
            const newIndex = config.animations.length + 1;
            const newId = `ANM${newIndex}`;
            const newAnim = { 
                id: newId, 
                title: `Yeni Animasyon ${newIndex}`, 
                price: '29.99',
                html: '<div class="circle"></div>', 
                css: '' 
            };
            config.animations.push(newAnim);
            saveToLocalStorage();
            renderList();
            selectAnim(newId);
        };

        deleteAnimBtn.onclick = () => {
            if (confirm('Bu animasyonu silmek istediğinize emin misiniz?')) {
                config.animations = config.animations.filter(a => a.id !== currentAnimId);
                currentAnimId = null;
                saveToLocalStorage();
                editView.classList.add('hidden');
                welcomeScreen.classList.remove('hidden');
                renderList();
            }
        };

        // UI-Only Apply (for real-time sync with main site)
        applyAllBtn.onclick = async () => {
            saveToLocalStorage();
            const adminKey = document.getElementById('admin-key-input').value;
            
            if (!adminKey) {
                showToast('Lütfen değişiklikleri kaydetmek için Giriş Anahtarı girin!', 'danger');
                return;
            }

            try {
                const response = await fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config, adminKey })
                });

                const result = await response.json();
                if (result.success) {
                    showToast('Bulut Senkronizasyonu Başarılı! Değişiklikler her yerden erişilebilir.', 'success');
                    localStorage.setItem('aero_admin_key', adminKey);
                } else {
                    showToast(result.error || 'Kaydetme hatası!', 'danger');
                }
            } catch (err) {
                showToast('Sunucuya bağlanılamadı!', 'danger');
            }
        };

        // Load saved admin key
        const savedKey = localStorage.getItem('aero_admin_key');
        if (savedKey) document.getElementById('admin-key-input').value = savedKey;

        // File-Based Export (Universal "Save")
        exportFileBtn.onclick = async () => {
            const content = `window.AERO_CONFIG = ${JSON.stringify(config, null, 4)};`;
            
            // Try Modern File System Access API
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'config.js',
                        types: [{ description: 'Config Dosyası', accept: { 'application/javascript': ['.js'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    showToast('config.js başarıyla güncellendi!', 'success');
                    return;
                } catch (err) {
                    console.log('User cancelled or error:', err);
                }
            }

            // Fallback: Blob Download
            const blob = new Blob([content], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.js';
            a.click();
            URL.revokeObjectURL(url);
            showToast('config.js indirildi! Lütfen projedeki eskisiyle değiştirin.', 'info');
        };
    }

    init();
});
