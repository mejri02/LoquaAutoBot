const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

let CONFIG = {
    headless: true,
    checkInInterval: 86400,
    minMessagesPerAccount: 1,
    maxMessagesPerAccount: 3,
    delayBetweenMessagesMin: 60,
    delayBetweenMessagesMax: 180,
    delayBetweenAccountsMin: 30,
    delayBetweenAccountsMax: 60,
    sleepAfterCycleSeconds: 14400,
    maxMessagesPerTenMinutes: 5,
    messages: [
        "Just read about Sui's new zkLogin feature – huge for onboarding! 🔐",
        "The Sui ecosystem is expanding fast. Any favorite new projects?",
        "DeFi on Sui is getting interesting – DeepBook volume is up 40% this week.",
        "NFTs on Sui are underrated. The Move language enables some really cool dynamic assets.",
        "I think we'll see major institutional adoption of Sui in the next bull run.",
        "Anyone else staking SUI? The APY is pretty attractive right now.",
        "The Walrus storage solution is a game-changer for permanent data on-chain.",
        "Sui's parallel execution is seriously impressive – I've been testing some transactions.",
        "Curious how the upcoming upgrade will affect gas fees. Thoughts?",
        "Building on Sui feels so smooth – the dev experience is top-notch."
    ]
};

try {
    const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    CONFIG = { ...CONFIG, ...cfg };
    console.log('✅ Loaded config.json');
} catch {
    console.log('ℹ️ Using default config');
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
];

const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
    white: '\x1b[37m', gray: '\x1b[90m',
    bRed: '\x1b[91m', bGreen: '\x1b[92m', bYellow: '\x1b[93m',
    bBlue: '\x1b[94m', bMagenta: '\x1b[95m', bCyan: '\x1b[96m', bWhite: '\x1b[97m'
};

function clr(c, t) { return C[c] ? C[c] + t + C.reset : t; }
function ts() { return clr('gray', '[' + new Date().toTimeString().slice(0,8) + ']'); }

function findChrome() {
    const platform = os.platform();
    const paths = [];
    if (platform === 'linux') {
        paths.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium', '/snap/bin/chrome');
    } else if (platform === 'darwin') {
        paths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium');
    } else if (platform === 'win32') {
        paths.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe');
    }
    if (process.env.WSL_DISTRO_NAME) {
        paths.push('/mnt/c/Program Files/Google/Chrome/Application/chrome.exe', '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe');
    }
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getProxyAgent(proxyUrl) {
    if (!proxyUrl) return null;
    try {
        const url = new URL(proxyUrl);
        const protocol = url.protocol.replace(':', '');
        if (protocol === 'http' || protocol === 'https') {
            return new HttpsProxyAgent(proxyUrl);
        } else if (protocol === 'socks5' || protocol === 'socks4') {
            return new SocksProxyAgent(proxyUrl);
        }
        return null;
    } catch { return null; }
}

function getNextUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function printBanner() {
    const w = 68;
    console.log('\n' + clr('bCyan', '╔' + '═'.repeat(w) + '╗'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ██╗      ██████╗  ██████╗ ██╗   ██╗ █████╗ ') + clr('bCyan', '║'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ██║     ██╔═══██╗██╔══██╗██║   ██║██╔══██╗') + clr('bCyan', '║'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ██║     ██║   ██║██████╔╝██║   ██║███████║') + clr('bCyan', '║'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ██║     ██║   ██║██╔══██╗██║   ██║██╔══██║') + clr('bCyan', '║'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ███████╗╚██████╔╝██████╔╝╚██████╔╝██║  ██║') + clr('bCyan', '║'));
    console.log(clr('bCyan', '║') + clr('bYellow', '  ╚══════╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝') + clr('bCyan', '║'));
    console.log(clr('bCyan', '╠' + '═'.repeat(w) + '╣'));
    const sub = '  🤖  LOQUA BOT  ·  PUPPETEER  ·  v5.0  ';
    console.log(clr('bCyan', '║') + clr('bMagenta', sub.padEnd(w)) + clr('bCyan', '║'));
    console.log(clr('bCyan', '╚' + '═'.repeat(w) + '╝') + '\n');
}

function loadAccounts() {
    let content;
    try { content = fs.readFileSync('accounts.json', 'utf8'); } 
    catch { try { content = fs.readFileSync('accounts.txt', 'utf8'); } catch { console.error('❌ No accounts file'); process.exit(1); } }
    let sessions = [];
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) sessions = parsed;
        else if (typeof parsed === 'object' && parsed.address) sessions = [parsed];
    } catch {
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
            try { sessions.push(JSON.parse(line.trim())); } catch {}
        }
    }
    const accounts = [];
    for (const session of sessions) {
        if (session.address && session.loquaAuth?.access_token) {
            accounts.push({
                address: session.address,
                session: session,
                lastCheckIn: null,
                messageCount: 0,
                messagesInWindow: 0,
                windowStartTime: Date.now(),
                rateLimitedUntil: 0
            });
        }
    }
    console.log(`✅ Loaded ${accounts.length} accounts`);
    return accounts;
}

