import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Segmented, Space, Typography } from 'antd';
import { useLoginMutation, useRegisterMutation } from '../services/api';

const { Title, Text } = Typography;

function formatMutationError(err) {
  if (!err) return null;
  const data = err.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((e) => e.msg || e.message || JSON.stringify(e)).join('; ');
  }
  if (typeof err.error === 'string') return err.error;
  return 'Request failed';
}

export function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();

  const busy = loginState.isLoading || registerState.isLoading;
  const error = formatMutationError(loginState.error || registerState.error);

  async function handleFinish(values) {
    try {
      if (mode === 'login') {
        await login({ email: values.email, password: values.password }).unwrap();
      } else {
        await register({
          name: values.name,
          email: values.email,
          password: values.password,
        }).unwrap();
      }
      navigate('/home', { replace: true });
    } catch {
      /* RTK Query sets error on hook */
    }
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Title>
          <Text type="secondary">
            {mode === 'login' ? 'Use your account to continue.' : 'Register to get started.'}
          </Text>
        </div>

        <Segmented
          block
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Login', value: 'login' },
            { label: 'Register', value: 'register' },
          ]}
        />

        <Form
          key={mode}
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
          style={{ marginBottom: 0 }}
        >
          {mode === 'register' && (
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input autoComplete="name" />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'At least 8 characters' },
            ]}
          >
            <Input.Password
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Form.Item>

          {error && <Alert type="error" message={String(error)} showIcon />}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={busy}>
              {mode === 'login' ? 'Sign in' : 'Register'}
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
}
