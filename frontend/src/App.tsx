import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import DashboardHome from './pages/dashboard/index';
import ProjectsPage from './pages/dashboard/Projects';
import WorkspacePage from './pages/workspace/Workspace';

function App() {
  return (
    <BrowserRouter>
      {/* Global Toaster for notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--bg-border)',
          },
          success: { iconTheme: { primary: 'var(--accent-success)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--accent-danger)', secondary: '#fff' } },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard/*"
          element={
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="workspace" element={<WorkspacePage />} />
              </Routes>
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
