const fs = require('fs');

let content = fs.readFileSync('src/pages/CargarClientes.jsx', 'utf8');

// Fix unused error
content = content.replace('} catch (error) {', '} catch (err) {');

// Fix meses
content = content.replace(
  'const meses = ["Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio"];',
  'const meses = ["Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio (Fin)", "Agosto (Fin)"];'
);

// Add missing imports
content = content.replace(
  'import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";',
  'import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query } from "firebase/firestore";'
);

// Add state and fetch for vendedoresOptions
content = content.replace(
  'const [numeroBuscado, setNumeroBuscado] = useState(\'\');',
  'const [numeroBuscado, setNumeroBuscado] = useState(\'\');\n  const [vendedoresOptions, setVendedoresOptions] = useState([]);\n\n  useEffect(() => {\n    const fetchVendedores = async () => {\n      const q = query(collection(db, "vendedores"));\n      const snap = await getDocs(q);\n      setVendedoresOptions(snap.docs.map(doc => doc.data().nombre).sort());\n    };\n    fetchVendedores();\n  }, []);'
);

// Default campana and save logic
content = content.replace(
  'cliente: "", vendedor: "", correo: "", campana: "2025-2026",',
  'cliente: "", vendedor: "", correo: "", campana: localStorage.getItem("campanaDefecto") || "2025-2026",'
);
content = content.replace(
  'setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });',
  'if (name === "campana") localStorage.setItem("campanaDefecto", value);\n    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });'
);

// Sellers select replacement
const oldSelect = `                    <select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>
                      <option value="">Seleccione...</option>
                      <option value="Gaitan Victor Adrian">Gaitan Victor Adrian</option>
                      <option value="Tufarelli Nestor Dario">Tufarelli Nestor Dario</option>
                      <option value="Stein Cacho Roberto">Stein Cacho Roberto</option>
                      <option value="Jalup Marcelo Adrian">Jalup Marcelo Adrian</option>
                      <option value="Di Puglia Pugliese Juan Manuel">Di Puglia Pugliese Juan Manuel</option>
                      <option value="Sosa Esteban Daniel">Sosa Esteban Daniel</option>
                      <option value="Curvelo Alba Rodolfo">Curvelo Alba Rodolfo</option>
                      <option value="Ruiz Oscar Eduardo">Ruiz Oscar Eduardo</option>
                      <option value="Turfarelli Arzamendia">Turfarelli Arzamendia</option>
                      <option value="Arzamendia Daniel Edgardo">Arzamendia Daniel Edgardo</option>
                      <option value="Tomalino Maximiliano">Tomalino Maximiliano</option>
                      <option value="Puyol Juan Carlos">Puyol Juan Carlos</option>
                      <option value="Calibar Victor">Calibar Victor</option>
                      <option value="Facundo Benitez">Facundo Benitez</option>
                    </select>`;

const newSelect = `                    <select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>
                      <option value="">Seleccione...</option>
                      {vendedoresOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>`;

content = content.replace(oldSelect, newSelect);

// Add Vendedores to Sidebar
content = content.replace(
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>',
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>'
);

fs.writeFileSync('src/pages/CargarClientes.jsx', content);
