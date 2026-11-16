# React Frontend

## Structure

- `frontend/src/main.tsx` mounts the React application.
- `frontend/src/app/App.tsx` defines routes and feature screens.
- `frontend/src/auth/AuthProvider.tsx` stores the in-memory session.
- `frontend/src/auth/ProtectedRoute.tsx` blocks unauthenticated routes.
- `frontend/src/api/client.ts` contains shared API client support.
- `frontend/src/styles.css` contains the small prototype stylesheet.

## Routes

| Route | Screen |
|---|---|
| `/login` | Demo registration/login |
| `/` | Protected dashboard shell |
| `/onboarding` | Company profile and template setup |
| `/knowledge` | Upload, document list, and retrieval test |
| `/chat` | Grounded admin chat preview |
| `/rules` | Create/list/disable escalation rules |

## Session behavior

The login screen first tries demo registration and falls back to login on
`409`. `AuthProvider` keeps the access token, email, and organization ID in
React state. Protected screens add `Authorization: Bearer <token>` to API
requests. Sign out clears the in-memory state.

## Feature behavior

The screens are intentionally thin clients. They collect user input, call
FastAPI endpoints, render typed response fields, and show explicit status
messages. Authorization, tenant selection, parsing, ranking, state decisions,
and rules remain backend responsibilities.

## Interview trade-off

The prototype does not persist the session across a full browser reload and
does not yet use a generated API client. Production improvements would include
secure session restoration, refresh handling, accessibility refinement, shared
form components, and stronger error models.
