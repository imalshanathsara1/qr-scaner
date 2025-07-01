const { Client, LocalAuth} = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { v4: uuidv4} = require('uuid');
const { exec} = require('child_process');

// 🔁 Session ID generate or load
let SESSION_ID;
if (fs.existsSync('session-id.txt')) {
    SESSION_ID = fs.readFileSync('session-id.txt', 'utf-8').trim();
    console.log(`🆔 Loaded session ID: ${SESSION_ID}`);
} else {
    SESSION_ID = uuidv4().slice(0, 8);
    fs.writeFileSync('session-id.txt', SESSION_ID);
    console.log(`🆕 Generated session ID: ${SESSION_ID}`);
}

// 🟢 WhatsApp client (Puppeteer skipped for Replit compatibility)
const client = new Client({
    authStrategy: new LocalAuth({ clientId: SESSION_ID}),
    puppeteer: {
        executablePath: 'echo', // ✅ Skip launching browser
        args: ['--no-sandbox', '--disable-setuid-sandbox']
}
});

let qrDataURL = '';

// 📸 QR code → browser tab via local server
client.on('qr', async (qr) => {
    console.log(`📱 Scan QR code in browser for session: ${SESSION_ID}`);
    qrDataURL = await qrcode.toDataURL(qr);

    if (!global.serverStarted) {
        global.serverStarted = true;

        http.createServer((req, res) => {
            if (!qrDataURL) {
                res.writeHead(503);
                return res.end('QR code not ready');
}

            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(`
                <html>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;">
                        <div>
                            <h2>Scan QR Code to Connect WhatsApp</h2>
                            <img src="${qrDataURL}" />
                            <p>Session ID: <b>${SESSION_ID}</b></p>
                        </div>
                    </body>
                </html>
            `);
}).listen(3000, () => {
            console.log('🌐 QR code server running at http://localhost:3000');

            const openCmd = process.platform === 'win32'? 'start':
                            process.platform === 'darwin'? 'open': 'xdg-open';
            exec(`${openCmd} http://localhost:3000`);
});
}
});

// ✅ Connected → Send session ID to your WhatsApp
client.on('ready', async () => {
    console.log(`✅ WhatsApp connected! Session ID: ${SESSION_ID}`);

    try {
        const chats = await client.getChats();
        const myChat = chats.find(chat => chat.isGroup === false);

        if (myChat) {
            await client.sendMessage(
                myChat.id._serialized,
                `✅ Bot connected!\n🆔 Session ID: *${SESSION_ID}*`
);
            console.log('📩 Session ID sent to your WhatsApp.');
} else {
            console.log('⚠️ Could not find a personal chat to send session ID.');
}
} catch (err) {
        console.error('❌ Error sending session ID:', err);
}
});

client.initialize();
