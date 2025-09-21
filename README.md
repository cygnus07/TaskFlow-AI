# TaskFlow AI - Backend API

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DD0031?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Railway" />
  <img src="https://img.shields.io/badge/Upstash-00E9A3?style=for-the-badge&logo=upstash&logoColor=black" alt="Upstash" />
</div>

<br />

<div align="center">
  <h3>🚀 AI-Powered Project Management Platform</h3>
  <p>Enterprise-grade SaaS platform with intelligent task optimization and real-time collaboration</p>
  <p>
    <a href="https://taskflow-ai-production.up.railway.app">🌐 Live API</a> •
    <a href="https://taskflow.kuldeepdev.me">🎨 Frontend Demo</a>
  </p>
</div>

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [API Endpoints](#-api-endpoints)
- [Installation](#-installation)
- [Environment Configuration](#-environment-configuration)
- [Running the Application](#-running-the-application)
- [WebSocket Events](#-websocket-events)
- [Security](#-security)
- [Performance](#-performance)
- [Error Handling](#-error-handling)
- [Contributing](#-contributing)

## ✨ Features

### 🏢 Core Platform Features

#### Multi-Tenant Architecture
- Complete tenant isolation with company-level data segregation
- Tenant-based user management with plan tracking
- Automatic tenant context injection in all operations
- Company-wide settings and configurations

#### Authentication & Authorization
- **JWT-based authentication** with access & refresh tokens
- **Token rotation** for enhanced security
- **Role-based access control** (Admin, Manager, Member)
- **Session management** with multiple device support
- **Cookie-based auth** with httpOnly flags
- **Logout from all devices** functionality

#### User Management
- User registration with company creation
- Profile management with last login tracking
- Active/inactive user states
- Password hashing with bcrypt (salt rounds)
- User session tracking via Redis

### 📁 Project & Task Management

#### Project Features
- **Full CRUD operations** for projects
- **Team collaboration** with member roles (Manager, Member)
- **Project prioritization** (low, medium, high, urgent)
- **Project timeline** with start and end dates
- **Member management** - add/remove team members
- **Project statistics** - task counts, completion rates
- **Activity logging** for audit trails

#### Task Management
- **Hierarchical task structure** with subtasks
- **Task dependencies** (blocks/blocked by relationships)
- **Task assignments** to multiple team members
- **Priority levels** (low, medium, high, urgent)
- **Status workflow** (todo, in-progress, review, done, cancelled)
- **Due date tracking** with reminders
- **Time tracking** - estimated vs actual hours
- **Task comments** with user mentions
- **Tags** for task categorization
- **Activity logs** for task history

### 🤖 AI-Powered Intelligence

All AI features are powered by OpenAI GPT-4 and can be toggled via environment configuration:

#### 1. Smart Task Prioritization
- Analyzes task dependencies, deadlines, and project context
- Suggests optimal task priorities based on project goals
- Considers team workload and resource availability
- Manager-only feature for controlled AI usage

#### 2. Intelligent Scheduling
- Generates optimal task schedules considering dependencies
- Balances workload across team members
- Accounts for task complexity and time estimates
- Optional auto-apply functionality for managers

#### 3. Project Health Analysis
- Real-time project health scoring
- Risk identification and mitigation suggestions
- Bottleneck detection in task flow
- Progress tracking against timelines
- Actionable insights for project managers

#### 4. Next Task Suggestions
- Context-aware recommendations after task completion
- Considers project priorities and deadlines
- Suggests tasks based on user skills and availability
- Helps maintain project momentum

### 🔔 Notification System

#### Real-time Notifications
- **In-app notifications** with unread tracking
- **Notification types**:
  - Task assigned to you
  - Task completed in your project
  - Comment mentions
  - Project updates
  - Deadline reminders
- **Bulk operations** - mark all as read
- **Priority levels** for notifications
- **WebSocket delivery** for instant updates

### ⚡ Real-Time Collaboration

#### WebSocket Features
- **Live project updates** across all connected clients
- **User presence** - see who's online in your project
- **Typing indicators** for comments and descriptions
- **Real-time notifications** delivery
- **Project rooms** for isolated communication
- **Connection management** with auto-reconnect
- **Event-driven architecture** for instant updates

#### Supported Real-time Events
- Task created/updated/deleted
- Project member added/removed
- Comment added to tasks
- User joined/left project
- Task assignment notifications
- Status changes

### 🚀 Performance Optimization

#### Redis Caching (Upstash Integration)
- **Intelligent caching** with automatic invalidation
- **Cache strategies**:
  - Project lists (5-minute TTL)
  - Project details (10-minute TTL)
  - Task lists (5-minute TTL)
  - User sessions (7-day TTL)
- **Pattern-based invalidation** for related data
- **Connection pooling** for optimal performance
- **Upstash serverless Redis** for scalability

#### Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes
- **API endpoints**: 100 requests per minute
- **AI endpoints**: 50 requests per hour
- **User-based and IP-based** limiting
- **Sliding window algorithm** for accurate limiting
- **Custom headers** with rate limit info

### 🔒 Security Features

#### Application Security
- **Helmet.js** for security headers
- **CORS configuration** with whitelisted origins
- **Request sanitization** and validation
- **SQL injection prevention** via Mongoose
- **XSS protection** through input sanitization
- **CSRF protection** with SameSite cookies
- **Environment variable validation** with Zod

#### Authentication Security
- **Password requirements** (minimum 8 characters)
- **Bcrypt hashing** with salt rounds
- **JWT expiration** handling
- **Refresh token rotation**
- **Secure cookie flags** (httpOnly, secure, sameSite)

### 🛠 Technical Infrastructure

#### Database Layer
- **MongoDB** with Mongoose ODM
- **Schema validation** with TypeScript
- **Database indexes** for query optimization
- **Connection pooling** (max 10 connections)
- **Tenant isolation** at document level
- **Soft deletes** support
- **Timestamps** on all documents

#### Middleware Stack
- **Authentication middleware** for protected routes
- **Authorization middleware** for role-based access
- **Validation middleware** for input sanitization
- **Error handling middleware** with custom error classes
- **Cache middleware** for GET requests
- **Rate limiting middleware** for API protection
- **AI feature toggle** middleware

#### Error Handling
- **Custom error classes**:
  - `AppError` - Base error class
  - `AuthenticationError` - 401 errors
  - `AuthorizationError` - 403 errors  
  - `ValidationError` - 400 errors
  - `NotFoundError` - 404 errors
  - `ConflictError` - 409 errors
- **Centralized error handler** with logging
- **Environment-aware error responses**
- **Stack trace in development mode**

## 🏗 Architecture

```
taskflow-ai/
├── src/
│   ├── config/                # Configuration and setup
│   │   ├── database.ts       # MongoDB connection with retry logic
│   │   ├── redis.ts          # Upstash Redis client setup
│   │   └── index.ts          # Central config with Zod validation
│   │
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.ts       # Login, register, refresh, logout
│   │   ├── project.controller.ts    # Project CRUD + members
│   │   ├── task.controller.ts       # Task operations + comments
│   │   └── ai.controller.ts         # AI feature endpoints
│   │
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts       # JWT verification & extraction
│   │   ├── cache.middleware.ts      # Redis caching layer
│   │   ├── rateLimit.middleware.ts  # API rate limiting
│   │   ├── validation.middleware.ts # Input validation
│   │   ├── error.middleware.ts      # Global error handler
│   │   └── ai.middleware.ts         # AI feature access control
│   │
│   ├── models/               # MongoDB schemas
│   │   ├── base.model.ts           # Base model with tenant isolation
│   │   ├── user.model.ts           # User with password hashing
│   │   ├── tenant.model.ts         # Company/tenant model
│   │   ├── project.model.ts        # Project with members
│   │   ├── task.model.ts           # Task with dependencies
│   │   └── notification.model.ts   # Notification model
│   │
│   ├── routes/               # API route definitions
│   │   ├── auth.routes.ts          # /api/auth/*
│   │   ├── project.routes.ts       # /api/projects/*
│   │   ├── task.routes.ts          # /api/tasks/*
│   │   ├── ai.routes.ts            # /api/ai/*
│   │   ├── notification.routes.ts  # /api/notifications/*
│   │   └── index.ts                # Route aggregator
│   │
│   ├── services/             # Business logic layer
│   │   ├── auth.service.ts         # Authentication logic
│   │   ├── project.service.ts      # Project operations
│   │   ├── task.service.ts         # Task management
│   │   ├── ai.service.ts           # OpenAI integration
│   │   ├── socket.service.ts       # WebSocket management
│   │   ├── cache.service.ts        # Redis operations
│   │   └── notification.service.ts # Notification handling
│   │
│   ├── utils/                # Helper utilities
│   │   ├── errors.ts               # Custom error classes
│   │   └── jwt.utils.ts            # JWT helpers
│   │
│   ├── types/                # TypeScript definitions
│   │   └── index.ts                # Shared types & interfaces
│   │
│   ├── app.ts                # Express app configuration
│   └── server.ts             # Server entry point
│
├── dist/                     # Compiled JavaScript output
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── railway.json              # Railway deployment config
```

## 📡 API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/register` | Register new user with company | 5/15min |
| POST | `/login` | Login with email/password | 5/15min |
| POST | `/logout` | Logout and invalidate tokens | - |
| POST | `/refresh-token` | Refresh access token | 5/15min |
| GET | `/me` | Get current user profile | - |

### 📁 Projects (`/api/projects`)
| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/` | List all user projects | 5 min |
| GET | `/:id` | Get project details | 10 min |
| POST | `/` | Create new project | - |
| PUT | `/:id` | Update project | - |
| DELETE | `/:id` | Delete project | - |
| POST | `/:id/members` | Add team member | - |
| DELETE | `/:id/members/:memberId` | Remove member | - |

### ✅ Tasks (`/api/tasks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:projectId/tasks` | List project tasks |
| GET | `/tasks/:id` | Get task details |
| POST | `/projects/:projectId/tasks` | Create new task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| PATCH | `/tasks/:id/status` | Update task status |
| GET | `/tasks/:id/subtasks` | Get subtasks |
| POST | `/tasks/:id/dependencies` | Add dependency |
| DELETE | `/tasks/:id/dependencies/:depId` | Remove dependency |
| POST | `/tasks/:id/comments` | Add comment |

### 🤖 AI Features (`/api`)
| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| POST | `/projects/:projectId/ai/prioritize` | AI task prioritization | Manager role |
| POST | `/projects/:projectId/ai/schedule` | Generate AI schedule | Manager role |
| POST | `/tasks/:taskId/ai/suggest-next` | Get next task suggestions | Task completed |
| POST | `/projects/:projectId/ai/analyze-health` | Analyze project health | Project member |

### 🔔 Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user notifications |
| PUT | `/:id/read` | Mark notification as read |
| PUT | `/read-all` | Mark all as read |

## 🚀 Installation

### Prerequisites
- Node.js v18+
- MongoDB v5.0+
- Redis/Upstash account
- OpenAI API key (for AI features)

### Quick Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/taskflow-ai.git
cd taskflow-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/taskflow
# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskflow

# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_EXPIRE=7d

# Redis Configuration (Upstash)
REDIS_URL=rediss://default:password@endpoint.upstash.io:6379
CACHE_TTL=3600

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
AI_FEATURES_ENABLED=true

# CORS Origins (comma-separated for multiple)
# Production example:
# CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# Server runs on http://localhost:3000
# Watches for file changes with nodemon
```

### Production Mode
```bash
# Build TypeScript to JavaScript
npm run build

# Run the compiled application
npm start
```

### Docker Support
```bash
# Using Docker Compose
docker-compose up -d

# Or build manually
docker build -t taskflow-ai .
docker run -p 3000:3000 --env-file .env taskflow-ai
```

### Health Check
```bash
# Check if API is running
curl http://localhost:3000/health

# Check with features status
curl http://localhost:3000/api/health
```

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});
```

### Client → Server Events
| Event | Description | Payload |
|-------|-------------|---------|
| `join:project` | Join project room | `projectId: string` |
| `leave:project` | Leave project room | `projectId: string` |
| `typing:start` | Start typing indicator | `{ projectId, taskId? }` |
| `typing:stop` | Stop typing indicator | `{ projectId, taskId? }` |

### Server → Client Events
| Event | Description | Payload |
|-------|-------------|---------|
| `task:created` | New task created | `{ task, projectId, timestamp }` |
| `task:updated` | Task updated | `{ task, changes, projectId }` |
| `task:deleted` | Task deleted | `{ taskId, projectId }` |
| `task:assigned:you` | Task assigned to user | `{ task, projectId }` |
| `comment:added` | Comment added to task | `{ taskId, comment, projectId }` |
| `project:updated` | Project details updated | `{ project }` |
| `project:member:added` | Member added to project | `{ member, projectId }` |
| `notification:new` | New notification | `{ notification }` |
| `user:joined` | User joined project | `{ userId, projectId }` |
| `user:left` | User left project | `{ userId, projectId }` |

## 🔒 Security

### Security Headers (via Helmet.js)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy configured
- Referrer-Policy: no-referrer

### Authentication Flow
```mermaid
sequenceDiagram
    Client->>API: POST /auth/login
    API->>DB: Verify credentials
    API->>Client: Access Token + Refresh Token (cookies)
    Client->>API: Request with Bearer Token
    API->>API: Verify JWT
    API->>Client: Protected Resource
```

### Rate Limiting Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T00:00:00.000Z
```

## 📊 Performance

### Caching Strategy
- **GET Request Caching**: Automatic caching for GET endpoints
- **Cache Keys Structure**: `taskflow:resource:identifier`
- **Invalidation**: Automatic on mutations (POST, PUT, DELETE)
- **TTL Management**: Configurable per resource type

### Database Optimization
- **Indexes**: On frequently queried fields (tenantId, userId, projectId)
- **Compound Indexes**: For complex queries
- **Connection Pooling**: Max 10 concurrent connections
- **Query Optimization**: Lean queries where applicable

### Response Times (Target)
- Authentication: < 200ms
- Project List: < 100ms (cached)
- Task Operations: < 150ms
- AI Features: < 3000ms

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "stack": "Stack trace (development only)",
    "details": {
      // Additional error details in development
    }
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Authentication Required
- `403` - Forbidden / Unauthorized
- `404` - Resource Not Found
- `409` - Conflict (duplicate resource)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Format code (`npm run format`)
6. Commit changes (`git commit -m 'Add AmazingFeature'`)
7. Push to branch (`git push origin feature/AmazingFeature`)
8. Open Pull Request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Node.js/TypeScript
- **Prettier**: Auto-formatting on save
- **Naming**: CamelCase for variables, PascalCase for classes
- **Comments**: JSDoc for public APIs



---

<div align="center">
  <br />
  <a href="https://taskflow.kuldeepdev.me">View Live Demo</a> •
  <a href="https://github.com/cygnus07/taskflow-ai/issues">Report Bug</a> •
  <a href="https://github.com/cygnus07/taskflow-ai/issues">Request Feature</a>
</div>