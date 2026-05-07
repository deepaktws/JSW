import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly } from './components/routing/GuestOnly';
import { ProtectedLayout } from './components/routing/ProtectedLayout';
import { RootRedirect } from './components/routing/RootRedirect';
import { LoginShell } from './components/layout/LoginShell';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Model } from './pages/Model';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginShell>
              <Login />
            </LoginShell>
          </GuestOnly>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route element={<MainLayout />}>
          <Route path="home" element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="model" element={<Model />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
