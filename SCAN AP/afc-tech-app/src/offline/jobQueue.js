import { dbPromise } from "./db";

export async function queueJob(jobPayload) {
    const db = await dbPromise;

    const localJob = {
        local_id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        synced:false,
        attempts:0,
        last_error:null,
        payload:jobPayload,
    };

    await db.put("jobQueue", localJob);
    return localJob;
}

export async function getQueuedJobs(){
    const db = await dbPromise;
    return await db.getAll("jobQueue");
}

export async function getUnsyncedJobs(){
    const db= await dbPromise;
    const all = await db.getAll("jobQueue");
    return all.filter((j)=>!j.synced);

}

export async function markJobSynced(local_id){
    const db = await dbPromise;
    const job = await db.get("jobQueue", local_id);

    if(!job) return;
    job.synced = true;
    job.last_error = null;
    await db.put("jobQueue", job);
}

export async function markJobFailed(local_id, errorMessage){
    const db = await dbPromise
    const job = await db.get("jobQueue", local_id);
    if(!job) return;
    job.attempts = (job.attempts || 0)+1;
    job.last_error = errorMessage?.slice(0,500) || "Unknown Error";
    await db.put("jobQueue", job);
}


export async function deleteJob(local_id){
    const db = await dbPromise;
    await db.delete("jobQueue",local_id);
}