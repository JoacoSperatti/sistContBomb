import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { db } from '../firebase/config';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function ListadoClientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [campanaFiltro, setCampanaFiltro] = useState('2025-2026');
  const [busqueda, setBusqueda] = useState('');
  
  const [precioCuotaLocal, setPrecioCuotaLocal] = useState(120000);

  const [clienteEditando, setClienteEditando] = useState(null);
  const [pagosTemp, setPagosTemp] = useState({});
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [editandoInfo, setEditandoInfo] = useState(null);
  const [infoTemp, setInfoTemp] = useState({});

  const meses = ['Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'];

  const fetchClientes = async () => {
    setCargando(true);
    try {
      const campanaRef = doc(db, 'campanas', campanaFiltro);
      const campSnap = await getDoc(campanaRef);
      const precioCuota = campSnap.exists() && campSnap.data().precioBono ? Number(campSnap.data().precioBono) : 120000;
      setPrecioCuotaLocal(precioCuota);

      const q = query(collection(db, 'socios'), where("campana", "==", campanaFiltro));
      const snapshot = await getDocs(q);

      const hoy = new Date();
      const anioActual = hoy.getFullYear();
      const mesActual = hoy.getMonth(); 
      const indexMesActual = mesActual >= 7 ? mesActual - 7 : mesActual + 5; 
      const [anioInicio, anioFin] = campanaFiltro.split('-');
      let maxMesesExigibles = 12; 
      
      if (anioActual === Number(anioInicio) && mesActual >= 7) {
        maxMesesExigibles = indexMesActual + 1;
      } else if (anioActual === Number(anioFin) && mesActual < 7) {
        maxMesesExigibles = indexMesActual + 1;
      } else if (anioActual < Number(anioInicio) || (anioActual === Number(anioInicio) && mesActual < 7)) {
        maxMesesExigibles = 0; 
      }
      
      const listaData = snapshot.docs.map(documento => {
        const data = documento.data();
        let cuotasPagas = 0;
        let pagosNormalizados = {};

        const nrosAsignados = data.nrosRifa || '';
        const cantidadNumeros = nrosAsignados.split(',').filter(n => n.trim() !== '').length || 1;
        const cuotaEsperada = precioCuota * cantidadNumeros;

        if (data.pagos) {
          Object.keys(data.pagos).forEach(mes => {
            const pagoInfo = data.pagos[mes];
            if (typeof pagoInfo === 'boolean') {
              pagosNormalizados[mes] = { pagado: pagoInfo, montoAbonado: pagoInfo ? cuotaEsperada : 0, montoEfectivo: pagoInfo ? cuotaEsperada : 0, montoTransferencia: 0, metodoPago: '', rendido: false };
              if (pagoInfo) cuotasPagas++;
            } else if (pagoInfo && pagoInfo.pagado) {
              let mEfectivo = Number(pagoInfo.montoEfectivo) || 0;
              let mTransf = Number(pagoInfo.montoTransferencia) || 0;
              const mAbonado = Number(pagoInfo.montoAbonado) || cuotaEsperada;
              if (mEfectivo === 0 && mTransf === 0 && mAbonado > 0) {
                if (pagoInfo.metodoPago === 'Transferencia') mTransf = mAbonado;
                else mEfectivo = mAbonado;
              }
              pagosNormalizados[mes] = { ...pagoInfo, montoAbonado: mAbonado, montoEfectivo: mEfectivo, montoTransferencia: mTransf, rendido: pagoInfo.rendido || false };
              cuotasPagas++;
            } else {
              pagosNormalizados[mes] = { pagado: false, montoAbonado: 0, montoEfectivo: 0, montoTransferencia: 0, metodoPago: '', rendido: false };
            }
          });
        }
        
        let tieneDeuda = false;
        let tieneTransferenciasPorRendir = false;
        let ultimoMesPagado = "Ninguno";

        for (let i = meses.length - 1; i >= 0; i--) {
          if (pagosNormalizados[meses[i]]?.pagado) {
            ultimoMesPagado = meses[i];
            break;
          }
        }

        if (data.activo !== false) {
          for (let i = 0; i < maxMesesExigibles; i++) {
            if (!pagosNormalizados[meses[i]]?.pagado) {
              tieneDeuda = true;
              break; 
            }
          }
          Object.values(pagosNormalizados).forEach(p => {
            if (p.pagado && p.montoAbonado < cuotaEsperada) tieneDeuda = true;
            if (p.pagado && !p.rendido && (p.metodoPago === 'Transferencia' || p.metodoPago === 'Híbrido' || p.montoTransferencia > 0)) {
              tieneTransferenciasPorRendir = true;
            }
          });
        }

        return { 
          id: documento.id, ...data, 
          pagos: pagosNormalizados, cuotasPagas, nrosAsignados, 
          tieneDeuda, tieneTransferenciasPorRendir, ultimoMesPagado, activo: data.activo !== false, cuotaEsperada
        };
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

  const clientesFiltrados = clientes.filter(c => 
    c.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.nrosAsignados && c.nrosAsignados.includes(busqueda)) ||
    (c.telefono && c.telefono.includes(busqueda))
  );

  const exportarExcel = () => {
    if (clientesFiltrados.length === 0) return Swal.fire('Tabla vacía', 'No hay clientes.', 'warning');

    let recaudacionTotalExcel = 0;
    let cantidadRifasActivas = 0;

    const datosFormateados = clientesFiltrados.map(c => {
      // Calculamos recaudación total por cliente exportado
      Object.values(c.pagos).forEach(p => {
        if (p.pagado) {
          recaudacionTotalExcel += (Number(p.montoAbonado) || 0);
        }
      });

      if (c.activo) {
        cantidadRifasActivas += c.nrosAsignados.split(',').filter(n => n.trim() !== '').length || 1;
      }

      return {
        "Nros. de Rifa": c.nrosAsignados || '-',
        "Nombre y Apellido": c.cliente,
        "Teléfono": c.telefono,
        "Vendedor": c.vendedor,
        "¿Es Abonado?": c.esAbonado ? 'Sí' : 'No',
        "Estado": c.activo ? 'Activo' : 'Baja',
        "Último Mes Pago": c.ultimoMesPagado,
        "Cuotas Pagas": `${c.cuotasPagas} de 12`,
        "Deuda": c.tieneDeuda ? 'CON DEUDA / PAGO PARCIAL' : 'AL DÍA',
        "Rendición Transf.": c.tieneTransferenciasPorRendir ? 'FALTA RENDIR' : 'OK'
      };
    });

    // Agregamos filas de resumen financiero al final del Excel
    datosFormateados.push({});
    datosFormateados.push({});
    datosFormateados.push({
      "Nros. de Rifa": "RESUMEN",
      "Nombre y Apellido": "TOTALES DE ESTE INFORME:",
      "Teléfono": "",
      "Vendedor": "",
      "¿Es Abonado?": "",
      "Estado": `Clientes Totales: ${clientesFiltrados.length}`,
      "Último Mes Pago": `Rifas Activas: ${cantidadRifasActivas}`,
      "Cuotas Pagas": "RECAUDACIÓN:",
      "Deuda": `$ ${recaudacionTotalExcel.toLocaleString('es-AR')}`,
      "Rendición Transf.": ""
    });

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);

    // Ajuste estético de anchos de columnas para Excel
    hoja['!cols'] = [
      { wch: 15 }, // Nros
      { wch: 35 }, // Nombre
      { wch: 15 }, // Telefono
      { wch: 25 }, // Vendedor
      { wch: 15 }, // Abonado
      { wch: 12 }, // Estado
      { wch: 18 }, // Ultimo Mes
      { wch: 15 }, // Cuotas Pagas
      { wch: 25 }, // Deuda
      { wch: 20 }, // Rendicion
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Clientes");
    XLSX.writeFile(libro, `Bomberos_Campaña_${campanaFiltro}.xlsx`);
  };

  const eliminarCliente = async (id, nombre) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar a ${nombre} DEFINITIVAMENTE?`,
      text: "Se borrará todo su historial y restará plata de la caja. Si solo querés pausarlo, usá el botón de Baja.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
    });
    if (isConfirmed) {
      await deleteDoc(doc(db, 'socios', id));
      setClientes(clientes.filter(c => c.id !== id));
      Swal.fire('Eliminado', 'Cliente borrado.', 'success');
    }
  };

  const toggleEstadoCliente = async (cliente) => {
    const nuevoEstado = !cliente.activo;
    
    const htmlWarning = nuevoEstado 
      ? `Pasará a <b>Activo</b>. Los pagos anteriores se conservan.` 
      : `<div class="text-left mt-2">
           <p class="mb-4">Pasará a <b>Baja</b>. Su historial de pagos se conservará en la recaudación.</p>
           <div class="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm">
             <p class="text-sm text-orange-800 font-bold mb-1 flex items-center gap-2">⚠️ Control de Cuponera Física:</p>
             <p class="text-xs text-orange-700">Según el sistema, el último mes abonado es <b>${cliente.ultimoMesPagado.toUpperCase()}</b>.</p>
             <p class="text-xs text-orange-700 mt-2 font-bold">Por favor, verificá que coincida exactamente con el último cartón de la chequera que devuelve el cliente.</p>
           </div>
         </div>`;

    const { isConfirmed } = await Swal.fire({
      title: `¿${nuevoEstado ? 'Reactivar' : 'Dar de baja'} a ${cliente.cliente}?`,
      html: htmlWarning,
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: nuevoEstado ? '#16a34a' : '#ea580c', 
      confirmButtonText: `Sí, ${nuevoEstado ? 'reactivar' : 'dar de baja'}`
    });

    if (isConfirmed) {
      await updateDoc(doc(db, 'socios', cliente.id), { activo: nuevoEstado });
      setClientes(clientes.map(c => c.id === cliente.id ? { ...c, activo: nuevoEstado, tieneDeuda: nuevoEstado ? c.tieneDeuda : false, tieneTransferenciasPorRendir: nuevoEstado ? c.tieneTransferenciasPorRendir : false } : c));
    }
  };

  const abrirEditorInfo = (cliente) => {
    setEditandoInfo(cliente);
    setInfoTemp({
      cliente: cliente.cliente, telefono: cliente.telefono || '', domicilio: cliente.domicilio || '',
      vendedor: cliente.vendedor || '', esAbonado: cliente.esAbonado || false, 
      nrosRifa: cliente.nrosAsignados || '', metodoPago: cliente.metodoPago || ''
    });
  };

  const guardarCambiosInfo = async () => {
    await updateDoc(doc(db, 'socios', editandoInfo.id), infoTemp);
    await fetchClientes(); 
    setEditandoInfo(null);
    Swal.fire({ icon: 'success', title: 'Datos Actualizados', timer: 1500, showConfirmButton: false });
  };

  const abrirEditorPagos = (cliente) => {
    setClienteEditando(cliente);
    setPagosTemp(cliente.pagos || meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, montoAbonado: 0 } }), {}));
  };

  const togglePago = async (mes) => {
    const pagoActual = pagosTemp[mes];
    const cantidadNumeros = clienteEditando.nrosAsignados.split(',').filter(n => n.trim() !== '').length || 1;
    const montoSugerido = precioCuotaLocal * cantidadNumeros;
    const metodoHab = clienteEditando.metodoPago || "Efectivo";

    let efVal = 0; let trVal = 0;
    if (pagoActual?.pagado) {
      efVal = pagoActual.montoEfectivo || 0;
      trVal = pagoActual.montoTransferencia || 0;
    } else {
      efVal = metodoHab === "Transferencia" ? 0 : montoSugerido;
      trVal = metodoHab === "Transferencia" ? montoSugerido : 0;
    }

    const checkRendido = pagoActual?.rendido ? 'checked' : '';

    const { value: formValues, isDenied } = await Swal.fire({
      title: pagoActual?.pagado ? `Editar pago de ${mes}` : `Registrar pago de ${mes}`,
      html: `
        <div class="text-left font-sans">
          <div class="bg-blue-50 text-blue-800 p-2 rounded mb-4 text-xs font-bold border border-blue-200">
            Valor esperado por ${cantidadNumeros} número(s): $${montoSugerido.toLocaleString('es-AR')}
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Efectivo ($):</label>
              <input id="swal-ef" type="number" value="${efVal}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Transferencia ($):</label>
              <input id="swal-tr" type="number" value="${trVal}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
            </div>
          </div>
          <div class="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border">
            <input type="checkbox" id="swal-rendido" class="w-5 h-5 text-green-600" ${checkRendido}>
            <label class="font-bold text-sm text-gray-700 cursor-pointer">Marcar Transferencia Rendida</label>
          </div>
        </div>
      `,
      focusConfirm: false, showCancelButton: true, showDenyButton: pagoActual?.pagado, 
      confirmButtonText: 'Guardar Pago', confirmButtonColor: '#16a34a',
      denyButtonText: 'Anular Pago', denyButtonColor: '#d33',
      preConfirm: () => {
        const ef = Number(document.getElementById('swal-ef').value);
        const tr = Number(document.getElementById('swal-tr').value);
        const ren = document.getElementById('swal-rendido').checked;
        
        if (ef === 0 && tr === 0) return { anular: true };
        
        let metodo = "Efectivo";
        if (ef > 0 && tr > 0) metodo = "Híbrido";
        else if (tr > 0) metodo = "Transferencia";

        return { montoEfectivo: ef, montoTransferencia: tr, montoAbonado: ef + tr, metodoPago: metodo, rendido: ren };
      }
    });

    if (isDenied || (formValues && formValues.anular)) {
      setPagosTemp({ ...pagosTemp, [mes]: { pagado: false, montoAbonado: 0, montoEfectivo: 0, montoTransferencia: 0, metodoPago: '', rendido: false } });
    } else if (formValues) {
      setPagosTemp({ ...pagosTemp, [mes]: { pagado: true, ...formValues } });
    }
  };

  const guardarCambiosPagos = async () => {
    setGuardandoPago(true);
    await updateDoc(doc(db, 'socios', clienteEditando.id), { pagos: pagosTemp });
    await fetchClientes();
    setClienteEditando(null);
    setGuardandoPago(false);
    Swal.fire({ icon: 'success', title: 'Pagos Actualizados', timer: 2000, showConfirmButton: false });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans relative">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow">← Volver al Tablero</button>
          <h1 className="text-3xl font-bold text-gray-800">Lista de Clientes</h1>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <input type="text" placeholder="🔍 Buscar nombre, nro o tel..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-full md:w-64" />
          <select value={campanaFiltro} onChange={(e) => setCampanaFiltro(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-white hidden sm:block">
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
          <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition flex items-center gap-2"><span>📊</span> <span className="hidden sm:inline">Exportar</span></button>
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
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-center">Cuotas</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm divide-y divide-gray-200">
              {cargando ? (
                <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">Cargando base de datos...</td></tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">No se encontraron clientes.</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className={`transition duration-200 ${!cliente.activo ? 'bg-gray-100 opacity-70 grayscale-[0.5]' : 'hover:bg-gray-50'}`}>
                    <td className={`p-4 font-bold text-gray-900 ${cliente.activo ? 'bg-yellow-50' : ''}`}>{cliente.nrosAsignados || '-'}</td>
                    <td className="p-4 font-bold">{cliente.cliente} {!cliente.activo && <span className="ml-2 text-[10px] bg-gray-500 text-white px-2 py-0.5 rounded uppercase">Dado de Baja</span>}</td>
                    <td className="p-4">{cliente.telefono || '-'}</td>
                    <td className="p-4 text-center">
                      {cliente.activo ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Activo</span>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">Baja</span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Últ. pago: {cliente.ultimoMesPagado}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${!cliente.activo ? 'bg-gray-200 text-gray-600' : cliente.cuotasPagas === 12 && !cliente.tieneDeuda ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {cliente.cuotasPagas} / 12
                        </span>
                        {cliente.tieneDeuda && cliente.activo && (
                          <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">
                            Pago Parcial / Impago
                          </span>
                        )}
                        {cliente.tieneTransferenciasPorRendir && cliente.activo && (
                          <span className="text-[9px] bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm flex items-center gap-1" title="Hay transferencias sin verificar">
                            ⚠️ Transf. por Rendir
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button onClick={() => toggleEstadoCliente(cliente)} className={`font-bold py-1 px-2 rounded transition shadow-sm border ${cliente.activo ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`} title={cliente.activo ? "Dar de Baja Lógica" : "Reactivar Cliente"}>{cliente.activo ? '⏸️' : '▶️'}</button>
                      <button onClick={() => abrirEditorPagos(cliente)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 px-2 rounded transition shadow-sm border border-blue-200" title="Editar Pagos">✏️</button>
                      <button onClick={() => abrirEditorInfo(cliente)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold py-1 px-2 rounded transition shadow-sm border border-gray-300" title="Editar Info Personal">⚙️</button>
                      <button onClick={() => eliminarCliente(cliente.id, cliente.cliente)} className="bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition shadow-sm border border-red-200" title="Eliminar Definitivamente">🗑️</button>
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
                <p className="text-gray-500 mt-1">Cliente: <span className="font-bold text-red-600">{clienteEditando.cliente}</span> | Esperado x mes: <strong>${clienteEditando.cuotaEsperada?.toLocaleString('es-AR')}</strong></p>
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
                          <span className={`text-[11px] font-bold ${pagosTemp[mes].montoAbonado < clienteEditando.cuotaEsperada ? 'text-red-600' : 'text-gray-700'}`}>${pagosTemp[mes].montoAbonado}</span>
                          {pagosTemp[mes].metodoPago && (
                            <span className="text-[10px] text-gray-600 uppercase font-bold flex gap-1 items-center">
                              {pagosTemp[mes].metodoPago} {pagosTemp[mes].rendido && <span className="text-green-600 text-sm" title="Rendido">✔️</span>}
                            </span>
                          )}
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
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Nombre y Apellido</label><input type="text" value={infoTemp.cliente} onChange={e => setInfoTemp({...infoTemp, cliente: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Números Asignados (separados por coma)</label><input type="text" value={infoTemp.nrosRifa} onChange={e => setInfoTemp({...infoTemp, nrosRifa: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label><input type="text" value={infoTemp.telefono} onChange={e => setInfoTemp({...infoTemp, telefono: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label><input type="text" value={infoTemp.domicilio} onChange={e => setInfoTemp({...infoTemp, domicilio: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vendedor</label>
                  <select value={infoTemp.vendedor} onChange={e => setInfoTemp({...infoTemp, vendedor: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="Gaitan Victor Adrian">Gaitan Victor Adrian</option>
                    <option value="Tufarelli Nestor Dario">Tufarelli Nestor Dario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Método Habitual</label>
                  <select value={infoTemp.metodoPago} onChange={e => setInfoTemp({...infoTemp, metodoPago: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
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