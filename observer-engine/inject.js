(function() {
  if (window.__uilens_active) return;
  window.__uilens_active = true;

  let observeMode = true;
  let overlay = null;
  let tooltip = null;
  let editorPanel = null;
  let lastHovered = null;
  let currentElement = null;
  let saving = false;

  // --- Utilities ---
  function getSelector(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 4) {
      let s = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      if (cur.className && typeof cur.className === 'string') {
        const c = cur.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (c) s += '.' + c;
      }
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function getReactInfo(el) {
    try {
      const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (!key) return null;
      let fiber = el[key];
      while (fiber) {
        if (typeof fiber.type === 'function' || (typeof fiber.type === 'object' && fiber.type)) {
          const name = fiber.type.displayName || fiber.type.name;
          if (name) {
            let src = fiber._debugSource;
            if (!src) { let p = fiber; while (p && !p._debugSource) p = p.return; src = p?._debugSource; }
            return { component: name, file: src?.fileName || null, line: src?.lineNumber || null };
          }
        }
        fiber = fiber.return;
      }
    } catch (_) {}
    return null;
  }

  function extractInfo(el) {
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    return {
      type: el.tagName.toLowerCase(),
      text: (el.innerText || el.value || '').trim().substring(0, 300),
      selector: getSelector(el),
      classes: Array.from(el.classList || []),
      styles: { color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize, padding: cs.padding },
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right },
      react: getReactInfo(el),
    };
  }

  // --- Overlay (hover highlight) ---
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = '__uilens_ov';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483640;border:2px solid #3B82F6;background:rgba(59,130,246,0.04);border-radius:2px;transition:all 60ms;display:none;';
    document.documentElement.appendChild(overlay);
    tooltip = document.createElement('div');
    tooltip.id = '__uilens_tt';
    tooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483641;background:#1e293b;color:#e2e8f0;padding:3px 8px;border-radius:4px;font:10px/1.3 system-ui;display:none;opacity:0.9;';
    document.documentElement.appendChild(tooltip);
  }

  function showOverlay(el) {
    ensureOverlay();
    const r = el.getBoundingClientRect();
    overlay.style.cssText = overlay.style.cssText.replace('display:none', 'display:block');
    overlay.style.top = r.top + 'px'; overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
    const info = getReactInfo(el);
    tooltip.textContent = (info?.component || el.tagName.toLowerCase()) + ' (double-click to edit)';
    tooltip.style.display = 'block';
    tooltip.style.top = Math.max(0, r.top - 22) + 'px';
    tooltip.style.left = r.left + 'px';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
  }

  // --- Editor Panel (shown IN the browser) ---
  function showEditor(el) {
    currentElement = el;
    const info = extractInfo(el);
    const rect = el.getBoundingClientRect();

    if (editorPanel) editorPanel.remove();
    editorPanel = document.createElement('div');
    editorPanel.id = '__uilens_editor';

    // Position: to the right of element, or left if no space
    let left = rect.right + 12;
    if (left + 340 > window.innerWidth) left = Math.max(8, rect.left - 352);
    let top = Math.max(8, Math.min(rect.top, window.innerHeight - 380));

    editorPanel.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:340px;max-height:370px;background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.5);z-index:2147483645;font-family:system-ui,sans-serif;color:#e2e8f0;overflow:hidden;`;

    const componentName = info.react?.component || info.type;
    const fileName = info.react?.file ? info.react.file.split(/[\\/]/).pop() : '';
    const currentText = info.text.substring(0, 200);
    const currentClasses = info.classes.join(' ');

    editorPanel.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;cursor:move;" id="__uilens_header">
        <div>
          <div style="font-size:11px;color:#60a5fa;font-weight:700;">✦ Edit Element</div>
          <div style="font-size:13px;font-weight:600;margin-top:2px;">&lt;${componentName}&gt;</div>
          ${fileName ? `<div style="font-size:10px;color:#64748b;font-family:monospace;">${fileName}</div>` : '<div style="font-size:10px;color:#f59e0b;">⚠ Source detected via text search</div>'}
        </div>
        <button id="__uilens_close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:4px;">✕</button>
      </div>
      <div style="padding:12px 16px;overflow-y:auto;max-height:260px;">
        <label style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;display:block;margin-bottom:4px;">Text Content</label>
        <textarea id="__uilens_text" style="width:100%;min-height:50px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:13px;resize:vertical;outline:none;box-sizing:border-box;">${currentText}</textarea>
        <label style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;display:block;margin:10px 0 4px;">Classes</label>
        <textarea id="__uilens_classes" style="width:100%;min-height:36px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:11px;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box;">${currentClasses}</textarea>
        <div id="__uilens_status" style="font-size:11px;margin-top:8px;min-height:16px;"></div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="__uilens_save" style="flex:1;padding:9px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Save Changes</button>
          <button id="__uilens_cancel" style="padding:9px 16px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;font-size:12px;cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(editorPanel);

    // Event handlers
    editorPanel.querySelector('#__uilens_close').onclick = closeEditor;
    editorPanel.querySelector('#__uilens_cancel').onclick = closeEditor;
    editorPanel.querySelector('#__uilens_save').onclick = () => handleSave(info, currentText, currentClasses);

    // Prevent clicks inside editor from triggering observer
    editorPanel.addEventListener('click', e => e.stopPropagation());
    editorPanel.addEventListener('dblclick', e => e.stopPropagation());

    // Drag support
    let dragging = false, dx = 0, dy = 0;
    const header = editorPanel.querySelector('#__uilens_header');
    header.onmousedown = (e) => { dragging = true; dx = e.clientX - editorPanel.offsetLeft; dy = e.clientY - editorPanel.offsetTop; };
    document.addEventListener('mousemove', (e) => { if (dragging) { editorPanel.style.left = (e.clientX - dx) + 'px'; editorPanel.style.top = (e.clientY - dy) + 'px'; } });
    document.addEventListener('mouseup', () => { dragging = false; });

    // Also send click event to Electron for logging
    if (window.__uilens_event) window.__uilens_event(info);
  }

  function closeEditor() {
    if (editorPanel) { editorPanel.remove(); editorPanel = null; }
    currentElement = null;
  }

  function setStatus(msg, type) {
    const el = document.querySelector('#__uilens_status');
    if (!el) return;
    const colors = { success: '#22c55e', error: '#ef4444', info: '#60a5fa', saving: '#f59e0b' };
    el.style.color = colors[type] || '#94a3b8';
    el.textContent = msg;
  }

  async function handleSave(info, originalText, originalClasses) {
    if (saving) return;
    saving = true;
    const textEl = document.querySelector('#__uilens_text');
    const classesEl = document.querySelector('#__uilens_classes');
    const saveBtn = document.querySelector('#__uilens_save');
    if (!textEl || !classesEl) { saving = false; return; }

    const newText = textEl.value.trim();
    const newClasses = classesEl.value.trim();
    const textChanged = newText !== originalText;
    const classesChanged = newClasses !== originalClasses;

    if (!textChanged && !classesChanged) {
      setStatus('No changes to save', 'info');
      saving = false;
      return;
    }

    saveBtn.textContent = 'Saving...';
    saveBtn.style.background = '#f59e0b';
    setStatus('Searching and updating file...', 'saving');

    try {
      const resp = await fetch('http://localhost:3001/api/ast/search-and-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: 'C:\\Users\\lenovo\\Downloads\\New folder\\Byte-code',
          originalText: originalText,
          newText: textChanged ? newText : null,
          newClasses: classesChanged ? newClasses : null,
          elementType: info.type,
          component: info.react?.component || info.type,
        }),
      });
      const data = await resp.json();

      if (data.success) {
        setStatus('✓ Saved to ' + (data.file || 'source file'), 'success');
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#22c55e';
        // Update the element visually
        if (currentElement && textChanged) {
          currentElement.innerText = newText;
        }
        if (currentElement && classesChanged) {
          currentElement.className = newClasses;
        }
        setTimeout(() => { saveBtn.textContent = 'Save Changes'; saveBtn.style.background = '#3b82f6'; }, 2000);
      } else {
        setStatus('✗ ' + (data.error || 'Save failed'), 'error');
        saveBtn.textContent = 'Retry Save';
        saveBtn.style.background = '#ef4444';
        setTimeout(() => { saveBtn.textContent = 'Save Changes'; saveBtn.style.background = '#3b82f6'; }, 3000);
      }
    } catch (e) {
      setStatus('✗ Server error: ' + e.message, 'error');
      saveBtn.textContent = 'Save Changes';
      saveBtn.style.background = '#3b82f6';
    }
    saving = false;
  }

  // --- Event Listeners ---

  // Hover: show overlay (doesn't block interaction)
  document.addEventListener('mousemove', (e) => {
    if (!observeMode || editorPanel) return;
    const el = e.target;
    if (el.id && el.id.startsWith('__uilens')) return;
    if (el === lastHovered) return;
    lastHovered = el;
    showOverlay(el);
  }, true);

  document.addEventListener('mouseleave', hideOverlay);

  // Double-click: open editor (single click passes through normally)
  document.addEventListener('dblclick', (e) => {
    if (!observeMode) return;
    const el = e.target;
    if (el.id && el.id.startsWith('__uilens')) return;
    e.preventDefault();
    e.stopPropagation();
    hideOverlay();
    showEditor(el);
  }, true);

  // Escape to close editor
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editorPanel) closeEditor();
  });

  console.log('%c[UILens] Observer active — double-click any element to edit', 'color:#3b82f6;font-weight:bold');
})();
