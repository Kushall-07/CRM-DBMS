import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/landing';
import CRMApp from './pages/CRMApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/crm" element={<CRMApp />} />
      </Routes>
    </BrowserRouter>
  );
}
