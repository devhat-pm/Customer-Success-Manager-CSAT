import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Tabs,
  Alert,
  Avatar,
  Descriptions,
  Divider,
  Space,
  Tag,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  LockOutlined,
  SaveOutlined,
  EditOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi, getErrorMessage } from '@/api';
import { showSuccess, showError } from '@/stores/uiStore';

const { Title, Text } = Typography;

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone?: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ProfilePage: React.FC = () => {
  const { customerUser, customer, setCustomerUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const onUpdateProfile = async (values: ProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      const updated = await authApi.updateProfile(values);
      setCustomerUser(updated);
      showSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (values: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      showSuccess('Password changed successfully');
      passwordForm.resetFields();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          Profile
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={8}>
            {/* Profile Card */}
            <Card className="text-center mb-6">
              <Avatar
                size={100}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#9c27b0', marginBottom: 16 }}
              />
              <Title level={4} style={{ marginBottom: 4 }}>
                {customerUser?.first_name} {customerUser?.last_name}
              </Title>
              <Text type="secondary">{customerUser?.email}</Text>
              <Divider />
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Role">
                  <Tag color="purple">
                    {customerUser?.role === 'admin' ? 'Administrator' : 'User'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Company">
                  {customer?.company_name}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Company Info Card */}
            <Card title={<><BuildOutlined /> Company Information</>}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Company Name">
                  {customer?.company_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Contract Status">
                  <Tag color="success">Active</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card
              title="Personal Information"
              extra={
                !isEditingProfile && (
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      profileForm.setFieldsValue({
                        first_name: customerUser?.first_name,
                        last_name: customerUser?.last_name,
                        phone: customerUser?.phone,
                      });
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit
                  </Button>
                )
              }
            >
              {isEditingProfile ? (
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={onUpdateProfile}
                  size="large"
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="first_name"
                        label="First Name"
                        rules={[{ required: true, message: 'First name is required' }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="First Name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="last_name"
                        label="Last Name"
                        rules={[{ required: true, message: 'Last name is required' }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Last Name" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="phone"
                    label="Phone Number"
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Phone Number" />
                  </Form.Item>

                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={isUpdatingProfile}
                    >
                      Save Changes
                    </Button>
                  </div>
                </Form>
              ) : (
                <Descriptions column={{ xs: 1, md: 2 }} bordered>
                  <Descriptions.Item label="First Name">
                    {customerUser?.first_name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Name">
                    {customerUser?.last_name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {customerUser?.email || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    {customerUser?.phone || '-'}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          Security
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card title="Change Password">
              <Alert
                message="Password Requirements"
                description={
                  <ul className="list-disc pl-4 mb-0">
                    <li>At least 8 characters long</li>
                    <li>Contains uppercase and lowercase letters</li>
                    <li>Contains at least one number</li>
                  </ul>
                }
                type="info"
                showIcon
                className="mb-6"
              />

              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={onChangePassword}
                size="large"
              >
                <Form.Item
                  name="current_password"
                  label="Current Password"
                  rules={[{ required: true, message: 'Please enter your current password' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Current Password"
                  />
                </Form.Item>

                <Form.Item
                  name="new_password"
                  label="New Password"
                  rules={[
                    { required: true, message: 'Please enter a new password' },
                    { min: 8, message: 'Password must be at least 8 characters' },
                    {
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number',
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="New Password"
                  />
                </Form.Item>

                <Form.Item
                  name="confirm_password"
                  label="Confirm New Password"
                  dependencies={['new_password']}
                  rules={[
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirm New Password"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<LockOutlined />}
                    loading={isChangingPassword}
                  >
                    Change Password
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Account Security">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Last Password Change">
                  <Text type="secondary">Not available</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Two-Factor Authentication">
                  <Space>
                    <Tag color="default">Not Enabled</Tag>
                    <Text type="secondary" className="text-xs">Contact admin to enable</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Active Sessions">
                  <Text type="secondary">1 active session</Text>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Alert
                message="Need Help?"
                description="If you're having trouble accessing your account, please contact support."
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 4 }}>
          My Profile
        </Title>
        <Text type="secondary">
          Manage your account settings and preferences
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default ProfilePage;
