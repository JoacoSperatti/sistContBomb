const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
    const fullPath = path.resolve(filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    for (const rep of replacements) {
        content = content.replace(rep.search, rep.replace);
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
}

// 1. Home.jsx
replaceFile('src/pages/Home.jsx', [
    {
        search: `const [campanaActiva, setCampanaActiva] = useState("2025-2026");`,
        replace: `const [campanaActiva, setCampanaActiva] = useState(localStorage.getItem('campanaDefecto') || "2025-2026");`
    },
    {
        search: `onChange={(e) => setCampanaActiva(e.target.value)}`,
        replace: `onChange={(e) => { setCampanaActiva(e.target.value); localStorage.setItem('campanaDefecto', e.target.value); }}`
    },
    {
        search: `const [stats, setStats] = useState({ vendidos: 0, recaudado: 0, totalRifas: 0 });`,
        replace: `const [stats, setStats] = useState({ vendidos: 0, recaudado: 0, totalRifas: 0 });\n  const [rifasData, setRifasData] = useState([]);\n  const [mostrarModalNumeros, setMostrarModalNumeros] = useState(false);`
    },
    {
        search: `          const rifasSnap = await getDocs(qRifas);\n\n          setStats({ vendidos: totalVendidos, recaudado: totalRecaudado, totalRifas: rifasSnap.size });`,
        replace: `          const rifasSnap = await getDocs(qRifas);\n          const rifasArray = rifasSnap.docs.map(doc => doc.data());\n          rifasArray.sort((a, b) => a.numero - b.numero);\n          setRifasData(rifasArray);\n\n          setStats({ vendidos: totalVendidos, recaudado: totalRecaudado, totalRifas: rifasSnap.size });`
    },
    {
        search: `                 {stats.totalRifas > 0 ? (\n                   <div className="w-full h-64">`,
        replace: `                 {stats.totalRifas > 0 ? (\n                   <>\n                   <div className="w-full h-64">`
    },
    {
        search: `                   </div>\n                 ) : (`,
        replace: `                   </div>\n                   <button onClick={() => setMostrarModalNumeros(true)} className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-lg font-bold hover:bg-indigo-700 transition shadow">Ver Todos los Números</button>\n                   </>\n                 ) : (`
    },
    {
        search: `      </main>\n    </div>`,
        replace: `        {mostrarModalNumeros && (\n          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">\n            <div className="bg-white p-6 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">\n              <div className="flex justify-between items-center mb-4">\n                <h2 className="text-2xl font-bold text-gray-800">Detalle de Numeración</h2>\n                <button onClick={() => setMostrarModalNumeros(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold p-2 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition">✕</button>\n              </div>\n              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">\n                {rifasData.map(rifa => (\n                  <div key={rifa.numero} className={\`p-2 rounded font-bold text-center border text-sm \${rifa.estado === 'vendido' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}\`}>\n                    {rifa.numero}\n                  </div>\n                ))}\n              </div>\n              <div className="mt-4 flex gap-4 text-sm font-bold justify-center bg-gray-50 p-3 rounded-lg border">\n                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span> Libre</div>\n                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span> Vendido</div>\n              </div>\n            </div>\n          </div>\n        )}\n      </main>\n    </div>`
    },
    {
        search: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>`,
        replace: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>`
    }
]);

// 2. CargarClientes.jsx
replaceFile('src/pages/CargarClientes.jsx', [
    {
        search: `import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";`,
        replace: `import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query } from "firebase/firestore";`
    },
    {
        search: `cliente: "", vendedor: "", correo: "", campana: "2025-2026",`,
        replace: `cliente: "", vendedor: "", correo: "", campana: localStorage.getItem('campanaDefecto') || "2025-2026",`
    },
    {
        search: `const meses = ["Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio"];`,
        replace: `const meses = ["Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio (Fin)", "Agosto (Fin)"];`
    },
    {
        search: `const handleInputChange = (e) => {\n    const { name, value, type, checked } = e.target;\n    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });\n  };`,
        replace: `const handleInputChange = (e) => {\n    const { name, value, type, checked } = e.target;\n    if (name === 'campana') localStorage.setItem('campanaDefecto', value);\n    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });\n  };`
    },
    {
        search: `<select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>\n                      <option value="">Seleccione...</option>\n                      <option value="Gaitan Victor Adrian">Gaitan Victor Adrian</option>\n                      <option value="Tufarelli Nestor Dario">Tufarelli Nestor Dario</option>\n                      <option value="Stein Cacho Roberto">Stein Cacho Roberto</option>\n                      <option value="Jalup Marcelo Adrian">Jalup Marcelo Adrian</option>\n                      <option value="Di Puglia Pugliese Juan Manuel">Di Puglia Pugliese Juan Manuel</option>\n                      <option value="Sosa Esteban Daniel">Sosa Esteban Daniel</option>\n                      <option value="Curvelo Alba Rodolfo">Curvelo Alba Rodolfo</option>\n                      <option value="Ruiz Oscar Eduardo">Ruiz Oscar Eduardo</option>\n                      <option value="Turfarelli Arzamendia">Turfarelli Arzamendia</option>\n                      <option value="Arzamendia Daniel Edgardo">Arzamendia Daniel Edgardo</option>\n                      <option value="Tomalino Maximiliano">Tomalino Maximiliano</option>\n                      <option value="Puyol Juan Carlos">Puyol Juan Carlos</option>\n                      <option value="Calibar Victor">Calibar Victor</option>\n                      <option value="Facundo Benitez">Facundo Benitez</option>\n                    </select>`,
        replace: `<select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>\n                      <option value="">Seleccione...</option>\n                      {vendedoresOptions.map(v => <option key={v} value={v}>{v}</option>)}\n                    </select>`
    },
    {
        search: `const [numeroBuscado, setNumeroBuscado] = useState('');`,
        replace: `const [numeroBuscado, setNumeroBuscado] = useState('');\n  const [vendedoresOptions, setVendedoresOptions] = useState([]);\n\n  useEffect(() => {\n    const fetchVendedores = async () => {\n      const q = query(collection(db, "vendedores"));\n      const snap = await getDocs(q);\n      setVendedoresOptions(snap.docs.map(doc => doc.data().nombre).sort());\n    };\n    fetchVendedores();\n  }, []);`
    },
    {
        search: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>`,
        replace: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>`
    }
]);

// 3. ListadoClientes.jsx
replaceFile('src/pages/ListadoClientes.jsx', [
    {
        search: `const [campanaFiltro, setCampanaFiltro] = useState('2025-2026');`,
        replace: `const [campanaFiltro, setCampanaFiltro] = useState(localStorage.getItem('campanaDefecto') || '2025-2026');`
    },
    {
        search: `onChange={(e) => setCampanaFiltro(e.target.value)}`,
        replace: `onChange={(e) => { setCampanaFiltro(e.target.value); localStorage.setItem('campanaDefecto', e.target.value); }}`
    },
    {
        search: `const meses = ['Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'];`,
        replace: `const meses = ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio (Fin)', 'Agosto (Fin)'];`
    },
    {
        search: `const [guardandoPago, setGuardandoPago] = useState(false);`,
        replace: `const [guardandoPago, setGuardandoPago] = useState(false);\n  const [vendedoresOptions, setVendedoresOptions] = useState([]);\n\n  useEffect(() => {\n    const fetchVendedores = async () => {\n      const q = query(collection(db, "vendedores"));\n      const snap = await getDocs(q);\n      setVendedoresOptions(snap.docs.map(doc => doc.data().nombre).sort());\n    };\n    fetchVendedores();\n  }, []);`
    },
    {
        search: `<select value={infoTemp.vendedor} onChange={e => setInfoTemp({...infoTemp, vendedor: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">\n                    <option value="">Seleccione...</option>\n                    <option value="Gaitan Victor Adrian">Gaitan Victor Adrian</option>\n                    <option value="Tufarelli Nestor Dario">Tufarelli Nestor Dario</option>\n                    <option value="Stein Cacho Roberto">Stein Cacho Roberto</option>\n                    <option value="Jalup Marcelo Adrian">Jalup Marcelo Adrian</option>\n                    <option value="Di Puglia Pugliese Juan Manuel">Di Puglia Pugliese Juan Manuel</option>\n                    <option value="Sosa Esteban Daniel">Sosa Esteban Daniel</option>\n                    <option value="Curvelo Alba Rodolfo">Curvelo Alba Rodolfo</option>\n                    <option value="Ruiz Oscar Eduardo">Ruiz Oscar Eduardo</option>\n                    <option value="Turfarelli Arzamendia">Turfarelli Arzamendia</option>\n                    <option value="Arzamendia Daniel Edgardo">Arzamendia Daniel Edgardo</option>\n                    <option value="Tomalino Maximiliano">Tomalino Maximiliano</option>\n                    <option value="Puyol Juan Carlos">Puyol Juan Carlos</option>\n                    <option value="Calibar Victor">Calibar Victor</option>\n                    <option value="Facundo Benitez">Facundo Benitez</option>\n                  </select>`,
        replace: `<select value={infoTemp.vendedor} onChange={e => setInfoTemp({...infoTemp, vendedor: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none">\n                    <option value="">Seleccione...</option>\n                    {vendedoresOptions.map(v => <option key={v} value={v}>{v}</option>)}\n                  </select>`
    },
    {
        search: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>`,
        replace: `<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>`
    }
]);

console.log("Done");
