import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; 
import { app } from "../firebase/config"; 
import logo from "../assets/Logo.png";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); 

    const auth = getAuth(app);
    const emailFalso = `${usuario.toLowerCase()}@bvi.com`;

    try {
      await signInWithEmailAndPassword(auth, emailFalso, password);
      navigate("/home");
    } catch (error) {
      console.error("Error de login:", error.code);
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96 flex flex-col items-center">
        <img
          src={logo}
          alt="Logo Bomberos Ituzaingó"
          className="w-36 h-36 mb-4 object-contain"
        />

        <h1 className="text-2xl font-bold text-center text-gray-900">BVI</h1>
        <h2 className="text-sm text-center text-gray-500 mb-6 uppercase tracking-wide">
          Sistema de Conteo de Rifas
        </h2>

        <form onSubmit={handleLogin} className="w-full">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Usuario:
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingresar usuario"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Contraseña:
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-200 shadow-md"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
