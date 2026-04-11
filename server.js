const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// === ADMIN KEY (GİRİŞ ANAHTARI) ===
const ADMIN_KEY = '126677';

// === IN-MEMORY CONFIG (Render'da filesystem yazılamaz) ===
// Başlangıçta config.js'deki statik değerler kullanılır.
let inMemoryConfig = null;

// Sunucu açıldığında config.js'yi oku ve memory'yi doldur
try {
    const configPath = path.join(__dirname, 'config.js');
    if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        // Hem "window.AERO_CONFIG =" hem de "const AERO_CONFIG =" durumlarını destekle
        const jsonStr = fileContent
            .replace(/^(window|const)\.AERO_CONFIG\s*=\s*/, '')
            .replace(/;$/, '')
            .trim();
        inMemoryConfig = JSON.parse(jsonStr);
        console.log("[OK] Config.js initialized into memory");
    }
} catch (e) {
    console.warn("[WARN] Could not initialize memory from config.js:", e.message);
}

// === MULTER SETUP ===
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'assets', 'videos');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Static Files (Viewer & Editor)
app.use(express.static(path.join(__dirname)));
app.use('/editor', express.static(path.join(__dirname, 'editor')));

// Video Yükleme Uç Noktası
app.post('/upload-video', upload.single('video'), (req, res) => {
    try {
        const { adminKey } = req.body;
        if (adminKey !== ADMIN_KEY) {
            // Unutulmaması için yüklü dosyayı siliyoruz (eğer yetki yoksa)
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Hata: Geçersiz Giriş Anahtarı!' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Video dosyası bulunamadı!' });
        }
        const videoUrl = 'assets/videos/' + req.file.filename;
        res.json({ success: true, url: videoUrl, message: 'Video başarıyla yüklendi.' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Yükleme hatası', details: err.message });
    }
});

// Health check
app.get('/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// GET config - memory'deki güncel config'i döndürür
app.get('/config-data', (req, res) => {
    if (inMemoryConfig) {
        res.json({ success: true, config: inMemoryConfig });
    } else {
        res.json({ success: false, message: 'Henüz memory config yok, config.js kullanılıyor.' });
    }
});

// Save endpoint - Hem memory'e hem de FİZİKSEL DOSYAYA kaydeder
app.post('/save', (req, res) => {
    try {
        const { config, adminKey } = req.body;

        // Security check
        if (adminKey !== ADMIN_KEY) {
            return res.status(401).json({ error: 'Hata: Geçersiz Giriş Anahtarı!' });
        }

        if (!config) {
            return res.status(400).json({ error: 'Config verisi eksik!' });
        }

        // 1. Memory'e kaydet (Hızlı erişim için)
        inMemoryConfig = config;

        // 2. Fiziksel config.js dosyasına yaz (GitHub'a push yapabilmek için)
        const configFilePath = path.join(__dirname, 'config.js');
        const fileContent = `window.AERO_CONFIG = ${JSON.stringify(config, null, 4)};`;
        fs.writeFileSync(configFilePath, fileContent, 'utf8');

        console.log('--- Config.js dosyası fiziksel olarak güncellendi ---');

        // 3. GitHub'a otomatik Push yap (Arka planda çalışır)
        // Artık sadece config.js değil, yeni yüklenen videoları da kapsıyor (git add .)
        const gitCmd = 'git add . && git commit -m "auto: sync from editor (config + assets)" && git push origin main';
        exec(gitCmd, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git Push Hatası: ${error.message}`);
                return;
            }
            console.log('--- GitHub Otomatik Senkronizasyonu Başarılı (Videolar Dahil) ---');
        });

        res.json({
            success: true,
            message: 'Ayarlar anlık olarak kaydedildi ve GitHub senkronizasyonu başlatıldı!'
        });
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ error: 'Kayıt hatası', details: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log('================================================');
    console.log('🚀 AERO SUNUCUSU AKTİF!');
    console.log(`🌍 Port: ${port}`);
    console.log('================================================');
});
