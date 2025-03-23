# Pulse Web App

A social fitness tracking application built with React, Supabase, and Expo.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `.env`:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_RESEND_API_KEY`: Your Resend API key for email services

## Deployment

### Web Deployment (Netlify)
1. Connect your repository to Netlify
2. Add the following environment variables in Netlify's dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RESEND_API_KEY`

### Mobile Deployment (Expo)
1. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```
2. Set up environment variables in Expo:
   ```bash
   expo config:set VITE_SUPABASE_URL=your_supabase_url
   expo config:set VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   expo config:set VITE_RESEND_API_KEY=your_resend_api_key
   ```

## Security

This project follows security best practices:
- Environment variables are not committed to the repository
- Authentication is handled through Supabase
- Database access is controlled through Row Level Security (RLS)
- API keys are stored securely in deployment platforms

For security concerns, please see our [Security Policy](SECURITY.md). 