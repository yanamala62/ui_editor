const fs = require('fs');
const path = require('path');

class FileService {
  constructor(basePath) {
    this.basePath = basePath || '';
    this.backupDir = path.resolve(basePath || '.', '.uilens-backups');
  }

  setBasePath(p) {
    this.basePath = p;
    this.backupDir = path.resolve(p, '.uilens-backups');
  }

  validatePath(filePath) {
    const abs = require('path').resolve(filePath);
    if (this.basePath) {
      const base = require('path').resolve(this.basePath);
      if (!abs.startsWith(base)) throw new Error('Access denied: path outside repository');
    }
    return abs;
  }

  read(filePath) {
    const abs = this.validatePath(filePath);
    const content = fs.readFileSync(abs, 'utf-8');
    const ext = path.extname(abs).slice(1);
    const langMap = { jsx: 'javascript', tsx: 'typescript', js: 'javascript', ts: 'typescript', vue: 'vue', css: 'css', html: 'html' };
    return { content, language: langMap[ext] || ext, path: abs };
  }

  write(filePath, content, createBackup = true) {
    const abs = this.validatePath(filePath);
    let backupPath = null;
    if (createBackup && fs.existsSync(abs)) {
      backupPath = this.backup(abs);
    }
    const tmp = abs + '.tmp';
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, abs);
    return { success: true, backupPath };
  }

  backup(filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
    const name = path.basename(abs);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(this.backupDir, `${name}.${ts}.bak`);
    fs.copyFileSync(abs, dest);
    this._pruneBackups(name);
    return dest;
  }

  restore(filePath) {
    const abs = path.resolve(filePath);
    const name = path.basename(abs);
    if (!fs.existsSync(this.backupDir)) throw new Error('No backups found');
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith(name + '.') && f.endsWith('.bak'))
      .sort().reverse();
    if (!backups.length) throw new Error('No backup for this file');
    const latest = path.join(this.backupDir, backups[0]);
    const content = fs.readFileSync(latest, 'utf-8');
    fs.writeFileSync(abs, content, 'utf-8');
    return { restored: true, content };
  }

  list(dirPath) {
    const abs = this.validatePath(dirPath);
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        extension: e.isFile() ? path.extname(e.name) : null,
        path: path.join(abs, e.name),
      }));
  }

  _pruneBackups(baseName) {
    const max = parseInt(process.env.MAX_BACKUPS || '10');
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith(baseName + '.') && f.endsWith('.bak'))
      .sort();
    while (backups.length > max) {
      fs.unlinkSync(path.join(this.backupDir, backups.shift()));
    }
  }
}

module.exports = { FileService };
