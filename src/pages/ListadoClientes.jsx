import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Sumamos deleteDoc para poder borrar
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { db } from '../firebase/config';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function ListadoClientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [campanaFiltro, setCampanaFiltro] = useState('2025-2026');
  
  // ESTADO PARA EL BUSCADOR
  const [busqueda, setBusqueda] = useState('');

  // Estados para Pagos
  const [clienteEditando, setClienteEditando] = useState(null);
  const [pagosTemp, setPagosTemp] = useState({});
  const [guardandoPago, setGuardandoPago] = useState(false);

  // Estados para Editar Info Personal
  const [editandoInfo, setEditandoInfo] = useState(null);
  const [infoTemp, setInfoTemp] = useState({});

  const meses = ['Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'];

  const fetchClientes = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'socios'), where("campana", "==", campanaFiltro));
      const snapshot = await getDocs(q);
      
      const listaData = snapshot.docs.map(documento => {
        const data = documento.data();
        let cuotasPagas = 0;
        let pagosNormalizados = {};
        let numerosRifaSet = new Set();

        if (data.pagos) {
          Object.keys(data.pagos).forEach(mes => {
            const pagoInfo = data.pagos[mes];
            if (typeof pagoInfo === 'boolean') {
              pagosNormalizados[mes] = { pagado: pagoInfo, nroRifa: '', metodoPago: '' };
              if (pagoInfo) cuotasPagas++;
            } else if (pagoInfo && pagoInfo.pagado) {
              pagosNormalizados[mes] = pagoInfo;
              cuotasPagas++;
              if (pagoInfo.nroRifa) numerosRifaSet.add(pagoInfo.nroRifa);
            } else {
              pagosNormalizados[mes] = { pagado: false, nroRifa: '', metodoPago: '' };
            }
          });
        }
        const nrosAsignados = Array.from(numerosRifaSet).join(', ');
        return { id: documento.id, ...data, pagos: pagosNormalizados, cuotasPagas, nrosAsignados };
      });

      listaData.sort((a, b) => {
        const numA = a.nrosAsignados.split(',')[0] || 0;
        const numB = b.nrosAsignados.split(',')[0] || 0;
        return Number(numA) - Number(numB);
      });
      
      setClientes(listaData);
    } catch (error) {
      console.error("Error al buscar clientes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchClientes();
      else navigate('/');
    });
    return () => unsubscribe();
  }, [campanaFiltro, navigate]);

  // --- FUNCIONES DE BÚSQUEDA Y EXPORTACIÓN ---
  const clientesFiltrados = clientes.filter(c => 
    c.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.nrosAsignados && c.nrosAsignados.includes(busqueda)) ||
    (c.telefono && c.telefono.includes(busqueda))
  );

  const exportarExcel = () => {
    if (clientesFiltrados.length === 0) {
      Swal.fire('Tabla vacía', 'No hay clientes para exportar.', 'warning');
      return;
    }
    const datosFormateados = clientesFiltrados.map(c => ({
      "Nros. de Rifa": c.nrosAsignados || '-',
      "Nombre y Apellido": c.cliente,
      "Teléfono": c.telefono,
      "Vendedor": c.vendedor,
      "¿Es Abonado?": c.esAbonado ? 'Sí' : 'No',
      "Cuotas Pagas": `${c.cuotasPagas} de 12`
    }));
    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Clientes");
    XLSX.writeFile(libro, `Bomberos_Campaña_${campanaFiltro}.xlsx`);
  };

  // --- FUNCIONES DE BORRADO ---
  const eliminarCliente = async (id, nombre) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar a ${nombre}?`,
      text: "Se borrará todo su historial de pagos. Esto no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'socios', id));
        setClientes(clientes.filter(c => c.id !== id));
        Swal.fire('Eliminado', 'El cliente ha sido borrado.', 'success');
      } catch (error) {
        console.error("Error borrando:", error);
        Swal.fire('Error', 'No se pudo eliminar al cliente.', 'error');
      }
    }
  };

  // --- FUNCIONES DE EDICIÓN DE INFO PERSONAL ---
  const abrirEditorInfo = (cliente) => {
    setEditandoInfo(cliente);
    setInfoTemp({
      cliente: cliente.cliente,
      telefono: cliente.telefono || '',
      domicilio: cliente.domicilio || '',
      vendedor: cliente.vendedor || '',
      esAbonado: cliente.esAbonado || false
    });
  };

  const guardarCambiosInfo = async () => {
    try {
      const clienteRef = doc(db, 'socios', editandoInfo.id);
      await updateDoc(clienteRef, infoTemp);
      await fetchClientes(); // Recargamos para ver los cambios
      Swal.fire({ icon: 'success', title: 'Datos Actualizados', timer: 1500, showConfirmButton: false });
      setEditandoInfo(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
    }
  };

  // --- FUNCIONES DE EDICIÓN DE PAGOS ---
  const abrirEditorPagos = (cliente) => {
    setClienteEditando(cliente);
    setPagosTemp(cliente.pagos || meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false } }), {}));
  };

  const togglePago = async (mes) => {
    const pagoActual = pagosTemp[mes];
    if (pagoActual && pagoActual.pagado) {
      const { isConfirmed } = await Swal.fire({
        title: `¿Anular pago de ${mes}?`,
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, anular'
      });
      if (isConfirmed) setPagosTemp({ ...pagosTemp, [mes]: { pagado: false, nroRifa: '', metodoPago: '' } });
    } else {
      const { value: formValues } = await Swal.fire({
        title: `Registrar pago de ${mes}`,
        html: `
          <div class="text-left font-sans">
            <label class="block text-sm font-bold text-gray-700 mb-1 mt-4">Nro. de Rifa:</label>
            <input id="swal-nro" type="number" min="1" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none mb-4" placeholder="Ej: 085">
            <label class="block text-sm font-bold text-gray-700 mb-1">Método de Pago:</label>
            <select id="swal-metodo" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar Pago', confirmButtonColor: '#16a34a',
        preConfirm: () => ({ nroRifa: document.getElementById('swal-nro').value, metodoPago: document.getElementById('swal-metodo').value })
      });
      if (formValues) setPagosTemp({ ...pagosTemp, [mes]: { pagado: true, nroRifa: formValues.nroRifa, metodoPago: formValues.metodoPago } });
    }
  };

  const guardarCambiosPagos = async () => {
    setGuardandoPago(true);
    try {
      const clienteRef = doc(db, 'socios', clienteEditando.id);
      await updateDoc(clienteRef, { pagos: pagosTemp });
      await fetchClientes();
      Swal.fire({ icon: 'success', title: 'Pagos Actualizados', confirmButtonColor: '#16a34a', timer: 2000 });
      setClienteEditando(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
    } finally {
      setGuardandoPago(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans relative">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow">
            ← Volver al Tablero
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Lista de Clientes</h1>
        </div>
        
        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="🔍 Buscar nombre, nro o tel..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-full md:w-64"
          />
          <select value={campanaFiltro} onChange={(e) => setCampanaFiltro(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-white hidden sm:block">
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
          <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition flex items-center gap-2">
            <span>📊</span> <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-red-600 text-white uppercase text-xs tracking-wider">
                <th className="p-4 font-bold">Nros. de Rifa</th>
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold">Teléfono</th>
                <th className="p-4 font-bold">Vendedor</th>
                <th className="p-4 font-bold text-center">Abonado</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm divide-y divide-gray-200">
              {cargando ? (
                <tr><td colSpan="7" className="text-center p-8 font-bold text-gray-400">Cargando base de datos...</td></tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-8 font-bold text-gray-400">No se encontraron clientes.</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-900 bg-yellow-50">{cliente.nrosAsignados || '-'}</td>
                    <td className="p-4 font-bold">{cliente.cliente}</td>
                    <td className="p-4">{cliente.telefono || '-'}</td>
                    <td className="p-4"><span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs font-bold">{cliente.vendedor}</span></td>
                    <td className="p-4 text-center">
                      {cliente.esAbonado ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1">⭐ Sí</span> : <span className="text-gray-400 font-bold text-xs">-</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cliente.cuotasPagas === 12 ? 'bg-green-100 text-green-700' : cliente.cuotasPagas > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {cliente.cuotasPagas} / 12
                      </span>
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button onClick={() => abrirEditorPagos(cliente)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 px-2 rounded transition shadow-sm border border-blue-200" title="Editar Pagos">✏️</button>
                      <button onClick={() => abrirEditorInfo(cliente)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold py-1 px-2 rounded transition shadow-sm border border-gray-300" title="Editar Info Personal">⚙️</button>
                      <button onClick={() => eliminarCliente(cliente.id, cliente.cliente)} className="bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition shadow-sm border border-red-200" title="Eliminar Cliente">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PAGOS */}
      {clienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all">
            <div className="bg-gray-50 border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detalle de Cuotas</h2>
                <p className="text-gray-500 mt-1">Cliente: <span className="font-bold text-red-600">{clienteEditando.cliente}</span></p>
              </div>
              <button onClick={() => setClienteEditando(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">×</button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {meses.map((mes) => {
                  const estaPagado = pagosTemp[mes]?.pagado;
                  return (
                    <div key={mes} onClick={() => togglePago(mes)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 select-none ${estaPagado ? 'bg-green-50 border-green-500 shadow-inner' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <span className={`font-bold text-sm uppercase ${estaPagado ? 'text-green-800' : 'text-gray-500'}`}>{mes}</span>
                      {estaPagado ? (
                        <>
                          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-sm mb-1">✓</span>
                          {pagosTemp[mes].nroRifa && <span className="text-[11px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-md">#{pagosTemp[mes].nroRifa}</span>}
                          {pagosTemp[mes].metodoPago && <span className="text-[10px] text-gray-600 uppercase font-bold">{pagosTemp[mes].metodoPago}</span>}
                        </>
                      ) : <span className="w-6 h-6 border-2 border-gray-300 rounded-full bg-gray-50 mt-1"></span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-gray-50 border-t p-6 flex justify-end gap-4">
              <button onClick={() => setClienteEditando(null)} className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={guardarCambiosPagos} disabled={guardandoPago} className={`px-8 py-2 rounded-lg font-bold text-white shadow-lg transition ${guardandoPago ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFO PERSONAL */}
      {editandoInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="bg-gray-50 border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Editar Cliente</h2>
              <button onClick={() => setEditandoInfo(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre y Apellido</label>
                <input type="text" value={infoTemp.cliente} onChange={e => setInfoTemp({...infoTemp, cliente: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={infoTemp.telefono} onChange={e => setInfoTemp({...infoTemp, telefono: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label>
                <input type="text" value={infoTemp.domicilio} onChange={e => setInfoTemp({...infoTemp, domicilio: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vendedor</label>
                <select value={infoTemp.vendedor} onChange={e => setInfoTemp({...infoTemp, vendedor: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">Seleccione...</option>
                  <option value="Juan Pérez">Juan Pérez</option>
                  <option value="María Gómez">María Gómez</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded-lg border">
                <input type="checkbox" id="editAbonado" checked={infoTemp.esAbonado} onChange={e => setInfoTemp({...infoTemp, esAbonado: e.target.checked})} className="w-5 h-5 text-red-600" />
                <label htmlFor="editAbonado" className="font-bold text-gray-700 cursor-pointer">Es Abonado (Socio)</label>
              </div>
            </div>
            <div className="bg-gray-50 border-t p-6 flex justify-end gap-4">
              <button onClick={() => setEditandoInfo(null)} className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={guardarCambiosInfo} className="px-8 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition">Guardar Info</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}