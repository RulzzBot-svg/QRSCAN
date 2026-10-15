import { useNavigate } from "react-router-dom";
import { clearTechSession } from "../../api/api";
import { clearClientSession } from "../../client/api";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogOut = () => {
    clearTechSession();
    clearClientSession();
    navigate("/");
  };

  return (
    <button className="btn btn-error text-white" onClick={handleLogOut}>
      🚪Logout
    </button>
  );
}
