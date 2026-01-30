import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersAPI, alertsAPI, interactionsAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NoSearchResultsEmpty } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Users,
  Bell,
  MessageSquare,
  ArrowRight,
  Loader2,
  Filter,
  X,
} from 'lucide-react'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(query)
  const [activeTab, setActiveTab] = useState('all')

  // Update input when URL changes
  useEffect(() => {
    setSearchInput(query)
  }, [query])

  // Search customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['search-customers-page', query],
    queryFn: () => customersAPI.search(query).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  // Search alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['search-alerts-page', query],
    queryFn: () => alertsAPI.getAll({ search: query }).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  // Search interactions
  const { data: interactionsData, isLoading: interactionsLoading } = useQuery({
    queryKey: ['search-interactions-page', query],
    queryFn: () => interactionsAPI.getAll({ search: query }).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  const isLoading = customersLoading || alertsLoading || interactionsLoading
  const customers = customersData?.customers || []
  const alerts = alertsData?.alerts || []
  const interactions = interactionsData?.interactions || []

  const totalResults = customers.length + alerts.length + interactions.length

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() })
    }
  }

  const handleClear = () => {
    setSearchInput('')
    setSearchParams({})
  }

  const ResultCard = ({ children, onClick }) => (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
    >
      {children}
    </div>
  )

  const getHealthBadgeVariant = (score) => {
    if (score >= 70) return 'success'
    if (score >= 40) return 'warning'
    return 'danger'
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Search</h1>
        <p className="text-slate-500">Search across customers, alerts, and interactions</p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search customers, alerts, interactions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-11 pr-10 py-2.5 text-base"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={!searchInput.trim()}>
          Search
        </Button>
      </form>

      {/* No query state */}
      {!query && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                Start searching
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Enter a search term to find customers, alerts, or interactions.
                You can search by name, email, company, or any related content.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {query && (
        <>
          {/* Results summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <span className="text-sm text-slate-500">
                  Found <span className="font-medium text-slate-700">{totalResults}</span> results for "{query}"
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                All
                {!isLoading && (
                  <Badge variant="secondary" className="ml-1">{totalResults}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2">
                <Users className="w-4 h-4" />
                Customers
                {!isLoading && customers.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{customers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="w-4 h-4" />
                Alerts
                {!isLoading && alerts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="interactions" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Interactions
                {!isLoading && interactions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{interactions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4 mt-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 bg-white rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && totalResults === 0 && (
              <div className="mt-6">
                <NoSearchResultsEmpty query={query} onClear={handleClear} />
              </div>
            )}

            {/* All Results */}
            <TabsContent value="all" className="space-y-6 mt-6">
              {/* Customers Section */}
              {customers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Customers ({customers.length})
                  </h3>
                  <div className="space-y-3">
                    {customers.slice(0, 5).map(customer => (
                      <ResultCard
                        key={customer.id}
                        onClick={() => navigate(`/customers/${customer.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">{customer.name}</h4>
                            <p className="text-sm text-slate-500">{customer.industry || 'No industry'}</p>
                          </div>
                          <Badge variant={getHealthBadgeVariant(customer.health_score)}>
                            {customer.health_score || 0}
                          </Badge>
                        </div>
                      </ResultCard>
                    ))}
                    {customers.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setActiveTab('customers')}
                      >
                        View all {customers.length} customers
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Alerts Section */}
              {alerts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Alerts ({alerts.length})
                  </h3>
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map(alert => (
                      <ResultCard
                        key={alert.id}
                        onClick={() => navigate(`/alerts?id=${alert.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">{alert.title || alert.message}</h4>
                            <p className="text-sm text-slate-500">{alert.customer_name || 'No customer'}</p>
                          </div>
                          <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'secondary'}>
                            {alert.severity || 'medium'}
                          </Badge>
                        </div>
                      </ResultCard>
                    ))}
                    {alerts.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setActiveTab('alerts')}
                      >
                        View all {alerts.length} alerts
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Interactions Section */}
              {interactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Interactions ({interactions.length})
                  </h3>
                  <div className="space-y-3">
                    {interactions.slice(0, 5).map(interaction => (
                      <ResultCard
                        key={interaction.id}
                        onClick={() => navigate(`/interactions?id=${interaction.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">{interaction.subject || interaction.type}</h4>
                            <p className="text-sm text-slate-500">{interaction.customer_name || 'No customer'}</p>
                          </div>
                          <Badge variant="secondary">{interaction.type || 'other'}</Badge>
                        </div>
                      </ResultCard>
                    ))}
                    {interactions.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setActiveTab('interactions')}
                      >
                        View all {interactions.length} interactions
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-3 mt-6">
              {customers.map(customer => (
                <ResultCard
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800">{customer.name}</h4>
                      <p className="text-sm text-slate-500">
                        {customer.industry || 'No industry'} - {customer.email || 'No email'}
                      </p>
                    </div>
                    <Badge variant={getHealthBadgeVariant(customer.health_score)}>
                      Health: {customer.health_score || 0}
                    </Badge>
                  </div>
                </ResultCard>
              ))}
              {customers.length === 0 && !isLoading && (
                <NoSearchResultsEmpty query={query} />
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-3 mt-6">
              {alerts.map(alert => (
                <ResultCard
                  key={alert.id}
                  onClick={() => navigate(`/alerts?id=${alert.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800">{alert.title || alert.message}</h4>
                      <p className="text-sm text-slate-500">
                        {alert.customer_name || 'No customer'} - {alert.type || 'Unknown type'}
                      </p>
                    </div>
                    <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'secondary'}>
                      {alert.severity || 'medium'}
                    </Badge>
                  </div>
                </ResultCard>
              ))}
              {alerts.length === 0 && !isLoading && (
                <NoSearchResultsEmpty query={query} />
              )}
            </TabsContent>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="space-y-3 mt-6">
              {interactions.map(interaction => (
                <ResultCard
                  key={interaction.id}
                  onClick={() => navigate(`/interactions?id=${interaction.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800">{interaction.subject || interaction.type}</h4>
                      <p className="text-sm text-slate-500">
                        {interaction.customer_name || 'No customer'} - {new Date(interaction.interaction_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{interaction.type || 'other'}</Badge>
                  </div>
                </ResultCard>
              ))}
              {interactions.length === 0 && !isLoading && (
                <NoSearchResultsEmpty query={query} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
