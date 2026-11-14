# V1 Authentication and Tenant Foundation

## Goal

V1 added secure users, organizations, memberships, roles, and tenant-scoped
authentication.

## Implementation process

1. Register a user and create the initial organization and membership.
2. Hash passwords with Argon2id; never store plaintext passwords.
3. Issue a short-lived JWT access token and a rotating refresh token at login.
4. Build an authenticated `AuthContext` from the token and membership.
5. Add role dependencies for owner/admin operations.
6. Require every organization-owned query to use the authenticated organization.
7. Reject refresh-token reuse and invalid credentials.

## Request flow

The browser sends credentials to the auth API. The backend verifies the
password, creates tokens, and returns the access token. Protected endpoints
resolve the user and membership before running application logic. The client
does not choose the organization context.

## Main implementation areas

- Authentication routes issue and rotate tokens.
- Password utilities use Argon2id.
- Dependency helpers create `AuthContext` and enforce roles.
- Organization and membership models provide tenant ownership.
- Protected queries filter by the organization from the context.

## Validation

Authentication, refresh rotation, RBAC, and tenant-isolation tests passed.

## Manual check

1. Register two users in separate organizations.
2. Log in as each user.
3. Confirm each user can access their own protected endpoints.
4. Try to use one user's token against the other organization's data and
   confirm access is denied or no data is returned.
5. Refresh once, then reuse the old refresh token and confirm it is rejected.

## Security boundary

Client-supplied organization IDs are never trusted for authorization.
Authentication and tenant context are established before business logic.
