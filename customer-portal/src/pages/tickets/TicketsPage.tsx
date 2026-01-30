import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { ticketsApi, getErrorMessage } from '@/api';
import { Ticket, TicketStatus, TicketPriority, TicketFilters } from '@/types';
import { showError } from '@/stores/uiStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const TicketsPage: React.FC = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<TicketFilters>({
    skip: 0,
    limit: 10,
  });
  const [searchText, setSearchText] = useState('');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ticketsApi.getTickets(filters);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchText || undefined,
      skip: 0,
    }));
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      skip: ((pagination.current || 1) - 1) * (pagination.pageSize || 10),
      limit: pagination.pageSize || 10,
    }));
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

  const columns: ColumnsType<Ticket> = [
    {
      title: 'Ticket #',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
      render: (text, record) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)} className="font-medium">
          {text}
        </a>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: TicketStatus) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: TicketPriority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 120,
      render: (product) => <Text type="secondary">{product}</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date) => (
        <Tooltip title={dayjs(date).format('MMM D, YYYY h:mm A')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tickets/${record.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Support Tickets
          </Title>
          <Text type="secondary">
            View and manage your support requests
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/tickets/new')}
          size="large"
        >
          New Ticket
        </Button>
      </div>

      <Card>
        {/* Filters */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search tickets..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, skip: 0 }))}
            >
              {Object.values(TicketStatus).map((status) => (
                <Select.Option key={status} value={status}>
                  {status.replace('_', ' ')}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Product"
              style={{ width: '100%' }}
              allowClear
              value={filters.product}
              onChange={(value) => setFilters((prev) => ({ ...prev, product: value, skip: 0 }))}
            >
              <Select.Option value="MonetX">MonetX</Select.Option>
              <Select.Option value="MonetX_Recon">MonetX Recon</Select.Option>
              <Select.Option value="SupportX">SupportX</Select.Option>
              <Select.Option value="PartnerLearn">PartnerLearn</Select.Option>
              <Select.Option value="AgentShield">AgentShield</Select.Option>
              <Select.Option value="ToolshubPro">ToolshubPro</Select.Option>
            </Select>
          </Col>
          <Col>
            <Space>
              <Button icon={<SearchOutlined />} onClick={handleSearch}>
                Search
              </Button>
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined />} onClick={fetchTickets} loading={isLoading} />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: Math.floor((filters.skip || 0) / (filters.limit || 10)) + 1,
            pageSize: filters.limit || 10,
            total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tickets`,
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                description="No tickets found"
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
            ),
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default TicketsPage;
