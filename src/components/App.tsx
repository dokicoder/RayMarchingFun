import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RaymarchingTestScene from './DeclarativeScene';
import MetaballsScene from './MetaballsScene';
import CubeScene from './CubeScene';

const Menu: React.FC = () => {
  return (
    <menu className="nav-menu">
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
      <Link
        to="/cubeScene"
        style={{
          backgroundColor: '#203010',
          padding: 10,
          margin: 5,
        }}
      >
        Cube Scene
      </Link>
    </menu>
  );
};

const App = () => (
  <BrowserRouter>
    <Menu />
    <Routes>
      <Route path="/" element={<div>No Route</div>} />
      <Route path="/raymarchingTest" element={<RaymarchingTestScene />} />
      <Route path="/metaballs" element={<MetaballsScene />} />
      <Route path="/cubeScene" element={<CubeScene />} />
    </Routes>
  </BrowserRouter>
);

export default App;
