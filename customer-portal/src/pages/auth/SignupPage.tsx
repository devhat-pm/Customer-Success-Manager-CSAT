import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Alert, Typography, Spin, Result } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi, getErrorMessage } from '@/api';
import { InvitationValidation } from '@/types';

const { Title, Text } = Typography;

interface SignupFormData {
  full_name: string;
  password: string;
  confirmPassword: string;
  job_title?: string;
  phone?: string;
  acceptTerms: boolean;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { setAuth } = useAuthStore();
  const [form] = Form.useForm();

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No invitation token provided. Please use the link from your invitation email.');
        setIsValidating(false);
        return;
      }

      try {
        const result = await authApi.validateInvitation(token);
        setInvitation(result);

        if (!result.valid) {
          setError(result.message || 'Invalid invitation');
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onFinish = async (values: SignupFormData) => {
    if (!token || !invitation?.valid) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.signup({
        token,
        password: values.password,
        full_name: values.full_name,
        job_title: values.job_title || undefined,
        phone: values.phone || undefined,
      });

      setAuth({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        customerUser: response.customer_user,
        customer: response.customer,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="text-center py-8">
        <Spin size="large" />
        <div className="mt-4">
          <Text>Validating invitation...</Text>
        </div>
      </div>
    );
  }

  if (!invitation?.valid) {
    return (
      <Result
        status="error"
        title="Invalid Invitation"
        subTitle={error || 'This invitation link is invalid or has expired.'}
        extra={
          <Link to="/login">
            <Button type="primary">Back to Login</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <Title level={3} style={{ marginBottom: 8 }}>
          Create Your Account
        </Title>
        <Text type="secondary">
          You've been invited to join <Text strong>{invitation.customer_name}</Text> on the Extravis Customer Portal.
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
        form={form}
        name="signup"
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item label="Email Address">
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            value={invitation.email || ''}
            disabled
          />
          <Text type="secondary" className="text-xs">Email cannot be changed</Text>
        </Form.Item>

        <Form.Item
          name="full_name"
          label="Full Name"
          rules={[
            { required: true, message: 'Please enter your full name' },
            { min: 2, message: 'Name must be at least 2 characters' },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="John Doe"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="job_title"
          label="Job Title (Optional)"
        >
          <Input
            prefix={<IdcardOutlined className="text-gray-400" />}
            placeholder="Product Manager"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number (Optional)"
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder="+1 234 567 8900"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
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
            placeholder="Create a strong password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
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
            placeholder="Confirm your password"
          />
        </Form.Item>

        <Form.Item
          name="acceptTerms"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('You must accept the terms and conditions')),
            },
          ]}
        >
          <Checkbox>
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isLoading}
          >
            Create Account
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center">
        <Text type="secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </Text>
      </div>
    </div>
  );
};

export default SignupPage;
