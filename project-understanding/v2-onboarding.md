# V2 Templates and Onboarding

## Goal

V2 added versioned industry templates and a one-time company onboarding flow.
The first template is the Northstar Store e-commerce configuration.

## Implementation process

1. Create a versioned template registry.
2. Expose available templates to the frontend.
3. Collect the company name and selected template.
4. Validate the authenticated profile and template ID on the backend.
5. Create an immutable organization-owned configuration snapshot.
6. Reject duplicate onboarding completion.
7. Add the onboarding screen and protected navigation.

## Request flow

The frontend loads templates, collects the company name, and submits the
selection. The backend derives the organization from `AuthContext`, validates
the template, saves the profile, and creates the configuration snapshot.
Subsequent requests read the tenant's snapshot rather than trusting browser
state.

## Important behavior

- Templates have stable IDs and versions.
- Configuration belongs to one organization.
- Completion is idempotency-protected by rejecting a second completion.
- An organization cannot read another organization's configuration.

## Validation

Eight backend tests passed. Frontend build and lint passed.

## Manual check

1. Sign in and open `/onboarding`.
2. Select the Northstar Store template and enter a company name.
3. Complete onboarding and confirm the success response.
4. Submit again and confirm duplicate completion is rejected.
5. Use a second organization and confirm it cannot see the first snapshot.

## Boundary

V2 does not upload documents or call an LLM. Those concerns begin in V3 and
V4.
