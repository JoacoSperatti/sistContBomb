const fs = require('fs');

let content = fs.readFileSync('src/pages/CargarClientes.jsx', 'utf8');

const regex = /<select name="vendedor"[^>]*>[\s\S]*?<\/select>/;
const replacement = '<select name="vendedor" value={formData.vendedor} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" onChange={handleInputChange}>\n' +
'  <option value="">Seleccione...</option>\n' +
'  {vendedoresOptions.map(v => <option key={v} value={v}>{v}</option>)}\n' +
'</select>';

content = content.replace(regex, replacement);

fs.writeFileSync('src/pages/CargarClientes.jsx', content);
