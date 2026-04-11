document.addEventListener('DOMContentLoaded', () => {
    let config = window.AERO_CONFIG || { animations: [] };
    let currentAnimId = null;

    // Elements
    const animList = document.getElementById('anim-list');
    const addAnimBtn = document.getElementById('add-anim-btn');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const videoUploadInput = document.getElementById('video-upload');
    const applyAllBtn = document.getElementById('save-all-btn');
    const exportFileBtn = document.getElementById('export-file-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const editView = document.getElementById('edit-view');
    const deleteAnimBtn = document.getElementById('delete-anim-btn');
    const toastContainer = document.getElementById('toast-container');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Form Elements
    const animIdInput = document.getElementById('anim-id');
    const animTitleInput = document.getElementById('anim-title');
    const animPriceInput = document.getElementById('anim-price');
    const animHtmlInput = document.getElementById('anim-html');
    const animCssInput = document.getElementById('anim-css');

    // === LOGIN & SECURITY ===
    const loginOverlay = document.getElementById('login-overlay');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const editorContainer = document.querySelector('.editor-container');

    const CORRECT_KEY = '126677';

    async function init() {
        // Şifre panelini geçici olarak devre dışı bıraktık
        unlockEditor();
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
        
        loadFromLocalStorage();
        renderList();
        
        document.getElementById('admin-key-input').value = CORRECT_KEY;
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
        // Her kayıtta timestamp ekle — ne zaman kaydedildiğini bileceğiz
        const backup = {
            timestamp: Date.now(),
            data: config
        };
        localStorage.setItem('aero_editor_backup', JSON.stringify(backup));
        // Eski key'i temizle (eski formattan geçiş)
        localStorage.removeItem('aero_config_backup');
    }

    function loadFromLocalStorage() {
        // ÖNCE sunucu verisini (window.AERO_CONFIG) kullan — asla ezeriz
        // LocalStorage sadece sunucu erişilememişse veya kullanıcı değişiklik yapmışsa kullanılır
        const serverConfig = window.AERO_CONFIG || { animations: [] };
        const backupRaw = localStorage.getItem('aero_editor_backup');

        if (!backupRaw) {
            // Yedek yok, sunucu verisini kullan
            config = serverConfig;
            return;
        }

        let backup;
        try { backup = JSON.parse(backupRaw); } catch(e) {
            // Yedek bozuksa sunucu verisini kullan
            config = serverConfig;
            return;
        }

        // Sunucu config.js'i ne zaman deploy edildi bilmiyoruz,
        // bu yüzden şu politikayı izliyoruz:
        // Kullanıcı yedeği varsa ve sunucu verisiyle animasyon sayısı eşleşiyorsa → yedeği kullan
        // Ancak sunucuda YENİ animasyon eklendiyse (sayısı fazlaysa) → sunucuyu kullan
        const serverAnimCount = serverConfig ? serverConfig.animations.length : 0;
        const backupAnimCount = backup.data ? backup.data.animations.length : 0;

        if (backupAnimCount >= serverAnimCount) {
            // Yedek daha kapsamlı veya eşit — kullanıcının yaptığı değişiklikler var
            config = backup.data;
        } else {
            // Sunucu daha fazla animasyon içeriyor — sunucu verisi daha güncel
            config = serverConfig;
            // Eskiyi sil
            localStorage.removeItem('aero_editor_backup');
        }
    }

    function renderList() {
        animList.innerHTML = '';
        config.animations.forEach(anim => {
            const li = document.createElement('li');
            li.className = `anim-item ${currentAnimId === anim.id ? 'active' : ''}`;
            li.innerHTML = `<i class="fas fa-cube"></i> ${anim.title}`;
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
        document.getElementById('edit-title-display').innerText = anim.title;

        animIdInput.value = anim.id;
        animTitleInput.value = anim.title;
        animPriceInput.value = anim.price || '0.00';
        animHtmlInput.value = anim.html;
        animCssInput.value = anim.css || '';

        updatePreview();
        renderList();
        
        // Close sidebar on mobile
        if (window.innerWidth < 992) {
            sidebar.classList.remove('open');
            menuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
        }
    }

    function updatePreview() {
        if (!currentAnimId) return;
        const html = animHtmlInput.value;
        const css = animCssInput.value;
        const iframe = document.getElementById('preview-frame');
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <base href="../">
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #020617; color: white; font-family: sans-serif; overflow: hidden; }
                    #shadow-host { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
                </style>
            </head>
            <body>
                <div id="shadow-host"></div>
                <script>
                    const host = document.getElementById('shadow-host');
                    const shadow = host.attachShadow({mode: 'open'});
                    window.updateContent = (h, c) => {
                        shadow.innerHTML = \`<style>:host { display: flex; justify-content: center; align-items: center; } \${c}</style><div>\${h}</div>\`;
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();

        iframe.onload = () => {
             if (iframe.contentWindow.updateContent) iframe.contentWindow.updateContent(html, css);
        };
    }

    function setupEventListeners() {
        menuToggle.onclick = () => {
            sidebar.classList.toggle('open');
            const icon = menuToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        };

        [animIdInput, animTitleInput, animPriceInput, animHtmlInput, animCssInput].forEach(input => {
            input.oninput = () => {
                const anim = config.animations.find(a => a.id === currentAnimId);
                if (anim) {
                    anim.id = animIdInput.value;
                    anim.title = animTitleInput.value;
                    anim.price = animPriceInput.value;
                    anim.html = animHtmlInput.value;
                    anim.css = animCssInput.value;
                    document.getElementById('edit-title-display').innerText = anim.title;
                }
                updatePreview();
                saveToLocalStorage();
            };
        });

        addAnimBtn.onclick = () => {
            const newId = 'ANM' + (config.animations.length + 1);
            const newAnim = { id: newId, title: 'Yeni Animasyon', price: '0.00', html: '<div></div>', css: '' };
            config.animations.push(newAnim);
            renderList();
            selectAnim(newId);
            saveToLocalStorage();
        };

        uploadVideoBtn.onclick = () => {
            videoUploadInput.click();
        };

        videoUploadInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const adminKey = document.getElementById('admin-key-input').value;
            if (!adminKey) {
                showToast('Sunucu anahtarı gerekli!', 'danger');
                videoUploadInput.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('video', file);
            formData.append('adminKey', adminKey);

            showToast('Video yükleniyor, lütfen bekleyin...', 'info');

            try {
                const response = await fetch('/upload-video', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    showToast('Video başarıyla yüklendi!', 'success');
                    
                    const newId = 'ANM' + (config.animations.length + 1);
                    const htmlCode = `<div class="video-wrapper" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; border-radius: 12px; overflow: hidden;">\n    <video src="${result.url}" autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>\n</div>`;
                    
                    const newAnim = { 
                        id: newId, 
                        title: 'Video ' + newId, 
                        price: '0.00', 
                        html: htmlCode, 
                        css: '' 
                    };
                    config.animations.push(newAnim);
                    renderList();
                    selectAnim(newId);
                    saveToLocalStorage();
                } else {
                    showToast(result.error || 'Yükleme başarısız!', 'danger');
                }
            } catch (err) {
                console.error(err);
                showToast('Hata: Video yüklenemedi.', 'danger');
            }
            videoUploadInput.value = '';
        };

        deleteAnimBtn.onclick = () => {
            if (confirm('Silmek istediğine emin misin?')) {
                config.animations = config.animations.filter(a => a.id !== currentAnimId);
                currentAnimId = null;
                editView.classList.add('hidden');
                welcomeScreen.classList.remove('hidden');
                renderList();
                saveToLocalStorage();
            }
        };

        applyAllBtn.onclick = async () => {
            const adminKey = document.getElementById('admin-key-input').value;
            if (!adminKey) return showToast('Sunucu anahtarı gerekli!', 'danger');

            try {
                const response = await fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config, adminKey })
                });

                const result = await response.json();
                if (result.success) {
                    showToast('Bulut Senkronizasyonu Başarılı!', 'success');
                } else {
                    showToast(result.error || 'Kaydetme hatası!', 'danger');
                }
            } catch (err) {
                showToast('Hata: Sunucuya ulaşılamadı.', 'danger');
            }
        };

        exportFileBtn.onclick = () => {
            const content = `window.AERO_CONFIG = ${JSON.stringify(config, null, 4)};`;
            const blob = new Blob([content], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.js';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Yedek config.js indirildi.', 'success');
        };
    }

    init();
});
