// ========== IndexedDB 图片存储 ==========
    const IMAGE_DB_NAME = 'WhiteboardImages', IMAGE_STORE_NAME = 'images';
    let dbPromise = null;
    function openImageDB() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(IMAGE_DB_NAME, 1);
        req.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' }); };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
      return dbPromise;
    }
    async function saveImageToDB(id, blob) { const db = await openImageDB(); return new Promise((res, rej) => { const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite'); const store = tx.objectStore(IMAGE_STORE_NAME); store.put({ id, blob }); tx.oncomplete = res; tx.onerror = rej; }); }
    async function getImageFromDB(id) { const db = await openImageDB(); return new Promise((res, rej) => { const tx = db.transaction(IMAGE_STORE_NAME, 'readonly'); const req = tx.objectStore(IMAGE_STORE_NAME).get(id); req.onsuccess = () => res(req.result?.blob ?? null); req.onerror = rej; }); }
    async function deleteImageFromDB(id) { const db = await openImageDB(); return new Promise((res, rej) => { const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite'); tx.objectStore(IMAGE_STORE_NAME).delete(id); tx.oncomplete = res; tx.onerror = rej; }); }
    function compressImageToWebP(blob) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > 800) { h = (h / w) * 800; w = 800; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((b) => b ? res(b) : rej(new Error('压缩失败')), 'image/webp', 0.5);
        };
        img.onerror = rej;
        img.src = URL.createObjectURL(blob);
      });
    }
    async function blobToBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
    function base64ToBlob(base64, mime = 'image/webp') { const bs = atob(base64.split(',')[1]); const ab = new ArrayBuffer(bs.length); const ia = new Uint8Array(ab); for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i); return new Blob([ab], { type: mime }); }
