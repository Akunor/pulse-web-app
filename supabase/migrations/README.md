# Database Migrations

This directory contains the database migrations for the Pulse web application. The migrations are organized by category and follow a specific naming convention.

## Directory Structure

```
migrations/
├── core/           # Core tables and functions
├── auth/           # Authentication-related functions and triggers
├── notify/         # Notification system functions and triggers
├── workout/        # Workout-related functions and triggers
└── user/           # User utility functions
```

## Migration Files

### Core Migrations
- `20240321000000_core_init.sql`: Initializes core tables and functions
- `20240321000007_final_setup.sql`: Final cleanup and configuration

### Auth Migrations
- `20240321000001_auth_init.sql`: Sets up user-related functions and triggers

### Notification Migrations
- `20240321000003_notify_init.sql`: Sets up notification system functions
- `20240321000004_notify_edge_function.sql`: Integrates with Netlify Edge Function
- `20240321000005_notify_scheduled_jobs.sql`: Sets up scheduled notification jobs

### Workout Migrations
- `20240321000002_workout_init.sql`: Sets up workout-related functions and triggers

### User Migrations
- `20240321000006_user_utils.sql`: Sets up user utility functions

## Naming Convention

Migration files follow the naming pattern:
```
YYYYMMDD_HHMMSS_<category>_<action>.sql
```

Where:
- `YYYYMMDD_HHMMSS`: Timestamp in UTC
- `<category>`: One of: core, auth, notify, workout, user
- `<action>`: Descriptive action (e.g., init, edge_function, scheduled_jobs)

## Running Migrations

Migrations are automatically run by Supabase in the order specified by their timestamps. The migration process:

1. Creates necessary extensions
2. Creates tables and functions
3. Sets up triggers and policies
4. Configures security settings
5. Creates indexes and comments
6. Performs cleanup of old objects

## Security

All migrations include:
- Row Level Security (RLS) policies
- Proper permissions for authenticated users and service role
- Security definer functions where appropriate
- Input validation and error handling

## Backup

Before running migrations, a backup is automatically created in the `migrations_backup` directory.

## Rollback

To rollback migrations:
1. Restore from the backup directory
2. Run the migrations in reverse order
3. Verify the database state

## Dependencies

Required extensions:
- `uuid-ossp`: For UUID generation
- `pgcrypto`: For cryptographic functions
- `pg_cron`: For scheduled jobs

## Notes

- All timestamps are stored in UTC
- User timezones are handled in the application layer
- Notifications are queued and processed asynchronously
- Failed notifications are automatically retried
- Old notifications are cleaned up daily 