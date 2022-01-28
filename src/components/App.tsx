import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RaymarchingTestScene from './DeclarativeScene';
import MetaballsScene from './MetaballsScene';

const Menu: React.FC = () => {
  return (
    <>
      <Link
        to="/raymarchingTest"
        style={{
          backgroundColor: '#203010',
          padding: 10,
          margin: 5,
        }}
      >
        Raymarching Test
      </Link>
      <Link
        to="/metaballs"
        style={{
          backgroundColor: '#203010',
          padding: 10,
          margin: 5,
        }}
      >
        Metaballs
      </Link>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <Menu />
    <Routes>
      <Route path="/raymarchingTest" element={<RaymarchingTestScene />} />
      <Route path="/metaballs" element={<MetaballsScene />} />
    </Routes>
  </BrowserRouter>
);

export default App;
