#!/usr/bin/env node
/**
 * BANTAI Static Application Security Testing (SAST), Secret, Docker & Rules Scanner
 * Fails with non-zero exit code if any security invariant regresses.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const failures = [];
let filesScanned = 0;

function fail(msg) {
  failures.push(msg);
  console.error(`[FAIL] ${msg}`);
}

function pass(msg) {
  console.log(`[PASS] ${msg}`);
}

function walkFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.next') || ['node_modules', 'dist', '.git', '.venv', '__pycache__'].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (!exts || exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// 1. Verify zero secret/key files tracked in Git index
try {
  const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);

  const forbiddenTracked = tracked.filter(f => {
    const base = path.basename(f);
    if (base === '.env.example') return false;
    return (
      base === '.env' ||
      base.startsWith('.env.') ||
      /serviceAccount.*\.json$/i.test(base) ||
      /firebase-adminsdk.*\.json$/i.test(base) ||
      /\.(pem|key|p12|pfx)$/i.test(base)
    );
  });

  if (forbiddenTracked.length > 0) {
    fail(`Sensitive file(s) tracked in git index: ${forbiddenTracked.join(', ')}`);
  } else {
    pass(`Git index hygiene clean (${tracked.length} tracked files checked, 0 secret files committed)`);
  }
} catch (err) {
  fail(`Unable to inspect git ls-files: ${(err && err.message) || err}`);
}

// 2. Scan production source directories for unsafe sinks, XSS vectors, and web localStorage JWT storage
const sourceDirs = [
  path.join(ROOT, 'shared', 'src'),
  path.join(ROOT, 'backend', 'src'),
  path.join(ROOT, 'frontend', 'web', 'src'),
  path.join(ROOT, 'frontend', 'mobile')
];

const dangerChecks = [
  {
    name: 'Unsafe React dangerouslySetInnerHTML sink',
    regex: /dangerouslySetInnerHTML/,
    dirs: ['frontend']
  },
  {
    name: 'Dynamic eval() or new Function() execution sink',
    regex: /\beval\s*\(|\bnew\s+Function\s*\(/,
    dirs: ['backend', 'frontend']
  },
  {
    name: 'Unsafe Node vm.runInNewContext or shell exec/shell:true sink',
    regex: /\bvm\.runInNewContext\s*\(|\bexecSync\s*\(|\bexec\s*\(\s*['"`]|shell\s*:\s*true/,
    dirs: ['backend']
  },
  {
    name: 'Web localStorage auth token storage (must use HttpOnly cookie)',
    regex: /localStorage\.(getItem|setItem|removeItem)\s*\(\s*['"]bantai_token['"]/,
    dirs: [path.join('frontend', 'web')]
  },
  {
    name: 'Private cryptographic key literal',
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    dirs: ['shared', 'backend', 'frontend']
  },
  {
    name: 'Live external API key pattern (OpenAI/Stripe/AWS)',
    regex: /(sk-proj-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/,
    dirs: ['shared', 'backend', 'frontend']
  }
];

for (const dir of sourceDirs) {
  const files = walkFiles(dir, ['.ts', '.tsx', '.js', '.jsx', '.mjs']);
  for (const file of files) {
    filesScanned++;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    for (const check of dangerChecks) {
      const normalizedDirs = check.dirs.map(d => d.replace(/\\/g, '/'));
      if (normalizedDirs.some(d => rel.startsWith(d)) && check.regex.test(content)) {
        fail(`${check.name} found in ${rel}`);
      }
    }

    // Check weak JWT default strings outside env.ts denylist
    if (rel !== 'backend/src/config/env.ts' && /bantai-super-secret-production-jwt-key/.test(content)) {
      fail(`Hardcoded weak JWT secret string found in ${rel}`);
    }
  }
}

// Verify safe_eval.ts retains strict subprocess isolation flags
const safeEvalPath = path.join(ROOT, 'backend', 'src', 'services', 'agent', 'safe_eval.ts');
if (fs.existsSync(safeEvalPath)) {
  const safeEval = fs.readFileSync(safeEvalPath, 'utf8');
  if (!safeEval.includes('env: {}') || !safeEval.includes('--permission')) {
    fail('safe_eval.ts missing strict env: {} or --permission subprocess isolation');
  }
}
pass(`Source SAST & secret scan completed across ${filesScanned} files`);

// 3. Docker hardening checks
const dockerBackendPath = path.join(ROOT, 'docker', 'Dockerfile.backend');
const dockerWebPath = path.join(ROOT, 'docker', 'Dockerfile.web');
const composePath = path.join(ROOT, 'docker', 'docker-compose.yml');

for (const [label, p] of [
  ['Dockerfile.backend', dockerBackendPath],
  ['Dockerfile.web', dockerWebPath]
]) {
  if (!fs.existsSync(p)) {
    fail(`Missing ${label}`);
    continue;
  }
  const text = fs.readFileSync(p, 'utf8');
  if (!/^USER\s+node\s*$/m.test(text)) {
    fail(`${label} must run as non-root USER node`);
  }
  if (!/^HEALTHCHECK\s+/m.test(text)) {
    fail(`${label} missing HEALTHCHECK instruction`);
  }
}

if (fs.existsSync(composePath)) {
  const compose = fs.readFileSync(composePath, 'utf8');
  if (!compose.includes('127.0.0.1:27017:27017') || !compose.includes('127.0.0.1:11434:11434')) {
    fail('docker-compose.yml must bind internal DB/Ollama ports strictly to 127.0.0.1');
  }
  if (!compose.includes('no-new-privileges:true') || !compose.includes('cap_drop:')) {
    fail('docker-compose.yml must enforce no-new-privileges and cap_drop ALL');
  }
  pass('Dockerfiles & docker-compose hardening invariants verified');
} else {
  fail('Missing docker/docker-compose.yml');
}

// 4. Firestore rules structural invariants (read-only audit check)
const rulesPath = path.join(ROOT, 'security', 'firestore.rules');
if (fs.existsSync(rulesPath)) {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const requiredInvariants = [
    ["rules_version = '2'", 'rules_version v2 header'],
    ['function isAuthenticated()', 'isAuthenticated helper'],
    ['function isOwner(userId)', 'isOwner ownership check'],
    ['allow read, write: if false;', 'default deny root fallback'],
    ['match /conversations/{conversationId}', 'conversations isolation'],
    ['match /messages/{messageId}', 'messages isolation'],
    ['match /tasks/{taskId}', 'tasks isolation'],
    ['match /memories/{memoryId}', 'memories isolation'],
    ['match /knowledge/{docId}', 'knowledge isolation']
  ];
  for (const [needle, desc] of requiredInvariants) {
    if (!rules.includes(needle)) {
      fail(`security/firestore.rules missing ${desc} (${needle})`);
    }
  }
  pass('Firestore rules structure and default-deny invariants verified');
} else {
  fail('Missing security/firestore.rules');
}

// 5. Built Next.js client bundle checks (when a production BUILD_ID is present)
const nextStatic = path.join(ROOT, 'frontend', 'web', '.next', 'static');
const nextBuildId = path.join(ROOT, 'frontend', 'web', '.next', 'BUILD_ID');
if (fs.existsSync(nextStatic) && fs.existsSync(nextBuildId)) {
  const chunkFiles = walkFiles(nextStatic, null);
  const maps = chunkFiles.filter(f => f.endsWith('.map'));
  const jsChunks = chunkFiles.filter(f => f.endsWith('.js'));

  if (maps.length > 0) {
    fail(`Built Next.js .next/static exposes ${maps.length} source map(s)`);
  }

  for (const chunk of jsChunks) {
    const content = fs.readFileSync(chunk, 'utf8');
    if (/NEXT_PUBLIC_ELEVENLABS_API_KEY|bantai-super-secret|BantaiPassword2026!|sk-proj-/.test(content)) {
      fail(`Sensitive pattern bundled in client chunk: ${path.relative(ROOT, chunk)}`);
    }
  }
  pass(`Built .next/static artifact clean (${jsChunks.length} JS chunks, 0 source maps)`);
}

if (failures.length > 0) {
  console.error(`\nStatic security scan failed with ${failures.length} finding(s).`);
  process.exit(1);
}

console.log('\n[SECURITY SCAN PASS] All static SAST, secret, Docker, and Firestore rules invariants passed.');
