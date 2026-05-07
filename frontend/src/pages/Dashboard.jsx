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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Title level={2} className="!m-0">
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
        <div className="mt-6 text-center">
          <Spin tip="Loading users…" />
        </div>
      )}

      {error && (
        <Alert
          className="mt-4"
          type="error"
          showIcon
          message="Could not load users."
          description={error?.data?.message || error?.error || 'Unknown error'}
        />
      )}

      {data?.users && (
        <List
          className="mt-4"
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
