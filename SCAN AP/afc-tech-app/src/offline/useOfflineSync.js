import { useEffect, useRef, useState } from "react";
import { syncQueuedJobs } from "./sync";


export function useOfflineSync(){
    const [status, setStatus] = useState({
        syncing:false,
        lastResult:null,
    })

    const isRunningRef = useRef(false);

    async function runSync(){
        if (isRunningRef.current) return;
        if (!navigator.onLine) return;

        isRunningRef.current = true;
        setStatus((s)=>({...s, syncing:true}));

        try{
            const res = await syncQueuedJobs({max:10});
            setStatus({syncing:false, lastResult:res});
        }finally{
            isRunningRef.current=false;
        }
    }

    useEffect(()=>{
        runSync();

        const online = () => runSync();
        const offline = () => {
            /* no-op for now, could update UI via shared state */
        };
        window.addEventListener("online", online);
        window.addEventListener("offline", offline);
        return () => {
            window.removeEventListener("online", online);
            window.removeEventListener("offline", offline);
        };
    }, []);
    return{...status, runSync};
}