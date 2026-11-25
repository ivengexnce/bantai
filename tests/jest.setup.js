const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.INFERENCE_PROVIDER = 'local_engine';

if (!process.env.DATA_DIR) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bantai-test-data-'));
  process.env.DATA_DIR = tmpDir;
  process.on('exit', () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors on process shutdown
    }
  });
}
