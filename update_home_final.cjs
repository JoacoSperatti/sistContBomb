const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// 1. Initial value
content = content.replace(
  'const [campanaActiva, setCampanaActiva] = useState("2025-2026");',
  'const [campanaActiva, setCampanaActiva] = useState(localStorage.getItem(\'campanaDefecto\') || "2025-2026");'
);

// 2. onChange
content = content.replace(
  'onChange={(e) => setCampanaActiva(e.target.value)}',
  'onChange={(e) => { setCampanaActiva(e.target.value); localStorage.setItem(\'campanaDefecto\', e.target.value); }}'
);

// 3. state variables
content = content.replace(
  'const [stats, setStats] = useState({ vendidos: 0, recaudado: 0, totalRifas: 0 });',
  'const [stats, setStats] = useState({ vendidos: 0, recaudado: 0, totalRifas: 0 });\n  const [rifasData, setRifasData] = useState([]);\n  const [mostrarModalNumeros, setMostrarModalNumeros] = useState(false);'
);

// 4. fetching rifasArray
content = content.replace(
  '          const rifasSnap = await getDocs(qRifas);\n\n          setStats({ vendidos: totalVendidos, recaudado: totalRecaudado, totalRifas: rifasSnap.size });',
  '          const rifasSnap = await getDocs(qRifas);\n          const rifasArray = rifasSnap.docs.map(doc => doc.data());\n          rifasArray.sort((a, b) => a.numero - b.numero);\n          setRifasData(rifasArray);\n\n          setStats({ vendidos: totalVendidos, recaudado: totalRecaudado, totalRifas: rifasSnap.size });'
);

// 5. Add button and fragment
const originalGraph = `                 {stats.totalRifas > 0 ? (
                   <div className="w-full h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={dataGrafico} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                           {dataGrafico.map((entry, index) => (
                             <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip formatter={(value) => [\`\${value} números\`, 'Cantidad']} />
                         <Legend />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                 ) : (`;

const replacedGraph = `                 {stats.totalRifas > 0 ? (
                   <>
                   <div className="w-full h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={dataGrafico} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                           {dataGrafico.map((entry, index) => (
                             <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip formatter={(value) => [\`\${value} números\`, 'Cantidad']} />
                         <Legend />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                   <button onClick={() => setMostrarModalNumeros(true)} className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-lg font-bold hover:bg-indigo-700 transition shadow">Ver Todos los Números</button>
                   </>
                 ) : (`;

content = content.replace(originalGraph, replacedGraph);

// 6. Add Modal
const modalCode = `        {mostrarModalNumeros && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Detalle de Numeración</h2>
                <button onClick={() => setMostrarModalNumeros(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold p-2 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {rifasData.map(rifa => (
                  <div key={rifa.numero} className={\`p-2 rounded font-bold text-center border text-sm \${rifa.estado === 'vendido' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}\`}>
                    {rifa.numero}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-sm font-bold justify-center bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span> Libre</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span> Vendido</div>
              </div>
            </div>
          </div>
        )}
      </main>`;

content = content.replace('      </main>', modalCode);

// 7. Add Sidebar Link
content = content.replace(
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>',
  '<button onClick={() => navigate("/lista-clientes")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">📋 Lista de Clientes</button>\n          <button onClick={() => navigate("/vendedores")} className="bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 py-2 px-4 rounded-lg font-semibold text-left transition">🏷️ Vendedores</button>'
);

fs.writeFileSync('src/pages/Home.jsx', content);
