// High-performance IndexedDB utility for storing large resume PDFs locally
export const localResumeStorage = {
  dbName: "RecruitCRMResumes_v2",
  storeName: "resumes",
  version: 1,

  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveResume(id: string | number, base64Data: string): Promise<void> {
    if (!base64Data) return;
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put(base64Data, String(id));
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB save failed, falling back to LocalStorage:", e);
      try {
        localStorage.setItem(`recruit_crm_resume_v2_${id}`, base64Data);
      } catch (err) {
        console.error("LocalStorage fallback failed:", err);
      }
    }
  },

  async getResume(id: string | number): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(String(id));
        req.onsuccess = () => {
          const result = req.result;
          if (result) {
            resolve(result);
          } else {
            resolve(localStorage.getItem(`recruit_crm_resume_v2_${id}`));
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB load failed, falling back to LocalStorage:", e);
      return localStorage.getItem(`recruit_crm_resume_v2_${id}`);
    }
  }
};
