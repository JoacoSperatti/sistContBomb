import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import CargarClientes from './pages/CargarClientes';
import ListadoClientes from './pages/ListadoClientes'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/cargar-clientes" element={<CargarClientes />} />
        <Route path="/lista-clientes" element={<ListadoClientes />} /> 
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;