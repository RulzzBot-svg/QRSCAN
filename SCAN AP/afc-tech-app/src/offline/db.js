import { openDB } from "idb";

const DB_NAME = "afc-tech";
const DB_VERSION = 3; // <-- bump

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (!db.objectStoreNames.contains("jobQueue")) {
      const store = db.createObjectStore("jobQueue", { keyPath: "local_id" });
      store.createIndex("created_at", "created_at");
      store.createIndex("synced", "synced");
    }

    if (!db.objectStoreNames.contains("ahuCache")) {
      db.createObjectStore("ahuCache", { keyPath: "ahu_id" });
    }

    // NEW: track downloaded hospitals
    if (!db.objectStoreNames.contains("offlineHospitals")) {
      const store = db.createObjectStore("offlineHospitals", { keyPath: "hospital_id" });
      store.createIndex("downloaded_at", "downloaded_at");
    }

    // NEW: index of which AHUs belong to a downloaded hospital (for deletion)
    if (!db.objectStoreNames.contains("hospitalAhuIndex")) {
      db.createObjectStore("hospitalAhuIndex", { keyPath: "hospital_id" });
    }
  },
});
