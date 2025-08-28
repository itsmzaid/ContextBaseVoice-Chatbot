# Voice Bot Project - Complete Setup Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Database Setup](#database-setup)
7. [Environment Configuration](#environment-configuration)
8. [Ngrok Setup](#ngrok-setup)
9. [Testing Setup](#testing-setup)
10. [Running the Application](#running-the-application)
11. [Troubleshooting](#troubleshooting)

## Project Overview

This is a real-time voice chatbot application with the following features:

- **Voice-to-Text**: Converts user speech to text using OpenAI Whisper
- **AI Response Generation**: Uses OpenAI GPT models for intelligent responses
- **Text-to-Speech**: Converts bot responses to audio using OpenAI TTS
- **Document Context**: Supports PDF, DOC, DOCX, and TXT files for context-aware responses
- **Real-time Communication**: WebSocket-based voice chat
- **User Management**: User registration, authentication, and agent management
- **Pre-composed Messages**: Fast responses for common queries

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (v12 or higher)
- **Git**
- **Ngrok** (for exposing local server)

### Required API Keys

- **OpenAI API Key** (for GPT, Whisper, and TTS)
- **Pinecone API Key** (for vector embeddings)

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd ContextBaseVoicebot

# Verify the structure
ls -la
```

You should see:

```
Backend/
Frontend/
README.md
```

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Required Directories

```bash
# Create storage directory structure
mkdir -p storage/audio
mkdir -p storage/uploads
mkdir -p storage/logs
mkdir -p storage/debug_audio
mkdir -p temp
```

### 4. Create Test Data Directory

```bash
# Create test directory for PDF testing
mkdir -p test/data
```

### 5. Add Test PDF File

Place a test PDF file in the test directory:

```bash
# Copy your test PDF to this location
cp /path/to/your/test.pdf test/data/05-versions-space.pdf
```

**Note**: If you don't have a test PDF, you can use any PDF file for testing the text extraction functionality.

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd ../Frontend
```

### 2. Install Dependencies

```bash
npm install
```

## Database Setup

### 1. PostgreSQL Configuration

1. **Install PostgreSQL** (if not already installed)
2. **Create Database**:
   ```sql
   CREATE DATABASE contextvoicebot;
   CREATE USER postgres WITH PASSWORD '1234';
   GRANT ALL PRIVILEGES ON DATABASE contextvoicebot TO postgres;
   ```

### 2. Run Database Migrations

```bash
cd Backend
npx sequelize-cli db:migrate
```

This will create all necessary tables:

- `users`
- `agents`
- `documents`
- `embeddings`
- `sessions`
- `messages`

## Environment Configuration

### 1. Backend Environment Variables

Create `.env` file in the `Backend` directory:

```bash
cd Backend
touch .env
```

Add the following content to `.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_USER=postgres
DB_PASSWORD=1234
DB_DATABASE=contextvoicebot
DB_HOST=127.0.0.1

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here

# OpenAI Configuration
DEFAULT_OPENAI_API_KEY=sk-your-openai-api-key-here

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=zenx-vectors

# WebSocket Configuration
WS_PORT=8080
```

### 2. Frontend Environment Variables

Create `.env` file in the `Frontend` directory:

```bash
cd Frontend
touch .env
```

Add the following content to `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## Ngrok Setup

### 1. Install Ngrok

```bash
# Download and install ngrok
# Visit: https://ngrok.com/download
# Or use npm:
npm install -g ngrok
```

### 2. Expose Backend Server

```bash
# Start ngrok on port 5000
ngrok http 5000
```

You'll get a URL like: `https://abc123.ngrok.io`

### 3. Update Frontend Configuration

After getting the ngrok URL, update the frontend configuration:

#### Update Frontend Environment Variables

Edit `Frontend/.env`:

```env
VITE_API_BASE_URL=https://abc123.ngrok.io
VITE_WS_URL=wss://abc123.ngrok.io
```

#### Update VoiceChat Component

Edit `Frontend/src/components/VoiceChat.jsx`:

Find this line:

```javascript
const ws = new WebSocket(`ws://localhost:5000`);
```

Replace with:

```javascript
const ws = new WebSocket(`wss://abc123.ngrok.io`);
```

**Important**: Replace `https://` with `wss://` for WebSocket connections.

## Testing Setup

### 1. Test PDF Extraction

If PDF text extraction doesn't work properly:

1. **Check PDF File**: Ensure your test PDF is not corrupted
2. **Test with Different PDF**: Try with a simple text-based PDF
3. **Check Dependencies**: Ensure `pdf-parse` is properly installed

### 2. Test Directory Structure

Your test directory should look like:

```
Backend/
├── test/
│   └── data/
│       └── 05-versions-space.pdf
```

## Running the Application

### 1. Start Backend Server

```bash
cd Backend
npm run dev
```

You should see:

```
HTTP Server listening on port 5000
API available at http://localhost:5000
WebSocket available at ws://localhost:5000
Database connection has been established successfully.
All services initialized successfully.
```

### 2. Start Frontend Development Server

```bash
cd Frontend
npm run dev
```

You should see:

```
Local:   http://localhost:5173/
Network: http://192.168.x.x:5173/
```

### 3. Access the Application

1. **Local Development**: Open `http://localhost:5173`
2. **With Ngrok**: Use the ngrok URL for external access

## Complete Setup Checklist

### Backend Checklist

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] PostgreSQL database created
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] Storage directories created
- [ ] Test data added
- [ ] Server starts without errors

### Frontend Checklist

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Ngrok URL updated (if using ngrok)
- [ ] WebSocket URL updated
- [ ] Development server starts

### Database Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `contextvoicebot` created
- [ ] User `postgres` with password `1234` created
- [ ] All tables created via migrations
- [ ] Connection test successful

### API Keys Checklist

- [ ] OpenAI API key configured
- [ ] Pinecone API key configured
- [ ] JWT secret key set
- [ ] All environment variables loaded

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running and credentials are correct.

#### 2. OpenAI API Error

```
Error: Invalid API key
```

**Solution**: Check your OpenAI API key in the `.env` file.

#### 3. PDF Parsing Error

```
Error: No text content extracted from document
```

**Solution**:

- Try with a different PDF file
- Ensure PDF is not image-based
- Check if `pdf-parse` is installed

#### 4. WebSocket Connection Error

```
Error: WebSocket connection failed
```

**Solution**:

- Check if backend is running on port 5000
- Verify WebSocket URL in frontend
- If using ngrok, ensure `wss://` protocol

#### 5. CORS Error

```
Error: CORS policy blocked
```

**Solution**: Backend CORS is already configured, but ensure frontend URL is correct.

### Performance Optimization

#### 1. Audio Processing

- Audio chunks are processed in 200ms intervals
- Silence detection is disabled (manual stop only)
- Parallel TTS processing for faster responses

#### 2. Database Optimization

- Indexes are created on frequently queried columns
- Connection pooling is configured
- Efficient query patterns implemented

#### 3. Caching

- Response caching for repeated queries
- Pre-composed message caching
- In-memory performance tracking

## File Structure Overview

```
ContextBaseVoicebot/
├── Backend/
│   ├── config/
│   │   └── config.json          # Database configuration
│   ├── controller/              # API controllers
│   ├── middleware/              # Authentication & error handling
│   ├── migrations/              # Database migrations
│   ├── models/                  # Sequelize models
│   ├── routes/                  # API routes
│   ├── service/                 # Business logic
│   ├── storage/                 # File storage
│   │   ├── audio/              # Generated audio files
│   │   ├── uploads/            # Uploaded documents
│   │   ├── logs/               # Application logs
│   │   └── debug_audio/        # Debug audio files
│   ├── test/                   # Test files
│   │   └── data/
│   │       └── 05-versions-space.pdf
│   ├── util/                   # Utility functions
│   ├── .env                    # Environment variables
│   ├── index.js                # Main server file
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Page components
│   │   ├── redux/             # State management
│   │   ├── routes/            # Routing
│   │   ├── utils/             # Utility functions
│   │   ├── validation/        # Form validation
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── .env                   # Frontend environment variables
│   └── package.json
└── README.md
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique API keys
- Rotate keys regularly

### 2. Database Security

- Use strong database passwords
- Limit database user permissions
- Enable SSL connections in production

### 3. API Security

- JWT tokens for authentication
- Rate limiting on API endpoints
- Input validation on all endpoints

## Production Deployment

### 1. Environment Setup

- Set `NODE_ENV=production`
- Use production database
- Configure production API keys

### 2. SSL Configuration

- Enable HTTPS for production
- Configure SSL certificates
- Update WebSocket URLs to `wss://`

### 3. Performance Monitoring

- Enable logging
- Monitor API response times
- Track WebSocket connections

## Support and Maintenance

### 1. Logs Location

- Backend logs: `Backend/storage/logs/`
- Application logs: Console output
- Error logs: Check console for detailed errors

### 2. Database Backup

```bash
# Backup database
pg_dump contextvoicebot > backup.sql

# Restore database
psql contextvoicebot < backup.sql
```

### 3. File Cleanup

- Audio files: `Backend/storage/audio/`
- Upload files: `Backend/storage/uploads/`
- Debug files: `Backend/storage/debug_audio/`

## Conclusion

This setup guide covers all aspects of deploying and running the voice bot application. Follow each step carefully and ensure all prerequisites are met. The application provides a robust foundation for real-time voice communication with AI-powered responses.

For additional support or questions, refer to the project documentation or create an issue in the repository.
