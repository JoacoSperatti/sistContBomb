const fs = require('fs');

let content = fs.readFileSync('src/pages/CargarClientes.jsx', 'utf8');

// Use Windows crlf normalization to simplify regexes
content = content.replace(/\r\n/g, '\n');

// 1. Fix unused error in catch block at the top
content = content.replace(/catch \(err\) \{\n\s*console\.error\(error\);/g, 'catch (err) {\n      console.error(err);');

// 2. Fix unused error in catch block at the bottom
content = content.replace(/catch \(error\) \{\n\s*Swal\.fire\(\{ icon: "error"/g, 'catch (_error) {\n      Swal.fire({ icon: "error"');

// 3. Fix meses
content = content.replace(
  'const meses = ["Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio"];',
  'const meses = ["Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio (Fin)", "Agosto (Fin)"];'
);

// 4. Add missing imports
content = content.replace(
  'import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";',
  'import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query } from "firebase/firestore";'
);

// 5. Add state and fetch for vendedoresOptions
content = content.replace(
  'const [numeroBuscado, setNumeroBuscado] = useState(\'\');',
  'const [numeroBuscado, setNumeroBuscado] = useState(\'\');\n  const [vendedoresOptions, setVendedoresOptions] = useState([]);\n\n  useEffect(() => {\n    const fetchVendedores = async () => {\n      const q = query(collection(db, "vendedores"));\n      const snap = await getDocs(q);\n      setVendedoresOptions(snap.docs.map(doc => doc.data().nombre).sort());\n    };\n    fetchVendedores();\n  }, []);'
);

// 6. Default campana and save logic
content = content.replace(
  'cliente: "", vendedor: "", correo: "", campana: "2025-2026",',
  'cliente: "", vendedor: "", correo: "", campana: localStorage.getItem("campanaDefecto") || "2025-2026",'
);
content = content.replace(
  'setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });',
  'if (name === "campana") localStorage.setItem("campanaDefecto", value);\n    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });'
);

// 7. Sellers select replacement
content = content.replace(
  /<select name="vendedor"[^>]*>[\s\S]*?<\/select>/,
  '<select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>\n' +
  '  <option value="">Seleccione...</option>\n' +
  '  {vendedoresOptions.map(v => <option key={v} value={v}>{v}</option>)}\n' +
  '</select>'
);

// 8. Add Vendedores to Sidebar
content = content.replace(
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>',
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>'
);

fs.writeFileSync('src/pages/CargarClientes.jsx', content);
