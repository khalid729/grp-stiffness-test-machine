# Deployment Guide

Complete installation and production deployment guide.

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB | 50 GB |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements

- **Operating System**: Ubuntu 22.04 LTS / Windows Server 2019+
- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher
- **Network**: Access to PLC on port 102

### PLC Requirements

- Siemens S7-1200/1500 series
- PUT/GET communication enabled
- Data Blocks configured (DB1, DB2, DB3)

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/stiffness_machine_test.git
cd stiffness_machine_test
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env
```

Edit `.env`:
```env
# PLC Connection
PLC_IP=192.168.0.100
PLC_RACK=0
PLC_SLOT=1

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# WebSocket
WS_UPDATE_INTERVAL=0.1

# Database
DATABASE_URL=sqlite:///./grp_test.db
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:8000" > .env
```

### 4. Run Development Servers

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Access at: `http://localhost:5173`

---

## Production Deployment

### Option 1: Single Server Deployment

```
┌─────────────────────────────────────────┐
│              Linux Server               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │           Nginx                  │   │
│  │      (Reverse Proxy)             │   │
│  │                                  │   │
│  │  :80/443 ──► :8000 (Gunicorn)   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Gunicorn                 │   │
│  │    (ASGI + Socket.IO)           │   │
│  │                                  │   │
│  │     FastAPI Application         │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### Step 1: Build Frontend

```bash
cd frontend
npm run build
# Output in dist/ directory
```

#### Step 2: Copy Frontend to Backend

```bash
# Copy build files to backend static folder
cp -r frontend/dist/* backend/static/
```

#### Step 3: Install Production Dependencies

```bash
cd backend
pip install gunicorn uvicorn[standard]
```

#### Step 4: Create Systemd Service

Create `/etc/systemd/system/grp-test.service`:

```ini
[Unit]
Description=GRP Ring Stiffness Test Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/grp-test/backend
Environment="PATH=/opt/grp-test/backend/venv/bin"
ExecStart=/opt/grp-test/backend/venv/bin/gunicorn \
    main:socket_app \
    -w 1 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/grp-test/access.log \
    --error-logfile /var/log/grp-test/error.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable grp-test
sudo systemctl start grp-test
```

#### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/grp-test`:

```nginx
server {
    listen 80;
    server_name grp-test.local;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:8000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/grp-test /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Option 2: Docker Deployment

#### Dockerfile (Backend)

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn uvicorn[standard]

# Copy application
COPY . .

# Copy frontend build
COPY static/ static/

EXPOSE 8000

CMD ["gunicorn", "main:socket_app", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  grp-test:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - PLC_IP=192.168.0.100
      - PLC_RACK=0
      - PLC_SLOT=1
      - DEBUG=false
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    network_mode: host  # Required for PLC access
```

Build and run:
```bash
docker-compose up -d
```

---

## Network Configuration

### Firewall Rules

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow internal WebSocket (if needed)
sudo ufw allow 8000/tcp
```

### PLC Network

Ensure the server can reach the PLC:

```bash
# Test connectivity
ping 192.168.0.100

# Test port 102
nc -zv 192.168.0.100 102
```

If server is on different subnet, configure routing:

```bash
# Add route to PLC network
sudo ip route add 192.168.0.0/24 via <gateway_ip>
```

---

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d grp-test.yourdomain.com
```

### Using Self-Signed Certificate

```bash
# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/grp-test.key \
    -out /etc/ssl/certs/grp-test.crt

# Update nginx config
server {
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/grp-test.crt;
    ssl_certificate_key /etc/ssl/private/grp-test.key;
    # ... rest of config
}
```

---

## Database Backup

### SQLite Backup Script

Create `/opt/grp-test/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/grp-test/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/opt/grp-test/backend/grp_test.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/grp_test_$DATE.db'"

# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/grp-test/backup.sh
```

---

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "plc_connected": true,
  "plc_ip": "192.168.0.100"
}
```

### Log Files

- Application: `/var/log/grp-test/error.log`
- Access: `/var/log/grp-test/access.log`
- Nginx: `/var/log/nginx/access.log`

### Systemd Status

```bash
sudo systemctl status grp-test
sudo journalctl -u grp-test -f
```

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| PLC connection fails | Check IP, verify PUT/GET enabled |
| WebSocket disconnects | Check Nginx proxy settings |
| Database locked | Ensure single worker process |
| Static files 404 | Verify static/ directory exists |

### Debug Mode

Enable debug logging:

```bash
# Edit .env
DEBUG=true
LOGGING_LEVEL=DEBUG

# Restart service
sudo systemctl restart grp-test
```

### Test PLC Connection

```python
# Run in Python shell
from plc.connector import PLCConnector

plc = PLCConnector("192.168.0.100")
print(f"Connected: {plc.connect()}")
print(f"Read DB1: {plc.read_real(1, 0)}")
```

---

## Updates

### Update Procedure

```bash
# Stop service
sudo systemctl stop grp-test

# Backup database
./backup.sh

# Pull updates
git pull origin main

# Update dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Rebuild frontend
cd ../frontend
npm install
npm run build
cp -r dist/* ../backend/static/

# Start service
sudo systemctl start grp-test
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Restrict PLC network access
- [ ] Enable log rotation
- [ ] Set up monitoring
- [ ] Configure backup schedule
- [ ] Disable debug mode in production
