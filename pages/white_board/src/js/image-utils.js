// ========== 图片节点工具 ==========
    function loadImageElement(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    async function getNodeImageElement(node) {
      const blob = await getNodeImageBlob(node);
      if (!blob) throw new Error('图片数据不存在');
      const url = URL.createObjectURL(blob);
      try {
        return await loadImageElement(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function getNodeImageBlob(node) {
      if (node.src) {
        const res = await fetch(node.src);
        if (res.ok) return res.blob();
      }
      if (node.imageId) {
        const blob = await getImageFromDB(node.imageId);
        if (blob) return blob;
      }
      return null;
    }

    async function imageNodeToBlob(node, mime = 'image/webp', quality = 0.92) {
      const blob = await getNodeImageBlob(node);
      if (!blob) throw new Error('图片数据不存在');
      const url = URL.createObjectURL(blob);
      try {
        const img = await loadImageElement(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('图片转换失败')), mime, quality));
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function copyImageToClipboard(node) {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('当前浏览器不支持写入图片剪贴板');
      const png = await imageNodeToBlob(node, 'image/png');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    }

    async function downloadNodeImage(node, mime, ext, quality = 0.92) {
      const blob = await imageNodeToBlob(node, mime, quality);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `whiteboard_image_${node.id}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }


    async function createImageNodeFromBlob(blob, { base = {}, imageId, centerX, centerY } = {}) {
      const originalUrl = URL.createObjectURL(blob);
      let committed = false;
      try {
        const img = await loadImageElement(originalUrl);
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        const cb = await compressImageToWebP(blob);
        const finalImageId = imageId || genId();
        await saveImageToDB(finalImageId, cb);
        const node = {
          ...base,
          id: base.id || genId(),
          type: 'image',
          x: centerX !== undefined ? centerX - originalWidth / 2 : base.x ?? 0,
          y: centerY !== undefined ? centerY - originalHeight / 2 : base.y ?? 0,
          width: base.width ?? originalWidth,
          height: base.height ?? originalHeight,
          originalWidth: base.originalWidth || originalWidth,
          originalHeight: base.originalHeight || originalHeight,
          src: originalUrl,
          imageId: finalImageId,
        };
        committed = true;
        return node;
      } finally {
        if (!committed) URL.revokeObjectURL(originalUrl);
      }
    }

    async function addImageNodeFromBlob(blob, wx, wy) {
      const node = await createImageNodeFromBlob(blob, { centerX: wx, centerY: wy });
      useStore.getState().addNode(node);
    }
