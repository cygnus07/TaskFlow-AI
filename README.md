# TaskFlow AI - Backend API

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DD0031?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest" />
</div>

<br />

<div align="center">
  <h3>🚀 AI-Powered Project Management Platform</h3>
  <p>Enterprise-grade SaaS platform with intelligent task optimization and real-time collaboration</p>
</div>

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## ✨ Features

### Core Features
- **🏢 Multi-tenant Architecture**: Complete tenant isolation with separate data contexts
- **🔐 Authentication & Authorization**: JWT-based auth with role-based access control (Admin, Manager, Member)
- **📊 Project Management**: Full CRUD operations for projects with team collaboration
- **✅ Task Management**: Hierarchical tasks with subtasks, dependencies, and status tracking
- **👥 Team Collaboration**: Real-time updates, comments, and notifications

### AI-Powered Features
- **🧠 Intelligent Task Prioritization**: GPT-4 powered task analysis and priority suggestions
- **📅 Smart Scheduling**: AI-driven resource allocation and timeline optimization
- **📈 Project Health Analysis**: Automated insights and risk assessment
- **💡 Task Suggestions**: Context-aware next task recommendations

### Technical Features
- **⚡ Real-time Updates**: WebSocket integration for live collaboration
- **💾 Redis Caching**: Performance optimization with intelligent cache invalidation
- **🔄 Rate Limiting**: API protection with configurable limits
- **📝 Comprehensive Logging**: Structured logging with Morgan
<!-- - **🧪 90%+ Test Coverage**: Unit, integration, and E2E tests -->
- **📚 API Documentation**: Complete REST API documentation

## 🏗 Architecture

```
taskflow-ai/
├── src/
│   ├── config/         # App configuration and database connections
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth, validation, caching, rate limiting
│   ├── models/         # MongoDB schemas with Mongoose
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic layer
│   ├── utils/          # Helper functions and utilities
│   ├── types/          # TypeScript type definitions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── tests/              # Test suites
├── scripts/            # Database seeds and migrations
└── dist/               # Compiled JavaScript output
```

### Tech Stack
- **Runtime**: Node.js v18+ with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Authentication**: JWT tokens with refresh token rotation
- **Real-time**: Socket.io
- **AI Integration**: OpenAI GPT-4 API
- **Testing**: Jest with Supertest
- **Code Quality**: ESLint, Prettier

## 📋 Prerequisites

- Node.js v18 or higher
- MongoDB v5.0 or higher (local or MongoDB Atlas)
- Redis v6.0 or higher (local or cloud)
- OpenAI API key (for AI features)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/taskflow-ai.git
cd taskflow-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

4. **Configure your .env file**
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/taskflow-dev
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskflow

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=7d

# Redis
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
AI_FEATURES_ENABLED=true
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Running with Docker
```bash
docker-compose up -d
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "companyName": "Acme Corp"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Project Endpoints

#### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "priority": "high"
}
```

#### List Projects
```http
GET /api/projects?status=active&priority=high
Authorization: Bearer <token>
```

### Task Endpoints

#### Create Task
```http
POST /api/projects/:projectId/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement feature",
  "description": "Detailed description",
  "priority": "high",
  "dueDate": "2024-12-31",
  "assignees": ["userId1", "userId2"]
}
```

#### Update Task Status
```http
PATCH /api/tasks/:taskId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in-progress"
}
```

### AI Endpoints

#### Prioritize Tasks
```http
POST /api/projects/:projectId/ai/prioritize
Authorization: Bearer <token>
```

#### Generate Schedule
```http
POST /api/projects/:projectId/ai/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "applySchedule": false
}
```

### WebSocket Events

Connect to WebSocket:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Join project room
socket.emit('join:project', projectId);

// Listen for updates
socket.on('task:created', (data) => {
  console.log('New task:', data);
});

socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
});
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Categories
- **Unit Tests**: Services, utilities, and models
- **Integration Tests**: API endpoints and middleware
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Response times and caching

**Current test coverage: 90%+**

## 🚀 Deployment

### Deploy to AWS EC2

1. **Set up EC2 instance with Ubuntu 22.04**

2. **Install dependencies:**
```bash
sudo apt update
sudo apt install nodejs npm nginx mongodb-org redis-server
```

3. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Use PM2 for process management:**
```bash
npm install -g pm2
pm2 start dist/server.js --name taskflow-api
pm2 save
pm2 startup
```

### Deploy with Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Request sanitization
- **CORS Configuration**: Controlled cross-origin access
- **Environment Variables**: Secure configuration
- **Password Hashing**: Bcrypt with salt rounds
- **JWT Token Rotation**: Refresh token mechanism

## 📊 Performance Optimizations

- **Redis Caching**: GET request caching with smart invalidation
- **Database Indexing**: Optimized MongoDB queries
- **Compression**: Gzip compression for responses
- **Connection Pooling**: MongoDB and Redis connection reuse
- **Lazy Loading**: Pagination for large datasets

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 90%
- Use conventional commits
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 integration
- MongoDB team for excellent documentation
- Socket.io community for real-time capabilities
- All contributors and testers

---

