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
    groqChance: 0.4,
    groqModels: [
        'llama-3.1-8b-instant',
        'llama-3.2-3b-preview'
    ],
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

let GROQ_API_KEYS = [];
let currentKeyIndex = 0;
let currentModelIndex = 0;

try {
    const content = fs.readFileSync('groq.txt', 'utf8');
    GROQ_API_KEYS = content.split(/[\s\n]+/).filter(k => k.trim().startsWith('gsk_')).map(k => k.trim());
    if (GROQ_API_KEYS.length > 0) {
        console.log(`✅ Loaded ${GROQ_API_KEYS.length} Groq API keys`);
        GROQ_API_KEYS = GROQ_API_KEYS.sort(() => Math.random() - 0.5);
    } else {
        console.log('⚠️ No valid Groq API keys found in groq.txt');
    }
} catch {
    console.log('ℹ️ No groq.txt found, Groq AI disabled');
}

function getNextGroqKey() {
    if (GROQ_API_KEYS.length === 0) return null;
    const key = GROQ_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
    return key;
}

function getNextGroqModel() {
    const model = CONFIG.groqModels[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % CONFIG.groqModels.length;
    return model;
}

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
    const sub = `  🤖  LOQUA BOT  ·  v5.4  `;
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

function isTokenExpired(account) {
    if (!account.session.loquaAuth?.expires_at) return true;
    try {
        const expiresAt = Date.parse(account.session.loquaAuth.expires_at);
        return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + 300000;
    } catch {
        return true;
    }
}

async function refreshToken(account) {
    try {
        console.log(ts() + ' 🔄 ' + clr('bYellow', `Refreshing token for ${account.address.slice(0,10)}...`));
        const refreshToken = account.session.loquaAuth.refresh_token;
        if (!refreshToken) throw new Error('No refresh token available');
        const response = await fetch('https://api.loqua.net/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (!response.ok) throw new Error(`Refresh failed with status ${response.status}`);
        const data = await response.json();
        if (!data.access_token) throw new Error('No access_token in refresh response');
        account.session.loquaAuth.access_token = data.access_token;
        account.session.loquaAuth.expires_at = data.expires_at || data.expiresAt;
        if (data.refresh_token) account.session.loquaAuth.refresh_token = data.refresh_token;
        account.session.expiresAt = Date.parse(data.expires_at || data.expiresAt) || Date.now() + 86400000;
        const accountsData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
        const accountIndex = accountsData.findIndex(a => a.address === account.address);
        if (accountIndex !== -1) {
            accountsData[accountIndex] = account.session;
            fs.writeFileSync('accounts.json', JSON.stringify(accountsData, null, 2));
        }
        console.log(ts() + ' ✅ ' + clr('bGreen', `Token refreshed for ${account.address.slice(0,10)}`));
        return true;
    } catch (error) {
        console.log(ts() + ' ❌ ' + clr('bRed', `Token refresh failed: ${error.message}`));
        return false;
    }
}

async function attemptReLogin(account) {
    try {
        console.log(ts() + ' 🔑 ' + clr('bYellow', `Attempting re-login for ${account.address.slice(0,10)}...`));
        const { authMessage, authSignature, address } = account.session;
        if (!authMessage || !authSignature) throw new Error('No auth data for re-login');
        const response = await fetch('https://api.loqua.net/auth/wallet/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, message: authMessage, signature: authSignature })
        });
        if (!response.ok) throw new Error(`Re-login failed with status ${response.status}`);
        const data = await response.json();
        if (!data.access_token) throw new Error('No access_token in re-login response');
        account.session.loquaAuth = data;
        account.session.expiresAt = Date.parse(data.expires_at) || Date.now() + 86400000;
        account.session.authMessage = authMessage;
        account.session.authSignature = authSignature;
        const accountsData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
        const accountIndex = accountsData.findIndex(a => a.address === account.address);
        if (accountIndex !== -1) {
            accountsData[accountIndex] = account.session;
            fs.writeFileSync('accounts.json', JSON.stringify(accountsData, null, 2));
        }
        console.log(ts() + ' ✅ ' + clr('bGreen', `Re-login successful for ${account.address.slice(0,10)}`));
        return true;
    } catch (error) {
        console.log(ts() + ' ❌ ' + clr('bRed', `Re-login failed: ${error.message}`));
        return false;
    }
}

async function ensureValidSession(account) {
    if (!account.session.loquaAuth?.access_token) {
        console.log(ts() + ' ⚠️ ' + clr('bYellow', `No token for ${account.address.slice(0,10)}`));
        return false;
    }
    if (isTokenExpired(account)) {
        let refreshed = await refreshToken(account);
        if (!refreshed) refreshed = await attemptReLogin(account);
        if (!refreshed) {
            console.log(ts() + ' ❌ ' + clr('bRed', `Cannot refresh session for ${account.address.slice(0,10)}`));
            return false;
        }
    }
    return true;
}

async function getGroqReply(messages) {
    if (GROQ_API_KEYS.length === 0) return null;
    const maxAttempts = GROQ_API_KEYS.length * CONFIG.groqModels.length;
    let attempts = 0;
    while (attempts < maxAttempts) {
        const apiKey = getNextGroqKey();
        const model = getNextGroqModel();
        attempts++;
        try {
            const chatContext = messages.slice(-5).map(m => ({
                role: 'user',
                content: m.text || m.bodyPreview || ''
            })).filter(m => m.content.length > 0);
            if (chatContext.length === 0) return null;
            const systemPrompt = `You are a knowledgeable crypto enthusiast participating in the Loqua Global Chat on the Sui blockchain. Keep responses short (1-2 sentences), conversational, and relevant to Sui, DeFi, NFTs, or Web3. Be positive and engaging. Never mention you're an AI.`;
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...chatContext.slice(-3),
                        { role: 'user', content: 'Reply to the latest messages in the chat naturally.' }
                    ],
                    max_tokens: 60,
                    temperature: 0.8
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content?.trim();
            if (reply && reply.length > 5 && reply.length < 200) {
                console.log(ts() + ' 🤖 ' + clr('bGreen', `Groq AI reply (${model})`));
                return reply;
            }
            continue;
        } catch (error) {
            console.log(ts() + ' ⚠️ ' + clr('bYellow', `Groq ${model} failed: ${error.message}, trying next...`));
        }
    }
    console.log(ts() + ' ❌ ' + clr('bRed', `All Groq keys and models failed`));
    return null;
}

