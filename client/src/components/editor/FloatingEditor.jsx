import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLogsStore, useAIStore, useSettingsStore } from '../../store';
import axios from 'axios';

const API = 'http://localhost:3001/api';

export function FloatingEditor({ elementInfo, position, onClose }) {
  const logs = useLogsStore();
  const ai = useAIStore();
  const settings = useSettingsStore();
  const [tab, setTab] = useState('visual');
  const [text, setText] = useState(elementInfo.text || '');
  const [classes, setClasses] = useState((elementInfo.classes || []).join(' '));
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [pos, setPos] = useState(position);
  const [sourceCode, setSourceCode] = useState('');
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const filePath = elementInfo.react?.file;
  const line = elementInfo.react?.line;
  const component = elementInfo.react?.component || elementInfo.type;

  // Load source code if file is known
  useEffect(() => {
    if (filePath) {
      axios.get(`${API}/files/read`, { params: { path: filePath } })
        .then(r => setSourceCode(r.data.content))
        .catch(() => {});
    }
  }, [filePath]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const originalText = elementInfo.text || '';
      const originalClasses = (elementInfo.classes || []).join(' ');
      const textChanged = text !== originalText;
      const classesChanged = classes !== originalClasses;

      if (!textChanged && !classesChanged) {
        setSaveResult('No changes');
        setSaving(false);
        return;
      }

      let targetFile = filePath;
      let targetLine = line;

      // If no file from React fiber, search in repo and update directly
      if (!targetFile && settings.repoPath) {
        const shortText = originalText.substring(0, 30);
        logs.addLog({ type: 'INFO', message: `Searching "${shortText}" in repo...` });
        const res = await axios.post(`${API}/ast/search-and-update`, {
          repoPath: settings.repoPath,
          originalText: originalText,
          newText: textChanged ? text : null,
          newClasses: classesChanged ? classes : null,
          elementType: elementInfo.type,
          component,
        });
        if (res.data.success) {
          logs.addLog({ type: 'SAVE', message: `Updated in ${res.data.file}` });
          setSaveResult('success');
          // Reload the observed page to show changes
          if (window.electronAPI?.reloadObserver) {
            setTimeout(() => window.electronAPI.reloadObserver(), 500);
          }
        } else {
          logs.addLog({ type: 'ERROR', message: res.data.error });
          setSaveResult('error: ' + res.data.error);
        }
        setSaving(false);
        return;
      }

      if (targetFile && targetLine) {
        if (textChanged) {
          const res = await axios.post(`${API}/ast/update-text`, { filePath: targetFile, elementInfo: { react: { line: targetLine } }, newText: text });
          if (!res.data.success) throw new Error(res.data.error);
        }
        if (classesChanged) {
          const res = await axios.post(`${API}/ast/update-classes`, { filePath: targetFile, elementInfo: { react: { line: targetLine } }, newClasses: classes });
          if (!res.data.success) throw new Error(res.data.error);
        }
        logs.addLog({ type: 'SAVE', message: `Updated ${component} in ${targetFile.split(/[\\/]/).pop()}:${targetLine}` });
        setSaveResult('success');
      } else if (targetFile) {
        // Have file but no line - use AI
        const fileContent = (await axios.get(`${API}/files/read`, { params: { path: targetFile } })).data.content;
        const prompt = `Here is the file ${targetFile}:\n\`\`\`\n${fileContent.substring(0, 4000)}\n\`\`\`\n\nChange the <${elementInfo.type}> element with text "${originalText}":\n${textChanged ? `- text to "${text}"` : ''}\n${classesChanged ? `- className to "${classes}"` : ''}\n\nReturn ONLY the complete modified file.`;
        const res = await axios.post(`${API}/ai/chat`, { messages: [{ role: 'user', content: prompt }] });
        let newCode = res.data.response || '';
        newCode = newCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        if (newCode.length > 50) {
          await axios.post(`${API}/files/write`, { path: targetFile, content: newCode, createBackup: true });
          logs.addLog({ type: 'SAVE', message: `AI updated ${targetFile.split(/[\\/]/).pop()}` });
          setSaveResult('success');
        }
      } else {
        throw new Error('No source file found. Ensure repo path is set in Settings and the app runs in dev mode.');
      }
    } catch (e) {
      logs.addLog({ type: 'ERROR', message: e.message });
      setSaveResult('error: ' + e.message);
    }
    setSaving(false);
  };

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    ai.setLoading(true);
    try {
      const context = sourceCode ? `\nCurrent source code:\n\`\`\`\n${sourceCode.substring(0, 2000)}\n\`\`\`` : '';
      const res = await axios.post(`${API}/ai/suggest`, {
        elementInfo,
        userRequest: aiPrompt + context,
      });
      ai.setSuggestions(res.data.suggestions || []);
      if (res.data.summary) ai.addChatMessage({ role: 'assistant', content: res.data.summary });
    } catch (e) {
      ai.setError(e.message);
    }
  };

  const applySuggestion = (s) => {
    if (s.modified) {
      if (s.type === 'tailwind') setClasses(s.modified);
      else setText(s.modified);
    }
  };

  // Drag
  const onDragStart = (e) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  useEffect(() => {
    const onMove = (e) => { if (dragging.current) setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="absolute z-50 w-[380px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 cursor-move select-none" onMouseDown={onDragStart}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-400">✦ Edit Element</span>
            <p className="text-sm font-semibold text-gray-200 mt-0.5">&lt;{component}&gt;</p>
            {filePath && <p className="text-[10px] text-gray-500 font-mono">{filePath.split(/[\\/]/).pop()}{line ? `:${line}` : ''}</p>}
            {!filePath && <p className="text-[10px] text-amber-500">⚠ No source file detected</p>}
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white text-lg">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {['visual', 'code', 'ai'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-semibold capitalize ${tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>{t === 'ai' ? 'AI' : t}</button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[350px] overflow-y-auto space-y-3">
        {tab === 'visual' && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Text Content</label>
              <input value={text} onChange={(e) => setText(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Classes (Tailwind/CSS)</label>
              <textarea value={classes} onChange={(e) => setClasses(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 font-mono outline-none focus:border-blue-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
              <div>Color: <span className="text-gray-300">{elementInfo.styles?.color}</span></div>
              <div>BG: <span className="text-gray-300">{elementInfo.styles?.backgroundColor}</span></div>
              <div>Font: <span className="text-gray-300">{elementInfo.styles?.fontSize}</span></div>
              <div>Padding: <span className="text-gray-300">{elementInfo.styles?.padding}</span></div>
            </div>
          </>
        )}

        {tab === 'code' && (
          <div>
            <p className="text-[10px] text-gray-500 font-mono mb-2">{filePath || 'No source file'}</p>
            <pre className="p-3 bg-gray-800 rounded-lg text-[11px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-[250px] overflow-y-auto">
              {sourceCode ? sourceCode.split('\n').slice(Math.max(0, (line || 1) - 5), (line || 1) + 10).join('\n') : `<${elementInfo.type} className="${classes}">\n  ${text}\n</${elementInfo.type}>`}
            </pre>
          </div>
        )}

        {tab === 'ai' && (
          <>
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAI()} placeholder="What should I change?" className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none focus:border-purple-500" />
              <button onClick={handleAI} disabled={ai.loading} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                {ai.loading ? '...' : 'Ask'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Make accessible', 'Better contrast', 'Add hover effect', 'Make responsive'].map(p => (
                <button key={p} onClick={() => setAiPrompt(p)} className="px-2 py-1 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-400 hover:border-purple-500">{p}</button>
              ))}
            </div>
            {ai.suggestions.length > 0 && ai.suggestions.map((s, i) => (
              <div key={i} className="p-2 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-xs text-gray-300">{s.description}</p>
                <button onClick={() => applySuggestion(s)} className="mt-1 text-[10px] text-purple-400 font-bold">Apply →</button>
              </div>
            ))}
            {ai.error && <p className="text-xs text-red-400">{ai.error}</p>}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          {saveResult === 'success' && '✓ Saved!'}
          {saveResult && saveResult.startsWith('error') && <span className="text-red-400">{saveResult}</span>}
          {!saveResult && (text !== (elementInfo.text || '') || classes !== (elementInfo.classes || []).join(' ')) && '● Unsaved'}
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
