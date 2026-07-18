const fs = require('fs');
let content = fs.readFileSync('src/pages/CargarClientes.jsx', 'utf8');
content = content.replace(/catch \(\/\* eslint-disable-next-line no-unused-vars \*\/ _error\) \{\n\s*Swal\.fire\(\{ icon: "error"/g, 'catch (e) {\n      console.error(e);\n      Swal.fire({ icon: "error"');
fs.writeFileSync('src/pages/CargarClientes.jsx', content);
