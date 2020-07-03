import React from 'react';
import { BrowserRouter, Route, Link, Switch, Redirect } from 'react-router-dom';
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
    <Switch>
      <Route path="/raymarchingTest">
        <RaymarchingTestScene />
      </Route>
      <Route path="/metaballs">
        <MetaballsScene />
      </Route>
      <Route path="*">
        <Redirect to="/metaballs" />
      </Route>
    </Switch>
  </BrowserRouter>
);

export default App;
