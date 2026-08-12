# 🤖 LoquaAutoBot – Sui Blockchain Automation

![Version](https://img.shields.io/badge/version-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Fully automated chat bot for [Loqua](https://loqua.net) — Sui blockchain community platform. Multi-account support, proxy rotation, rate limiting, and Puppeteer-based browser automation with zkLogin authentication.

**Join the community:** [Telegram](https://t.me/AirDropXDevs)

---

## ✨ Features

- ✅ **Multi-Account Support** — Run unlimited accounts simultaneously  
- ✅ **Daily Auto Check-In** — Automatic wallet sign-ins via zkLogin  
- ✅ **Message Automation** — Curated Sui-focused comments with randomization  
- ✅ **Proxy Rotation** — HTTP/HTTPS/SOCKS4/SOCKS5 support with round-robin  
- ✅ **Rate Limiting** — Smart cooldown (5 msgs/10min per account)  
- ✅ **Session Injection** — localStorage-based authentication  
- ✅ **Configurable Delays** — Random delays between messages & accounts  
- ✅ **User-Agent Rotation** — Avoid detection with randomized headers  
- ✅ **Colored Logging** — ANSI terminal output with timestamps  
- ✅ **Headless Mode** — Lightweight browser automation  

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/mejri02/LoquaAutoBot.git
cd LoquaAutoBot
```

### 2. Install Dependencies

```bash
npm install puppeteer-core https-proxy-agent socks-proxy-agent
```

If Chromium is not already installed on your system:

```bash
npm install chromium
# or use system package manager:
# Ubuntu/Debian: sudo apt-get install chromium-browser
# macOS: brew install chromium
# Windows: Download from https://www.chromium.org/getting-involved/download-chromium
```

**Required packages:**
- `puppeteer-core` — Browser automation (lightweight, no bundled Chromium)
- `chromium` — Chromium browser binary (or use system Chrome)
- `https-proxy-agent` — HTTPS/HTTP proxy support
- `socks-proxy-agent` — SOCKS4/SOCKS5 proxy support

### 3. Prepare Accounts

Export your Loqua sessions to `accounts.json` (one JSON object per line):

#### How to Extract Sessions from localStorage

1. Open [loqua.net](https://loqua.net) and log in with zkLogin
2. Open **Browser DevTools** (`F12` or `Ctrl+Shift+I`)
3. Go to **Application** tab → **Local Storage** → **https://loqua.net**
4. Look for key: `loqua.zklogin.session`
5. Click on it and copy the **entire JSON value** from the right panel
6. Paste into `accounts.json` (see formats below — single-line or formatted both work)

![Session Extraction Example](./png/session.png)

#### Example Formats

**Option 1: Single-line JSON array** (can be formatted):

```json
[
  {"address":"0x742d...","loquaAuth":{"access_token":"...","verified":true},"ephemeralSecretKey":"0x1a2b...","idToken":"...","provider":"google"},
  {"address":"0x8e3f...","loquaAuth":{"access_token":"...","verified":true},"ephemeralSecretKey":"0x5d4c...","idToken":"...","provider":"google"}
]
```

**Option 2: Newline-delimited JSON** (one per line, can be formatted):

```json
{"address":"0x742d...","loquaAuth":{"access_token":"...","verified":true},"ephemeralSecretKey":"0x1a2b...","idToken":"...","provider":"google"}
{"address":"0x8e3f...","loquaAuth":{"access_token":"...","verified":true},"ephemeralSecretKey":"0x5d4c...","idToken":"...","provider":"google"}
```

**Option 3: Single object** (for one account):

```json
{"address":"0x742d...","loquaAuth":{"access_token":"...","verified":true},"ephemeralSecretKey":"0x1a2b...","idToken":"...","provider":"google"}
```

Save as `accounts.json` or `accounts.txt` — all formats are supported.

**Required fields per account:**
- `address` — Wallet address (0x...)
- `loquaAuth.access_token` — Bearer token for API auth
- `loquaAuth.verified` — Must be `true`
- `ephemeralSecretKey` — 64-char hex key for zkLogin
- `idToken` — JWT token from zkLogin
- `provider` — Auth provider: `google`, `microsoft`, etc.

### 4. (Optional) Add Proxies

Create `proxy.txt` with one proxy per line:

```
http://user:pass@proxy1.com:8080
socks5://proxy2.com:1080
https://proxy3.com:443
```

### 5. Configure Settings

Edit `config.json` (optional, defaults shown):

```json
{
  "headless": true,
  "checkInInterval": 86400,
  "minMessagesPerAccount": 1,
  "maxMessagesPerAccount": 3,
  "delayBetweenMessagesMin": 60,
  "delayBetweenMessagesMax": 180,
  "delayBetweenAccountsMin": 30,
  "delayBetweenAccountsMax": 60,
  "sleepAfterCycleSeconds": 14400,
  "maxMessagesPerTenMinutes": 5,
  "messages": [
    "Just read about Sui's new zkLogin feature – huge for onboarding! 🔐",
    "The Sui ecosystem is expanding fast. Any favorite new projects?",
    "DeFi on Sui is getting interesting – DeepBook volume is up 40% this week."
  ]
}
```

| Setting | Default | Notes |
|---------|---------|-------|
| `headless` | `true` | Run without visible browser window (set to `false` for debugging) |
| `checkInInterval` | `86400` | Seconds between daily check-ins (24 hours) |
| `minMessagesPerAccount` | `1` | Minimum messages per cycle |
| `maxMessagesPerAccount` | `3` | Maximum messages per cycle |
| `delayBetweenMessagesMin` | `60` | Min seconds between messages |
| `delayBetweenMessagesMax` | `180` | Max seconds between messages |
| `delayBetweenAccountsMin` | `30` | Min seconds between account switches |
| `delayBetweenAccountsMax` | `60` | Max seconds between account switches |
| `sleepAfterCycleSeconds` | `14400` | Sleep duration after full cycle (4 hours) |
| `maxMessagesPerTenMinutes` | `5` | Hard rate limit per account |
| `messages` | `[...]` | Array of chat messages to rotate |

---

## 📝 Usage

```bash
node index.js
```

The bot will prompt:

```
Use proxy?
  1: No (direct connection)
  2: Yes (use proxies from proxy.txt)
>
```

Select `1` or `2`, then the bot runs indefinitely:

1. **Check-in** — Daily wallet sign-in (if not done in 24h)
2. **Inject Session** — Load zkLogin session into browser localStorage
3. **Find Chat Input** — Locate message input field
4. **Send Messages** — Post curated messages at randomized intervals
5. **Sleep** — Wait before next cycle

Press `Ctrl+C` to stop gracefully.

---

## 🔧 File Structure

```
.
├── index.js              # Main bot logic (v5.0)
├── config.json           # Configuration (optional)
├── accounts.json         # Account sessions (required)
├── proxy.txt             # Proxy list (optional)
└── README.md             # This file
```

---

## 🎯 How It Works

### Session Injection

- Launches Chrome/Chromium browser via Puppeteer
- Navigates to loqua.net
- Injects zkLogin session into `localStorage['loqua.zklogin.session']`
- Reloads page to authenticate

### Message Sending

- Finds chat input field via multiple selector strategies
- Types message character-by-character (delay: 20-50ms per char)
- Presses Enter to send
- Respects rate limits (5 messages per 10-minute window per account)

### Rate Limiting

- **Per-Account:** 5 messages per 10 minutes (configurable)
- **Cooldown:** 600 seconds after hitting limit
- **Window Reset:** Automatic every 10 minutes

### Proxy Rotation

- HTTP/HTTPS: Uses `HttpsProxyAgent`
- SOCKS4/5: Uses `SocksProxyAgent`
- Load-balanced round-robin across list
- Paired with random User-Agent rotation

### Browser Detection Evasion

- Random User-Agent rotation (7 profiles: Chrome, Firefox, Safari)
- Headless mode enabled by default
- Random delays between all actions
- No console warnings or suspicious flags

### Headless Mode

**Enabled by default** (`"headless": true` in config.json):
- Bot runs silently in the background
- No browser window visible
- Lower resource usage
- Ideal for production/server environments

**Disable for debugging** (`"headless": false` in config.json):
- Visible browser window opens
- Watch real-time automation happening
- See chat input field detection
- Inspect element selectors
- Useful for troubleshooting message sending failures or authentication issues

**How to toggle:**

```json
{
  "headless": false,
  "checkInInterval": 86400
}
```

Then run `node index.js` — you'll see the Chrome browser window with live actions.

---

## ⚠️ Important Notes

1. **Chrome/Chromium Required** — Bot auto-detects Chrome on Linux/macOS/Windows. Supports WSL.

2. **Session Freshness** — Sessions expire after ~24-48 hours. Re-export if you see `401 Unauthorized`.

3. **Rate Limiting** — Loqua enforces per-IP rate limits. Space out message intervals or use proxies.

4. **Proxy Reliability** — Test proxies before large-scale runs; dead proxies cause hangs.

5. **Message Quality** — Keep messages natural and Sui-focused. Avoid spam/ads.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Chrome not found!` | Install Chrome/Chromium or set `executablePath` in code |
| `SyntaxError: Unexpected token` | Ensure each session in `accounts.json` is on a **single line** |
| `Chat input not found` | Chat may not have loaded; increase `waitUntil` timeout |
| `Rate limited` | Increase delays or reduce `maxMessagesPerAccount` |
| `401 Unauthorized` | Re-export sessions from localStorage; tokens expire |
| `Proxy errors` | Test proxy format (`http://...`, `socks5://...`) |
| `Session injection failed` | Session JSON may be invalid; re-copy from localStorage |

---

## 🔗 Resources

- **Loqua Platform:** https://loqua.net
- **Sui Network:** https://sui.io
- **GitHub:** https://github.com/mejri02/LoquaAutoBot
- **Telegram Community:** https://t.me/AirDropXDevs

---

## 📄 License

MIT – Free to use, modify, and redistribute.

---

**Version:** 5.0  
**Engine:** Puppeteer + Browser Automation  
**Maintainer:** [@mejri02](https://github.com/mejri02)
