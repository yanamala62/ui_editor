// This script is injected into the target page by Playwright.

(function() {
    const LOG_PREFIX = '[Observer Engine v2.3]';
    console.log(`%c${LOG_PREFIX} Loading...`, 'color: #6366f1; font-weight: bold;');

    function getReactData(element) {
        try {
            // Find the Fiber node
            const fiberKey = Object.keys(element).find(k => 
                k.startsWith('__reactFiber$') || 
                k.startsWith('__reactInternalInstance$') ||
                k.startsWith('__reactEvents$')
            );
            
            if (!fiberKey) return null;

            let fiber = element[fiberKey];
            
            // Traverse up to find component and source
            while (fiber) {
                // Fiber Source found
                if (fiber._debugSource) {
                    return {
                        component: fiber.type?.name || fiber.type?.displayName || (typeof fiber.type === 'string' ? fiber.type : 'Component'),
                        file: fiber._debugSource.fileName,
                        line: fiber._debugSource.lineNumber,
                    };
                }
                
                // Fallback for different React versions or Vite HMR
                const stateNode = fiber.stateNode;
                if (stateNode && stateNode._reactInternalInstance?._debugSource) {
                     return {
                        component: fiber.type?.name || fiber.type?.displayName || 'Component',
                        file: stateNode._reactInternalInstance._debugSource.fileName,
                        line: stateNode._reactInternalInstance._debugSource.lineNumber
                    };
                }

                if (fiber.type && (typeof fiber.type === 'function' || typeof fiber.type === 'object')) {
                     const name = fiber.type.name || fiber.type.displayName;
                     if (name) {
                        let current = fiber;
                        while(current) {
                            if (current._debugSource) {
                                return { component: name, file: current._debugSource.fileName, line: current._debugSource.lineNumber };
                            }
                            current = current.return;
                        }
                        return { component: name };
                     }
                }
                fiber = fiber.return;
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} Fiber extraction error:`, e);
        }
        return null;
    }

    let activeEditor = null;

    function createEditor(element, data) {
        if (activeEditor) activeEditor.remove();

        const rect = element.getBoundingClientRect();
        const editor = document.createElement('div');
        editor.id = 'obs-editor-container';
        
        // Position relative to viewport but scrollable
        const spaceBelow = window.innerHeight - rect.bottom;
        const editorHeight = 320;
        const topPos = spaceBelow > editorHeight ? (rect.bottom + window.scrollY + 8) : (rect.top + window.scrollY - editorHeight - 8);

        editor.style.cssText = `
            position: absolute;
            top: ${topPos}px;
            left: ${Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 340))}px;
            width: 320px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            z-index: 1000000000;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
        `;

        const title = data.component ? `<${data.component}>` : `${data.type.toUpperCase()}`;
        const shortFile = data.file ? data.file.split(/[\\/]/).pop() : 'No Source Map';

        editor.innerHTML = `
            <div style="margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                <div style="font-weight: 700; color: #4f46e5; font-size: 14px;">${title}</div>
                <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">${shortFile}${data.line ? ':' + data.line : ''}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                    <label style="display: block; font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">Content</label>
                    <input type="text" id="obs-input-text" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;" value="${element.innerText || element.value || ''}">
                </div>
                <div>
                    <label style="display: block; font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">Classes</label>
                    <textarea id="obs-input-classes" style="width: 100%; height: 60px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-family: monospace; resize: none;">${element.className || ''}</textarea>
                </div>
                <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button id="obs-btn-save" style="flex: 2; background: #4f46e5; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">SAVE CHANGES</button>
                    <button id="obs-btn-ai" style="flex: 1; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">AI FIX</button>
                    <button id="obs-btn-close" style="flex: 1; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">CLOSE</button>
                </div>
                <div id="obs-ai-results" style="display: none; border-top: 1px solid #f1f5f9; padding-top: 10px;"></div>
            </div>
        `;

        document.body.appendChild(editor);
        activeEditor = editor;

        // --- Event Handlers ---
        editor.querySelector('#obs-btn-save').onclick = async () => {
            if (!data.file) {
                alert('Source mapping not found. Cannot update file.');
                return;
            }
            const btn = editor.querySelector('#obs-btn-save');
            btn.innerText = 'SAVING...';
            btn.disabled = true;

            const res = await window.updateSource(data.file, data.line, {
                text: editor.querySelector('#obs-input-text').value,
                attributes: { className: editor.querySelector('#obs-input-classes').value }
            });

            if (res.success) {
                btn.innerText = 'SUCCESS!';
                btn.style.background = '#059669';
                setTimeout(() => { editor.remove(); activeEditor = null; }, 800);
            } else {
                alert('Update failed: ' + res.error);
                btn.innerText = 'SAVE';
                btn.disabled = false;
            }
        };

        editor.querySelector('#obs-btn-ai').onclick = async () => {
            const results = editor.querySelector('#obs-ai-results');
            results.innerHTML = '<div style="font-size: 11px; color: #4f46e5; text-align: center;">Asking AI...</div>';
            results.style.display = 'block';

            const suggestions = await window.getAISuggestions({
                component: data.component,
                text: editor.querySelector('#obs-input-text').value,
                classes: editor.querySelector('#obs-input-classes').value
            });
            
            results.innerHTML = '';
            suggestions.forEach(s => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 6px; cursor: pointer; font-size: 11px;';
                div.innerHTML = `<strong>${s.text}</strong><br><small style="color: #64748b;">${s.classes}</small>`;
                div.onclick = () => {
                    editor.querySelector('#obs-input-text').value = s.text;
                    editor.querySelector('#obs-input-classes').value = s.classes;
                };
                results.appendChild(div);
            });
        };

        editor.querySelector('#obs-btn-close').onclick = () => {
            editor.remove();
            activeEditor = null;
        };

        editor.onclick = (e) => e.stopPropagation();
    }

    // Main Interaction Logic
    let lastInteractedElement = null;

    const handleInteraction = async (e) => {
        // Ignore internal UI
        if (e.target.closest('#obs-editor-container') || e.target.id === 'observer-overlay') return;

        const element = e.target;
        
        // Visual feedback
        const originalOutline = element.style.outline;
        element.style.outline = '2px solid #6366f1';
        setTimeout(() => { 
            if (element.style.outline === '2px solid #6366f1') {
                element.style.outline = originalOutline; 
            }
        }, 300);

        console.log(`${LOG_PREFIX} Interaction on:`, element.tagName);

        const reactData = getReactData(element);
        const eventData = {
            action: 'INTERACT',
            type: element.tagName.toLowerCase(),
            text: (element.innerText || element.value || '').substring(0, 50),
            component: reactData?.component,
            file: reactData?.file,
            line: reactData?.line
        };

        window.reportEvent(eventData);
        createEditor(element, eventData);
        
        // Prevent default only if we found React data (optional)
        // e.preventDefault();
        // e.stopPropagation();
    };

    // Listen for click on capture phase
    document.addEventListener('click', handleInteraction, true);

    console.log(`%c${LOG_PREFIX} Ready. Interaction monitoring active.`, 'color: #10b981; font-weight: bold;');
})();
