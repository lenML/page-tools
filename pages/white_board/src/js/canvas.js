function Canvas() {
      const boards = useStore(s => s.boards);
      const currentBoardId = useStore(s => s.currentBoardId);
      const selectedNodeIds = useStore(s => s.selectedNodeIds);
      const setSelectedNodes = useStore(s => s.setSelectedNodes);
      const tool = useStore(s => s.tool);
      const dragging = useStore(s => s.dragging);
      const editingNodeId = useStore(s => s.editingNodeId);
      const shapePreview = useStore(s => s.shapePreview);
      const resizing = useStore(s => s.resizing);
      const setViewport = useStore(s => s.setViewport);
      const zoomAt = useStore(s => s.zoomAt);
      const deselectAll = useStore(s => s.deselectAll);
      const stopEditingNode = useStore(s => s.stopEditingNode);
      const startEditingNode = useStore(s => s.startEditingNode);
      const addNode = useStore(s => s.addNode);
      const updateNode = useStore(s => s.updateNode);
      const addPin = useStore(s => s.addPin);
      const updatePin = useStore(s => s.updatePin);
      const startDrag = useStore(s => s.startDrag);
      const updateDrag = useStore(s => s.updateDrag);
      const endDrag = useStore(s => s.endDrag);
      const setShapePreview = useStore(s => s.setShapePreview);
      const updateResizing = useStore(s => s.updateResizing);
      const endResizing = useStore(s => s.endResizing);
      const copySelectedNodes = useStore(s => s.copySelectedNodes);
      const pasteNodes = useStore(s => s.pasteNodes);
      const updateNodesBatch = useStore(s => s.updateNodesBatch);
      const saveHistory = useStore(s => s.saveHistory);
      const undo = useStore(s => s.undo);
      const redo = useStore(s => s.redo);
      const setTool = useStore(s => s.setTool);
      const deleteNodes = useStore(s => s.deleteNodes);
      const setPinPanelOpen = useStore(s => s.setPinPanelOpen);

      const board = boards[currentBoardId];
      const nodes = board?.nodes || [], pins = board?.pins || [], vp = board?.viewport || { x: 0, y: 0, zoom: 1 };
      const canvasRef = React.useRef(null);
      const [marqueeRect, setMarqueeRect] = React.useState(null);
      const [contextMenu, setContextMenu] = React.useState(null);
      const sortedNodes = React.useMemo(() => { const rects = nodes.filter(n => n.type === 'rectangle'); return [...rects, ...nodes.filter(n => n.type !== 'rectangle')]; }, [nodes]);
      const screenToWorld = React.useCallback((sx, sy) => { const r = canvasRef.current?.getBoundingClientRect(); return { wx: ((r ? sx - r.left : sx) - vp.x) / vp.zoom, wy: ((r ? sy - r.top : sy) - vp.y) / vp.zoom }; }, [vp.x, vp.y, vp.zoom]);
      const isNodeInsideRect = (node, rect) => { if (node.type === 'rectangle') return false; const cx = node.x + (node.width || 60) / 2, cy = node.y + (node.height || 30) / 2; return cx >= rect.x && cx <= rect.x + (rect.width || 120) && cy >= rect.y && cy <= rect.y + (rect.height || 90); };

      const beginNodeDrag = React.useCallback((nodeId, e) => {
        if (tool !== 'select' || editingNodeId) return false;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return false;
        const currentIds = useStore.getState().selectedNodeIds;
        let nextIds = currentIds;
        if (!currentIds.includes(nodeId)) nextIds = (e.ctrlKey || e.metaKey) ? [...currentIds, nodeId] : [nodeId];
        if (nextIds !== currentIds) setSelectedNodes(nextIds);
        const { wx, wy } = screenToWorld(e.clientX, e.clientY);
        const originals = nextIds.map(id => { const n = nodes.find(nn => nn.id === id); return n ? { id, x: n.x, y: n.y, x2: n.x2, y2: n.y2 } : null; }).filter(Boolean);
        if (node.type === 'rectangle') {
          nodes.filter(n => n.id !== nodeId && isNodeInsideRect(n, node) && !nextIds.includes(n.id)).forEach(n => originals.push({ id: n.id, x: n.x, y: n.y, x2: n.x2, y2: n.y2 }));
        }
        startDrag('multi', { originals, startWx: wx, startWy: wy, didMove: false, startSnapshot: deepClone({ nodes, pins }) });
        return true;
      }, [tool, editingNodeId, nodes, pins, screenToWorld]);

      const handleDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
      const handleDrop = async e => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (!files.length) return;
        const { wx, wy } = screenToWorld(e.clientX, e.clientY);
        for (const file of files) {
          try { await addImageNodeFromBlob(file, wx, wy); } catch (err) { console.error(err); }
        }
      };

      const handleMouseDown = React.useCallback(e => {
        if (e.button !== 0) return;
        if (resizing) { endResizing(); return; }
        const pinEl = e.target.closest('[data-pin-id]');
        if (pinEl) {
          e.stopPropagation();
          const pinId = pinEl.getAttribute('data-pin-id');
          const pin = pins.find(p => p.id === pinId);
          if (pin && tool === 'select') { const { wx, wy } = screenToWorld(e.clientX, e.clientY); startDrag('pin', { pinId, offsetX: wx - pin.x, offsetY: wy - pin.y, startX: pin.x, startY: pin.y, didMove: false, startSnapshot: deepClone({ nodes, pins }) }); return; }
        }
        if (e.target.closest('.resize-handle')) return;
        const { wx, wy } = screenToWorld(e.clientX, e.clientY);
        const targetNodeEl = e.target.closest('[data-node-id]');
        const nodeId = targetNodeEl?.getAttribute('data-node-id');
        if (tool === 'select') {
          if (nodeId && !editingNodeId) {
            beginNodeDrag(nodeId, e);
          } else if (!nodeId && !editingNodeId && (e.ctrlKey || e.metaKey)) {
            startDrag('marquee', { startWorldX: wx, startWorldY: wy, endWorldX: wx, endWorldY: wy, additive: true });
            setMarqueeRect({ x: wx, y: wy, width: 0, height: 0 });
          } else if (!nodeId && !editingNodeId) { deselectAll(); stopEditingNode(); startDrag('canvas', { startX: e.clientX, startY: e.clientY, vpX: vp.x, vpY: vp.y }); }
        } else if (tool === 'pin') {
          if (!nodeId && !pinEl) { const pid = genId(); addPin({ id: pid, x: wx, y: wy, label: `图钉 ${pins.length + 1}` }); setPinPanelOpen(true); }
        } else if (['rectangle', 'line', 'arrow'].includes(tool)) {
          if (!nodeId && !pinEl) { startDrag('shape', { shapeType: tool, startWorldX: wx, startWorldY: wy }); setShapePreview({ type: tool, x: wx, y: wy, w: 0, h: 0, startX: wx, startY: wy, endX: wx, endY: wy }); }
        }
      }, [tool, screenToWorld, nodes, pins, editingNodeId, resizing, beginNodeDrag]);

      const handleMouseMove = React.useCallback(e => {
        if (resizing) { const node = nodes.find(n => n.id === resizing.nodeId); updateResizing(e.clientX, e.clientY, node?.type === 'image' ? true : !e.shiftKey); return; }
        if (!dragging) return;
        if (dragging.type === 'canvas') setViewport({ x: dragging.vpX + e.clientX - dragging.startX, y: dragging.vpY + e.clientY - dragging.startY });
        else if (dragging.type === 'marquee') {
          const { wx, wy } = screenToWorld(e.clientX, e.clientY);
          const x = Math.min(dragging.startWorldX, wx), y = Math.min(dragging.startWorldY, wy);
          setMarqueeRect({ x, y, width: Math.abs(wx - dragging.startWorldX), height: Math.abs(wy - dragging.startWorldY) });
          updateDrag({ endWorldX: wx, endWorldY: wy, didMove: true });
        } else if (dragging.type === 'multi' && dragging.originals?.length) {
          const { wx, wy } = screenToWorld(e.clientX, e.clientY);
          const dx = wx - dragging.startWx, dy = wy - dragging.startWy;
          updateDrag({ didMove: Math.abs(dx) > 1 || Math.abs(dy) > 1 });
          const map = new Map();
          dragging.originals.forEach(o => {
            const n = nodes.find(nn => nn.id === o.id);
            if (!n) return;
            if (n.type === 'line' || n.type === 'arrow') map.set(o.id, { x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? o.x + (n.width || 0)) + dx, y2: (o.y2 ?? o.y + (n.height || 0)) + dy });
            else map.set(o.id, { x: o.x + dx, y: o.y + dy });
          });
          if (map.size) updateNodesBatch(map);
        } else if (dragging.type === 'node' && dragging.nodeId) {
          const { wx, wy } = screenToWorld(e.clientX, e.clientY);
          const nx = wx - dragging.offsetX, ny = wy - dragging.offsetY;
          updateDrag({ didMove: Math.abs(nx - dragging.startX) > 1 || Math.abs(ny - dragging.startY) > 1 });
          const node = nodes.find(n => n.id === dragging.nodeId);
          if (node) {
            if (node.type === 'line' || node.type === 'arrow') { updateNode(dragging.nodeId, { x: nx, y: ny, x2: (node.x2 ?? node.x + (node.width || 0)) + (nx - node.x), y2: (node.y2 ?? node.y + (node.height || 0)) + (ny - node.y) }); }
            else updateNode(dragging.nodeId, { x: nx, y: ny });
            if (dragging.containedNodes?.length) {
              const rdx = nx - dragging.origRectX, rdy = ny - dragging.origRectY;
              const map = new Map();
              dragging.containedNodes.forEach(cn => map.set(cn.id, { x: cn.origX + rdx, y: cn.origY + rdy }));
              useStore.getState().updateNodesBatch(map);
            }
          }
        } else if (dragging.type === 'pin') { const { wx, wy } = screenToWorld(e.clientX, e.clientY); updatePin(dragging.pinId, { x: wx - dragging.offsetX, y: wy - dragging.offsetY }); updateDrag({ didMove: true }); }
        else if (dragging.type === 'shape') { const { wx, wy } = screenToWorld(e.clientX, e.clientY); setShapePreview({ type: dragging.shapeType, x: Math.min(dragging.startWorldX, wx), y: Math.min(dragging.startWorldY, wy), w: Math.abs(wx - dragging.startWorldX), h: Math.abs(wy - dragging.startWorldY), startX: dragging.startWorldX, startY: dragging.startWorldY, endX: wx, endY: wy }); updateDrag({ endWorldX: wx, endWorldY: wy }); }
      }, [dragging, resizing, nodes, screenToWorld, updateNodesBatch]);

      const handleMouseUp = React.useCallback(() => {
        setMarqueeRect(null);
        if (resizing) endResizing(); else if (dragging) endDrag();
      }, [dragging, resizing]);

      const handleDoubleClick = React.useCallback(e => {
        const targetNodeEl = e.target.closest('[data-node-id]');
        const nodeId = targetNodeEl?.getAttribute('data-node-id');
        if (nodeId) {
          const node = nodes.find(n => n.id === nodeId);
          if (!node) return;
          if (node.type === 'text') startEditingNode(nodeId);
          else if (node.type === 'iframe') { const u = prompt('iframe URL:', node.url || 'https://'); if (u !== null && u.trim()) updateNode(nodeId, { url: u.trim() }); }
          else if (node.type === 'rectangle') { const l = prompt('分组标签:', node.label || ''); if (l !== null) updateNode(nodeId, { label: l.trim() }); }
        } else if (tool === 'select') {
          const { wx, wy } = screenToWorld(e.clientX, e.clientY);
          const newNode = { id: genId(), type: 'text', x: wx - 80, y: wy - 20, width: 240, height: 40, content: '' };
          addNode(newNode);
          setTimeout(() => startEditingNode(newNode.id), 60);
        }
      }, [nodes, tool, screenToWorld]);

      const handleNodeMouseDown = React.useCallback((nodeId, e) => {
        e.stopPropagation();
        beginNodeDrag(nodeId, e);
      }, [beginNodeDrag]);

      const handleContextMenu = React.useCallback(e => {
        e.preventDefault();
        const el = e.target.closest('[data-node-id]');
        if (!el) { setContextMenu(null); return; }
        const nodeId = el.getAttribute('data-node-id');
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const currentIds = useStore.getState().selectedNodeIds;
        let ids = currentIds.includes(nodeId) ? currentIds : [nodeId];
        if ((e.ctrlKey || e.metaKey) && !currentIds.includes(nodeId)) ids = [...currentIds, nodeId];
        if (!currentIds.includes(nodeId)) setSelectedNodes(ids);
        setContextMenu({
          x: Math.max(8, Math.min(e.clientX, window.innerWidth - 190)),
          y: Math.max(8, Math.min(e.clientY, window.innerHeight - 250)),
          nodeIds: ids
        });
      }, [nodes]);

      React.useEffect(() => {
        if (!contextMenu) return;
        const close = e => { if (!e.target.closest('.wb-context-menu')) setContextMenu(null); };
        const esc = e => { if (e.key === 'Escape') setContextMenu(null); };
        const wheel = () => setContextMenu(null);
        window.addEventListener('pointerdown', close, true);
        window.addEventListener('contextmenu', close, true);
        window.addEventListener('keydown', esc);
        window.addEventListener('wheel', wheel, { passive: true });
        return () => {
          window.removeEventListener('pointerdown', close, true);
          window.removeEventListener('contextmenu', close, true);
          window.removeEventListener('keydown', esc);
          window.removeEventListener('wheel', wheel);
        };
      }, [contextMenu]);

      const handleWheel = React.useCallback(e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 : -1); }, [zoomAt]);

      const handlePaste = React.useCallback(async e => {
        if (document.activeElement?.contentEditable === 'true' || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        const items = e.clipboardData?.items;
        if (!items) return;
        const { wx, wy } = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        let handled = false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              try {
                await addImageNodeFromBlob(blob, wx, wy);
                handled = true;
              } catch (err) { console.error(err); }
            }
          } else if (item.type === 'text/plain' && !handled) {
            item.getAsString(text => { if (text.trim()) addNode({ id: genId(), type: 'text', x: wx - 110, y: wy - 20, width: 260, height: 50, content: text.trim() }); });
            handled = true;
          }
        }
        if (handled) e.preventDefault();
      }, [screenToWorld, addNode]);

      React.useEffect(() => {
        const handler = e => {
          if (document.activeElement?.contentEditable === 'true' || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
          const ctrl = e.ctrlKey || e.metaKey;
          if (e.key === 'Delete' || e.key === 'Backspace') { const ids = useStore.getState().selectedNodeIds; if (ids.length) { e.preventDefault(); deleteNodes(ids); } }
          else if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
          else if (ctrl && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
          else if (ctrl && e.key === 'c') { e.preventDefault(); copySelectedNodes(); }
          else if (ctrl && e.key === 'v') { const { wx, wy } = screenToWorld(window.innerWidth / 2, window.innerHeight / 2); pasteNodes(wx, wy); }
          else if (e.key === 'v' && !ctrl) setTool('select');
          else if (e.key === 'r' && !ctrl) setTool('rectangle');
          else if (e.key === 'l' && !ctrl) setTool('line');
          else if (e.key === 'a' && !ctrl) setTool('arrow');
          else if (e.key === 'p' && !ctrl) setTool('pin');
          else if (e.key === 'Escape') { setContextMenu(null); deselectAll(); stopEditingNode(); setTool('select'); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }, [screenToWorld, deleteNodes, copySelectedNodes, pasteNodes, undo, redo, setTool, deselectAll, stopEditingNode]);

      return (
        <div ref={canvasRef} className="dot-bg absolute inset-0" style={{ backgroundSize: `${22 * vp.zoom}px ${22 * vp.zoom}px`, backgroundPosition: `${vp.x}px ${vp.y}px`, cursor: tool === 'select' ? 'default' : 'crosshair' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleDoubleClick} onContextMenu={handleContextMenu} onWheel={handleWheel} onPaste={handlePaste} onDragOver={handleDragOver} onDrop={handleDrop} tabIndex={0}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.zoom})`, transformOrigin: '0 0', width: 0, height: 0 }}>
            {sortedNodes.map(node => {
              const nb = getNodeBounds(node);
              return <div key={node.id} data-node-id={node.id} style={{ position: 'absolute', left: node.x, top: node.y, width: nb.width, height: nb.height, zIndex: node.type === 'rectangle' ? 1 : 10 }}><NodeRenderer node={node} isSelected={selectedNodeIds.includes(node.id)} showResizeHandles={selectedNodeIds.length === 1} isEditing={editingNodeId === node.id} onNodeMouseDown={handleNodeMouseDown} onNodeDoubleClick={nid => { const n = nodes.find(nn => nn.id === nid); if (n?.type === 'text') startEditingNode(nid); else if (n?.type === 'iframe') { const u = prompt('iframe URL:', n.url || 'https://'); if (u !== null && u.trim()) updateNode(nid, { url: u.trim() }); } }} /></div>;
            })}
            <ShapePreview preview={shapePreview} />
            {marqueeRect && <div style={{ position: 'absolute', left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.width, height: marqueeRect.height, border: '1px dashed #007acc', background: 'rgba(0,122,204,0.12)', pointerEvents: 'none', zIndex: 9998 }} />}
            {pins.map(pin => <PinMarker key={pin.id} pin={pin} tool={tool} onMouseDown={handleMouseDown} />)}
          </div>
          <StatusBar vp={vp} nodesCount={nodes.length} pinsCount={pins.length} />
          {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}
        </div>
      );
    }

    function CanvasView() {
      const goBackToList = useStore(s => s.goBackToList);
      const boards = useStore(s => s.boards);
      const currentBoardId = useStore(s => s.currentBoardId);
      const board = boards[currentBoardId];
      useImageLoader();
      return <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#1a1a24' }}>
        <button onClick={goBackToList} className="fixed top-2 left-2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs cursor-pointer shadow-lg" style={{ background: '#252526', borderColor: '#3e3e3e', color: '#858585' }}><ChevronLeft size={14} /><span className="max-w-[120px] truncate">{board?.name || currentBoardId}</span></button>
        <Toolbar /><Canvas /><Minimap />
      </div>;
    }
