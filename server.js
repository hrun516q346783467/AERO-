const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// === ADMIN KEY (GİRİŞ ANAHTARI) ===
const ADMIN_KEY = '126677';

// === IN-MEMORY CONFIG (Render'da filesystem yazılamaz) ===
// Başlangıçta config.js'deki statik değerler kullanılır.
// Editor'dan kaydedilince bu memory'de tutulur.
let inMemoryConfig = null;

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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Save endpoint - dosyaya DEĞİL, memory'e kaydeder
app.post('/save', (req, res) => {
    try {
        const { config, adminKey } = req.body;

        // Security check
        if (adminKey !== ADMIN_KEY) {
            return res.status(401).json({ error: 'Hata: Geçersiz Giriş Anahtarı!' });
        }

        if (!config) {
            return res.status(400).json({ error: 'Config data missing' });
        }

        // Memory'e kaydet
        inMemoryConfig = config;
        console.log('--- Config memory\'e kaydedildi ---');

        res.json({
            success: true,
            message: 'Ayarlar kaydedildi! (Not: Sunucu restart edilirse sıfırlanır. GitHub\'a push yapın.)'
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
