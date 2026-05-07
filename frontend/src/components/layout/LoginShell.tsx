import type { ReactNode } from 'react';
import { Layout } from 'antd';
import { AppNavbar } from './AppNavbar';

const { Content } = Layout;

type LoginShellProps = {
  children: ReactNode;
};

/** Full-viewport centered shell for auth screens (matches Ant Design page background). */
export function LoginShell({ children }: LoginShellProps) {
  return (
    <Layout className="relative min-h-screen overflow-hidden bg-secondary/10">
      <AppNavbar />
      <Content className="relative flex flex-col items-center justify-center bg-secondary/10 px-4 py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-secondary/35 blur-3xl" />
        <img
          src="/assets/jswLogo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto w-[44rem] max-w-[92vw] object-contain opacity-20"
        />
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </Content>
    </Layout>
  );
}

