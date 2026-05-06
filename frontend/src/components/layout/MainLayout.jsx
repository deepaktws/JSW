import { Button, Layout, Menu } from 'antd';
import { useDispatch } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';

const { Header, Content } = Layout;

export function MainLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = location.pathname.startsWith('/dashboard') ? '/dashboard' : '/home';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16, paddingInline: 24 }}>
        <Link to="/home" style={{ color: '#fff', fontWeight: 600, fontSize: 18, whiteSpace: 'nowrap' }}>
          JSSL
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end', borderBottom: 'none', background: 'transparent' }}
          items={[
            {
              key: '/home',
              label: 'Home',
              onClick: () => navigate('/home'),
            },
            {
              key: '/dashboard',
              label: 'Dashboard',
              onClick: () => navigate('/dashboard'),
            },
          ]}
        />
        <Button type="primary" ghost onClick={() => dispatch(logout())}>
          Log out
        </Button>
      </Header>
      <Content
        style={{
          padding: '32px 24px',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
}
