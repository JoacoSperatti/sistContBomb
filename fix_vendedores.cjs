const fs = require('fs');

let content = fs.readFileSync('src/pages/Vendedores.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// Fix catch block 1
content = content.replace(/catch \(_error\) \{\n\s*console\.error\("Error obteniendo vendedores:", error\);/g, 'catch (error) {\n      console.error("Error obteniendo vendedores:", error);');

// Fix catch block 2
content = content.replace(/catch \(_err\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al agregar', 'error'\);/g, 'catch (_err) {\n      Swal.fire(\'Error\', \'Hubo un problema al agregar\', \'error\');');

// Fix catch block 3
content = content.replace(/catch \(_err\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al eliminar', 'error'\);/g, 'catch (_err) {\n        Swal.fire(\'Error\', \'Hubo un problema al eliminar\', \'error\');');

// (Wait, block 2 and 3 don't need changes if they are already `_err` and don't log it? Ah, the lint error was `error is not defined` because I replaced `catch (err)` with `catch (_err)` but left `console.error(err)` as `console.error(error)`? No, the original file in `Vendedores.jsx` had `catch (error)` in block 1, and `catch (error)` in block 2, and `catch (error)` in block 3.)
// Let's just fix it completely:
content = content.replace(/catch \(error\) \{\n\s*console\.error\("Error obteniendo vendedores:", error\);/g, 'catch (error) {\n      console.error("Error obteniendo vendedores:", error);');
content = content.replace(/catch \(error\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al agregar', 'error'\);/g, 'catch (_err) {\n      Swal.fire(\'Error\', \'Hubo un problema al agregar\', \'error\');');
content = content.replace(/catch \(error\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al eliminar', 'error'\);/g, 'catch (_err) {\n        Swal.fire(\'Error\', \'Hubo un problema al eliminar\', \'error\');');

// Let's do a replace that covers both `catch (error)` and `catch (err)` and `catch (_err)`
content = content.replace(/catch \((err|error|_err|_error)\) \{\n\s*console\.error\([^,]+,\s*(err|error|_err|_error)\);/g, 'catch ($1) {\n      console.error("Error obteniendo vendedores:", $1);');
content = content.replace(/catch \((err|error|_err|_error)\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al agregar', 'error'\);/g, 'catch (_error) {\n      Swal.fire(\'Error\', \'Hubo un problema al agregar\', \'error\');');
content = content.replace(/catch \((err|error|_err|_error)\) \{\n\s*Swal\.fire\('Error', 'Hubo un problema al eliminar', 'error'\);/g, 'catch (_error) {\n        Swal.fire(\'Error\', \'Hubo un problema al eliminar\', \'error\');');

fs.writeFileSync('src/pages/Vendedores.jsx', content);
