import { Button } from 'antd';
import { Link } from 'react-router-dom';

export function AppNavbar({ showLogout = false, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-secondary-border/80 bg-secondary/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full items-center justify-between px-4">
        <Link to="/home">
          <img src="/assets/jswLogo.png" alt="JSW logo" className="block h-8 w-32 object-contain" />
        </Link>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <span className="text-2xl font-semibold tracking-wide text-secondary-foreground font-serif">
            Blend Mix
          </span>
        </div>

        <div className="flex min-w-24 items-center justify-end">
          {showLogout && (
            <Button
              type="primary"
              onClick={onLogout}
              className="!h-9 !rounded-md !border-primary !bg-primary !px-4 !text-primary-foreground hover:!border-primary/90 hover:!bg-primary/90"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
