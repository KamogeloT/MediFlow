# MediFlow

A React + TypeScript + Vite application.

## Supabase Setup

This project uses [Supabase](https://supabase.com) for authentication.

1. Create a Supabase project.
2. Copy your project's URL and anonymous key.
3. Create a `.env` file based on `.env.example` and set the following variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Development

Install dependencies and start the development server:

```
npm install
npm run dev
```

Run type checking and build for production:

```
npm run build
```

Run linting:

```
npm run lint
```
