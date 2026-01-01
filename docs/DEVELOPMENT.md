# Development Guide

Developer guide for contributing to the GRP Ring Stiffness Test Machine project.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git
- VS Code (recommended)

### Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/stiffness_machine_test.git
cd stiffness_machine_test

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

---

## Project Structure

```
stiffness_machine_test/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Entry point
│   ├── config.py           # Settings
│   ├── requirements.txt
│   ├── plc/                # PLC communication
│   │   ├── connector.py    # Snap7 wrapper
│   │   ├── data_service.py # Read operations
│   │   └── command_service.py # Write operations
│   ├── api/
│   │   ├── websocket.py    # Socket.IO handlers
│   │   └── routes/         # REST endpoints
│   ├── db/
│   │   ├── database.py     # SQLAlchemy setup
│   │   └── models.py       # ORM models
│   └── services/           # Business logic
│
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── api/           # API clients
│   │   ├── hooks/         # React hooks
│   │   ├── pages/         # Page components
│   │   ├── components/    # UI components
│   │   └── types/         # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                   # Documentation
```

---

## Development Workflow

### Running in Development Mode

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

The `--reload` flag enables hot reload for the backend.

### Running Without PLC

The backend runs in "offline mode" when PLC is not available. Use demo endpoints to generate test data:

```bash
# Generate demo tests
curl -X POST "http://localhost:8000/api/demo/generate-tests?count=10"

# Generate demo alarms
curl -X POST "http://localhost:8000/api/demo/generate-alarms?count=5"

# Clear demo data
curl -X DELETE "http://localhost:8000/api/demo/clear-all"
```

---

## Code Style

### Python (Backend)

- **Style**: PEP 8
- **Formatter**: Black
- **Linter**: Flake8
- **Type Hints**: Required for function signatures

```bash
# Format code
black backend/

# Check style
flake8 backend/
```

Example:
```python
from typing import Optional, Dict, Any

def get_live_data(self) -> Dict[str, Any]:
    """Read all real-time values from PLC.

    Returns:
        Dictionary with force, deflection, status values.
    """
    if not self.plc.connected:
        return self._get_disconnected_data()

    return {
        "actual_force": self.plc.read_real(2, 0) or 0.0,
        # ...
    }
```

### TypeScript (Frontend)

- **Style**: ESLint + Prettier
- **Strict Mode**: Enabled
- **Type Imports**: Use `import type` when possible

```bash
# Lint code
npm run lint

# Type check
npm run type-check
```

Example:
```typescript
import type { LiveData } from '@/types/api';

export function useLiveData(): { liveData: LiveData; isConnected: boolean } {
  const [liveData, setLiveData] = useState<LiveData>(defaultLiveData);
  // ...
}
```

---

## Adding New Features

### Adding a New API Endpoint

1. **Create route in `backend/api/routes/`**:

```python
# backend/api/routes/new_feature.py
from fastapi import APIRouter

router = APIRouter(prefix="/new-feature", tags=["New Feature"])

@router.get("/")
async def get_data():
    return {"data": "value"}

@router.post("/action")
async def do_action(param: str):
    return {"success": True, "param": param}
```

2. **Register in `main.py`**:

```python
from api.routes import new_feature

app.include_router(new_feature.router, prefix="/api")
```

3. **Add frontend API method**:

```typescript
// frontend/src/api/client.ts
async getNewFeatureData(): Promise<{ data: string }> {
  return this.request('/api/new-feature');
}

async doNewFeatureAction(param: string): Promise<CommandResponse> {
  return this.request('/api/new-feature/action', {
    method: 'POST',
    body: JSON.stringify({ param }),
  });
}
```

4. **Create React hook**:

```typescript
// frontend/src/hooks/useApi.ts
export function useNewFeature() {
  return useQuery({
    queryKey: ['new-feature'],
    queryFn: () => api.getNewFeatureData(),
  });
}

export function useNewFeatureAction() {
  return useMutation({
    mutationFn: (param: string) => api.doNewFeatureAction(param),
  });
}
```

### Adding a New PLC Data Field

