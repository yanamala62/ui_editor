const chokidar = require('chokidar');
const path = require('path');

class WatcherService {
  constructor(onChange) {
    this.watcher = null;
    this.onChange = onChange;
    this.repoPath = null;
  }

  watch(repoPath) {
    this.stop();
    this.repoPath = repoPath;
    this.watcher = chokidar.watch(repoPath, {
      ignored: [/(^|[\/\\])\./, '**/node_modules/**', '**/dist/**', '**/build/**', '**/.uilens-backups/**'],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100 },
    });
    this.watcher.on('change', (filePath) => {
      const rel = path.relative(repoPath, filePath);
      this.onChange(rel);
    });
  }

  stop() {
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
  }
}

module.exports = { WatcherService };
