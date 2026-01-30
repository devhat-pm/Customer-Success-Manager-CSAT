import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Tag,
  Input,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Alert,
  Spin,
  Divider,
  Avatar,
  Modal,
  Space,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ticketsApi, getErrorMessage } from '@/api';
import { TicketDetail, TicketStatus, TicketPriority, CreatorType } from '@/types';
import { showSuccess, showError } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customerUser } = useAuthStore();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeFeedback, setCloseFeedback] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(fetchTicket, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchTicket = async () => {
    if (!id) return;

    try {
      const data = await ticketsApi.getTicket(id);
      setTicket(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!id || !newComment.trim()) return;

    setIsSending(true);
    try {
      await ticketsApi.addComment(id, { comment_text: newComment.trim() });
      setNewComment('');
      await fetchTicket();
      showSuccess('Comment added successfully');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;

    setIsClosing(true);
    try {
      await ticketsApi.closeTicket(id, closeFeedback || undefined);
      setCloseModalOpen(false);
      setCloseFeedback('');
      await fetchTicket();
      showSuccess('Ticket closed successfully');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!id) return;

    try {
      await ticketsApi.reopenTicket(id);
      await fetchTicket();
      showSuccess('Ticket reopened successfully');
    } catch (err) {
      showError(getErrorMessage(err));
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div>
        <Alert
          message="Error"
          description={error || 'Ticket not found'}
          type="error"
          showIcon
          className="mb-4"
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const canClose = ticket.status !== TicketStatus.CLOSED;
  const canReopen = ticket.status === TicketStatus.CLOSED;
  const canComment = ticket.status !== TicketStatus.CLOSED;

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item>
          <a onClick={() => navigate('/tickets')}>Tickets</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{ticket.ticket_number}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Title level={3} style={{ marginBottom: 0 }}>
              {ticket.ticket_number}
            </Title>
            <Tag color={getStatusColor(ticket.status)}>
              {ticket.status.replace('_', ' ').toUpperCase()}
            </Tag>
            {ticket.sla_breached && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                SLA Breached
              </Tag>
            )}
          </div>
          <Text type="secondary" className="text-lg">{ticket.subject}</Text>
        </div>

        <Space>
          {canReopen && (
            <Button icon={<ReloadOutlined />} onClick={handleReopenTicket}>
              Reopen Ticket
            </Button>
          )}
          {canClose && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => setCloseModalOpen(true)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Close Ticket
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Main Content - Conversation */}
        <Col xs={24} lg={16}>
          <Card title="Conversation">
            {/* Original Description */}
            <div
              className="p-4 mb-4 rounded-lg bg-gray-50"
              style={{ borderLeft: '4px solid #9c27b0' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar
                  size="small"
                  style={{ backgroundColor: '#9c27b0' }}
                  icon={<UserOutlined />}
                />
                <div>
                  <Text strong>
                    {ticket.created_by_type === CreatorType.CUSTOMER ? 'You' : 'Extravis Support'}
                  </Text>
                  <Text type="secondary" className="ml-2 text-xs">
                    {dayjs(ticket.created_at).format('MMM D, YYYY h:mm A')}
                  </Text>
                </div>
              </div>
              <Paragraph className="mb-0 whitespace-pre-wrap">
                {ticket.description}
              </Paragraph>
            </div>

            <Divider />

            {/* Comments */}
            {ticket.comments.length > 0 ? (
              <div className="flex flex-col gap-4">
                {ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg"
                    style={{
                      borderLeft: '4px solid',
                      borderLeftColor: comment.commenter_type === CreatorType.CUSTOMER ? '#9c27b0' : '#52c41a',
                      backgroundColor: comment.commenter_type === CreatorType.CUSTOMER ? '#faf5fc' : '#f6ffed',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        size="small"
                        style={{
                          backgroundColor: comment.commenter_type === CreatorType.CUSTOMER ? '#9c27b0' : '#52c41a',
                        }}
                        icon={comment.commenter_type === CreatorType.CUSTOMER ? <UserOutlined /> : <CustomerServiceOutlined />}
                      />
                      <div>
                        <Text strong>
                          {comment.commenter_type === CreatorType.CUSTOMER
                            ? comment.commenter_customer_user_id === customerUser?.id
                              ? 'You'
                              : comment.commenter_name || 'Customer'
                            : comment.commenter_name || 'Extravis Support'}
                        </Text>
                        <Text type="secondary" className="ml-2 text-xs">
                          {dayjs(comment.created_at).format('MMM D, YYYY h:mm A')}
                        </Text>
                      </div>
                    </div>
                    <Paragraph className="mb-0 whitespace-pre-wrap">
                      {comment.comment_text}
                    </Paragraph>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Text type="secondary">No replies yet</Text>
              </div>
            )}

            {/* Add Comment Form */}
            {canComment && (
              <>
                <Divider />
                <div>
                  <Text strong className="block mb-2">Add a Reply</Text>
                  <TextArea
                    rows={4}
                    placeholder="Type your message here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-3"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSendComment}
                      loading={isSending}
                      disabled={!newComment.trim()}
                    >
                      Send Reply
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Sidebar - Ticket Info */}
        <Col xs={24} lg={8}>
          <Card title="Ticket Details">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Product">
                {ticket.product}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Created">
                <div>
                  <div>{dayjs(ticket.created_at).format('MMM D, YYYY h:mm A')}</div>
                  <Text type="secondary" className="text-xs">
                    ({dayjs(ticket.created_at).fromNow()})
                  </Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {dayjs(ticket.updated_at).format('MMM D, YYYY h:mm A')}
              </Descriptions.Item>
              {ticket.resolved_at && (
                <Descriptions.Item label="Resolved">
                  {dayjs(ticket.resolved_at).format('MMM D, YYYY h:mm A')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Replies">
                {ticket.comment_count}
              </Descriptions.Item>
            </Descriptions>

            {ticket.customer_visible_notes && (
              <>
                <Divider />
                <div>
                  <Text type="secondary" className="block mb-2 text-xs">Notes</Text>
                  <div className="p-3 bg-gray-50 rounded">
                    <Text>{ticket.customer_visible_notes}</Text>
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Close Ticket Modal */}
      <Modal
        title="Close Ticket"
        open={closeModalOpen}
        onCancel={() => setCloseModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCloseModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="close"
            type="primary"
            loading={isClosing}
            onClick={handleCloseTicket}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Close Ticket
          </Button>,
        ]}
      >
        <Paragraph type="secondary">
          Are you sure you want to close this ticket? You can optionally provide feedback about your support experience.
        </Paragraph>
        <TextArea
          rows={3}
          placeholder="How was your support experience? (Optional)"
          value={closeFeedback}
          onChange={(e) => setCloseFeedback(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default TicketDetailPage;
