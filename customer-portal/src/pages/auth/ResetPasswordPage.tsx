import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Result } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authApi, getErrorMessage } from '@/api';

const { Title, Text } = Typography;

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(token, values.password);
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid Reset Link"
        subTitle="This password reset link is invalid or missing. Please request a new password reset."
        extra={
          <Link to="/forgot-password">
            <Button type="primary">Request New Reset Link</Button>
          </Link>
        }
      />
    );
  }

  if (isSuccess) {
    return (
      <Result
        status="success"
        title="Password Reset Successfully"
        subTitle="Your password has been updated. You can now sign in with your new password."
        extra={
          <Link to="/login">
            <Button type="primary" size="large">
              Sign In
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/login" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeftOutlined />
          Back to login
        </Link>
      </div>

      <div className="text-center mb-6">
        <Title level={3} style={{ marginBottom: 8 }}>
          Reset Your Password
        </Title>
        <Text type="secondary">
          Enter your new password below.
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
        name="reset-password"
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="password"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Password must contain uppercase, lowercase, and number',
            },
          ]}
          extra="At least 8 characters with uppercase, lowercase, and number"
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Enter new password"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Confirm new password"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isLoading}
          >
            Reset Password
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ResetPasswordPage;
