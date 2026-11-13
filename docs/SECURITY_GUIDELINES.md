# Security guidelines

- Passwords use Argon2id and are never logged or returned.
- Access JWTs are short-lived. Refresh tokens are random, hashed at rest,
  rotated on use, and revoked on logout or reuse detection.
- Organization identity comes from the authenticated membership, never from
  request JSON, query parameters, or browser storage.
- Role checks occur in backend dependencies/services.
- Tokens and secrets are excluded from API responses and logs.
- AI, uploaded content, and integrations are deferred until their versions.