async function getMessage(account, chatMessages = []) {
    if (GROQ_API_KEYS.length === 0) {
        return CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];
    }
    if (Math.random() < CONFIG.groqChance && chatMessages.length > 0) {
        const aiReply = await getGroqReply(chatMessages);
        if (aiReply) return aiReply;
    }
    return CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];
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
        this.failedAttempts = 0;
        this.maxFailures = 3;
    }

    getNextProxy() {
        if (!this.proxyList.length) return null;
        const proxy = this.proxyList[this.proxyIndex % this.proxyList.length];
        this.proxyIndex++;
        return proxy;
    }

    getBrowserArgs() {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-blink-features=AutomationControlled',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-session-crashed-bubble',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-hang-monitor',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-sync',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-breakpad',
            '--disable-crash-reporter',
            '--disable-logging',
            '--disable-speech-api',
            '--disable-print-preview',
            '--disable-password-generation',
            '--disable-save-password-bubble',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-background-networking',
            '--safebrowsing-disable-auto-update'
        ];
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
        try {
            this.browser = await puppeteer.launch({
                headless: CONFIG.headless ? 'new' : false,
                executablePath: chromePath,
                args: this.getBrowserArgs(),
                defaultViewport: { width: 1280, height: 720 },
                timeout: 60000,
                ignoreHTTPSErrors: true
            });
            this.page = await this.browser.newPage();
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });
            await this.page.setUserAgent(getNextUserAgent());
            await this.page.setViewport({ width: 1280, height: 720 });
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                const resourceType = request.resourceType();
                if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            console.log('✅ Browser initialized with CORS bypass enabled');
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error.message);
            throw error;
        }
    }

    async closeBrowser() {
        if (this.browser) {
            try { await this.browser.close(); } catch (e) {}
            this.browser = null;
            this.page = null;
        }
    }

    async injectSession(session) {
        if (!this.page) await this.initBrowser();
        try {
            await this.page.goto('https://loqua.net', { waitUntil: 'networkidle2', timeout: 60000, referer: 'https://loqua.net/' });
            await this.page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
            await this.page.evaluate((s) => {
                localStorage.setItem('loqua.zklogin.session', JSON.stringify(s));
            }, session);
            await this.page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            await sleep(5000);
            const pageLoaded = await this.page.evaluate(() => document.querySelector('body') !== null);
            if (!pageLoaded) throw new Error('Page failed to load properly');
            return true;
        } catch (error) {
            console.log(ts() + ' ❌ ' + clr('bRed', `Navigation failed: ${error.message}`));
            try { await this.page.screenshot({ path: 'error-screenshot.png' }); } catch (e) {}
            throw error;
        }
    }

    async findInput() {
        const selectors = [
            '.web-chat-input textarea',
            '.web-chat-input',
            '.chat-input',
            '[contenteditable="true"]',
            'textarea[placeholder*="message"]',
            'textarea.web-chat-input',
            'textarea[aria-label*="message"]'
        ];
        for (const selector of selectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 5000 });
                const el = await this.page.$(selector);
                if (el) return selector;
            } catch {}
        }
        return null;
    }

    async waitForChatToLoad() {
        try {
            await this.page.waitForSelector('.web-chat-list, .web-chat-input', { timeout: 60000, visible: true });
            return true;
        } catch (error) {
            console.log(ts() + ' ❌ ' + clr('bRed', 'Chat failed to load'));
            return false;
        }
    }

    async getChatMessages() {
        try {
            const messages = await this.page.evaluate(() => {
                const items = document.querySelectorAll('.web-chat-row');
                return Array.from(items).slice(-5).map(el => {
                    const text = el.querySelector('.web-chat-text')?.textContent || '';
                    const sender = el.querySelector('strong')?.textContent || '';
                    return { text, sender };
                });
            });
            return messages.filter(m => m.text.length > 0);
        } catch { return []; }
    }

    async dailyCheckIn(account) {
        try {
            const isValid = await ensureValidSession(account);
            if (!isValid) {
                console.log(ts() + ' ❌ ' + clr('bRed', `Session invalid for ${account.address.slice(0,10)}`));
                return false;
            }
            console.log(ts() + ' 📋 ' + clr('bBlue', `Check-in ${account.address.slice(0,10)}...`));
            await this.injectSession(account.session);
            const chatLoaded = await this.waitForChatToLoad();
            if (!chatLoaded) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat not loaded after waiting'));
                return false;
            }
            const input = await this.findInput();
            if (!input) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat input not found'));
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
            const isValid = await ensureValidSession(account);
            if (!isValid) {
                console.log(ts() + ' ❌ ' + clr('bRed', `Session invalid for ${account.address.slice(0,10)}`));
                return false;
            }
            const chatContext = await this.getChatMessages();
            const msg = await getMessage(account, chatContext);
            console.log(ts() + ' 💬 ' + clr('bCyan', `${account.address.slice(0,10)}: `) + clr('bWhite', `"${msg}"`));
            await this.injectSession(account.session);
            const chatLoaded = await this.waitForChatToLoad();
            if (!chatLoaded) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat not loaded'));
                return false;
            }
            const input = await this.findInput();
            if (!input) {
                console.log(ts() + ' ❌ ' + clr('bRed', 'Chat input not found'));
                return false;
            }
            await this.page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) { el.focus(); el.click(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }, input);
            await sleep(1000);
            await this.page.type(input, msg, { delay: 30 + Math.random() * 40 });
            await sleep(500 + Math.random() * 1000);
            await this.page.keyboard.press('Enter');
            await sleep(3000);
            account.messageCount++;
            account.messagesInWindow++;
            console.log(ts() + ' ✅ ' + clr('bGreen', 'Message sent!'));
            console.log(ts() + ' 📊 ' + clr('bYellow', `Total: ${account.messageCount}`));
            return true;
        } catch (error) {
            console.log(ts() + ' ❌ ' + clr('bRed', `Send failed: ${error.message}`));
            try { await this.page.screenshot({ path: 'error-screenshot.png' }); } catch (e) {}
            return false;
        }
    }

    async runCycle() {
        for (let i = 0; i < this.accounts.length && this.running; i++) {
            const account = this.accounts[i];
            let accountFailed = false;
            try {
                if (isTokenExpired(account)) {
                    console.log(ts() + ' 🔄 ' + clr('bYellow', `Token expired for ${account.address.slice(0,10)}, refreshing...`));
                    const refreshed = await ensureValidSession(account);
                    if (!refreshed) {
                        console.log(ts() + ' ⚠️ ' + clr('bYellow', `Cannot refresh ${account.address.slice(0,10)}, skipping`));
                        continue;
                    }
                }
                if (!account.lastCheckIn || (Date.now() - account.lastCheckIn >= CONFIG.checkInInterval * 1000)) {
                    const checkInSuccess = await this.dailyCheckIn(account);
                    if (!checkInSuccess) {
                        accountFailed = true;
                        console.log(ts() + ' ⚠️ ' + clr('bYellow', `Account ${account.address.slice(0,10)} check-in failed, skipping messages`));
                    }
                }
                if (!accountFailed) {
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
                }
                if (i < this.accounts.length - 1 && this.running) {
                    const accDelay = Math.floor(Math.random() * (CONFIG.delayBetweenAccountsMax - CONFIG.delayBetweenAccountsMin + 1)) + CONFIG.delayBetweenAccountsMin;
                    console.log(ts() + ' 🔄 ' + clr('bCyan', `Switching accounts in ${accDelay}s...`));
                    await sleep(accDelay * 1000);
                    await this.closeBrowser();
                }
                this.failedAttempts = 0;
            } catch (error) {
                console.log(ts() + ' ❌ ' + clr('bRed', `Error with account ${account.address.slice(0,10)}: ${error.message}`));
                this.failedAttempts++;
                if (this.failedAttempts >= this.maxFailures) {
                    console.log(ts() + ' 🔄 ' + clr('bYellow', 'Too many failures, restarting browser...'));
                    await this.closeBrowser();
                    await sleep(10000);
                    this.failedAttempts = 0;
                }
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
            try { await this.runCycle(); } catch (error) {
                console.log(ts() + ' ❌ ' + clr('bRed', `Cycle error: ${error.message}`));
                await this.closeBrowser();
                await sleep(30000);
            }
            if (!this.running) break;
            const hours = CONFIG.sleepAfterCycleSeconds / 3600;
            console.log(ts() + ' 💤 ' + clr('bMagenta', `Sleeping for ${CONFIG.sleepAfterCycleSeconds}s (${hours.toFixed(1)} hours)...`));
            await sleep(CONFIG.sleepAfterCycleSeconds * 1000);
        }
        await this.closeBrowser();
        console.log(ts() + ' 👋 ' + clr('bYellow', 'Bot stopped'));
    }

    stop() {
        this.running = false;
        console.log(ts() + ' 🛑 ' + clr('bRed', 'Stopping bot...'));
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