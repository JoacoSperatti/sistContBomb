import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { db } from '../firebase/config';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';

export default function Vendedores() {
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState([]);
  const [nuevoVendedor, setNuevoVendedor] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        fetchVendedores();
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchVendedores = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'vendedores'));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre }));
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setVendedores(lista);
    } catch (error) {
      console.error("Error obteniendo vendedores:", error);
    } finally {
      setCargando(false);
    }
  };

  const agregarVendedor = async (e) => {
    e.preventDefault();
    if (!nuevoVendedor.trim()) return;
    try {
      await addDoc(collection(db, 'vendedores'), { nombre: nuevoVendedor.trim() });
      Swal.fire('Agregado', 'Vendedor agregado correctamente', 'success');
      setNuevoVendedor('');
      fetchVendedores();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Hubo un problema al agregar', 'error');
    }
  };

  const eliminarVendedor = async (id, nombre) => {
    const confirm = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Vas a eliminar a ${nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'vendedores', id));
        Swal.fire('Eliminado!', 'El vendedor ha sido eliminado.', 'success');
        fetchVendedores();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Hubo un problema al eliminar', 'error');
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-gray-900 text-white flex flex-col items-center py-8 shadow-xl">
        <img src={logo} alt="Logo Bomberos" className="w-28 h-28 object-contain mb-4" />
        <h2 className="text-2xl font-bold text-center">BVI</h2>
        <p className="text-xs text-gray-400 text-center mb-8 px-4 uppercase tracking-wider">Sistema de Conteo</p>
        <nav className="flex flex-col w-full px-4 space-y-3">
          <button onClick={() => navigate("/home")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏠 Tablero Inicio</button>
          <button onClick={() => navigate("/cargar-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">👥 Cargar Clientes</button>
          <button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>
          <button className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold text-left shadow-md">🏷️ Vendedores</button>
        </nav>
        <div className="mt-auto w-full px-4">
          <button onClick={() => navigate("/")} className="w-full text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2"><span>🚪</span> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10 border-b border-gray-300 pb-5">
          <h1 className="text-3xl font-bold text-gray-800">Administrar Vendedores</h1>
          <p className="text-gray-500 mt-1">Agrega o elimina vendedores de la lista desplegable</p>
        </header>

        <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-lg border-t-8 border-red-600">
          <form onSubmit={agregarVendedor} className="mb-8 flex gap-4">
            <input 
              type="text" 
              value={nuevoVendedor}
              onChange={(e) => setNuevoVendedor(e.target.value)}
              placeholder="Nombre del nuevo vendedor..."
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
            <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition">Agregar</button>
          </form>

          {cargando ? (
            <p className="text-center text-gray-500 font-bold animate-pulse">Cargando vendedores...</p>
          ) : (
            <div className="space-y-3">
              {vendedores.length > 0 ? vendedores.map((vendedor) => (
                <div key={vendedor.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-700">{vendedor.nombre}</span>
                  <button onClick={() => eliminarVendedor(vendedor.id, vendedor.nombre)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition font-bold text-sm">🗑️ Eliminar</button>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4">No hay vendedores registrados.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
