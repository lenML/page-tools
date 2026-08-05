function useImageLoader() {
      const updateNode = useStore(s => s.updateNode);
      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          const boards = useStore.getState().boards;
          for (const [, board] of Object.entries(boards)) {
            for (const node of board.nodes) {
              if (cancelled) return;
              if (node.type === 'image' && node.imageId && (!node.src || node.src === '' || node.src === 'undefined')) {
                try { const blob = await getNodeImageBlob(node); if (blob && !cancelled) updateNode(node.id, { src: URL.createObjectURL(blob) }); } catch { }
              }
            }
          }
        })();
        return () => { cancelled = true; };
      }, []);
    }

    function ToolbarButton({ children, onClick, disabled, title, active, activeColor }) {
      return (
        <Tooltip.Root delayDuration={400}>
          <Tooltip.Trigger asChild>
            <button onClick={onClick} disabled={disabled} className="p-1.5 rounded transition-all flex items-center justify-center" style={{ color: disabled ? '#4a4a4a' : active ? (activeColor || '#007acc') : '#858585', background: active ? '#007acc' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer' }} onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = '#3c3c3c'; }} onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}>
              {children}
            </button>
          </Tooltip.Trigger>
          {title && <Tooltip.Portal><Tooltip.Content className="px-2 py-1 text-xs rounded shadow border" style={{ background: '#333', color: '#ddd', borderColor: '#555' }} sideOffset={6}>{title}<Tooltip.Arrow style={{ fill: '#333' }} /></Tooltip.Content></Tooltip.Portal>}
        </Tooltip.Root>
      );
    }

    function ResizeHandles({ nodeId }) {
      const startResizing = useStore(s => s.startResizing);
      const nodes = useStore(s => s.boards[s.currentBoardId]?.nodes || []);
      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.type === 'line' || node.type === 'arrow') return null;
      const handles = node.type === 'image' ? ['nw', 'ne', 'se', 'sw'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      const getStyle = (h) => {
        const base = { position: 'absolute', width: 10, height: 10, background: '#007acc', border: '1px solid white', borderRadius: 1, zIndex: 20 };
        switch (h) {
          case 'nw': return { ...base, top: -5, left: -5, cursor: 'nwse-resize' };
          case 'n': return { ...base, top: -5, left: '50%', marginLeft: -5, cursor: 'ns-resize' };
          case 'ne': return { ...base, top: -5, right: -5, cursor: 'nesw-resize' };
          case 'e': return { ...base, top: '50%', marginTop: -5, right: -5, cursor: 'ew-resize' };
          case 'se': return { ...base, bottom: -5, right: -5, cursor: 'nwse-resize' };
          case 's': return { ...base, bottom: -5, left: '50%', marginLeft: -5, cursor: 'ns-resize' };
          case 'sw': return { ...base, bottom: -5, left: -5, cursor: 'nesw-resize' };
          case 'w': return { ...base, top: '50%', marginTop: -5, left: -5, cursor: 'ew-resize' };
        }
      };
      return handles.map(h => (
        <div key={h} className="resize-handle" style={getStyle(h)} onMouseDown={e => {
          e.stopPropagation(); e.preventDefault();
          const n = nodes.find(n => n.id === nodeId);
          if (n) {
            const ratio = n.type === 'image' ? (n.width / n.height) : undefined;
            startResizing(nodeId, h, { x: e.clientX, y: e.clientY }, { x: n.x, y: n.y }, { width: n.width, height: n.height, aspectRatio: ratio });
          }
        }} />
      ));
    }

    function TextNode({ node, isSelected, isEditing, onNodeMouseDown, onNodeDoubleClick }) {
      const updateNode = useStore(s => s.updateNode);
      const stopEditingNode = useStore(s => s.stopEditingNode);
      const ref = React.useRef(null);
      React.useEffect(() => { if (isEditing && ref.current) { const el = ref.current; setTimeout(() => { el.focus(); const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }, 10); } }, [isEditing]);
      const base = { position: 'absolute', left: 0, top: 0, minWidth: 50, cursor: isSelected && !isEditing ? 'move' : isEditing ? 'text' : 'pointer', userSelect: 'none' };
      if (isEditing) return <div ref={ref} contentEditable suppressContentEditableWarning className="px-2.5 py-2 text-sm rounded-md min-w-[60px] outline-none text-node-editing" style={{ ...base, width: node.width || 220, background: 'rgba(30,30,35,0.92)', border: '1px solid rgba(255,255,255,0.1)', color: '#d0d0d0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.5 }} onMouseDown={e => e.stopPropagation()} onBlur={() => { const c = ref.current?.innerText || ''; updateNode(node.id, { content: c || '双击编辑' }); stopEditingNode(); }}>{node.content || ''}</div>;
      return <div className={`px-2.5 py-2 text-sm rounded-md min-w-[60px] markdown-rendered ${isSelected ? 'node-selected' : ''}`} style={{ ...base, width: node.width || 220, background: 'rgba(30,30,35,0.85)', border: '1px solid rgba(255,255,255,0.07)', color: '#d0d0d0', fontSize: 13, lineHeight: 1.5 }} onMouseDown={e => onNodeMouseDown(node.id, e)} onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(node.id); }} dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(node.content || '双击编辑') }} />;
    }

    function ImageNode({ node, isSelected, onNodeMouseDown }) {
      return <div className={`${isSelected ? 'node-selected' : ''} rounded-lg overflow-hidden`} style={{ position: 'absolute', left: 0, top: 0, width: node.width || 200, height: node.height || 150, background: '#1e1e1e', cursor: isSelected ? 'move' : 'pointer', userSelect: 'none' }} onMouseDown={e => onNodeMouseDown(node.id, e)}><img src={node.src} alt="" className="w-full h-full object-contain" draggable={false} style={{ pointerEvents: 'none' }} /></div>;
    }

    function IframeNode({ node, isSelected, onNodeMouseDown, onNodeDoubleClick }) {
      return <div className={`${isSelected ? 'node-selected' : ''} rounded-lg overflow-hidden border`} style={{ position: 'absolute', left: 0, top: 0, width: node.width || 400, height: node.height || 280, minWidth: 180, minHeight: 120, borderColor: '#3e3e3e', background: '#1e1e1e', cursor: isSelected ? 'move' : 'pointer', userSelect: 'none' }} onMouseDown={e => onNodeMouseDown(node.id, e)} onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(node.id); }}>
        <div className="absolute top-0 left-0 right-0 px-2 py-1 text-xs truncate z-10 pointer-events-none" style={{ background: 'rgba(30,30,35,0.9)', color: '#858585' }}>🌐 {node.url || '双击设置URL'}</div>
        {node.url ? <iframe src={node.url} className="w-full h-full border-none" style={{ paddingTop: 20 }} sandbox="allow-scripts allow-same-origin" /> : <div className="flex items-center justify-center h-full text-sm pt-4" style={{ color: '#858585' }}>双击设置URL</div>}
      </div>;
    }

    function RectangleNode({ node, isSelected, onNodeMouseDown, onNodeDoubleClick }) {
      return <div className={`group-node ${isSelected ? 'node-selected' : ''}`} style={{ position: 'absolute', left: 0, top: 0, width: node.width || 120, height: node.height || 90, minWidth: 20, minHeight: 20, cursor: isSelected ? 'move' : 'pointer', userSelect: 'none' }} onMouseDown={e => onNodeMouseDown(node.id, e)} onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(node.id); }} />;
    }

    function LineNode({ node, isSelected, onNodeMouseDown }) {
      const x1 = node.x, y1 = node.y, x2 = node.x2 ?? node.x + (node.width || 0), y2 = node.y2 ?? node.y + (node.height || 0);
      const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
      const svgW = Math.abs(x2 - x1) + 8, svgH = Math.abs(y2 - y1) + 8;
      const sx1 = x1 - minX + 4, sy1 = y1 - minY + 4, sx2 = x2 - minX + 4, sy2 = y2 - minY + 4;
      const color = node.color || '#f472b6';
      return <div className={isSelected ? 'node-selected' : ''} style={{ position: 'absolute', left: minX - 4, top: minY - 4, width: svgW, height: svgH, overflow: 'visible', cursor: isSelected ? 'move' : 'pointer', userSelect: 'none' }} onMouseDown={e => onNodeMouseDown(node.id, e)}>
        <svg width={svgW} height={svgH} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          {node.type === 'arrow' && <defs><marker id={`ah_${node.id}`} markerWidth="9" markerHeight="6" refX="9" refY="3" orient="auto"><polygon points="0 0, 9 3, 0 6" fill={color} /></marker></defs>}
          <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={color} strokeWidth="2" strokeLinecap="round" markerEnd={node.type === 'arrow' ? `url(#ah_${node.id})` : undefined} />
        </svg>
      </div>;
    }

    function NodeRenderer({ node, isSelected, isEditing, showResizeHandles, onNodeMouseDown, onNodeDoubleClick }) {
      const Wrapper = ({ children }) => <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}{isSelected && showResizeHandles && <ResizeHandles nodeId={node.id} />}</div>;
      switch (node.type) {
        case 'text': return <Wrapper><TextNode node={node} isSelected={isSelected} isEditing={isEditing} onNodeMouseDown={onNodeMouseDown} onNodeDoubleClick={onNodeDoubleClick} /></Wrapper>;
        case 'image': return <Wrapper><ImageNode node={node} isSelected={isSelected} onNodeMouseDown={onNodeMouseDown} /></Wrapper>;
        case 'iframe': return <Wrapper><IframeNode node={node} isSelected={isSelected} onNodeMouseDown={onNodeMouseDown} onNodeDoubleClick={onNodeDoubleClick} /></Wrapper>;
        case 'rectangle': return <Wrapper><RectangleNode node={node} isSelected={isSelected} onNodeMouseDown={onNodeMouseDown} onNodeDoubleClick={onNodeDoubleClick} /></Wrapper>;
        case 'line': case 'arrow': return <LineNode node={node} isSelected={isSelected} onNodeMouseDown={onNodeMouseDown} />;
        default: return null;
      }
    }

    function PinMarker({ pin, tool, onMouseDown }) {
      return <div data-pin-id={pin.id} style={{ position: 'absolute', left: pin.x - 8, top: pin.y - 18, cursor: tool === 'select' ? 'move' : 'pointer', zIndex: 50 }} title={pin.label || '图钉'} onMouseDown={onMouseDown}>
        <div className="flex flex-col items-center pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full shadow-lg border-2" style={{ background: '#d4a72c', borderColor: 'rgba(255,255,255,0.7)', boxShadow: '0 0 8px rgba(212,167,44,0.4)' }} />
          <div className="w-0.5 h-4" style={{ background: 'rgba(212,167,44,0.6)' }} />
        </div>
      </div>;
    }

    function ShapePreview({ preview }) {
      if (!preview) return null;
      return <div style={{ position: 'absolute', left: preview.x, top: preview.y, width: preview.w || 4, height: preview.h || 4, border: preview.type === 'rectangle' ? '2px dashed rgba(255,255,255,0.35)' : '2px dashed #f472b6', background: preview.type === 'rectangle' ? 'rgba(255,255,255,0.03)' : 'transparent', borderRadius: preview.type === 'rectangle' ? 6 : 0, pointerEvents: 'none', zIndex: 9999 }}>
        {(preview.type === 'line' || preview.type === 'arrow') && <svg width={preview.w + 8} height={preview.h + 8} style={{ position: 'absolute', left: -4, top: -4, overflow: 'visible', pointerEvents: 'none' }}>
          {preview.type === 'arrow' && <defs><marker id="pv_ah" markerWidth="9" markerHeight="6" refX="9" refY="3" orient="auto"><polygon points="0 0, 9 3, 0 6" fill="#f472b6" /></marker></defs>}
          <line x1={preview.startX < preview.endX ? 4 : preview.w + 4} y1={preview.startY < preview.endY ? 4 : preview.h + 4} x2={preview.startX < preview.endX ? preview.w + 4 : 4} y2={preview.startY < preview.endY ? preview.h + 4 : 4} stroke="#f472b6" strokeWidth="2" strokeDasharray="5,3" strokeLinecap="round" markerEnd={preview.type === 'arrow' ? 'url(#pv_ah)' : undefined} />
        </svg>}
      </div>;
    }

    function StatusBar({ vp, nodesCount, pinsCount }) {
      return <>
        <div className="fixed bottom-2 left-2 z-40 px-2 py-1 rounded text-xs pointer-events-none select-none" style={{ background: 'rgba(30,30,30,0.8)', color: '#858585', border: '1px solid rgba(255,255,255,0.06)' }}>{Math.round(vp.zoom * 100)}% · {nodesCount}元素 · {pinsCount}图钉</div>
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 px-2 py-1 rounded text-xs pointer-events-none select-none opacity-50" style={{ color: '#858585' }}>拖拽平移 · Ctrl+拖拽多选 · 右键图片操作 · Ctrl+V粘贴 · 拖入图片</div>
      </>;
    }

    function ContextMenuItem({ icon: Icon, label, onClick, danger, busy }) {
      return (
        <button disabled={busy} onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer text-left hover:bg-[#3c3c3c] disabled:opacity-50" style={{ background: 'transparent', border: 'none', color: danger ? '#e06c75' : '#cccccc' }}>
          {Icon && <Icon size={14} />}{label}
        </button>
      );
    }

    function ContextMenu({ menu, onClose }) {
      const boards = useStore(s => s.boards);
      const currentBoardId = useStore(s => s.currentBoardId);
      const updateNode = useStore(s => s.updateNode);
      const updateNodesBatch = useStore(s => s.updateNodesBatch);
      const saveHistory = useStore(s => s.saveHistory);
      const copySelectedNodes = useStore(s => s.copySelectedNodes);
      const deleteNodes = useStore(s => s.deleteNodes);
      const board = boards[currentBoardId];
      const vp = board?.viewport || { x: 0, y: 0, zoom: 1 };
      const selectedNodes = (board?.nodes || []).filter(n => menu.nodeIds.includes(n.id));
      const single = selectedNodes.length === 1 ? selectedNodes[0] : null;
      const [busy, setBusy] = React.useState(false);

      const run = async (fn) => {
        setBusy(true);
        try { await fn(); } catch (e) { console.error(e); alert(e?.message || '操作失败'); }
        finally { setBusy(false); onClose(); }
      };
      const applyLayout = updates => { if (updates.size) { saveHistory(); updateNodesBatch(updates); } };
      const copyImage = async () => { if (single?.type === 'image') await copyImageToClipboard(single); };
      const resetImageScale = async () => {
        if (!single) return;
        const img = await getNodeImageElement(single);
        saveHistory();
        updateNode(single.id, { width: single.originalWidth || img.naturalWidth || img.width, height: single.originalHeight || img.naturalHeight || img.height });
      };
      const download = async (mime, ext) => { if (single) await downloadNodeImage(single, mime, ext); };

      return (
        <div className="wb-context-menu fixed z-[10000] min-w-[176px] py-1 rounded-lg border shadow-2xl" style={{ left: menu.x, top: menu.y, background: '#2a2a2d', borderColor: '#3e3e3e' }} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
          {single?.type === 'image' && <>
            <ContextMenuItem icon={Copy} label="复制图片到剪贴板" busy={busy} onClick={() => run(copyImage)} />
            <ContextMenuItem icon={RotateCcw} label="重置缩放" busy={busy} onClick={() => run(resetImageScale)} />
            <div className="h-px my-1" style={{ background: '#3e3e3e' }} />
            <ContextMenuItem icon={Download} label="下载 WebP" busy={busy} onClick={() => run(() => download('image/webp', 'webp'))} />
            <ContextMenuItem icon={Download} label="下载 PNG" busy={busy} onClick={() => run(() => download('image/png', 'png'))} />
            <ContextMenuItem icon={Download} label="下载 JPEG" busy={busy} onClick={() => run(() => download('image/jpeg', 'jpg'))} />
            <div className="h-px my-1" style={{ background: '#3e3e3e' }} />
          </>}
          {menu.nodeIds.length > 1 && <>
            <ContextMenuItem icon={LayoutGrid} label="自动排版" busy={busy} onClick={() => run(() => applyLayout(computeAutoLayout(selectedNodes, window.innerWidth / vp.zoom, window.innerHeight / vp.zoom)))} />
            <ContextMenuItem icon={AlignLeft} label="左对齐（不重叠）" busy={busy} onClick={() => run(() => applyLayout(computeAlignment(selectedNodes, 'left')))} />
            <ContextMenuItem icon={AlignRight} label="右对齐（不重叠）" busy={busy} onClick={() => run(() => applyLayout(computeAlignment(selectedNodes, 'right')))} />
            <div className="h-px my-1" style={{ background: '#3e3e3e' }} />
          </>}
          <ContextMenuItem icon={Copy} label="复制选中节点" busy={busy} onClick={() => run(copySelectedNodes)} />
          <ContextMenuItem icon={Trash2} label="删除" danger busy={busy} onClick={() => run(() => deleteNodes(menu.nodeIds))} />
        </div>
      );
    }

    function BoardListPage() {
      const boards = useStore(s => s.boards);
      const setCurrentBoardId = useStore(s => s.setCurrentBoardId);
      const createBoard = useStore(s => s.createBoard);
      const deleteBoard = useStore(s => s.deleteBoard);
      const deleteDialogTarget = useStore(s => s.deleteDialogTarget);
      const setDeleteDialogTarget = useStore(s => s.setDeleteDialogTarget);
      const clearDeleteDialogTarget = useStore(s => s.clearDeleteDialogTarget);
      const [newName, setNewName] = React.useState('');
      const keys = Object.keys(boards);

      return (
        <div className="w-screen h-screen flex flex-col items-center justify-start pt-16 px-6" style={{ background: '#1e1e1e' }}>
          <div className="w-full max-w-3xl">
            <h1 className="text-2xl font-semibold mb-1" style={{ color: '#e0e0e0' }}>白板笔记</h1>
            <p className="text-xs mb-6" style={{ color: '#858585' }}>选择一个画布开始，或创建新画布</p>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const n = newName.trim() || `画布_${keys.length + 1}`; createBoard(n); setNewName(''); } }} placeholder="新画布名称..." className="flex-1 px-3 py-2 text-sm rounded-md outline-none border" style={{ background: '#3c3c3c', borderColor: '#3e3e3e', color: '#cccccc' }} />
              <button onClick={() => { const n = newName.trim() || `画布_${keys.length + 1}`; createBoard(n); setNewName(''); }} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ background: '#007acc', color: '#fff', border: 'none' }}><Plus size={15} /> 新建</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {keys.map(key => {
                const board = boards[key];
                return (
                  <div key={key} onClick={() => setCurrentBoardId(key)} className="rounded-lg p-4 cursor-pointer transition-all border group relative" style={{ background: '#252526', borderColor: '#3e3e3e' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#007acc'; e.currentTarget.style.background = '#2a2d2e'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#3e3e3e'; e.currentTarget.style.background = '#252526'; }}>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate" style={{ color: '#e0e0e0' }}>{board?.name || key}</h3>
                      <p className="text-xs mt-1" style={{ color: '#858585' }}>{board?.nodes?.length || 0} 元素 · {board?.pins?.length || 0} 图钉</p>
                    </div>
                    {keys.length > 1 && <button onClick={e => { e.stopPropagation(); setDeleteDialogTarget(key); }} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ color: '#858585' }} title="删除"><Trash2 size={13} /></button>}
                  </div>
                );
              })}
            </div>
          </div>
          <Dialog.Root open={!!deleteDialogTarget} onOpenChange={open => { if (!open) clearDeleteDialogTarget(); }}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[10000]" style={{ background: 'rgba(0,0,0,0.5)' }} />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] rounded-lg p-5 shadow-2xl border" style={{ background: '#252526', borderColor: '#3e3e3e', minWidth: 320 }}>
                <Dialog.Title className="text-sm font-semibold mb-2" style={{ color: '#e0e0e0' }}>确认删除</Dialog.Title>
                <VisuallyHidden.Root asChild><Dialog.Description>确定要删除画布吗？此操作不可撤销。</Dialog.Description></VisuallyHidden.Root>
                <p className="text-xs mb-5" style={{ color: '#858585' }}>确定要删除画布 "{deleteDialogTarget ? (boards[deleteDialogTarget]?.name || deleteDialogTarget) : ''}" 吗？此操作不可撤销。</p>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild><button className="px-3 py-1.5 rounded text-xs cursor-pointer" style={{ background: '#3c3c3c', color: '#cccccc', border: '1px solid #3e3e3e' }}>取消</button></Dialog.Close>
                  <button onClick={() => { if (deleteDialogTarget) deleteBoard(deleteDialogTarget); clearDeleteDialogTarget(); }} className="px-3 py-1.5 rounded text-xs cursor-pointer" style={{ background: '#e06c75', color: '#fff', border: 'none' }}>确认删除</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      );
    }

    function Toolbar() {
      const tool = useStore(s => s.tool);
      const setTool = useStore(s => s.setTool);
      const selectedNodeIds = useStore(s => s.selectedNodeIds);
      const deleteNodes = useStore(s => s.deleteNodes);
      const undo = useStore(s => s.undo);
      const redo = useStore(s => s.redo);
      const exportBoard = useStore(s => s.exportBoard);
      const importBoard = useStore(s => s.importBoard);
      const setShowMinimap = useStore(s => s.setShowMinimap);
      const showMinimap = useStore(s => s.showMinimap);
      const pinPanelOpen = useStore(s => s.pinPanelOpen);
      const setPinPanelOpen = useStore(s => s.setPinPanelOpen);
      const boards = useStore(s => s.boards);
      const currentBoardId = useStore(s => s.currentBoardId);
      const board = boards[currentBoardId];
      const canUndo = board?.history?.past?.length > 0;
      const canRedo = board?.history?.future?.length > 0;
      const pins = board?.pins || [];
      const goToPin = useStore(s => s.goToPin);
      const deletePin = useStore(s => s.deletePin);

      const toolItems = [
        { value: 'select', icon: MousePointer2, label: '选择 (V)' },
        { value: 'rectangle', icon: Square, label: '分组框 (R)' },
        { value: 'line', icon: LineIcon, label: '直线 (L)' },
        { value: 'arrow', icon: ArrowRight, label: '箭头 (A)' },
        { value: 'pin', icon: MapPin, label: '图钉 (P)' },
      ];

      const handleImport = () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
        inp.onchange = e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => { importBoard(ev.target.result); }; r.readAsText(file); };
        inp.click();
      };

      return (
        <Tooltip.Provider delayDuration={400}>
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 px-2 py-1 rounded-lg shadow-2xl border" style={{ background: '#252526', borderColor: '#3e3e3e' }}>
            <ToggleGroup.Root type="single" value={tool} onValueChange={v => setTool(v || 'select')} className="flex items-center gap-0.5">
              {toolItems.map(t => (
                <Tooltip.Root key={t.value}><Tooltip.Trigger asChild><ToggleGroup.Item value={t.value} className="toggle-group-item p-1.5 rounded transition-all flex items-center justify-center border-none"><t.icon size={15} /></ToggleGroup.Item></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="px-2 py-1 text-xs rounded shadow border" style={{ background: '#333', color: '#ddd', borderColor: '#555' }} sideOffset={6}>{t.label}<Tooltip.Arrow style={{ fill: '#333' }} /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>
              ))}
            </ToggleGroup.Root>
            <div className="text-xs select-none" style={{ color: '#858585', minWidth: 84 }}>{toolItems.find(t => t.value === tool)?.label}</div>
            <div className="w-px h-4 mx-1" style={{ background: '#3e3e3e' }} />
            <ToolbarButton onClick={undo} disabled={!canUndo} title="撤销 Ctrl+Z"><Undo2 size={15} /></ToolbarButton>
            <ToolbarButton onClick={redo} disabled={!canRedo} title="重做 Ctrl+Shift+Z"><Redo2 size={15} /></ToolbarButton>
            {selectedNodeIds.length > 0 && <><div className="w-px h-4 mx-1" style={{ background: '#3e3e3e' }} /><ToolbarButton onClick={() => deleteNodes(selectedNodeIds)} title="删除 Delete" active activeColor="#e06c75"><Trash2 size={15} /></ToolbarButton></>}
            <div className="w-px h-4 mx-1" style={{ background: '#3e3e3e' }} />
            <ToolbarButton onClick={exportBoard} title="导出 JSON"><Download size={15} /></ToolbarButton>
            <ToolbarButton onClick={handleImport} title="导入 JSON"><Upload size={15} /></ToolbarButton>
            <div className="w-px h-4 mx-1" style={{ background: '#3e3e3e' }} />
            <ToolbarButton onClick={() => setShowMinimap(!showMinimap)} title="小地图" active={showMinimap}><MapIcon size={15} /></ToolbarButton>
            <Popover.Root open={pinPanelOpen} onOpenChange={setPinPanelOpen}>
              <Popover.Trigger asChild>
                <button className="p-1.5 rounded transition-all flex items-center justify-center" style={{ color: pinPanelOpen ? '#d4a72c' : '#858585', background: 'transparent' }} onMouseEnter={e => { if (!pinPanelOpen) e.currentTarget.style.background = '#3c3c3c'; }} onMouseLeave={e => { if (!pinPanelOpen) e.currentTarget.style.background = 'transparent'; }}><Pin size={15} /></button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="rounded-lg border shadow-2xl z-[9998]" style={{ background: '#252526', borderColor: '#3e3e3e', width: 220 }} sideOffset={8} align="end">
                  <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#3e3e3e' }}><span className="text-xs font-semibold" style={{ color: '#cccccc' }}>📌 图钉 ({pins.length})</span><Popover.Close asChild><button className="p-0.5 rounded cursor-pointer" style={{ color: '#858585' }}><X size={13} /></button></Popover.Close></div>
                  <ScrollArea.Root className="max-h-56 overflow-hidden">
                    <ScrollArea.Viewport className="max-h-56 w-full">
                      {pins.length === 0 ? <p className="text-xs px-3 py-4 text-center" style={{ color: '#858585' }}>使用图钉工具点击画布放置</p> :
                        pins.map(pin => <div key={pin.id} onClick={() => goToPin(pin.id)} className="flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors group" style={{ color: '#cccccc' }} onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><span className="truncate flex-1">{pin.label || '图钉'}</span><span className="text-xs mr-1" style={{ color: '#555' }}>({Math.round(pin.x)},{Math.round(pin.y)})</span><button onClick={e => { e.stopPropagation(); deletePin(pin.id); }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ color: '#e06c75' }}><Trash2 size={11} /></button></div>)
                      }
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-transparent"><ScrollArea.Thumb className="rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} /></ScrollArea.Scrollbar>
                  </ScrollArea.Root>
                  <Popover.Arrow style={{ fill: '#252526' }} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </Tooltip.Provider>
      );
    }

    function Minimap() {
      const show = useStore(s => s.showMinimap);
      const boards = useStore(s => s.boards);
      const currentBoardId = useStore(s => s.currentBoardId);
      const setViewport = useStore(s => s.setViewport);
      const board = boards[currentBoardId];
      const nodes = board?.nodes || [], pins = board?.pins || [], vp = board?.viewport || { x: 0, y: 0, zoom: 1 };
      if (!show) return null;
      const mmW = 180, mmH = 120;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => { const nx = n.x, ny = n.y, nw = n.width || 60, nh = n.height || 30; minX = Math.min(minX, nx); minY = Math.min(minY, ny); maxX = Math.max(maxX, nx + nw); maxY = Math.max(maxY, ny + nh); if (n.type === 'line' || n.type === 'arrow') { const ex = n.x2 !== undefined ? n.x2 : nx + nw, ey = n.y2 !== undefined ? n.y2 : ny + nh; minX = Math.min(minX, ex); minY = Math.min(minY, ey); maxX = Math.max(maxX, ex); maxY = Math.max(maxY, ey); } });
      pins.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
      if (!isFinite(minX)) { minX = -400; minY = -400; maxX = 400; maxY = 400; }
      const padX = (maxX - minX) * 0.4 + 80, padY = (maxY - minY) * 0.4 + 80;
      const scale = Math.min(mmW / (maxX - minX + padX * 2), mmH / (maxY - minY + padY * 2));
      const offX = (mmW - (maxX - minX + padX * 2) * scale) / 2, offY = (mmH - (maxY - minY + padY * 2) * scale) / 2;
      const toMM = (wx, wy) => ({ mx: offX + (wx - minX + padX) * scale, my: offY + (wy - minY + padY) * scale });
      const sw = window.innerWidth, sh = window.innerHeight;
      const vpL = -vp.x / vp.zoom, vpT = -vp.y / vp.zoom;
      const vpTL = toMM(vpL, vpT), vpBR = toMM(vpL + sw / vp.zoom, vpT + sh / vp.zoom);
      return <div className="fixed bottom-3 right-3 z-40 rounded-lg border shadow-lg overflow-hidden cursor-pointer" style={{ background: '#252526', borderColor: '#3e3e3e', width: mmW + 10, height: mmH + 28 }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const cx = e.clientX - r.left - 5, cy = e.clientY - r.top - 18; const wx = minX - padX + (cx - offX) / scale, wy = minY - padY + (cy - offY) / scale; setViewport({ x: sw / 2 - wx * vp.zoom, y: sh / 2 - wy * vp.zoom }); }}>
        <div className="text-xs text-center pt-1 font-medium" style={{ color: '#858585' }}>小地图</div>
        <div className="relative mx-1 mt-0.5 rounded" style={{ width: mmW, height: mmH, background: '#1a1a1a' }}>
          {nodes.map(n => { const tl = toMM(n.x, n.y), br = toMM(n.x + (n.width || 60), n.y + (n.height || 30)); let c = 'rgba(148,163,184,0.5)'; if (n.type === 'image') c = 'rgba(96,165,250,0.6)'; if (n.type === 'iframe') c = 'rgba(167,139,250,0.6)'; if (n.type === 'text') c = 'rgba(251,191,36,0.55)'; if (n.type === 'rectangle') c = 'rgba(255,255,255,0.2)'; if (n.type === 'line' || n.type === 'arrow') c = 'rgba(244,114,182,0.5)'; return <div key={n.id} className="minimap-dot" style={{ left: tl.mx, top: tl.my, width: Math.max(br.mx - tl.mx, 2), height: Math.max(br.my - tl.my, 2), backgroundColor: c }} />; })}
          {pins.map(p => { const pm = toMM(p.x, p.y); return <div key={p.id} className="minimap-pin" style={{ left: pm.mx, top: pm.my }} />; })}
          <div className="absolute border rounded-sm pointer-events-none" style={{ left: Math.max(0, vpTL.mx), top: Math.max(0, vpTL.my), width: Math.min(vpBR.mx - vpTL.mx, mmW), height: Math.min(vpBR.my - vpTL.my, mmH), borderColor: '#007acc' }} />
        </div>
      </div>;
    }
