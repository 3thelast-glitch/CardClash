// Stores large base64 images in IndexedDB (unlimited size)
// AsyncStorage only stores a small reference key

const DB_NAME = 'card_images_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(key: string, base64: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(base64, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadImage(key: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** تصدير كل الصور دفعة واحدة — مستخدم في نظام الباكأب */
export async function exportAllImages(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result: Record<string, string> = {};
    const keysReq = store.getAllKeys();
    keysReq.onsuccess = () => {
      const keys = keysReq.result as string[];
      if (keys.length === 0) { resolve(result); return; }
      let done = 0;
      keys.forEach(key => {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          if (getReq.result) result[key] = getReq.result;
          if (++done === keys.length) resolve(result);
        };
        getReq.onerror = () => { if (++done === keys.length) resolve(result); };
      });
    };
    keysReq.onerror = () => reject(keysReq.error);
  });
}
