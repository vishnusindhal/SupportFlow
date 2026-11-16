# Authentication, Authorization, and Tenant Isolation

## Registration

`POST /api/v1/auth/register` accepts organization name/slug, display name,
email, and password. The auth service normalizes the email, hashes the
password with Argon2id, creates the user, organization, and owner membership,
and issues tokens.

## Login and tokens

`POST /api/v1/auth/login` verifies the Argon2id hash. The access token is a
short-lived JWT containing the user (`sub`) and organization (`org`). The
refresh token is random, stored only as a hash in `refresh_sessions`, and sent
as an HttpOnly cookie.

Refresh rotation works as follows:

1. Hash the presented refresh cookie.
2. Find the database session.
3. Reject missing, expired, or revoked sessions.
4. Revoke the current session.
5. Create a replacement session with a new random token.
6. Set the replacement cookie and issue a new access token.

Reuse of a revoked refresh token is rejected. Logout revokes the current
refresh session and clears the cookie.

## AuthContext

`get_current_context` decodes the JWT, converts the subject and organization
claims to UUIDs, checks an active membership, and loads the user and
organization. It returns an immutable `AuthContext`.

Routes use:

- `UserContext` for authenticated organization members.
- `Admin` for owner/admin operations.
- `require_roles` for reusable role checks.

## Tenant isolation invariant

The organization in `AuthContext` is the authorization source. Every query
for documents, chunks, conversations, flows, rules, messages, and audit rows
includes the authenticated organization ID. A client cannot switch tenants by
changing a request body field.

## Interview trade-off

The access token is convenient for API calls, while the refresh token is
protected with an HttpOnly cookie. For production, the application would also
use a strong external secret, HTTPS, secure cookies, rate limiting, email
verification, password reset, and centralized audit/monitoring.

## Manual checks

Use `/docs` to register two organizations, log in to each, call `/auth/me`,
and verify that resources created by one organization are invisible to the
other. Refresh once and reuse the old cookie to verify rotation.
