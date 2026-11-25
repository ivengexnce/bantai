import { spawn } from 'child_process';

const MATH_CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E
};

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log,
  exp: Math.exp
};

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

function tokenizeMath(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const start = i;
      let dotCount = ch === '.' ? 1 : 0;
      i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') dotCount++;
        if (dotCount > 1) throw new Error('Invalid number literal');
        i++;
      }
      const numStr = expr.slice(start, i);
      const val = Number(numStr);
      if (!Number.isFinite(val)) throw new Error('Invalid number literal');
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      i++;
      while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) {
        i++;
      }
      tokens.push({ type: 'id', value: expr.slice(start, i) });
      continue;
    }
    if (ch === '*' && expr[i + 1] === '*') {
      tokens.push({ type: 'op', value: '**' });
      i += 2;
      continue;
    }
    if ('+-*/%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    throw new Error(`Unsupported character '${ch}' in math expression`);
  }
  return tokens;
}

/**
 * Pure mathematical expression evaluator without Node.js `vm`, `eval`, or `Function`.
 * Supports arithmetic (+ - * / % **), parentheses, PI/E constants, and allowlisted Math.* functions.
 */
export function evaluateSafeMathExpression(rawExpr: string): number {
  const expr = rawExpr.trim();
  if (!expr || expr.length > 512) {
    throw new Error('Math expression must be between 1 and 512 characters');
  }

  const tokens = tokenizeMath(expr);
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value.match(/^[+-]$/)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && ['*', '/', '%'].includes((peek() as { type: 'op'; value: string }).value)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('Division by zero');
      }
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '**') {
      consume();
      const exponent = parsePower();
      return Math.pow(base, exponent);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op') {
      const op = (peek() as { type: 'op'; value: string }).value;
      if (op === '+' || op === '-') {
        consume();
        const val = parseUnary();
        return op === '-' ? -val : val;
      }
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of math expression');

    if (tok.type === 'num') {
      consume();
      return tok.value;
    }

    if (tok.type === 'paren' && tok.value === '(') {
      consume();
      const inner = parseExpression();
      const closing = consume();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return inner;
    }

    if (tok.type === 'id') {
      consume();
      const shortName = tok.value.startsWith('Math.') ? tok.value.slice(5) : tok.value;
      if (tok.value.includes('.') && !tok.value.startsWith('Math.')) {
        throw new Error(`Disallowed identifier '${tok.value}'`);
      }

      if (peek()?.type === 'paren' && (peek() as { type: 'paren'; value: string }).value === '(') {
        const fn = Object.prototype.hasOwnProperty.call(MATH_FUNCTIONS, shortName)
          ? MATH_FUNCTIONS[shortName]
          : null;
        if (!fn) throw new Error(`Unsupported math function '${tok.value}'`);
        consume(); // '('
        const args: number[] = [];
        if (!(peek()?.type === 'paren' && (peek() as { type: 'paren'; value: string }).value === ')')) {
          args.push(parseExpression());
          while (peek()?.type === 'comma') {
            consume();
            args.push(parseExpression());
          }
        }
        const close = consume();
        if (!close || close.type !== 'paren' || close.value !== ')') {
          throw new Error('Missing closing parenthesis in function call');
        }
        if (args.length === 0) throw new Error(`Function '${shortName}' requires arguments`);
        return fn(...args);
      }

      if (Object.prototype.hasOwnProperty.call(MATH_CONSTANTS, shortName)) {
        return MATH_CONSTANTS[shortName];
      }
      throw new Error(`Unsupported symbol '${tok.value}'`);
    }

    throw new Error('Invalid syntax in math expression');
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error('Unexpected trailing tokens in math expression');
  }
  if (!Number.isFinite(result)) {
    throw new Error('Math expression resulted in non-finite value');
  }
  return result;
}

const ISOLATED_CHILD_HARNESS = `
const vm = require('vm');
const Module = require('module');
for (const k of Object.keys(process.env)) { delete process.env[k]; }
Module._load = () => { throw new Error('Module loading is disabled in sandbox'); };
process.getBuiltinModule = () => { throw new Error('Builtin access disabled'); };
process.binding = () => { throw new Error('Native binding access disabled'); };
delete globalThis.fetch;
delete globalThis.WebSocket;

let rawCode = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  rawCode += chunk;
  if (rawCode.length > 4096) {
    process.stderr.write('Code exceeds 4096 character sandbox limit');
    process.exit(2);
  }
});
process.stdin.on('end', () => {
  const logs = [];
  try {
    // Pass NO outer JS constructors (Array/Object/Math) into vmContext so
    // this.constructor.constructor cannot access outer global/process objects.
    const vmContext = vm.createContext(
      Object.assign(Object.create(null), {
        console: Object.freeze({
          log: (...msgs) => { logs.push(msgs.map(m => String(m)).join(' ')); },
          error: (...msgs) => { logs.push(msgs.map(m => String(m)).join(' ')); }
        })
      }),
      { codeGeneration: { strings: true, wasm: false } }
    );
    const script = new vm.Script(rawCode);
    const evalResult = script.runInContext(vmContext, { timeout: 1500 });
    process.stdout.write(JSON.stringify({ ok: true, output: evalResult, logs }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err && err.message ? err.message : 'Execution failed', logs }));
  }
});
`;

/**
 * Executes user-approved code in a separate OS Node.js process with an empty environment,
 * Node permission restrictions (--permission), stripped network globals, and strict timeout.
 */
export function executeInIsolatedSubprocess(
  code: string,
  timeoutMs: number = 2500
): Promise<{ output?: unknown; logs: string[]; error?: string }> {
  if (!code || code.length > 4096) {
    return Promise.resolve({ logs: [], error: 'Code must be between 1 and 4096 characters.' });
  }

  return new Promise(resolve => {
    const majorNode = parseInt(process.versions.node.split('.')[0], 10);
    const nodeArgs = majorNode >= 20 ? ['--permission', '-e', ISOLATED_CHILD_HARNESS] : ['-e', ISOLATED_CHILD_HARNESS];

    const child = spawn(process.execPath, nodeArgs, {
      env: {},
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        resolve({ logs: [], error: 'Sandbox execution timed out.' });
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      if (stdout.length > 64 * 1024) {
        settled = true;
        clearTimeout(timer);
        child.kill('SIGKILL');
        resolve({ logs: [], error: 'Sandbox output exceeded 64KB buffer.' });
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', err => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ logs: [], error: err.message });
      }
    });

    child.on('close', exitCode => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim()) as { ok: boolean; output?: unknown; logs?: string[]; error?: string };
          if (parsed.ok) {
            resolve({ output: parsed.output, logs: parsed.logs || [] });
          } else {
            resolve({ logs: parsed.logs || [], error: parsed.error || 'Sandbox execution failed' });
          }
          return;
        } catch {
          // Fall through to error message
        }
      }
      resolve({ logs: [], error: stderr.trim() || `Sandbox exited with code ${exitCode}` });
    });

    child.stdin.write(code);
    child.stdin.end();
  });
}
