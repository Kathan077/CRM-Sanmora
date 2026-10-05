# CRM Sanmora - Backend & RBAC API Documentation

This document explains the backend architecture, authentication system, Role-Based Access Control (RBAC), and how to test all API endpoints.

---

## 🔑 Default Credentials (Super Admin)

When the server starts for the first time, it automatically creates the default Super Admin account:
- **Email**: `admin@sanmoracrm.com`
- **Password**: `Admin@123456`
- **Role**: `Super Admin` (Has full access to all system modules)

---

## ⚡ Quick Start & Testing

### Option 1: Automated Test Suite (Recommended)
Run the built-in test script to verify all 9 steps of authentication, role creation, user management, and RBAC enforcement:
```bash
cd server
npm run test:api
```

### Option 2: Start Development Server
```bash
cd server
npm run dev
```
Server runs on: `http://localhost:5000`

---

## 🛠️ REST API Endpoints Overview

### 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Login with email & password, returns JWT token |
| `GET` | `/api/auth/me` | Protected | Get current user's profile, role, & effective permissions |
| `PUT` | `/api/auth/profile` | Protected | Update logged-in user's name & phone |
| `PUT` | `/api/auth/change-password` | Protected | Change current user's password |

#### Example Login Request:
`POST http://localhost:5000/api/auth/login`
```json
{
  "email": "admin@sanmoracrm.com",
  "password": "Admin@123456"
}
```

---

### 2. Role & Permission Management Endpoints (`/api/roles`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/roles` | `roles:view` | Get list of all roles & assigned user counts |
| `GET` | `/api/roles/permissions` | `roles:view` | Get all available system permissions & module groups |
| `POST` | `/api/roles` | `roles:create` | Create a new custom role with specific permissions |
| `PUT` | `/api/roles/:id` | `roles:update` | Edit custom role permissions or description |
| `DELETE` | `/api/roles/:id` | `roles:delete` | Delete custom role (system roles are protected) |

#### Example Create Custom Role Request:
`POST http://localhost:5000/api/roles`
*Headers: `Authorization: Bearer <ADMIN_JWT_TOKEN>`*
```json
{
  "name": "Sales Manager",
  "description": "Manages lead assignments and team performance",
  "permissions": [
    "users:view",
    "roles:view",
    "leads:view_all",
    "leads:create",
    "leads:update",
    "leads:assign",
    "leads:change_status",
    "followups:view",
    "followups:create",
    "reports:view"
  ]
}
```

---

### 3. User & Employee Management Endpoints (`/api/users`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | `users:view` | Get all employees (supports `search`, `roleId`, `status` query filters) |
| `GET` | `/api/users/:id` | `users:view` | Get single employee details & effective permissions |
| `POST` | `/api/users` | `users:create` | Add new employee/user, set role & custom permissions |
| `PUT` | `/api/users/:id` | `users:update` | Update employee role, department, designation, or permissions |
| `PATCH` | `/api/users/:id/toggle-status` | `users:toggle_status` | Activate or Deactivate employee account |
| `DELETE` | `/api/users/:id` | `users:delete` | Delete employee account |

#### Example Create Employee Request:
`POST http://localhost:5000/api/users`
*Headers: `Authorization: Bearer <ADMIN_JWT_TOKEN>`*
```json
{
  "name": "Amit Sharma",
  "email": "amit.sales@sanmoracrm.com",
  "password": "Employee@123456",
  "roleId": "<ROLE_ID_HERE>",
  "phone": "+91 98765 11111",
  "department": "Sales",
  "designation": "Sales Executive",
  "customPermissions": []
}
```

---

## 🔒 Permission System Explained

The system calculates **Effective Permissions** for any user dynamically:
$$\text{Effective Permissions} = \text{Role Permissions} \cup \text{Custom User Permissions}$$

1. **Super Admin**: Always bypasses permission checks (has full system control).
2. **Role Permissions**: Permissions inherited by belonging to a specific Role (e.g. Sales Executive).
3. **Custom Permissions**: Admin can assign extra individual permissions to a specific user without creating a new role!
