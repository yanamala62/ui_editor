const FRAMEWORKS = {
  react: { extensions: ['.jsx', '.tsx', '.js'], devServer: 'vite' },
  nextjs: { extensions: ['.jsx', '.tsx'], devServer: 'next' },
  vue: { extensions: ['.vue', '.js'], devServer: 'vite' },
  angular: { extensions: ['.ts', '.html'], devServer: 'ng' },
  html: { extensions: ['.html', '.css', '.js'], devServer: null },
};

const WS_EVENTS = {
  FILE_CHANGED: 'FILE_CHANGED',
  ELEMENT_SELECTED: 'ELEMENT_SELECTED',
  SAVE_COMPLETE: 'SAVE_COMPLETE',
  HOT_RELOAD_TRIGGER: 'HOT_RELOAD_TRIGGER',
  AI_STREAM_CHUNK: 'AI_STREAM_CHUNK',
  ERROR: 'ERROR',
};

const LOG_LEVELS = { INFO: 'INFO', ERROR: 'ERROR', WARN: 'WARN', EVENT: 'EVENT', AI: 'AI', SAVE: 'SAVE' };

module.exports = { FRAMEWORKS, WS_EVENTS, LOG_LEVELS };
