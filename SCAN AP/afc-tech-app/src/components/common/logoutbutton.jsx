import { useNavigate } from "react-router-dom";


export default function LogoutButton(){
    const navigate = useNavigate();


    const handleLogOut = () =>{
        localStorage.removeItem("tech");
        navigate("/");
    }

    return(
        <button className="btn btn-error text-white" onClick={handleLogOut}>🚪Logout </button>
    )
}