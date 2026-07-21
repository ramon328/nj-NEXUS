# Edge Functions

This folder contains the Supabase Edge Functions for the GoAutos Admin application.

## Functions

### send-email

Sends emails using the Resend API. This function is used for various email notifications in the application.

### consignments-reports

Weekly reports for consigned vehicles. This function:

- Fetches all active vehicle consignments (excluding those with "Vendido" status)
- For each customer, generates a report showing:
  - For published vehicles: View statistics and engagement metrics
  - For unpublished vehicles: Current status in the client's timeline
- Uses the send-email function to deliver the reports to vehicle owners

## Deployment

Deploy functions using the Supabase CLI:

```bash
supabase functions deploy [function-name]
```

## Scheduled Execution

The `consignments-reports` function can be executed on a schedule using pg_cron:

```sql
SELECT cron.schedule(
  'weekly-consignment-reports',  -- unique job name
  '0 9 * * MON',                 -- cron schedule (every Monday at 9:00 AM)
  $$
  SELECT http_post(
    'https://[your-project-ref].supabase.co/functions/v1/consignments-reports',
    '{}',
    'application/json',
    ARRAY[
      'Authorization: Bearer [anon-key]'
    ]
  );
  $$
);
```

Note: Replace `[your-project-ref]` and `[anon-key]` with your actual Supabase project reference and anonymous key.
