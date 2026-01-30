import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authApi } from '@/api';

const { Title, Text } = Typography;

const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const onFinish = async (values: { email: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.forgotPassword(values.email);
      setSubmittedEmail(values.email);
      setIsSubmitted(true);
    } catch (err) {
      // Show success message regardless for security reasons
      setSubmittedEmail(values.email);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Result
        status="success"
        title="Check Your Email"
        subTitle={
          <div className="text-center">
            <p>If an account exists with <strong>{submittedEmail}</strong>, we've sent password reset instructions.</p>
            <p className="mt-2 text-sm text-gray-500">
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        }
        extra={
          <Link to="/login">
            <Button type="primary" icon={<ArrowLeftOutlined />}>
              Back to Login
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
          Forgot Password?
        </Title>
        <Text type="secondary">
          No worries! Enter your email address and we'll send you instructions to reset your password.
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
        name="forgot-password"
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
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="Email Address"
            autoComplete="email"
            autoFocus
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isLoading}
          >
            Send Reset Instructions
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ForgotPasswordPage;
