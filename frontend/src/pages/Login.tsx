import { useNavigate } from 'react-router-dom';
import { MdEmail, MdLock } from 'react-icons/md';
import { FaUser } from 'react-icons/fa';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useLoginMutation } from '../services/api';

const { Title, Text } = Typography;

type LoginFormValues = {
  email: string;
  password: string;
};

function formatMutationError(err: unknown): string | null {
  if (!err) return null;
  if (typeof err !== 'object') return 'Request failed';
  const record = err as Record<string, unknown>;

  const data = record.data;
  if (typeof data === 'object' && data) {
    const dataRecord = data as Record<string, unknown>;
    if (typeof dataRecord.message === 'string') return dataRecord.message;
    if (Array.isArray(dataRecord.errors)) {
      return dataRecord.errors
        .map((e) => {
          if (typeof e === 'string') return e;
          if (typeof e === 'object' && e) {
            const er = e as Record<string, unknown>;
            if (typeof er.msg === 'string') return er.msg;
            if (typeof er.message === 'string') return er.message;
          }
          return JSON.stringify(e);
        })
        .join('; ');
    }
  }

  if (typeof record.error === 'string') return record.error;
  return 'Request failed';
}

export function Login() {
  const navigate = useNavigate();

  const [login, loginState] = useLoginMutation();
  const busy = loginState.isLoading;
  const error = formatMutationError(loginState.error);

  async function handleFinish(values: LoginFormValues) {
    try {
      await login({ email: values.email, password: values.password }).unwrap();
      navigate('/home', { replace: true });
    } catch {
      /* RTK Query sets error on hook */
    }
  }

  return (
    <Card className="w-full rounded-3xl !border-secondary-border/45 !bg-secondary/10 !backdrop-blur-xl shadow-2xl shadow-secondary/20">
      <Space direction="vertical" size="large" className="w-full">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-xl text-secondary shadow-md shadow-secondary/20">
            <FaUser className="text-3xl" />
          </div>
          <Title level={3} className="mb-1 text-secondary-foreground">
            Sign in with email
          </Title>
          <Text className="text-secondary">Use your account credentials to continue.</Text>
        </div>

        <Form<LoginFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
          className="space-y-1"
        >
          <Form.Item
            name="email"
            className="!mb-3"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              type="email"
              autoComplete="email"
              prefix={<MdEmail className="text-secondary" size={20} />}
              placeholder="Email"
              className="!h-11 !rounded-xl !border-secondary-border/55 !bg-secondary/15 !text-secondary placeholder:!text-secondary/60"
            />
          </Form.Item>
          <Form.Item
            name="password"
            className="!mb-3"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'At least 8 characters' },
            ]}
          >
            <Input.Password
              autoComplete="current-password"
              prefix={<MdLock className="text-secondary" size={20} />}
              placeholder="Password"
              className="!h-11 !rounded-xl !border-secondary-border/55 !bg-secondary/15 !text-secondary placeholder:!text-secondary/60"
            />
          </Form.Item>

          {error && <Alert type="error" message={String(error)} showIcon />}

          <Form.Item className="!mb-0">
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={busy}
              className="!h-11 !rounded-xl !border-primary !bg-primary !font-semibold !text-primary-foreground hover:!border-primary/90 hover:!bg-primary/90"
            >
              Get Started
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
}

