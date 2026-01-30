import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi, getErrorMessage } from '@/api';

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
        rememberMe: values.remember,
      });

      // Transform backend response to match our store format
      setAuth({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        customerUser: {
          id: response.user.id,
          email: response.user.email,
          first_name: response.user.full_name?.split(' ')[0] || '',
          last_name: response.user.full_name?.split(' ').slice(1).join(' ') || '',
          full_name: response.user.full_name,
          job_title: response.user.job_title,
          phone: response.user.phone,
          customer_id: response.company.id,
          customer_name: response.company.name,
          is_primary_contact: response.user.is_primary_contact || false,
          is_active: true,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        customer: {
          id: response.company.id,
          company_name: response.company.name,
          industry: response.company.industry,
          portal_enabled: true,
        },
      });

      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <Title level={3} style={{ marginBottom: 8 }}>
          Welcome Back
        </Title>
        <Text type="secondary">
          Sign in to access your customer portal
        </Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-6"
        />
      )}

      <Form
        name="login"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="Email Address"
            autoComplete="email"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Please enter your password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Password"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item>
          <div className="flex justify-between items-center">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isLoading}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center">
        <Text type="secondary">
          Don't have an account?{' '}
          <Text>Contact your Extravis representative to get started.</Text>
        </Text>
      </div>
    </div>
  );
};

export default LoginPage;
