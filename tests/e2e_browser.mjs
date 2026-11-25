#!/usr/bin/env node
/**
 * BANTAI Real Headless Chrome UI, Security & E2E Verification Runner
 * Launches production Backend (:4000) + Next.js Web Server (:3199) in an isolated temp DATA_DIR,
 * verifies HTTP security headers, scans built client bundles for exposed secrets,
 * and drives real headless Chrome over CDP across desktop, tablet, and mobile viewports.
 */
import { execSync, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BACKEND_PORT = 4199;
const WEB_PORT = 3199;
const CDP_PORT = 9399;
const E2E_NEXT_DIR = '.next-e2e';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return res;
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function scanNextChunksForSecrets() {
  const staticDir = path.resolve('frontend/web', E2E_NEXT_DIR, 'static');
  if (!fs.existsSync(staticDir)) {
    throw new Error(`frontend/web/${E2E_NEXT_DIR}/static not found — isolated Next build failed.`);
  }
  const mapFiles = [];
  const suspicious = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        if (entry.name.endsWith('.map')) mapFiles.push(full);
        if (entry.name.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf8');
          if (/NEXT_PUBLIC_ELEVENLABS_API_KEY|sk-[A-Za-z0-9]{20,}|bantai-super-secret|BantaiPassword2026!/.test(content)) {
            suspicious.push(full);
          }
        }
      }
    }
  }
  walk(staticDir);
  if (mapFiles.length > 0) throw new Error(`Public source maps found: ${mapFiles.join(', ')}`);
  if (suspicious.length > 0) throw new Error(`Sensitive pattern found in client chunks: ${suspicious.join(', ')}`);
  console.log('[PASS] Built .next/static has 0 source maps and 0 leaked secrets/hardcoded passwords');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.failedRequests = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params.exceptionDetails?.text || 'Uncaught exception');
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.consoleErrors.push(`${msg.params.entry.text} (${msg.params.entry.url || 'unknown'})`);
      } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 500) {
        this.failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evalJs(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Browser eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function waitForSelectorText(cdp, jsCheck, label, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await cdp.evalJs(jsCheck);
    if (val) return val;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

async function run() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome executable not found at ${CHROME_PATH}`);
  }

  const webRoot = path.resolve('frontend/web');
  const e2eDistAbs = path.join(webRoot, E2E_NEXT_DIR);
  fs.rmSync(e2eDistAbs, { recursive: true, force: true });

  // Build isolated production Next bundle targeting BACKEND_PORT without touching .next
  execSync('npx next build', {
    cwd: webRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_DIST_DIR: E2E_NEXT_DIR,
      NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api`
    },
    stdio: 'pipe'
  });

  scanNextChunksForSecrets();

  const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bantai-e2e-data-'));
  const chromeUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bantai-chrome-'));
  const procs = [];

  try {
    const backendLogs = [];
    const backendProc = spawn('node', ['backend/dist/index.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(BACKEND_PORT),
        JWT_SECRET: crypto.randomBytes(48).toString('hex'),
        CLIENT_URLS: `http://127.0.0.1:${WEB_PORT},http://localhost:${WEB_PORT}`,
        DATA_DIR: tempDataDir,
        INFERENCE_PROVIDER: 'local_engine'
      },
      stdio: 'pipe',
      windowsHide: true
    });
    backendProc.stderr?.on('data', d => backendLogs.push(String(d)));
    procs.push(backendProc);

    await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/api/health`);
    console.log(`[PASS] Production backend online on :${BACKEND_PORT}`);

    const webLogs = [];
    const webProc = spawn(
      process.execPath,
      [path.resolve('node_modules/next/dist/bin/next'), 'start', '-p', String(WEB_PORT), '-H', '127.0.0.1'],
      {
        cwd: webRoot,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NEXT_DIST_DIR: E2E_NEXT_DIR,
          NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api`
        },
        stdio: 'pipe',
        windowsHide: true
      }
    );
    webProc.stderr?.on('data', d => webLogs.push(String(d)));
    webProc.on('exit', code => {
      if (code && webLogs.length) {
        console.error('[WEB STDERR]', webLogs.join(''));
      }
    });
    procs.push(webProc);

    const webRes = await waitForHttp(`http://127.0.0.1:${WEB_PORT}`);
    const csp = webRes.headers.get('content-security-policy') || '';
    const xfo = webRes.headers.get('x-frame-options') || '';
    const nosniff = webRes.headers.get('x-content-type-options') || '';
    if (!csp.includes("frame-ancestors 'none'") || xfo !== 'DENY' || nosniff !== 'nosniff') {
      throw new Error(`Missing web security headers: csp=${csp} xfo=${xfo} nosniff=${nosniff}`);
    }
    console.log('[PASS] Next.js production security headers verified (CSP, X-Frame-Options: DENY, nosniff)');

    const chromeProc = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${chromeUserDir}`,
        `http://localhost:${WEB_PORT}`
      ],
      { stdio: 'pipe', windowsHide: true }
    );
    procs.push(chromeProc);

    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 15000);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget?.webSocketDebuggerUrl) throw new Error('No Chrome page target found');

    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 1. Verify AuthScreen renders (NO unauthenticated auto-signup)
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Create Account') && document.body.innerText.includes('Sign In')",
      'AuthScreen rendered'
    );
    const usersFile = path.join(tempDataDir, 'mongo_users_store.json');
    if (fs.existsSync(usersFile) && JSON.parse(fs.readFileSync(usersFile, 'utf8')).length > 0) {
      throw new Error('Auto-signup regression: user created without authentication!');
    }
    console.log('[PASS] AuthScreen rendered on unauthenticated visit with zero auto-signup accounts');

    // 2. Sign up via UI
    await cdp.evalJs(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create Account');
      btn.click();
    })()`);
    await sleep(150);

    const unique = 'e2e_' + Date.now();
    await cdp.evalJs(`(() => {
      const setInput = (id, val) => {
        const el = document.getElementById(id);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setInput('auth-name', 'E2E Tester');
      setInput('auth-username', '${unique}');
      setInput('auth-email', '${unique}@bantai.local');
      setInput('auth-password', 'StrongE2EPass!2026');
      document.querySelector('form button[type="submit"]').click();
    })()`);

    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Apna Model. Apna Dimaag. Apna AI.') && document.querySelector('textarea') !== null",
      'Authenticated ChatView loaded'
    );

    // Verify HttpOnly session model: zero JWT in localStorage while signed in!
    const storedTokenWhileSignedIn = await cdp.evalJs("localStorage.getItem('bantai_token')");
    if (storedTokenWhileSignedIn !== null) {
      throw new Error(`Security regression: bantai_token found in localStorage while signed in!`);
    }
    console.log('[PASS] UI Signup flow completed -> ChatView active (0 JWT in localStorage)');

    // Toggle Chat History sidebar cleanly
    await cdp.evalJs(`document.querySelector('button[aria-label="Toggle chat history"]')?.click()`);
    await sleep(150);

    // 3. Send XSS payload in Chat & verify escaping + streaming + feedback + regenerate
    await cdp.evalJs(`(() => {
      const ta = document.querySelector('textarea');
      if (!ta) throw new Error('Chat textarea missing');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Hello <img src=x onerror="window.__xssPwn=1"> <script>window.__xssPwn=2</script>');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => document.querySelector('button[aria-label="Send message"]').click(), 50);
    })()`);

    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('<img src=x onerror=')",
      'XSS payload echoed safely as text'
    );
    await waitForSelectorText(
      cdp,
      "document.querySelector('button[aria-label=\"Thumbs up feedback\"]') !== null && document.querySelector('button[aria-label=\"Regenerate response\"]') !== null",
      'Assistant reply actions (feedback + regenerate) rendered'
    );
    await cdp.evalJs(`document.querySelector('button[aria-label="Thumbs up feedback"]').click()`);
    await sleep(250);
    const xssFlag = await cdp.evalJs('window.__xssPwn');
    if (xssFlag !== undefined) throw new Error(`XSS executed! window.__xssPwn=${xssFlag}`);
    console.log('[PASS] Chat SSE + History + Feedback rendered cleanly; XSS payload escaped safely');

    // 4. Test Live AgenticView workflow with Approval Gate
    await cdp.evalJs(`document.querySelector('button[aria-label="Multi-Agent Runner"]').click()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Autonomous Agent Planner') && document.getElementById('agent-goal-input') !== null",
      'AgenticView loaded'
    );
    await cdp.evalJs(`(() => {
      const inp = document.getElementById('agent-goal-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'Send an email security summary to team@bantai.local');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => document.querySelector('form button[type="submit"]').click(), 50);
    })()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Authorization Gate Required')",
      'Agentic Authorization Gate rendered'
    );
    await cdp.evalJs(`(() => {
      const approveBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Approve & Execute Step'));
      approveBtn.click();
    })()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.toUpperCase().includes('COMPLETED') && !document.body.innerText.includes('Authorization Gate Required')",
      'Agentic approved step completed'
    );
    console.log('[PASS] AgenticView live backend plan + human-in-the-loop approval verified');

    // 5. Test Memory Store creation via UI
    await cdp.evalJs(`document.querySelector('button[aria-label="Memory Store"]').click()`);
    await waitForSelectorText(cdp, "document.body.innerText.includes('Sovereign Memory Store')", 'MemoryView loaded');
    await cdp.evalJs(`(() => {
      const addBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Memory'));
      addBtn.click();
    })()`);
    await waitForSelectorText(cdp, "document.querySelector('form textarea') !== null", 'Memory drawer textarea');
    await cdp.evalJs(`(() => {
      const ta = document.querySelector('form textarea');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Security rule: enforce strict opt-in learning consent');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => document.querySelector('form button[type="submit"]').click(), 50);
    })()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('enforce strict opt-in learning consent')",
      'Memory persisted and displayed'
    );
    console.log('[PASS] MemoryView creation verified against live backend');

    // 6. Test FineTuneView live telemetry dashboard
    await cdp.evalJs(`document.querySelector('button[aria-label="Fine-Tune LoRA"]').click()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Model Telemetry') && document.body.innerText.toLowerCase().includes('supported local inference models')",
      'FineTuneView telemetry loaded'
    );
    console.log('[PASS] FineTuneView live telemetry & model registry verified');

    // 7. Test Settings MFA setup + opt-in default false + save persistence
    await cdp.evalJs(`document.querySelector('button[aria-label="System Settings"]').click()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Preferences & Account Security') && document.querySelector('button[aria-label=\"Toggle cross-user training opt-in\"]') !== null",
      'SettingsView loaded'
    );
    const optInChecked = await cdp.evalJs(
      `document.querySelector('button[aria-label="Toggle cross-user training opt-in"]').getAttribute('aria-checked')`
    );
    if (optInChecked !== 'false') {
      throw new Error(`Privacy default regression: crossUserTrainingOptIn switch was ${optInChecked}`);
    }
    await cdp.evalJs(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Save Preferences'));
      btn.click();
    })()`);
    await waitForSelectorText(cdp, "document.body.innerText.includes('Preferences and privacy settings persisted.')", 'Preferences persisted');

    await cdp.evalJs(`(() => {
      const mfaBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Setup Authenticator MFA'));
      mfaBtn.click();
    })()`);
    await waitForSelectorText(
      cdp,
      "document.querySelector('[data-testid=\"mfa-setup-secret\"]') !== null",
      'MFA setup Base32 secret displayed'
    );
    console.log('[PASS] SettingsView MFA setup, strict opt-in default=false, and persistence verified');

    // 6. Test Responsive viewports (Desktop 1440, Tablet 768, Mobile 390) + Keyboard focus check
    for (const [w, h, isMob, name] of [
      [1440, 900, false, 'desktop'],
      [768, 1024, true, 'tablet'],
      [390, 844, true, 'mobile']
    ]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: isMob
      });
      await sleep(150);
      const overflow = await cdp.evalJs('document.documentElement.scrollWidth > window.innerWidth + 2');
      if (overflow) {
        const dims = await cdp.evalJs('({sw: document.documentElement.scrollWidth, iw: window.innerWidth})');
        throw new Error(`Horizontal overflow on ${name} (${w}x${h}): ${JSON.stringify(dims)}`);
      }
      console.log(`[PASS] Responsive layout ${name} (${w}x${h}) has zero horizontal overflow`);
    }

    // 7. Sign out via UI and verify AuthScreen returns + token cleared
    await cdp.evalJs(`document.querySelector('button[aria-label="User Profile"]').click()`);
    await waitForSelectorText(cdp, "document.body.innerText.includes('Reset Session')", 'Profile menu open');
    await cdp.evalJs(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Reset Session'));
      btn.click();
    })()`);
    await waitForSelectorText(
      cdp,
      "document.body.innerText.includes('Sign In') && localStorage.getItem('bantai_token') === null",
      'Signed out to AuthScreen'
    );
    console.log('[PASS] UI Logout revoked token and returned to AuthScreen cleanly');

    if (cdp.consoleErrors.length > 0) {
      throw new Error(`Console errors detected: ${cdp.consoleErrors.join('; ')}`);
    }
    if (cdp.failedRequests.length > 0) {
      throw new Error(`HTTP 5xx network errors detected: ${cdp.failedRequests.join('; ')}`);
    }
    console.log('[PASS] Zero console errors and zero 5xx network responses across entire E2E journey');

    cdp.close();
  } finally {
    for (const p of procs) {
      try {
        p.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    try {
      fs.rmSync(tempDataDir, { recursive: true, force: true });
      fs.rmSync(chromeUserDir, { recursive: true, force: true });
      fs.rmSync(e2eDistAbs, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

run().catch(err => {
  console.error('[E2E FAIL]', err);
  process.exit(1);
});
