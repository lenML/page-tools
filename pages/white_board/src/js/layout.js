function getNodeBounds(node) {
      if (node.type === 'line' || node.type === 'arrow') {
        const x1 = node.x, y1 = node.y, x2 = node.x2 ?? node.x + (node.width || 0), y2 = node.y2 ?? node.y + (node.height || 0);
        return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
      }
      return { x: node.x, y: node.y, width: node.width || 60, height: node.height || 30 };
    }

    function buildNodeMove(node, newX, newY) {
      const b = getNodeBounds(node);
      if (node.type === 'line' || node.type === 'arrow') {
        const dx = newX - b.x, dy = newY - b.y;
        return { x: node.x + dx, y: node.y + dy, x2: (node.x2 ?? node.x + (node.width || 0)) + dx, y2: (node.y2 ?? node.y + (node.height || 0)) + dy };
      }
      return { x: newX, y: newY };
    }

    function computeAutoLayout(nodes, regionW, regionH) {
      const gap = 16;
      const margin = Math.min(regionW, regionH) * 0.08;
      const targetW = Math.max(80, regionW - margin * 2), targetH = Math.max(80, regionH - margin * 2);
      const items = nodes.map(n => ({ node: n, bounds: getNodeBounds(n) })).sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
      if (!items.length) return new Map();
      let best = null;
      for (let cols = 1; cols <= items.length; cols++) {
        const rows = Math.ceil(items.length / cols);
        let layoutH = 0, layoutW = 0;
        for (let r = 0; r < rows; r++) {
          const row = items.slice(r * cols, r * cols + cols);
          const rowW = row.reduce((sum, i) => sum + i.bounds.width, 0) + (row.length - 1) * gap;
          layoutW = Math.max(layoutW, rowW);
          layoutH += Math.max(...row.map(i => i.bounds.height));
          if (r < rows - 1) layoutH += gap;
        }
        const w = Math.max(1, layoutW);
        const h = Math.max(1, layoutH);
        const fits = w <= targetW && h <= targetH;
        const diff = Math.abs(w / h - regionW / regionH);
        const area = w * h;
        const score = fits ? area + 1e9 : area;
        if (!best || score > best.score || (score === best.score && diff < best.diff)) best = { cols, w, h, score, diff };
      }
      const startX = Math.max(0, (regionW - best.w) / 2), startY = Math.max(0, (regionH - best.h) / 2);
      const updates = new Map();
      let y = startY;
      for (let r = 0; r < Math.ceil(items.length / best.cols); r++) {
        const row = items.slice(r * best.cols, r * best.cols + best.cols);
        const rowMaxH = Math.max(...row.map(i => i.bounds.height));
        let x = startX;
        for (const item of row) {
          updates.set(item.node.id, buildNodeMove(item.node, x, y));
          x += item.bounds.width + gap;
        }
        y += rowMaxH + gap;
      }
      return updates;
    }

    function computeAlignment(nodes, mode) {
      const items = nodes.map(n => ({ node: n, bounds: getNodeBounds(n) })).sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
      if (items.length < 2) return new Map();
      const refX = mode === 'left' ? Math.min(...items.map(i => i.bounds.x)) : Math.max(...items.map(i => i.bounds.x + i.bounds.width));
      const updates = new Map();
      let y = items[0].bounds.y;
      for (const item of items) {
        const x = mode === 'left' ? refX : refX - item.bounds.width;
        updates.set(item.node.id, buildNodeMove(item.node, x, y));
        y += item.bounds.height + 16;
      }
      return updates;
    }

    const genId = () => `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
    const getBoardIdFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('id') || null;
    const setBoardIdToHash = (id) => { window.location.hash = `id=${encodeURIComponent(id)}`; };
    const clearHash = () => { window.location.hash = ''; };
