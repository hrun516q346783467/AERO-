const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

// === ADMIN KEY (GİRİŞ ANAHTARI) ===
const ADMIN_KEY = 'AERO VARNA'; // Here's the key to save changes. You can change it.

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve Static Files (Viewer & Editor)
app.use(express.static(path.join(__dirname)));
app.use('/editor', express.static(path.join(__dirname, 'editor')));

// Health check
app.get('/status', (req, res) => {
    res.json({ status: 'online' });
});

// Save endpoint with Admin Key protection
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

        const filePath = path.join(__dirname, 'config.js');
        const content = `window.AERO_CONFIG = ${JSON.stringify(config, null, 4)};`;

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('--- config.js updated successfully ---');
        res.json({ success: true, message: 'Ayarlar başarıyla kaydedildi!' });
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ error: 'Dosya kaydedilemedi', details: err.message });
    }
});

// Helper: Get Local Network IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n================================================');
    console.log('🚀 AERO SUNUCUSU AKTİF!');
    console.log(`🏠 Yerel Adres: http://localhost:${port}`);
    console.log(`📱 Ağ Adresi (Wi-Fi): http://${localIP}:${port}`);
    console.log('------------------------------------------------');
    console.log('🌍 DÜNYAYA AÇMAK İÇİN (Localtunnel):');
    console.log(`👉 npx localtunnel --port ${port}`);
    console.log('================================================\n');
});
