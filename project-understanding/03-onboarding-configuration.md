# Templates, Profiles, and Immutable Configuration

## Purpose

Onboarding converts a generic organization into a configured support
workspace. The template is versioned so future template changes do not mutate
an organization's completed configuration unexpectedly.

## Flow

1. `GET /api/v1/templates` returns active templates.
2. The frontend collects `company_name` and `timezone`.
3. `PUT /api/v1/onboarding/profile` saves the tenant profile.
4. `POST /api/v1/onboarding/complete` validates the selected template.
5. The backend creates a `company_configs` snapshot with the template
   configuration and marks onboarding complete.
6. `GET /api/v1/configuration/current` returns the tenant snapshot.

## Validation and safety

Template IDs are validated against active database rows. Profile values are
validated by Pydantic. Completion is protected against duplicate setup. The
configuration is owned by the authenticated organization.

## Frontend behavior

`Onboarding` loads templates on mount, renders radio choices, sends profile and
completion requests with the Bearer token, and redirects to the dashboard on
success. API errors are shown as user-facing messages.

## Interview question

**Why snapshot instead of reading the template every time?**  
Because a template is a reusable versioned definition, while a company's
configuration is a historical tenant decision. A snapshot preserves the
configuration that the company selected even if the global template later
changes.
