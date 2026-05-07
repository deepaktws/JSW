import { Layout } from 'antd';
import { useDispatch } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AppNavbar } from './AppNavbar';
import { logout } from '../../features/auth/authSlice';

const { Content } = Layout;

export function MainLayout() {
  const dispatch = useDispatch();

  return (
    <Layout className="min-h-screen bg-secondary/5">
      <AppNavbar showLogout onLogout={() => dispatch(logout())} />
      <Content className="mx-auto w-full max-w-7xl px-6 py-8">
        <Outlet />
      </Content>
    </Layout>
  );
}
