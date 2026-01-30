import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Skeleton,
  List,
  Alert,
  Avatar,
  Empty,
  Progress,
  Space,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  StarOutlined,
  AppstoreOutlined,
  NotificationOutlined,
  UserOutlined,
  ArrowRightOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi, getErrorMessage } from '@/api';
import { CustomerDashboard, TicketStatus, TicketPriority } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

// Health Score Gauge Component
const HealthScoreGauge: React.FC<{
  score: number;
  status: string;
  trend: string;
  message: string;
}> = ({ score, status, trend, message }) => {
  const getColor = () => {
    if (status === 'healthy') return '#52c41a';
    if (status === 'at_risk') return '#faad14';
    return '#ff4d4f';
  };

  const getTrendIcon = () => {
    if (trend === 'improving') return <RiseOutlined style={{ color: '#52c41a' }} />;
    if (trend === 'declining') return <FallOutlined style={{ color: '#ff4d4f' }} />;
    return <MinusOutlined style={{ color: '#8c8c8c' }} />;
  };

  return (
    <div className="text-center py-4">
      <Progress
        type="dashboard"
        percent={score}
        strokeColor={getColor()}
        format={(percent) => (
          <div>
            <span className="text-3xl font-bold">{percent}</span>
            <span className="text-lg text-gray-400">/100</span>
          </div>
        )}
        size={160}
      />
      <div className="mt-4 flex items-center justify-center gap-2">
        <Tag color={status === 'healthy' ? 'success' : status === 'at_risk' ? 'warning' : 'error'}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
        {getTrendIcon()}
      </div>
      <Text type="secondary" className="block mt-2">{message}</Text>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerUser, customer } = useAuthStore();

  const [dashboard, setDashboard] = useState<CustomerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await dashboardApi.getDashboard();
        setDashboard(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return 'blue';
      case TicketStatus.IN_PROGRESS: return 'orange';
      case TicketStatus.WAITING_CUSTOMER: return 'purple';
      case TicketStatus.RESOLVED: return 'green';
      case TicketStatus.CLOSED: return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.CRITICAL: return 'red';
      case TicketPriority.HIGH: return 'orange';
      case TicketPriority.MEDIUM: return 'blue';
      case TicketPriority.LOW: return 'green';
      default: return 'default';
    }
  };

  if (error) {
    return (
      <Alert
        message="Error loading dashboard"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="fade-in">
      {/* Welcome Header */}
      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 4 }}>
          Welcome back, {customerUser?.first_name || 'there'}!
        </Title>
        <Text type="secondary">
          Here's an overview of your account at {customer?.company_name}.
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Health Score Widget */}
        <Col xs={24} md={8}>
          <Card title="Account Health" className="h-full">
            {isLoading ? (
              <Skeleton active />
            ) : dashboard?.health_score ? (
              <HealthScoreGauge
                score={dashboard.health_score.overall_score}
                status={dashboard.health_score.health_status}
                trend={dashboard.health_score.trend}
                message={dashboard.health_score.health_message}
              />
            ) : (
              <Empty description="Health score not available" />
            )}
          </Card>
        </Col>

        {/* Tickets Summary Widget */}
        <Col xs={24} md={8}>
          <Card
            title="My Tickets"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => navigate('/tickets/new')}
              >
                New
              </Button>
            }
            className="h-full"
          >
            {isLoading ? (
              <Skeleton active />
            ) : dashboard?.tickets_summary ? (
              <>
                <Row gutter={16} className="mb-4">
                  <Col span={12}>
                    <Card size="small" style={{ background: '#e6f7ff', border: 'none' }}>
                      <Statistic
                        title={<span className="text-blue-600">Open</span>}
                        value={dashboard.tickets_summary.open_count}
                        valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#fff7e6', border: 'none' }}>
                      <Statistic
                        title={<span className="text-orange-600">In Progress</span>}
                        value={dashboard.tickets_summary.in_progress_count}
                        valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Text type="secondary" className="block text-center">
                  {dashboard.tickets_summary.resolved_this_month} resolved this month
                </Text>
                <Button
                  type="link"
                  block
                  onClick={() => navigate('/tickets')}
                  icon={<ArrowRightOutlined />}
                  className="mt-4"
                >
                  View All Tickets
                </Button>
              </>
            ) : null}
          </Card>
        </Col>

        {/* Pending Surveys Widget */}
        <Col xs={24} md={8}>
          <Card
            title="Pending Feedback"
            extra={<StarOutlined style={{ color: '#faad14' }} />}
            className="h-full"
          >
            {isLoading ? (
              <Skeleton active />
            ) : dashboard?.pending_surveys && dashboard.pending_surveys.count > 0 ? (
              <>
                <Alert
                  message={`You have ${dashboard.pending_surveys.count} pending survey${dashboard.pending_surveys.count > 1 ? 's' : ''}`}
                  type="info"
                  showIcon
                  className="mb-4"
                />
                <List
                  size="small"
                  dataSource={dashboard.pending_surveys.surveys.slice(0, 2)}
                  renderItem={(survey) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<StarOutlined />}
                        title={survey.survey_type.replace('_', ' ')}
                        description={survey.linked_ticket_number ? `Ticket: ${survey.linked_ticket_number}` : null}
                      />
                    </List.Item>
                  )}
                />
                <Button
                  type="default"
                  block
                  onClick={() => navigate('/feedback')}
                  className="mt-4"
                >
                  Complete Surveys
                </Button>
              </>
            ) : (
              <Empty description="No pending surveys" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* Recent Tickets */}
        <Col xs={24} md={16}>
          <Card
            title="Recent Tickets"
            extra={
              <Button type="link" onClick={() => navigate('/tickets')} icon={<ArrowRightOutlined />}>
                View All
              </Button>
            }
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : dashboard?.tickets_summary?.recent_tickets && dashboard.tickets_summary.recent_tickets.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={dashboard.tickets_summary.recent_tickets}
                renderItem={(ticket) => (
                  <List.Item
                    className="cursor-pointer hover:bg-gray-50 rounded px-2"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <List.Item.Meta
                      avatar={<CustomerServiceOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />}
                      title={
                        <Space>
                          <Text strong>{ticket.ticket_number}</Text>
                          <Tag color={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Tag>
                          <Tag color={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div className="flex justify-between items-center">
                          <Text type="secondary" ellipsis style={{ maxWidth: '70%' }}>
                            {ticket.subject}
                          </Text>
                          <Text type="secondary" className="text-xs">
                            {dayjs(ticket.created_at).fromNow()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description="No recent tickets"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/tickets/new')}
                >
                  Create Your First Ticket
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Account Info & Products */}
        <Col xs={24} md={8}>
          <Card title="Your Account Manager" className="mb-6">
            {isLoading ? (
              <Skeleton avatar active paragraph={{ rows: 1 }} />
            ) : dashboard?.contract_info?.account_manager_name ? (
              <div className="flex items-center gap-3">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#9c27b0' }} />
                <div>
                  <Text strong className="block">{dashboard.contract_info.account_manager_name}</Text>
                  <Text type="secondary" className="text-sm">{dashboard.contract_info.account_manager_email}</Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">Contact support for assistance</Text>
            )}
          </Card>

          <Card
            title="My Products"
            extra={<AppstoreOutlined />}
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : dashboard?.products?.products && dashboard.products.products.length > 0 ? (
              <>
                <List
                  size="small"
                  dataSource={dashboard.products.products.slice(0, 4)}
                  renderItem={(product) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <div
                            className="w-2 h-2 rounded-full mt-2"
                            style={{ backgroundColor: product.status === 'active' ? '#52c41a' : '#8c8c8c' }}
                          />
                        }
                        title={product.product_name}
                        description={product.version ? `v${product.version}` : null}
                      />
                    </List.Item>
                  )}
                />
                <Button
                  type="link"
                  block
                  onClick={() => navigate('/products')}
                  icon={<ArrowRightOutlined />}
                >
                  View All Products
                </Button>
              </>
            ) : (
              <Empty description="No products deployed" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* Announcements */}
        {dashboard?.announcements?.announcements && dashboard.announcements.announcements.length > 0 && (
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <NotificationOutlined style={{ color: '#9c27b0' }} />
                  Announcements
                </Space>
              }
            >
              {dashboard.announcements.announcements.map((announcement) => (
                <Alert
                  key={announcement.id}
                  message={<Text strong>{announcement.title}</Text>}
                  description={
                    <div>
                      <Paragraph className="mb-1">{announcement.content}</Paragraph>
                      <Text type="secondary" className="text-xs">
                        Posted {dayjs(announcement.start_date).format('MMM D, YYYY')}
                      </Text>
                    </div>
                  }
                  type={announcement.priority === 'important' ? 'warning' : 'info'}
                  showIcon
                  className="mb-3"
                />
              ))}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default DashboardPage;
