import React, { useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  CustomerServiceOutlined,
  StarOutlined,
  AppstoreOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { authApi } from '@/api';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const CustomerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, customerUser, customer, logout } = useAuthStore();
  const { sidebarCollapsed, isMobile, setSidebarCollapsed, setIsMobile, sidebarOpen, setSidebarOpen } = useUIStore();

  // Handle responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/tickets',
      icon: <CustomerServiceOutlined />,
      label: 'Support Tickets',
    },
    {
      key: '/feedback',
      icon: <StarOutlined />,
      label: 'Feedback',
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: 'Products',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
    },
  ];

  const handleMenuClick = (info: { key: string }) => {
    navigate(info.key);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const getInitials = () => {
    if (customerUser) {
      return `${customerUser.first_name?.charAt(0) || ''}${customerUser.last_name?.charAt(0) || ''}`.toUpperCase();
    }
    return 'U';
  };

  // Find selected key based on current path
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/tickets')) return '/tickets';
    if (path.startsWith('/feedback')) return '/feedback';
    if (path.startsWith('/products')) return '/products';
    if (path.startsWith('/profile')) return '/profile';
    if (path.startsWith('/help')) return '/help';
    return '/dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
          style={{ zIndex: 999 }}
        />
      )}

      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={isMobile ? false : sidebarCollapsed}
        width={250}
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          position: isMobile ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 1000,
          left: isMobile && !sidebarOpen ? -250 : 0,
          transition: 'left 0.2s ease',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-100 px-4">
          <img
            src="/logo.svg"
            alt="Success Manager"
            className={`${sidebarCollapsed && !isMobile ? 'h-6' : 'h-8'} w-auto transition-all`}
          />
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none', marginTop: 8 }}
        />

        {/* Quick Action */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="p-4 absolute bottom-16 left-0 right-0">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => navigate('/tickets/new')}
            >
              New Ticket
            </Button>
          </div>
        )}
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : setSidebarCollapsed(!sidebarCollapsed)}
              style={{ fontSize: '16px' }}
            />
            <div className="hidden md:block">
              <Text strong style={{ fontSize: '16px' }}>{customer?.company_name}</Text>
            </div>
          </div>

          <Space size="middle">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100">
                <Avatar
                  style={{ backgroundColor: '#9c27b0' }}
                  size="default"
                >
                  {getInitials()}
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">
                  {customerUser?.first_name} {customerUser?.last_name}
                </span>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px',
            minHeight: 'calc(100vh - 64px - 70px)',
          }}
        >
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center', background: 'transparent', padding: '16px 24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            © {new Date().getFullYear()} Extravis. All rights reserved.
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
};

export default CustomerLayout;
