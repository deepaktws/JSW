import { Alert, Button, List, Spin, Typography } from 'antd';
import { useGetUsersQuery } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export function Dashboard() {
  const { token } = useAuth();
  const { data, error, isLoading, isFetching, refetch } = useGetUsersQuery(undefined, {
    skip: !token,
  });

  if (!token) {
    return <Text type="secondary">You need to sign in to view this page.</Text>;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          Dashboard
        </Title>
        <Button onClick={() => refetch()} loading={isFetching}>
          Refresh users
        </Button>
      </div>
      <Text type="secondary">
        Protected RTK Query call: <Text code>useGetUsersQuery</Text>
      </Text>

      {isLoading && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Spin tip="Loading users…" />
        </div>
      )}

      {error && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          message="Could not load users."
          description={error?.data?.message || error?.error || 'Unknown error'}
        />
      )}

      {data?.users && (
        <List
          style={{ marginTop: 16 }}
          bordered
          dataSource={data.users}
          renderItem={(u) => (
            <List.Item>
              <List.Item.Meta title={u.name} description={u.email} />
              <Text type="secondary">{new Date(u.createdAt).toLocaleString()}</Text>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
