/** Full-viewport centered shell for auth screens (matches Ant Design page background). */
export function LoginShell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        background: '#f0f2f5',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
    </div>
  );
}
