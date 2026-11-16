# API Map

All routes are prefixed with `/api/v1` unless noted. Protected routes require
the Bearer access token. Owner/admin routes additionally require the matching
role.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create user, organization, membership, and tokens |
| POST | `/auth/login` | Authenticate and issue tokens |
| POST | `/auth/refresh` | Rotate the HttpOnly refresh token |
| POST | `/auth/logout` | Revoke refresh session |
| GET | `/auth/me` | Return current user and membership |

## Organization and onboarding

| Method | Path | Purpose |
|---|---|---|
| GET | `/organizations/current` | Current tenant |
| GET | `/templates` | Active industry templates |
| GET | `/templates/{id}` | Template details |
| GET | `/onboarding/status` | Setup status |
| PUT | `/onboarding/profile` | Save company profile |
| POST | `/onboarding/complete` | Create immutable configuration |
| GET | `/configuration/current` | Read configuration snapshot |

## Knowledge

| Method | Path | Purpose |
|---|---|---|
| POST | `/knowledge/documents` | Upload and process a document |
| GET | `/knowledge/documents` | List tenant documents |
| GET | `/knowledge/documents/{id}` | Read document status |
| POST | `/knowledge/documents/{id}/retry` | Retry processing |
| DELETE | `/knowledge/documents/{id}` | Delete document/chunks |
| POST | `/knowledge/retrieve` | Search tenant chunks |

## Chat and controls

| Method | Path | Purpose |
|---|---|---|
| POST | `/chat/conversations` | Create conversation |
| GET | `/chat/conversations/{id}/messages` | List messages |
| POST | `/chat/conversations/{id}/messages` | Respond in conversation |
| POST | `/chat/preview` | Admin one-request preview |
| GET/PUT | `/flows/current` | Read/save current tenant flow |
| GET | `/rules` | List rules |
| POST | `/rules` | Create rule |
| PATCH | `/rules/{id}` | Update rule |
| DELETE | `/rules/{id}` | Disable rule |
| POST | `/rules/test` | Side-effect-free rule evaluation |

Interactive OpenAPI documentation is available at
`http://localhost:8000/docs`.
