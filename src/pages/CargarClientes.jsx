import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import Swal from "sweetalert2";

export default function CargarClientes() {
  const navigate = useNavigate();

  const estadoInicialForm = {
    cliente: "", vendedor: "", correo: "", campana: "2025-2026",
    telefono: "", domicilio: "", metodoPago: "", esAbonado: false,
    nrosRifa: "", 
  };

  const [formData, setFormData] = useState(estadoInicialForm);
  const [cargando, setCargando] = useState(false);
  const [precioCuota, setPrecioCuota] = useState(120000);

  const meses = ["Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio"];

  const [pagos, setPagos] = useState(
    meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, metodoPago: "", montoAbonado: 0, montoEfectivo: 0, montoTransferencia: 0 } }), {})
  );

  useEffect(() => {
    const getPrecio = async () => {
      const campRef = doc(db, "campanas", formData.campana);
      const snap = await getDoc(campRef);
      if (snap.exists() && snap.data().precioBono) setPrecioCuota(Number(snap.data().precioBono));
    };
    getPrecio();
  }, [formData.campana]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handlePagoChange = async (mes) => {
    const pagoActual = pagos[mes];

    const cantidadNumeros = formData.nrosRifa.split(',').filter(n => n.trim() !== '').length || 1;
    const montoSugerido = precioCuota * cantidadNumeros;

    if (pagoActual && pagoActual.pagado) {
      setPagos({ ...pagos, [mes]: { pagado: false, metodoPago: "", montoAbonado: 0, montoEfectivo: 0, montoTransferencia: 0 } });
    } else {
      // INTELIGENCIA DE AUTO-RELLENO SEGÚN MÉTODO HABITUAL
      const metodoHab = formData.metodoPago || "Efectivo";
      const efVal = metodoHab === "Transferencia" ? 0 : montoSugerido;
      const trVal = metodoHab === "Transferencia" ? montoSugerido : 0;

      const { value: formValues } = await Swal.fire({
        title: `Registrar pago de ${mes}`,
        html: `
          <div class="text-left font-sans">
            <div class="bg-blue-50 text-blue-800 p-2 rounded mb-4 text-xs font-bold border border-blue-200">
              Valor esperado por ${cantidadNumeros} número(s): $${montoSugerido.toLocaleString('es-AR')}
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Efectivo ($):</label>
                <input id="swal-ef" type="number" value="${efVal}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Transferencia ($):</label>
                <input id="swal-tr" type="number" value="${trVal}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
              </div>
            </div>
          </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: "Confirmar Mes", confirmButtonColor: "#16a34a",
        preConfirm: () => {
          const ef = Number(document.getElementById("swal-ef").value);
          const tr = Number(document.getElementById("swal-tr").value);
          if (ef === 0 && tr === 0) {
            Swal.showValidationMessage("Debes ingresar un monto mayor a 0");
            return false;
          }
          let metodo = "Efectivo";
          if (ef > 0 && tr > 0) metodo = "Híbrido";
          else if (tr > 0) metodo = "Transferencia";
          
          return { montoEfectivo: ef, montoTransferencia: tr, montoAbonado: ef + tr, metodoPago: metodo };
        },
      });

      if (formValues) {
        setPagos({ ...pagos, [mes]: { pagado: true, ...formValues } });
      }
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const nuevoSocio = { ...formData, pagos, fechaCreacion: serverTimestamp(), activo: true };
      await addDoc(collection(db, "socios"), nuevoSocio);
      Swal.fire({ icon: "success", title: "¡Cliente Guardado!", confirmButtonColor: "#dc2626" });
      setFormData(estadoInicialForm);
      setPagos(meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, metodoPago: "", montoAbonado: 0, montoEfectivo: 0, montoTransferencia: 0 } }), {}));
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Problema al guardar.", confirmButtonColor: "#dc2626" });
    } finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto mb-6 flex items-center gap-4">
        <button onClick={() => navigate("/home")} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 shadow">← Volver al Tablero</button>
        <h1 className="text-3xl font-bold text-gray-800">Cargar Nuevo Cliente</h1>
      </div>

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <form onSubmit={handleGuardar} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Datos del Cliente</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre y Apellido *</label>
                  <input type="text" name="cliente" value={formData.cliente} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Números Asignados (separados por coma) *</label>
                  <input type="text" name="nrosRifa" placeholder="Ej: 1001, 1005" value={formData.nrosRifa} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                    <input type="text" name="telefono" value={formData.telefono} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                    <input type="email" name="correo" value={formData.correo} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label>
                  <input type="text" name="domicilio" value={formData.domicilio} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Detalles de Venta</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Campaña *</label>
                    <select name="campana" value={formData.campana} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>
                      <option value="2025-2026">Campaña 2025-2026</option>
                      <option value="2026-2027">Campaña 2026-2027</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vendedor *</label>
                    <select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>
                      <option value="">Seleccione...</option>
                      <option value="Gaitan Victor Adrian">Gaitan Victor Adrian</option>
                      <option value="Tufarelli Nestor Dario">Tufarelli Nestor Dario</option>
                      <option value="Stein Cacho Roberto">Stein Cacho Roberto</option>
                      <option value="Jalup Marcelo Adrian">Jalup Marcelo Adrian</option>
                      <option value="Sosa Esteban Daniel">Sosa Esteban Daniel</option>
                      <option value="Curvelo Alba Rodolfo">Curvelo Alba Rodolfo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Método Habitual</label>
                    <select name="metodoPago" value={formData.metodoPago} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>
                      <option value="">Seleccione...</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-6 bg-gray-50 p-3 rounded-lg border">
                    <input type="checkbox" id="esAbonado" name="esAbonado" checked={formData.esAbonado} className="w-5 h-5 text-red-600" onChange={handleInputChange} />
                    <label htmlFor="esAbonado" className="font-bold text-gray-700 cursor-pointer">Es Abonado (Socio)</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-bold text-blue-800 mb-4 border-b pb-2">Control de Pagos (Meses Abonados)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {meses.map((mes) => {
                const estaPagado = pagos[mes]?.pagado;
                const cantidadNumeros = formData.nrosRifa.split(',').filter(n => n.trim() !== '').length || 1;
                const cuotaEsperada = precioCuota * cantidadNumeros;

                return (
                  <div key={mes} onClick={() => handlePagoChange(mes)} className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 select-none ${estaPagado ? "bg-green-50 border-green-500 shadow-inner" : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}>
                    <span className={`font-bold text-sm uppercase ${estaPagado ? "text-green-800" : "text-gray-500"}`}>{mes}</span>
                    {estaPagado ? (
                      <>
                        <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-sm mb-1">✓</span>
                        {pagos[mes].montoAbonado > 0 && (
                           <span className={`text-[11px] font-bold ${pagos[mes].montoAbonado < cuotaEsperada ? 'text-red-600' : 'text-gray-700'}`}>${pagos[mes].montoAbonado}</span>
                        )}
                        {pagos[mes].metodoPago && <span className="text-[9px] text-gray-500 uppercase">{pagos[mes].metodoPago}</span>}
                      </>
                    ) : <span className="w-6 h-6 border-2 border-gray-300 rounded-full bg-gray-50 mt-1"></span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-10 flex justify-end">
            <button type="submit" disabled={cargando} className={`font-bold py-3 px-8 rounded-xl shadow-lg text-white ${cargando ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"}`}>💾 Guardar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  );
}