import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/properties" className="text-lg font-semibold text-slate-800">
          Velocity Zone Manager
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {token ? (
            <>
              <Link to="/properties" className="text-slate-700 hover:text-slate-900">
                Properties
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="rounded bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-900"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-700 hover:text-slate-900">
                Login
              </Link>
              <Link to="/signup" className="text-slate-700 hover:text-slate-900">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
