# Testing strategy

Pytest and HTTPX cover authentication, refresh rotation, registration
atomicity, RBAC, and cross-tenant authorization. Fixture tests verify every
prepared question has an evidence or safe-fallback expectation. Frontend
checks run TypeScript compilation, ESLint, and the production build.