function extractEmail(idToken) {
    try {
        if (!idToken) return null;
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.email || null;
    } catch { return null; }
}

class LoquaBot {
    constructor(useProxy = false) {
        this.accounts = [];
        this.running = false;
        this.useProxy = useProxy;
        this.proxyList = [];
        this.proxyIndex = 0;
        try {
            this.proxyList = fs.readFileSync('proxy.txt', 'utf8').split('\n').filter(l => l.trim());
            console.log(`✅ Loaded ${this.proxyList.length} proxies`);
        } catch { console.log('ℹ️ No proxy.txt – direct connection'); }
        this.browser = null;
        this.page = null;
    }

    getNextProxy() {
        if (!this.proxyList.length) return null;
        const proxy = this.proxyList[this.proxyIndex % this.proxyList.length];
        this.proxyIndex++;
        return proxy;
    }

    getBrowserArgs() {
        const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
        const proxy = this.useProxy ? this.getNextProxy() : null;
        if (proxy) {
            const agent = getProxyAgent(proxy);
            if (agent) args.push(`--proxy-server=${proxy}`);
        }
        return args;
    }

    async initBrowser() {
        const chromePath = findChrome();
        if (!chromePath) {
            console.error('❌ Chrome not found!');
            process.exit(1);
        }
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless ? 'new' : false,
            executablePath: chromePath,
            args: this.getBrowserArgs(),
            defaultViewport: { width: 1280, height: 720 }
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(getNextUserAgent());
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    async injectSession(session) {
        if (!this.page) await this.initBrowser();
        await this.page.goto('https://loqua.net', { waitUntil: 'networkidle2', timeout: 30000 });
        await this.page.evaluate((s) => {
            localStorage.setItem('loqua.zklogin.session', JSON.stringify(s));
        }, session);
        await this.page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(3000);
    }

    async findInput() {
        const selectors = [
            '.web-chat-input textarea',
            '.web-chat-input',
            '.chat-input',
            '[contenteditable="true"]',
            'textarea[placeholder*="message"]'
        ];
        for (const selector of selectors) {
            try {
                const el = await this.page.$(selector);
                if (el) return selector;
            } catch {}
        }
        return null;
    }

    async dailyCheckIn(account) {
        try {
            console.log(ts() + ' 📋 ' + clr('bBlue', `Check-in ${account.address.slice(0,10)}...`));
            await this.injectSession(account.session);
            const input = await this.findInput();
            if (!input) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat not loaded'));
                return false;
            }
            account.lastCheckIn = Date.now();
            console.log(ts() + ' ✅ ' + clr('bGreen', 'Check-in successful!'));
            return true;
        } catch (error) {
            console.log(ts() + ' ❌ ' + clr('bRed', `Check-in failed: ${error.message}`));
            return false;
        }
    }

    async sendMessage(account) {
        if (account.rateLimitedUntil > Date.now()) {
            const remaining = Math.ceil((account.rateLimitedUntil - Date.now()) / 1000);
            console.log(ts() + ' ⏳ ' + clr('bYellow', `Rate limited for ${remaining}s`));
            return false;
        }
        if (Date.now() - account.windowStartTime > CONFIG.maxMessagesPerTenMinutes * 60 * 1000) {
            account.messagesInWindow = 0;
            account.windowStartTime = Date.now();
        }
        if (account.messagesInWindow >= CONFIG.maxMessagesPerTenMinutes) {
            account.rateLimitedUntil = Date.now() + 600 * 1000;
            console.log(ts() + ' ⏳ ' + clr('bYellow', 'Rate limit reached'));
            return false;
        }

        try {
            const msg = CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];
            console.log(ts() + ' 💬 ' + clr('bCyan', `${account.address.slice(0,10)}: `) + clr('bWhite', `"${msg}"`));
            
            await this.injectSession(account.session);
            const input = await this.findInput();
            if (!input) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat input not found'));
                return false;
            }
            
