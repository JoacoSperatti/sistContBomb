const fs = require('fs');

function fixFile(path, fixes) {
  let content = fs.readFileSync(path, 'utf8');
  for (const fix of fixes) {
    content = content.replace(fix.regex, fix.replacement);
  }
  fs.writeFileSync(path, content);
}

// CargarClientes
fixFile('src/pages/CargarClientes.jsx', [
  // Remove unused error variables
  { regex: /catch \(error\)/g, replacement: 'catch (_error)' },
  { regex: /catch \(err\)/g, replacement: 'catch (_err)' },
  // Fix undefined error because I previously replaced it with err
  { regex: /console\.error\("Error fetching data:", error\);/g, replacement: 'console.error("Error fetching data:", _error);' },
]);

// ListadoClientes
fixFile('src/pages/ListadoClientes.jsx', [
  { regex: /\{\/\* eslint-disable-next-line \*\/\}\r?\n/g, replacement: '' }
]);

// Vendedores
fixFile('src/pages/Vendedores.jsx', [
  { regex: /catch \(err\)/g, replacement: 'catch (_err)' },
  { regex: /catch \(error\)/g, replacement: 'catch (_error)' }
]);
