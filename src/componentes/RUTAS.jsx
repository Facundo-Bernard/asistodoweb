import { Routes, Route } from 'react-router-dom';
import QUIENESSOMOSPAGE from './quienessomospage/QUIENESSOMOSPAGE';
import LANFINGPAGEMAIN from './landingpage/LANFINGPAGEMAIN';
import SERVICIOS from './servicios/SERVICIOS';
import CONTACTANOS from './contactanos/CONTACTANOS';
import BAJAS from './bajas/BAJAS';
import ADELANTO from './adelanto/ADELANTO';

function RUTAS() {
  return (
    <Routes>
      <Route path="/contactanos" element={<CONTACTANOS />} />
      <Route path="/servicios" element={<SERVICIOS />} />
      <Route path="/quienes-somos" element={<QUIENESSOMOSPAGE />} />
      <Route path="/" element={<LANFINGPAGEMAIN></LANFINGPAGEMAIN>} ></Route>
      <Route path="/bajas" element={<BAJAS/>} />
      <Route path="/adelanto" element={<ADELANTO />} />
    </Routes>
  );
}

export default RUTAS;
