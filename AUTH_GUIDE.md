# Admin Authentication Guide

## Default Admin Credentials

For development and testing, the following admin account is seeded in the database:

- **Email**: `admin@demo.test`
- **Password**: `changeme123`

⚠️ **Security Note**: Change this password in production!

## Login Methods

### 1. Email + Password Login
1. Navigate to http://localhost:3000/auth/login
2. Enter email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### 2. Magic Link Login
1. Navigate to http://localhost:3000/auth/login
2. Request a magic link (requires email service configuration)
3. Click the link in your email
4. You'll be automatically logged in

## Protected Routes

All admin pages are protected with authentication:
- `/` - Dashboard
- `/employees` - Employee management
- `/campaigns` - Campaign management

If you try to access these pages without being logged in, you'll be redirected to `/auth/login`.

## Authentication Flow

1. **Login**: User provides credentials
2. **JWT Generation**: Server creates a JSON Web Token
3. **Token Storage**: Frontend stores JWT in localStorage
4. **Protected Requests**: All API calls include JWT in Authorization header
5. **Logout**: JWT is removed from localStorage

## JWT Token

- **Storage**: `localStorage.getItem('jwt_token')`
- **Header Format**: `Authorization: Bearer <token>`
- **Expiration**: Configured in backend (default: 24 hours)

## Testing Authentication

### Test Login API
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.test", "password": "changeme123"}'
```

### Test Protected Endpoint
```bash
# First, get a token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.test", "password": "changeme123"}' | jq -r '.token')

# Then use it to access protected endpoint
curl http://localhost:4000/campaigns \
  -H "Authorization: Bearer $TOKEN"
```

## Logout

Click the "Logout" button in the navigation bar to:
1. Clear the JWT token from localStorage
2. Redirect to the login page
3. Prevent access to protected routes

## Troubleshooting

### "Invalid credentials" error
- Check email/password spelling
- Verify admin exists in database: `SELECT * FROM admins WHERE email = 'admin@demo.test';`
- Ensure password hash is set: `SELECT password_hash IS NOT NULL FROM admins;`

### Redirected to login immediately
- JWT token may have expired
- Token may be invalid
- Check browser console for errors

### "Unauthorized" on API calls
- JWT token not being sent
- Token is invalid or expired
- Check Network tab in browser dev tools
- Verify Authorization header is present
