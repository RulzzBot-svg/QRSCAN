import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogOut = () => {
    localStorage.removeItem("tech");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("offline_tech");
    navigate("/");
  };

  return (
    <button className="btn btn-error text-white" onClick={handleLogOut}>
      🚪Logout
    </button>
  );
}
