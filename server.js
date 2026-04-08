const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// === ADMIN KEY (GİRİŞ ANAHTARI) ===
const ADMIN_KEY = 'AERO VARNA';

// === IN-MEMORY CONFIG (Render'da filesystem yazılamaz) ===
// Başlangıçta config.js'deki statik değerler kullanılır.
// Editor'dan kaydedilince bu memory'de tutulur.
let inMemoryConfig = null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve Static Files (Viewer & Editor)
app.use(express.static(path.join(__dirname)));
app.use('/editor', express.static(path.join(__dirname, 'editor')));

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
