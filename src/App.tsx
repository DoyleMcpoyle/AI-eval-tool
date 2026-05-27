import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Datasets } from './components/Datasets';
import { EvalConfigs } from './components/EvalConfigs';
import { EvalRuns } from './components/EvalRuns';
import { Reviews } from './components/Reviews';
import { Settings } from './components/Settings';

type View = 'dashboard' | 'datasets' | 'configs' | 'runs' | 'reviews' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
      {currentView === 'datasets' && <Datasets />}
      {currentView === 'configs' && <EvalConfigs />}
      {currentView === 'runs' && <EvalRuns />}
      {currentView === 'reviews' && <Reviews />}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;
