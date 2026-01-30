import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI, alertsAPI, csatAPI } from '@/services/api'
import { formatNumber } from '@/lib/utils'
import {
  Users,
  HeartPulse,
  ThumbsUp,
  Bell,
} from 'lucide-react'

import {
  StatCard,
  StatCardSkeleton,
  GaugeStatCard,
  NPSStatCard,
  AlertsStatCard,
  HealthDistributionChart,
  AlertsSummaryCard,
  HealthTrendsChart,
  CSATTrendsChart,
  UpcomingRenewalsTable,
  CustomerSegmentsChart,
  ActivityFeed,
} from '@/components/dashboard'

export default function Dashboard() {
  const [healthTrendRange, setHealthTrendRange] = useState('30d')

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
  })

  // Fetch health distribution
  const { data: healthDistribution, isLoading: healthDistLoading } = useQuery({
    queryKey: ['dashboard-health-distribution'],
    queryFn: () => dashboardAPI.getHealthDistribution().then(res => res.data),
  })

  // Fetch alerts dashboard for summary
  const { data: alertsDashboard, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts-dashboard'],
    queryFn: () => alertsAPI.getDashboard().then(res => res.data),
  })

  // Fetch recent alerts
  const { data: recentAlerts, isLoading: recentAlertsLoading } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => alertsAPI.getAll({ limit: 5, is_resolved: false }).then(res => res.data?.alerts || []),
  })

  // Fetch health trends
  const { data: healthTrends, isLoading: healthTrendsLoading } = useQuery({
    queryKey: ['dashboard-health-trends', healthTrendRange],
    queryFn: () => dashboardAPI.getHealthTrends({ range: healthTrendRange }).then(res => res.data),
  })

  // Fetch CSAT trends
  const { data: csatTrends, isLoading: csatTrendsLoading } = useQuery({
    queryKey: ['dashboard-csat-trends'],
    queryFn: () => dashboardAPI.getCSATTrends().then(res => res.data),
  })

  // Fetch upcoming renewals
  const { data: renewalsData, isLoading: renewalsLoading } = useQuery({
    queryKey: ['dashboard-renewals'],
    queryFn: () => dashboardAPI.getUpcomingRenewals().then(res => res.data),
  })

  // Fetch customer segments
  const { data: segmentsData, isLoading: segmentsLoading } = useQuery({
    queryKey: ['dashboard-segments'],
    queryFn: () => dashboardAPI.getCustomerSegments().then(res => res.data),
  })

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardAPI.getRecentActivity({ limit: 10 }).then(res => res.data?.activities || []),
  })

  // Customer change percentage from API
  const customerChange = stats?.customer_change_percentage || 0
  const customerTrend = customerChange >= 0 ? 'up' : 'down'

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Welcome back! Here's what's happening with your customers.</p>
      </div>

      {/* TOP STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Total Customers"
            value={formatNumber(stats?.total_customers || 0)}
            icon={Users}
            iconColor="primary"
            change={customerChange ? `${Math.abs(customerChange)}%` : undefined}
            changeLabel="from last month"
            trend={customerTrend}
          />
        )}

        {/* Average Health Score - Gauge */}
        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <GaugeStatCard
            title="Avg Health Score"
            value={Math.round(stats?.avg_health_score || 0)}
            max={100}
            icon={HeartPulse}
            iconColor={
              stats?.avg_health_score >= 80 ? 'success' :
              stats?.avg_health_score >= 60 ? 'primary' :
              stats?.avg_health_score >= 40 ? 'warning' : 'danger'
            }
          />
        )}

        {/* NPS Score */}
        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <NPSStatCard
            title="NPS Score"
            value={stats?.nps_score ?? 0}
            icon={ThumbsUp}
          />
        )}

        {/* Active Alerts */}
        {alertsLoading ? (
          <StatCardSkeleton />
        ) : (
          <AlertsStatCard
            title="Active Alerts"
            total={alertsDashboard?.total_unresolved || 0}
            critical={alertsDashboard?.by_severity?.critical || 0}
            high={alertsDashboard?.by_severity?.high || 0}
            medium={alertsDashboard?.by_severity?.medium || 0}
            low={alertsDashboard?.by_severity?.low || 0}
            icon={Bell}
          />
        )}
      </div>

      {/* SECOND ROW - Health Distribution & Alerts Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Health Distribution - 60% */}
        <div className="lg:col-span-3">
          <HealthDistributionChart
            data={healthDistribution}
            isLoading={healthDistLoading}
          />
        </div>

        {/* Alerts Summary - 40% */}
        <div className="lg:col-span-2">
          <AlertsSummaryCard
            alerts={recentAlerts}
            isLoading={recentAlertsLoading}
          />
        </div>
      </div>

      {/* THIRD ROW - Health Trends (Full Width) */}
      <HealthTrendsChart
        data={healthTrends}
        isLoading={healthTrendsLoading}
        onTimeRangeChange={setHealthTrendRange}
      />

      {/* FOURTH ROW - CSAT Trends & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CSATTrendsChart
          data={csatTrends}
          isLoading={csatTrendsLoading}
        />
        <UpcomingRenewalsTable
          data={renewalsData}
          isLoading={renewalsLoading}
        />
      </div>

      {/* FIFTH ROW - Customer Segments & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerSegmentsChart
          data={segmentsData}
          isLoading={segmentsLoading}
        />
        <ActivityFeed
          activities={activityData}
          isLoading={activityLoading}
        />
      </div>
    </div>
  )
}
