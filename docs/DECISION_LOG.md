# Decision log

## V0/V1

- Keep the initial system monolithic and synchronous.
- Use a hashed opaque refresh token instead of storing a bearer token in the
  database.
- Keep tenant scoping in application repositories; RLS remains a later
  defense-in-depth enhancement once transaction-local context is established.
- Do not install AI or deferred infrastructure dependencies before V3/V4.

