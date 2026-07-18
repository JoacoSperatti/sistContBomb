const fs = require('fs');
const path = require('path');

let appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');

// Insert import
if (!appContent.includes("import Vendedores")) {
    appContent = appContent.replace(
        "import ListadoClientes from './pages/ListadoClientes';", 
        "import ListadoClientes from './pages/ListadoClientes';\nimport Vendedores from './pages/Vendedores';"
    );
}

// Insert route
if (!appContent.includes('<Route path="/vendedores" element={<Vendedores />} />')) {
    appContent = appContent.replace(
        '<Route path="/lista-clientes" element={<ListadoClientes />} />',
        '<Route path="/lista-clientes" element={<ListadoClientes />} />\n        <Route path="/vendedores" element={<Vendedores />} />'
    );
}

fs.writeFileSync(path.resolve('src/App.jsx'), appContent);
console.log("Updated App.jsx");
