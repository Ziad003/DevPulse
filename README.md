# DevPulse

DevPulse is a RESTful issue-tracking API for logging bugs and feature requests. It supports role-aware access, JWT authentication, and PostgreSQL-backed issue management.

**Live API:** [https://dev-pulse-tau-eight.vercel.app](https://dev-pulse-tau-eight.vercel.app)

## Features

- Register and authenticate contributors or maintainers.
- Secure protected routes with JSON Web Tokens (JWT).
- Create, view, filter, sort, update, and delete issues.
- Track bug reports and feature requests with `open`, `in_progress`, and `resolved` statuses.
- Apply role-based permissions: maintainers can manage all issues; contributors can edit only their own open issues.
- Create the required PostgreSQL tables automatically when the server starts.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL with `pg`
- **Authentication:** JWT and bcryptjs password hashing
- **Configuration:** dotenv
- **Build and deployment:** tsup and Vercel

## Getting Started

### Prerequisites

- Node.js 18 or later
- A PostgreSQL database

### Installation

1. Clone the repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```env
   PORT=5000
   CONNECTIONSTRING=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
   JWT_SECRET=replace_with_a_secure_secret
   JWT_REFRESH_SECRET=replace_with_a_secure_refresh_secret
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The server initializes the `users` and `issues` tables if they do not already exist.

### Production Build

```bash
npm run build
npm start
```

## API Reference

Base URL: `https://dev-pulse-tau-eight.vercel.app`

For protected endpoints, send the JWT returned by login in the `Authorization` header:

```http
Authorization: <token>
```

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Returns the DevPulse welcome message. |
| `POST` | `/api/auth/signup` | Public | Register a user. |
| `POST` | `/api/auth/login` | Public | Log in and receive an access token. |
| `POST` | `/api/issues` | Contributor, Maintainer | Create an issue. |
| `GET` | `/api/issues` | Public | List issues. Supports `sort`, `type`, or `status` query parameters. |
| `GET` | `/api/issues/:id` | Public | Retrieve one issue and its reporter details. |
| `PATCH` | `/api/issues/:id` | Contributor, Maintainer | Update an issue. Contributors may update only their own issues while they are `open`. |
| `DELETE` | `/api/issues/:id` | Maintainer | Delete an issue. |

### Request Examples

Register a user:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strong-password",
  "role": "contributor"
}
```

Create an issue:

```json
{
  "title": "Dashboard does not load",
  "description": "The dashboard remains blank after a successful login attempt.",
  "type": "bug",
  "status": "open"
}
```

Allowed issue types are `bug` and `feature_request`; allowed statuses are `open`, `in_progress`, and `resolved`. Issue descriptions must contain at least 20 characters.

## Database Schema

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(30)` | Required |
| `email` | `VARCHAR(50)` | Required and unique |
| `password` | `TEXT` | Required; stored as a bcrypt hash |
| `role` | `VARCHAR(15)` | `contributor` (default) or `maintainer` |
| `created_at` | `TIMESTAMP` | Defaults to the current time |
| `updated_at` | `TIMESTAMP` | Defaults to the current time |

### `issues`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `title` | `VARCHAR(150)` | Required |
| `description` | `TEXT` | Required; minimum 20 characters |
| `type` | `VARCHAR(20)` | `bug` or `feature_request` |
| `status` | `VARCHAR(20)` | `open` (default), `in_progress`, or `resolved` |
| `reporter_id` | `INT` | Required foreign key to `users.id`; cascading delete |
| `created_at` | `TIMESTAMP` | Defaults to the current time |
| `updated_at` | `TIMESTAMP` | Defaults to the current time |

Each issue belongs to one user through `issues.reporter_id`.
