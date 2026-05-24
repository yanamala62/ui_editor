import { useState } from 'react';
import axios from 'axios';
import { useLogsStore, useObserverStore } from '../store';

const API = 'http://localhost:3001/api';

export function useFileEditor() {
  const [saveStatus, setSaveStatus] = useState('idle');
  const logs = useLogsStore();
  const observer = useObserverStore();

  async function saveChange(elementInfo, changeType, changeData) {
    const filePath = elementInfo.react?.file;
    if (!filePath) return { success: false, error: 'No source file' };

    setSaveStatus('saving');
    const endpoints = { text: '/ast/update-text', classes: '/ast/update-classes', styles: '/ast/update-styles', prop: '/ast/update-prop', code: '/ast/apply-code' };
    const url = API + (endpoints[changeType] || '/ast/apply-code');

    try {
      const body = changeType === 'text' ? { filePath, elementInfo, newText: changeData }
        : changeType === 'classes' ? { filePath, elementInfo, newClasses: changeData }
        : changeType === 'styles' ? { filePath, elementInfo, styles: changeData }
        : changeType === 'prop' ? { filePath, elementInfo, propName: changeData.name, value: changeData.value }
        : { filePath, newCode: changeData };

      const res = await axios.post(url, body);
      setSaveStatus('success');
      logs.addLog({ type: 'SAVE', message: `${changeType} saved on ${elementInfo.react?.component || elementInfo.type}`, data: { file: filePath } });
      observer.removePendingChange(elementInfo.selector);
      setTimeout(() => setSaveStatus('idle'), 2000);
      return res.data;
    } catch (e) {
      setSaveStatus('error');
      logs.addLog({ type: 'ERROR', message: e.response?.data?.error || e.message });
      return { success: false, error: e.message };
    }
  }

  async function undoLast() {
    try {
      const history = observer.interactionHistory;
      const last = history[history.length - 1];
      if (!last?.react?.file) return;
      await axios.post(API + '/files/restore', { path: last.react.file });
      logs.addLog({ type: 'INFO', message: `Restored ${last.react.file}` });
    } catch (e) {
      logs.addLog({ type: 'ERROR', message: e.message });
    }
  }

  return { saveChange, undoLast, saveStatus };
}
