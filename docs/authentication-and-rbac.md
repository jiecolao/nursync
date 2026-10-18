# Authentication and RBAC

## Environment

Set these on the backend (never expose SMTP credentials or `JWT_SECRET` as `VITE_*` variables):

- `JWT_SECRET`: long, randomly generated signing secret. The API intentionally refuses to start without it.
- `FRONTEND_ORIGIN`: exact browser origin allowed to send credentialed requests (for example `http://localhost:5173`).
- `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`.
- For Gmail, enable 2-Step Verification and create a Google App Password. Use that App Password as `SMTP_PASS`, not the regular Google account password.

Install dependencies with `npm install` after pulling this branch.

## API

- `POST /api/auth/login` with `{ "email": "...", "password": "..." }`: sets HTTP-only access and refresh cookies.
- `GET /api/auth/session`: returns current account identity, role, and permissions.
- `POST /api/auth/refresh`: verifies and rotates the refresh token cookie.
- `POST /api/auth/logout`: invalidates the stored refresh token and clears cookies.
- `POST /api/auth/forgot-password` with `{ "email": "..." }`: sends a six-digit code if the active account exists. The challenge is held in an HTTP-only cookie.
- `POST /api/auth/verify-otp` with `{ "code": "123456" }`: validates the short-lived code and sets a short-lived HTTP-only reset cookie.
- `POST /api/auth/reset-password` with `{ "password": "..." }`: resets the password, invalidates refresh sessions, and clears reset/auth cookies.

Use `credentials: 'include'` for frontend requests. In production, serve the UI and API over HTTPS so the authentication cookies use the `Secure` flag.

## RBAC

JWT access claims include `role`, `roles`, and the six Boolean permissions: `students_read`, `students_write`, `user_read`, `user_write`, `logs_read`, and `logs_write`. Use `@UseGuards(JwtAuthGuard, RbacGuard)` with `@RequireRoles(...)` and/or `@RequirePermissions(...)` on controllers and handlers. The frontend `CanAccess` component and `ProtectedRoute` are presentation aids only; the API guards remain the security boundary.

Access tokens expire after 15 minutes; refresh tokens expire after seven days and are stored hashed in the database. Password-reset challenges expire after ten minutes and are held in HTTP-only cookies.
