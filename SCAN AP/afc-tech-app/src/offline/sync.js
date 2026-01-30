import { API } from "../api/api";
import {getUnsyncedJobs, markJobSynced, markJobFailed} from "./jobQueue";


export async function syncQueuedJobs({max=10} = {}){
    const jobs = await getUnsyncedJobs();
    if(!jobs?.length) return {ok:true, synced:0, failed:0};

    let synced= 0;
    let failed =0;

    const batch = jobs.slice(0, max);

    for (const j of batch){
        const localId = j.local_id;
        try{
            const payload = j.payload ?? j;
            await API.post("/jobs", payload);
            await markJobSynced(localId);
            synced+=1
        }catch(err){
            const msg= err?.response?.data?.console.error || err?.message || "Uknown syncing error.";
            await markJobFailed(localId, msg);
            failed+=1;
        }
    }
    return {ok: failed ===0, synced, failed};
}