            await this.page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) { el.focus(); el.click(); }
            }, input);
            
            await this.page.type(input, msg, { delay: 20 + Math.random() * 30 });
            await this.page.keyboard.press('Enter');
            await sleep(2000);
            
            account.messageCount++;
            account.messagesInWindow++;
            console.log(ts() + ' ✅ ' + clr('bGreen', 'Message sent!'));
            console.log(ts() + ' 📊 ' + clr('bYellow', `Total: ${account.messageCount}`));
            return true;
        } catch (error) {
            console.log(ts() + ' ❌ ' + clr('bRed', `Send failed: ${error.message}`));
            return false;
        }
    }

    async runCycle() {
        for (let i = 0; i < this.accounts.length && this.running; i++) {
            const account = this.accounts[i];
            try {
                if (!account.lastCheckIn || (Date.now() - account.lastCheckIn >= CONFIG.checkInInterval * 1000)) {
                    await this.dailyCheckIn(account);
                }
                const count = Math.floor(Math.random() * (CONFIG.maxMessagesPerAccount - CONFIG.minMessagesPerAccount + 1)) + CONFIG.minMessagesPerAccount;
                let sent = 0;
                for (let j = 0; j < count && this.running; j++) {
                    if (account.rateLimitedUntil > Date.now()) break;
                    const success = await this.sendMessage(account);
                    if (success) sent++;
                    if (j < count - 1 && sent < count) {
                        const delay = Math.floor(Math.random() * (CONFIG.delayBetweenMessagesMax - CONFIG.delayBetweenMessagesMin + 1)) + CONFIG.delayBetweenMessagesMin;
                        console.log(ts() + ' ⏳ ' + clr('bMagenta', `Waiting ${delay}s...`));
                        await sleep(delay * 1000);
                    }
                }
                if (i < this.accounts.length - 1 && this.running) {
                    const accDelay = Math.floor(Math.random() * (CONFIG.delayBetweenAccountsMax - CONFIG.delayBetweenAccountsMin + 1)) + CONFIG.delayBetweenAccountsMin;
                    console.log(ts() + ' 🔄 ' + clr('bCyan', `Switching accounts in ${accDelay}s...`));
                    await sleep(accDelay * 1000);
                    await this.closeBrowser();
                }
            } catch (error) {
                console.log(ts() + ' ❌ ' + clr('bRed', `Error: ${error.message}`));
            }
        }
    }

    async run() {
        console.clear();
        printBanner();
        this.accounts = loadAccounts();
        if (!this.accounts.length) { console.error('❌ No accounts'); process.exit(1); }
        console.log(ts() + ' 🚀 ' + clr('bGreen', `Starting with ${this.accounts.length} accounts...`));
        this.running = true;
        while (this.running) {
            await this.runCycle();
            if (!this.running) break;
            const hours = CONFIG.sleepAfterCycleSeconds / 3600;
            console.log(ts() + ' 💤 ' + clr('bMagenta', `Sleeping for ${CONFIG.sleepAfterCycleSeconds}s (${hours.toFixed(1)} hours)...`));
            await sleep(CONFIG.sleepAfterCycleSeconds * 1000);
        }
        await this.closeBrowser();
    }

    stop() {
        this.running = false;
        this.closeBrowser();
    }
}

const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
console.log(clr('bYellow', 'Use proxy?'));
console.log('  1: ' + clr('bGreen', 'No (direct connection)'));
console.log('  2: ' + clr('bGreen', 'Yes (use proxies from proxy.txt)'));
rl.question(clr('bCyan', '> '), (answer) => {
    const useProxy = answer.trim() === '2';
    rl.close();
    const bot = new LoquaBot(useProxy);
    bot.run().catch(console.error);
    process.on('SIGINT', () => {
        console.log('\n' + clr('bRed', '🛑 Stopping bot...'));
        bot.stop();
        process.exit(0);
    });
});