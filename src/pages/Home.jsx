import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase/config";
import Swal from "sweetalert2";
import logo from "../assets/Logo.png";

export default function Home() {
  const navigate = useNavigate();

  const [campanas] = useState([
    { id: "2025-2026", nombre: "Campaña 2025-2026" },
    { id: "2026-2027", nombre: "Campaña 2026-2027" },
  ]);
  const [campanaActiva, setCampanaActiva] = useState("2025-2026");

  const [precioBono, setPrecioBono] = useState(120000);
  const [stats, setStats] = useState({ vendidos: 0, recaudado: 0 });
  const [cargando, setCargando] = useState(true);

  const handleEditarPrecio = async () => {
    const { value: nuevoPrecio } = await Swal.fire({
      title: "Modificar Precio de Cuota",
      input: "number",
      inputLabel: "Valor de la cuota por UN solo número ($)",
      inputValue: precioBono,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (nuevoPrecio && Number(nuevoPrecio) > 0) {
      const precioNum = Number(nuevoPrecio);
      const campanaRef = doc(db, "campanas", campanaActiva);
      await setDoc(campanaRef, { precioBono: precioNum }, { merge: true });
      setPrecioBono(precioNum);
      Swal.fire("¡Actualizado!", "El precio ha sido guardado exitosamente.", "success");
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCargando(true);
        try {
          const campanaRef = doc(db, "campanas", campanaActiva);
          const campanaSnap = await getDoc(campanaRef);
          
          let precioCuotaRef = 120000;
          if (campanaSnap.exists() && campanaSnap.data().precioBono) {
            precioCuotaRef = Number(campanaSnap.data().precioBono);
            setPrecioBono(precioCuotaRef);
          } else {
            setPrecioBono(precioCuotaRef);
          }

          const q = query(collection(db, "socios"), where("campana", "==", campanaActiva));
          const querySnapshot = await getDocs(q);

          let totalVendidos = 0;
          let totalRecaudado = 0;

          querySnapshot.forEach((documento) => {
            const socio = documento.data();
            
            // Calculamos cuántos números tiene este cliente en base a las comas
            const cantidadNumeros = socio.nrosRifa 
              ? socio.nrosRifa.split(',').filter(n => n.trim() !== '').length 
              : 1;
              
            // Sumamos los números reales, no solo 1 por cliente
            if (socio.activo !== false) {
              totalVendidos += cantidadNumeros;
            }

            if (socio.pagos && typeof socio.pagos === "object") {
              Object.values(socio.pagos).forEach((pago) => {
                if (pago === true) {
                  totalRecaudado += (precioCuotaRef * cantidadNumeros);
                } else if (pago && pago.pagado === true) {
                  // Si pagó menos, suma solo lo que pagó
                  totalRecaudado += (Number(pago.montoAbonado) || (precioCuotaRef * cantidadNumeros));
                }
              });
            }
          });

          setStats({ vendidos: totalVendidos, recaudado: totalRecaudado });
        } catch (error) {
          console.error("Error obteniendo datos:", error);
        } finally {
          setCargando(false);
        }
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [campanaActiva, navigate]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-gray-900 text-white flex flex-col items-center py-8 shadow-xl">
        <img src={logo} alt="Logo Bomberos" className="w-28 h-28 object-contain mb-4" />
        <h2 className="text-2xl font-bold text-center">BVI</h2>
        <p className="text-xs text-gray-400 text-center mb-8 px-4 uppercase tracking-wider">Sistema de Conteo</p>
        <nav className="flex flex-col w-full px-4 space-y-3">
          <button className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold text-left shadow-md">🏠 Tablero Inicio</button>
          <button onClick={() => navigate("/cargar-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">👥 Cargar Clientes</button>
          <button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>
        </nav>
        <div className="mt-auto w-full px-4">
          <button onClick={() => navigate("/")} className="w-full text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2"><span>🚪</span> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 border-b border-gray-300 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Inicio</h1>
            <p className="text-gray-500 mt-1">Resumen general de la campaña en tiempo real</p>
          </div>
          <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <label className="text-gray-700 font-bold text-sm uppercase">Campaña:</label>
            <select className="bg-transparent text-gray-800 font-semibold focus:outline-none cursor-pointer" value={campanaActiva} onChange={(e) => setCampanaActiva(e.target.value)}>
              {campanas.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
            </select>
          </div>
        </header>

        {cargando ? (
          <div className="text-center text-gray-500 font-bold mt-20 animate-pulse">Sincronizando con la base de datos... ⏳</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-blue-500 relative">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">Cuota Base (1 Número)</h3>
              <p className="text-4xl font-black text-gray-800">${precioBono.toLocaleString("es-AR")}</p>
              <button onClick={handleEditarPrecio} className="absolute top-4 right-4 text-blue-500 hover:text-blue-700 font-bold text-sm bg-blue-50 px-2 py-1 rounded">✏️ Editar</button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-yellow-500">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">Números Vendidos</h3>
              <p className="text-4xl font-black text-gray-800">{stats.vendidos}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-green-500">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">Total Recaudado Real</h3>
              <p className="text-4xl font-black text-green-600">${stats.recaudado.toLocaleString("es-AR")}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}