import { useNavigate } from "react-router-dom";
import {Scanner} from '@yudiel/react-qr-scanner';


export default function QRScanner(){

    const navigate = useNavigate();

    const handleScan = (data)=>{
        if(data){console.log("QR Detected: ", data);
            const clean = data.text || data;

            const ahuId = clean.split("/").pop();

            navigate(`/FilterInfo/${ahuId}`);


        }
    };

    const handleError = (error) =>{
        console.error("QR Scan Error: ", error);
    };


    return (
        <>
        <div data-theme="corporate" className="p-4 min-h-screen bg-base-200">

            <button className="btn btn-ghost mb-4" onClick={()=>navigate(-1)}>
                ⬅ Back
            </button> 

            <h1 className="text-2xl font-bold mb-4 text-primary">
                Scan AHU QR Code
            </h1>

            <div className="rounded-xl overflow-hidden shadow border border-base-300">
                <Scanner
                onResult ={(result,error)=>{
                    if(!!result){
                        handleScan(result);
                    }
                    if(!!error){
                        //silent
                    }
                }
            }
            constraints={{facingMode: "environment"}}//this allows back camera
            className="w-full h-auto"
                />
            </div>
            <p className="text-center text-sm text-base-content/70 mt-2">
            Position the QR Code inside the frame 
            </p>


        </div>
        </>
    )




}