1. **Add offset constant in `data_service.py`**:

```python
class DataService:
    # Existing offsets...
    DB2_NEW_FIELD = 26  # New field at offset 26
```

2. **Read in `get_live_data()`**:

```python
def get_live_data(self) -> Dict[str, Any]:
    return {
        # Existing fields...
        "new_field": self.plc.read_real(2, self.DB2_NEW_FIELD) or 0.0,
    }
```

3. **Update TypeScript interface**:

```typescript
// frontend/src/types/api.ts
export interface LiveData {
  // Existing fields...
  new_field: number;
}
```

4. **Update default values in `useLiveData.ts`**:

```typescript
const defaultLiveData: LiveData = {
  // Existing fields...
  new_field: 0,
};
```

### Adding a New Page

1. **Create page component**:

```typescript
// frontend/src/pages/NewPage.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function NewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">New Page</h1>
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Page content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

2. **Add route in `App.tsx`**:

```typescript
import NewPage from '@/pages/NewPage';

<Routes>
  {/* Existing routes... */}
  <Route path="/new-page" element={<NewPage />} />
</Routes>
```

3. **Add navigation link in `Sidebar.tsx`**:

```typescript
<NavLink to="/new-page">New Page</NavLink>
```

---

## Database Schema

### Adding New Model

```python
# backend/db/models.py
class NewModel(Base):
    __tablename__ = "new_models"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    value = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "value": self.value,
            "created_at": self.created_at.isoformat(),
        }
```

The database is auto-created on startup via `init_db()`.

---

## Testing

### Backend Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html
```

Example test:
```python
# backend/tests/test_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
```

### Frontend Tests

```bash
cd frontend
npm install vitest @testing-library/react

# Run tests
npm run test

# Watch mode
npm run test:watch
```

Example test:
```typescript
// frontend/src/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Dashboard';

test('renders dashboard', () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
  expect(screen.getByText(/Force/i)).toBeInTheDocument();
});
```

---

## Debugging

### Backend Debugging

Enable debug logging:
```python
# config.py
DEBUG = True
LOGGING_LEVEL = "DEBUG"
```

VS Code launch configuration:
```json
{
  "name": "Python: FastAPI",
  "type": "python",
  "request": "launch",
  "module": "uvicorn",
  "args": ["main:socket_app", "--reload"],
  "cwd": "${workspaceFolder}/backend"
}
```

### Frontend Debugging

Use React Developer Tools and browser DevTools.

VS Code launch configuration:
```json
{
  "name": "Launch Chrome",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

### PLC Debugging

```python
# Quick PLC test script
from plc.connector import PLCConnector

plc = PLCConnector("192.168.0.100")
print(f"Connected: {plc.connect()}")

# Read DB1 parameters
print(f"Diameter: {plc.read_real(1, 0)}")
print(f"Length: {plc.read_real(1, 4)}")

# Read DB2 results
print(f"Force: {plc.read_real(2, 0)}")
print(f"Deflection: {plc.read_real(2, 4)}")

# Read DB3 status
print(f"Servo Ready: {plc.read_bool(3, 1, 0)}")
print(f"At Home: {plc.read_bool(3, 1, 2)}")

plc.disconnect()
```

---

## Common Tasks

### Regenerate API Types

If you change the backend API, update frontend types:

1. Check OpenAPI schema: `http://localhost:8000/docs`
2. Update `frontend/src/types/api.ts` manually
3. Or use a generator:
   ```bash
   npx openapi-typescript http://localhost:8000/openapi.json -o src/types/generated.ts
   ```

### Add shadcn/ui Component

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Available components: button, card, input, select, table, dialog, dropdown-menu, etc.

### Update Dependencies

Backend:
```bash
cd backend
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt
```

Frontend:
```bash
cd frontend
npm update
npm audit fix
```

---

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

### Commit Messages

Follow conventional commits:

```
feat: add new test report format
fix: correct ring stiffness calculation
docs: update API documentation
refactor: extract PLC connection logic
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log or debug statements
- [ ] Types are correct

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Snap7 Documentation](https://python-snap7.readthedocs.io/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
