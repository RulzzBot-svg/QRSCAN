import { openDB } from "idb";

const DB_NAME = "afc-tech";
const DB_VERSION =1;


export const dbPromise = openDB(DB_NAME, DB_VERSION,{
    upgrade(db){
        if(!db.objectStoreNames.contains("jobQueue")){
            const store = db.createObjectStore("jobQueue",{keyPath:"local_id"});
            store.createIndex("created_at", "created_at");
            store.createIndex("synced","synced");
        }
        if(!db.objectStoreNames.contains("ahuCache")){
            db.createObjectStore("ahuCahce",{keyPath:"ahu_id"});
        }
    },

});