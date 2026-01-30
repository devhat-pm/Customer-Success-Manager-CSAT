# Success Manager - Frontend

React-based single-page application for the Success Manager customer success platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TanStack Query** - Server state management
- **React Router v6** - Client-side routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - UI component library
- **Radix UI** - Accessible primitives
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Axios** - HTTP client

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── alerts/        # Alert management components
│   │   ├── csat/          # CSAT/feedback components
│   │   ├── customers/     # Customer management components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── health-scores/ # Health score components
│   │   ├── interactions/  # Interaction tracking components
│   │   ├── layout/        # Layout components (Header, Sidebar, etc.)
│   │   ├── reports/       # Report generation components
│   │   ├── settings/      # Settings page components
│   │   └── ui/            # Base UI components (Shadcn)
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.jsx    # Authentication state
│   │   └── ToastContext.jsx   # Toast notifications
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   │   └── utils.js       # Helper functions (cn, formatters)
│   ├── pages/             # Page components
│   ├── services/          # API service layer
│   │   └── api.js         # Axios instance and API methods
│   ├── App.jsx            # Main app with routing
│   ├── main.jsx           # Application entry point
│   └── index.css          # Global styles and Tailwind
├── components.json        # Shadcn/ui configuration
├── tailwind.config.js     # Tailwind configuration
├── vite.config.js         # Vite configuration
├── package.json
└── README.md
```

## Component Architecture

### Page Components (`/pages`)

Each route has a dedicated page component:

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Authentication page |
| Dashboard | `/dashboard` | Main dashboard with KPIs |
| Customers | `/customers` | Customer list and management |
| CustomerDetail | `/customers/:id` | Individual customer view |
| HealthScores | `/health-scores` | Health monitoring |
| CSAT | `/csat` | Satisfaction tracking |
| Interactions | `/interactions` | Communication logs |
| Alerts | `/alerts` | Alert management |
| Reports | `/reports` | Report generation |
| Search | `/search` | Global search |
| Settings | `/settings/*` | Application settings |

### Feature Components

Components are organized by feature domain:

```
components/
├── alerts/           # AlertCard, AlertFilters, ResolveModal, etc.
├── csat/             # CSATMetrics, NPSChart, SurveyModal, etc.
├── customers/        # CustomerTable, CustomerForm, Tabs, etc.
├── dashboard/        # StatCard, Charts, ActivityFeed, etc.
├── health-scores/    # ScoreGauge, TrendIndicator, Grid, etc.
├── interactions/     # InteractionForm, Timeline, Filters, etc.
├── reports/          # ReportCard, GenerateModal, History, etc.
├── settings/         # ProfileSettings, TeamSettings, etc.
├── layout/           # Layout, Sidebar, Header, ProtectedRoute
└── ui/               # Button, Input, Card, Dialog, etc.
```

### UI Components (`/components/ui`)

Base components built with Shadcn/ui:

- `button` - Button with variants (default, outline, ghost, etc.)
- `input` - Text input with validation states
- `card` - Card container with header, content, footer
- `badge` - Status badges with color variants
- `dialog` - Modal dialogs
- `alert-dialog` - Confirmation dialogs
- `tabs` - Tab navigation
- `table` - Data tables
- `select` - Select dropdowns
- `checkbox` - Checkbox inputs
- `switch` - Toggle switches
- `slider` - Range sliders
- `tooltip` - Tooltips
- `skeleton` - Loading skeletons
- `empty-state` - Empty state messaging

## State Management

### Server State (TanStack Query)

All API data is managed with React Query:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['customers'],
  queryFn: () => customersAPI.getAll()
})

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: customersAPI.create,
  onSuccess: () => {
    queryClient.invalidateQueries(['customers'])
  }
})
```

### Client State

- **AuthContext** - User authentication state
- **ToastContext** - Toast notification queue
- **URL Parameters** - Filter state persistence

## Adding New Pages

1. Create the page component in `/pages`:

```jsx
// src/pages/NewPage.jsx
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'

export default function NewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['new-data'],
    queryFn: () => api.getData()
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Page</h1>
      <Card>
        {/* Page content */}
      </Card>
    </div>
  )
}
```

2. Add the route in `App.jsx`:

```jsx
import NewPage from './pages/NewPage'

// Inside the Routes component
<Route path="/new-page" element={<NewPage />} />
```

3. Add navigation in `Sidebar.jsx`:

```jsx
const navItems = [
  // ... existing items
  { icon: Icon, label: 'New Page', path: '/new-page' }
]
```

## Adding New Components

1. Create component in appropriate feature folder:

```jsx
// src/components/feature/NewComponent.jsx
import { cn } from '@/lib/utils'

export function NewComponent({ className, ...props }) {
  return (
    <div className={cn('base-styles', className)} {...props}>
      {/* Component content */}
    </div>
  )
}
```

2. Export from index file:

```jsx
// src/components/feature/index.js
export { NewComponent } from './NewComponent'
```

3. Import in pages:

```jsx
import { NewComponent } from '@/components/feature'
```

## API Service Layer

All API calls go through `/services/api.js`:

```jsx
// Adding new API methods
export const newAPI = {
  getAll: (params) => api.get('/new-endpoint', { params }).then(res => res.data),
  getById: (id) => api.get(`/new-endpoint/${id}`).then(res => res.data),
  create: (data) => api.post('/new-endpoint', data).then(res => res.data),
  update: (id, data) => api.put(`/new-endpoint/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/new-endpoint/${id}`).then(res => res.data),
}
```

## Form Handling

Forms use React Hook Form with Zod validation:

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' }
  })

  const onSubmit = (data) => {
    // Handle submission
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

## Styling

### Tailwind CSS

Custom design tokens in `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      primary: { /* blue shades */ },
      success: { /* green shades */ },
      warning: { /* amber shades */ },
      danger: { /* red shades */ },
    }
  }
}
```

### CSS Utilities

Common utility classes:
- `animate-in` - Fade in animation
- `hover-lift` - Hover scale effect
- `card-hover` - Card hover shadow

### Component Variants

Using `class-variance-authority` for variants:

```jsx
const buttonVariants = cva('base-styles', {
  variants: {
    variant: {
      default: 'bg-primary text-white',
      outline: 'border border-primary',
      ghost: 'hover:bg-slate-100',
    },
    size: {
      sm: 'h-8 px-3',
      default: 'h-10 px-4',
      lg: 'h-12 px-6',
    }
  }
})
```

## Building for Production

```bash
# Build
npm run build

# Output in /dist folder
# - index.html
# - assets/index-[hash].js
# - assets/index-[hash].css
```

### Optimization Notes

- Code splitting with dynamic imports for large components
- Image optimization via Vite
- CSS purging via Tailwind
- Tree shaking for unused code

### Deployment

The `/dist` folder can be served by:
- Nginx
- Apache
- Netlify
- Vercel
- AWS S3 + CloudFront

Example Nginx config:
```nginx
server {
    listen 80;
    root /var/www/success-manager/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
    }
}
```

## Environment Variables

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Success Manager
```

Access in code:
```jsx
const apiUrl = import.meta.env.VITE_API_URL
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Common Issues

**API Connection Failed**
- Check backend is running on port 8000
- Verify VITE_API_URL in .env
- Check CORS settings in backend

**Styles Not Loading**
- Run `npm install` to ensure Tailwind is installed
- Check tailwind.config.js content paths

**Build Errors**
- Clear node_modules and reinstall
- Check for TypeScript errors (if using)
- Verify all imports are correct

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
