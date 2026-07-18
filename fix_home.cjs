const fs = require('fs');

const homePath = 'src/pages/Home.jsx';
let content = fs.readFileSync(homePath, 'utf8');

// The section that was accidentally deleted
const pieChartSection = `            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
                 <h2 className="text-gray-800 text-xl font-bold mb-4 w-full text-left">Estado de Ocupación de Rifas</h2>
                 {stats.totalRifas > 0 ? (
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
                 ) : (
                   <div className="h-64 flex items-center justify-center text-gray-400 italic">
                     Aún no generaste la base de números.
                   </div>
                 )}
              </div>

              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl flex flex-col justify-center">`;

content = content.replace(
  `              </div>

              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl flex flex-col justify-center">`,
  pieChartSection
);

fs.writeFileSync(homePath, content);
