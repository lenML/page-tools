// ========== Zustand Store ==========
    const useStore = create((set, get) => {
      const persistNode = n => n && n.type === 'image' && n.imageId ? { ...n, src: undefined } : n;
      const persistSnapshot = snap => snap ? { ...snap, nodes: (snap.nodes || []).map(persistNode) } : snap;
      const persistBoard = b => b ? { ...b, nodes: (b.nodes || []).map(persistNode), history: b.history ? { ...b.history, past: (b.history.past || []).map(persistSnapshot), future: (b.history.future || []).map(persistSnapshot) } : b.history } : b;
      const loadBoards = () => { try { const raw = JSON.parse(localStorage.getItem('wb_boards_v6')) || {}; const saved = {}; for (const [id, b] of Object.entries(raw)) saved[id] = persistBoard(b); return saved; } catch { return {}; } };
      const saved = loadBoards();
      const hashId = getBoardIdFromHash();
      const initialBoardId = hashId && saved[hashId] ? hashId : null;
      const initialView = initialBoardId ? 'canvas' : 'board-list';
      let saveTimer;
      const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { const { boards } = get(); const s = {}; for (const [id, b] of Object.entries(boards)) s[id] = { nodes: (b.nodes || []).map(persistNode), pins: b.pins, viewport: b.viewport, name: b.name, history: b.history ? { ...b.history, past: (b.history.past || []).map(persistSnapshot), future: (b.history.future || []).map(persistSnapshot) } : b.history }; try { localStorage.setItem('wb_boards_v6', JSON.stringify(s)); } catch { } }, 300); };
      const saveHistory = () => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board) return; const snap = { nodes: deepClone(board.nodes), pins: deepClone(board.pins) }; set({ boards: { ...boards, [currentBoardId]: { ...board, history: { past: [...board.history.past.slice(-100), snap], future: [] } } } }); scheduleSave(); };

      return {
        view: initialView,
        currentBoardId: initialBoardId || 'default',
        boards: saved,
        selectedNodeIds: [],
        tool: 'select',
        clipboard: null,
        dragging: null,
        showMinimap: true,
        pinPanelOpen: false,
        editingNodeId: null,
        shapePreview: null,
        deleteDialogTarget: null,
        resizing: null,

        setView: (v) => set({ view: v }),
        saveHistory,
        setCurrentBoardId: (id) => {
          const { boards } = get();
          if (!boards[id]) {
            set(s => ({ boards: { ...s.boards, [id]: { nodes: [], pins: [], viewport: { x: 0, y: 0, zoom: 1 }, history: { past: [], future: [] }, name: id } }, currentBoardId: id, selectedNodeIds: [], tool: 'select', view: 'canvas' }));
          } else {
            set({ currentBoardId: id, selectedNodeIds: [], tool: 'select', view: 'canvas' });
          }
          setBoardIdToHash(id);
          scheduleSave();
        },
        createBoard: (name) => {
          const id = name || `画布_${Date.now()}`;
          const { boards } = get();
          const finalId = boards[id] ? `${id}_${Date.now()}` : id;
          set(s => ({ boards: { ...s.boards, [finalId]: { nodes: [], pins: [], viewport: { x: 0, y: 0, zoom: 1 }, history: { past: [], future: [] }, name: finalId } }, currentBoardId: finalId, selectedNodeIds: [], tool: 'select', view: 'canvas' }));
          setBoardIdToHash(finalId);
          scheduleSave();
        },
        deleteBoard: (id) => {
          const { boards, currentBoardId } = get();
          const keys = Object.keys(boards);
          if (keys.length <= 1) return;
          const newBoards = { ...boards }; delete newBoards[id];
          const newId = id === currentBoardId ? (keys.find(k => k !== id) || 'default') : currentBoardId;
          set({ boards: newBoards, currentBoardId: newId, selectedNodeIds: [], deleteDialogTarget: null });
          if (id === currentBoardId) setBoardIdToHash(newId);
          scheduleSave();
        },
        setDeleteDialogTarget: (id) => set({ deleteDialogTarget: id }),
        clearDeleteDialogTarget: () => set({ deleteDialogTarget: null }),
        goBackToList: () => { clearHash(); set({ view: 'board-list', selectedNodeIds: [], tool: 'select', editingNodeId: null }); },
        setTool: (tool) => set({ tool, selectedNodeIds: tool !== 'select' ? [] : get().selectedNodeIds }),
        selectNode: (id) => { if (get().tool === 'select') set({ selectedNodeIds: [id], editingNodeId: null }); },
        setSelectedNodes: (ids) => set({ selectedNodeIds: ids, editingNodeId: null }),
        deselectAll: () => set({ selectedNodeIds: [], editingNodeId: null }),
        startEditingNode: (id) => set({ editingNodeId: id }),
        stopEditingNode: () => {
          const { editingNodeId, boards, currentBoardId } = get();
          if (!editingNodeId) return;
          const board = boards[currentBoardId];
          if (board) {
            const snap = { nodes: deepClone(board.nodes), pins: deepClone(board.pins) };
            set({ editingNodeId: null, boards: { ...boards, [currentBoardId]: { ...board, history: { ...board.history, past: [...board.history.past.slice(-100), snap], future: [] } } } });
            scheduleSave();
          } else set({ editingNodeId: null });
        },
        setViewport: (vp) => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, viewport: { ...board.viewport, ...vp } } } }); scheduleSave(); } },
        zoomAt: (sx, sy, delta) => {
          const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board) return;
          const vp = board.viewport; const factor = delta > 0 ? 1.1 : 1 / 1.1; const nz = Math.max(0.06, Math.min(8, vp.zoom * factor));
          const wx = (sx - vp.x) / vp.zoom, wy = (sy - vp.y) / vp.zoom;
          set({ boards: { ...boards, [currentBoardId]: { ...board, viewport: { x: sx - wx * nz, y: sy - wy * nz, zoom: nz } } } });
          scheduleSave();
        },
        addNode: (node) => { saveHistory(); const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: [...board.nodes, node] } }, selectedNodeIds: [node.id] }); scheduleSave(); } },
        addNodes: (newNodes) => { if (!newNodes.length) return; saveHistory(); const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: [...board.nodes, ...newNodes] } }, selectedNodeIds: newNodes.map(n => n.id) }); scheduleSave(); } },
        updateNode: (id, updates) => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: board.nodes.map(n => n.id === id ? { ...n, ...updates } : n) } } }); scheduleSave(); } },
        deleteNode: (id) => get().deleteNodes([id]),
        deleteNodes: (ids) => {
          const idSet = new Set(ids);
          if (!idSet.size) return;
          saveHistory();
          const { boards, currentBoardId } = get();
          const board = boards[currentBoardId];
          if (!board) return;
          const remaining = board.nodes.filter(n => !idSet.has(n.id));
          const remainingImageIds = new Set(remaining.filter(n => n.type === 'image' && n.imageId).map(n => n.imageId));
          [...new Set(board.nodes.filter(n => idSet.has(n.id) && n.type === 'image' && n.imageId).map(n => n.imageId))]
            .filter(imageId => !remainingImageIds.has(imageId))
            .forEach(imageId => deleteImageFromDB(imageId).catch(console.error));
          set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: remaining } }, selectedNodeIds: [] });
          scheduleSave();
        },
        updateNodesBatch: (map) => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: board.nodes.map(n => map.has(n.id) ? { ...n, ...map.get(n.id) } : n) } } }); scheduleSave(); } },
        addPin: (pin) => { saveHistory(); const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, pins: [...board.pins, pin] } } }); scheduleSave(); } },
        updatePin: (id, updates) => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, pins: board.pins.map(p => p.id === id ? { ...p, ...updates } : p) } } }); scheduleSave(); } },
        deletePin: (id) => { saveHistory(); const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (board) { set({ boards: { ...boards, [currentBoardId]: { ...board, pins: board.pins.filter(p => p.id !== id) } } }); scheduleSave(); } },
        goToPin: (id) => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board) return; const pin = board.pins.find(p => p.id === id); if (!pin) return; const vp = board.viewport; const sw = window.innerWidth, sh = window.innerHeight; set({ boards: { ...boards, [currentBoardId]: { ...board, viewport: { ...vp, x: sw / 2 - pin.x * vp.zoom, y: sh / 2 - pin.y * vp.zoom } } }, pinPanelOpen: false });
          scheduleSave();
        },
        setPinPanelOpen: (v) => set({ pinPanelOpen: v }),
        undo: () => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board || !board.history.past.length) return; const past = [...board.history.past]; const snap = past.pop(); const futureSnap = { nodes: deepClone(board.nodes), pins: deepClone(board.pins) }; set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: snap.nodes, pins: snap.pins, history: { past, future: [futureSnap, ...board.history.future.slice(0, 100)] } } }, selectedNodeIds: [] }); scheduleSave(); },
        redo: () => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board || !board.history.future.length) return; const future = [...board.history.future]; const snap = future.shift(); const pastSnap = { nodes: deepClone(board.nodes), pins: deepClone(board.pins) }; set({ boards: { ...boards, [currentBoardId]: { ...board, nodes: snap.nodes, pins: snap.pins, history: { past: [...board.history.past.slice(-100), pastSnap], future } } }, selectedNodeIds: [] }); scheduleSave(); },
        exportBoard: async () => { const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board) return; const nodes = await Promise.all(board.nodes.map(async n => { if (n.type === 'image' && n.imageId) { const blob = await getImageFromDB(n.imageId); if (blob) { const b64 = await blobToBase64(blob); return { ...n, src: b64 }; } } return n; })); const data = { nodes, pins: board.pins, viewport: board.viewport, name: board.name, version: '3.0' }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `whiteboard_${board.name || currentBoardId}.json`; a.click(); URL.revokeObjectURL(a.href); },
        importBoard: async (json) => { try { const data = typeof json === 'string' ? JSON.parse(json) : json; if (!data.nodes?.length) throw new Error('无效'); saveHistory(); const { boards, currentBoardId } = get(); const board = boards[currentBoardId]; if (!board) return false; const nodes = await Promise.all(data.nodes.map(async n => { if (n.type === 'image' && n.src?.startsWith('data:')) { const blob = base64ToBlob(n.src); const cb = await compressImageToWebP(blob); const imgId = n.imageId || genId(); await saveImageToDB(imgId, cb); return { ...n, src: URL.createObjectURL(cb), imageId: imgId }; } return n; })); set({ boards: { ...boards, [currentBoardId]: { ...board, nodes, pins: data.pins || [], viewport: data.viewport || { x: 0, y: 0, zoom: 1 }, history: { past: [], future: [] } } }, selectedNodeIds: [] }); scheduleSave(); return true; } catch (e) { console.error(e); return false; } },
        copySelectedNodes: () => { const { selectedNodeIds, boards, currentBoardId } = get(); if (!selectedNodeIds.length) return; const nodes = boards[currentBoardId]?.nodes.filter(n => selectedNodeIds.includes(n.id)); if (nodes?.length) set({ clipboard: nodes.map(deepClone) }); },
        pasteNodes: async (wx, wy) => {
          const { clipboard } = get(); if (!clipboard?.length) return;
          const ref = clipboard[0]; const refCx = ref.x + (ref.width || 100) / 2, refCy = ref.y + (ref.height || 30) / 2; const dx = wx - refCx, dy = wy - refCy;
          const newNodes = await Promise.all(clipboard.map(async n => {
            const nn = { ...deepClone(n), id: genId(), x: n.x + dx, y: n.y + dy };
            if (nn.type === 'line' || nn.type === 'arrow') { nn.x2 = (n.x2 ?? n.x + (n.width || 0)) + dx; nn.y2 = (n.y2 ?? n.y + (n.height || 0)) + dy; }
            if (nn.type === 'image' && nn.imageId) {
              const blob = await getNodeImageBlob(n);
              if (blob) {
                const imageId = genId();
                await saveImageToDB(imageId, blob);
                nn.imageId = imageId;
                nn.src = URL.createObjectURL(blob);
              }
            }
            return nn;
          }));
          get().addNodes(newNodes);
        },
        startDrag: (type, data) => set({ dragging: { type, ...data } }),
        updateDrag: (upd) => set(s => s.dragging ? { dragging: { ...s.dragging, ...upd } } : {}),
        endDrag: () => {
          const { dragging, boards, currentBoardId } = get();
          if (!dragging) return;
          if (dragging.type === 'marquee' && dragging.endWorldX !== undefined) {
            const board = boards[currentBoardId];
            if (board) {
              const x = Math.min(dragging.startWorldX, dragging.endWorldX), y = Math.min(dragging.startWorldY, dragging.endWorldY);
              const w = Math.abs(dragging.endWorldX - dragging.startWorldX), h = Math.abs(dragging.endWorldY - dragging.startWorldY);
              const ids = board.nodes.filter(n => {
                const b = getNodeBounds(n);
                return b.x < x + w && b.x + b.width > x && b.y < y + h && b.y + b.height > y;
              }).map(n => n.id);
              const base = dragging.additive ? get().selectedNodeIds : [];
              set({ dragging: null, shapePreview: null, selectedNodeIds: [...new Set([...base, ...ids])], editingNodeId: null });
            } else set({ dragging: null, shapePreview: null });
            return;
          }
          if ((dragging.type === 'node' && dragging.nodeId && dragging.didMove) || (dragging.type === 'multi' && dragging.originals?.length && dragging.didMove)) {
            const board = boards[currentBoardId];
            if (board) {
              const snap = dragging.startSnapshot || { nodes: deepClone(board.nodes), pins: deepClone(board.pins) };
              set({ dragging: null, boards: { ...boards, [currentBoardId]: { ...board, history: { ...board.history, past: [...board.history.past.slice(-100), snap], future: [] } } } });
              scheduleSave();
              return;
            }
          }
          if (dragging.type === 'pin' && dragging.pinId && dragging.didMove) {
            const board = boards[currentBoardId];
            if (board) {
              const snap = dragging.startSnapshot || { nodes: deepClone(board.nodes), pins: deepClone(board.pins) };
              set({ dragging: null, boards: { ...boards, [currentBoardId]: { ...board, history: { ...board.history, past: [...board.history.past.slice(-100), snap], future: [] } } } });
              scheduleSave();
              return;
            }
          }
          if (dragging.type === 'shape' && dragging.endWorldX !== undefined) {
            const { shapeType, startWorldX, startWorldY, endWorldX, endWorldY } = dragging;
            const node = { id: genId(), type: shapeType, x: startWorldX, y: startWorldY, x2: endWorldX, y2: endWorldY, width: Math.abs(endWorldX - startWorldX), height: Math.abs(endWorldY - startWorldY), color: shapeType === 'rectangle' ? 'rgba(255,255,255,0.25)' : '#f472b6' };
            if (shapeType === 'rectangle') { node.x = Math.min(startWorldX, endWorldX); node.y = Math.min(startWorldY, endWorldY); }
            set({ dragging: null, shapePreview: null });
            get().addNode(node);
            return;
          }
          set({ dragging: null, shapePreview: null });
        },
        setShapePreview: (p) => set({ shapePreview: p }),
        setShowMinimap: (v) => set({ showMinimap: v }),
        startResizing: (nodeId, handle, startPos, nodePos, nodeDim) => {
          const { boards, currentBoardId } = get();
          const board = boards[currentBoardId];
          set({
            resizing: { nodeId, handle, startMouseX: startPos.x, startMouseY: startPos.y, startX: nodePos.x, startY: nodePos.y, startWidth: nodeDim.width, startHeight: nodeDim.height, aspectRatio: nodeDim.aspectRatio, historySnapshot: board ? deepClone({ nodes: board.nodes, pins: board.pins }) : null }
          });
        },
        updateResizing: (mouseX, mouseY, maintainRatio) => {
          const { resizing, boards, currentBoardId } = get();
          if (!resizing) return;
          const board = boards[currentBoardId];
          if (!board) return;
          const vpZoom = board.viewport.zoom || 1;
          const { nodeId, handle, startMouseX, startMouseY, startX, startY, startWidth, startHeight, aspectRatio } = resizing;
          const dx = (mouseX - startMouseX) / vpZoom;
          const dy = (mouseY - startMouseY) / vpZoom;
          let newX = startX, newY = startY, newW = startWidth, newH = startHeight;
          const effectiveRatio = maintainRatio && aspectRatio ? aspectRatio : null;

          const applyRatio = (tw, th) => {
            if (!effectiveRatio) return { w: tw, h: th };
            if (tw / th > effectiveRatio) return { w: th * effectiveRatio, h: th };
            else return { w: tw, h: tw / effectiveRatio };
          };

          switch (handle) {
            case 'nw': { const d = applyRatio(startWidth - dx, startHeight - dy); newW = Math.max(10, d.w); newH = Math.max(10, d.h); newX = startX + startWidth - newW; newY = startY + startHeight - newH; break; }
            case 'ne': { const d = applyRatio(startWidth + dx, startHeight - dy); newW = Math.max(10, d.w); newH = Math.max(10, d.h); newY = startY + startHeight - newH; break; }
            case 'sw': { const d = applyRatio(startWidth - dx, startHeight + dy); newW = Math.max(10, d.w); newH = Math.max(10, d.h); newX = startX + startWidth - newW; break; }
            case 'se': { const d = applyRatio(startWidth + dx, startHeight + dy); newW = Math.max(10, d.w); newH = Math.max(10, d.h); break; }
            case 'n': { const d = effectiveRatio ? { w: startHeight - dy * effectiveRatio, h: startHeight - dy } : { w: startWidth, h: startHeight - dy }; newH = Math.max(10, d.h); newW = effectiveRatio ? Math.max(10, d.w) : startWidth; if (effectiveRatio) newX = startX + (startWidth - newW) / 2; newY = startY + startHeight - newH; break; }
            case 's': { const d = effectiveRatio ? { w: startHeight + dy * effectiveRatio, h: startHeight + dy } : { w: startWidth, h: startHeight + dy }; newH = Math.max(10, d.h); newW = effectiveRatio ? Math.max(10, d.w) : startWidth; if (effectiveRatio) newX = startX + (startWidth - newW) / 2; break; }
            case 'w': { const d = effectiveRatio ? { w: startWidth - dx, h: (startWidth - dx) / effectiveRatio } : { w: startWidth - dx, h: startHeight }; newW = Math.max(10, d.w); newH = effectiveRatio ? Math.max(10, d.h) : startHeight; if (effectiveRatio) newY = startY + (startHeight - newH) / 2; newX = startX + startWidth - newW; break; }
            case 'e': { const d = effectiveRatio ? { w: startWidth + dx, h: (startWidth + dx) / effectiveRatio } : { w: startWidth + dx, h: startHeight }; newW = Math.max(10, d.w); newH = effectiveRatio ? Math.max(10, d.h) : startHeight; if (effectiveRatio) newY = startY + (startHeight - newH) / 2; break; }
          }
          const nodes = board.nodes.map(n => n.id === nodeId ? { ...n, x: newX, y: newY, width: newW, height: newH } : n);
          set({ boards: { ...boards, [currentBoardId]: { ...board, nodes } } });
        },
        endResizing: () => {
          const { resizing, boards, currentBoardId } = get();
          if (!resizing) return;
          const board = boards[currentBoardId];
          if (board) {
            const snap = resizing.historySnapshot || { nodes: deepClone(board.nodes), pins: deepClone(board.pins) };
            set({ resizing: null, boards: { ...boards, [currentBoardId]: { ...board, history: { ...board.history, past: [...board.history.past.slice(-100), snap], future: [] } } } });
            scheduleSave();
          } else set({ resizing: null });
        },
      };
    });
