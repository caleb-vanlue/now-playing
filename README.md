# Plex Dashboard

A sleek, real-time dashboard for monitoring media currently playing on your Plex server. Track what's playing across movies, TV shows, and music with automatic updates and a beautiful user interface.

## Features

- **Real-time Media Monitoring**: View all content currently playing across your Plex server
- **Multiple Media Types**: Support for movies, TV shows, and music tracks
- **Live Updates**: Automatic polling and data refresh (configurable interval)
- **Responsive Design**: Optimized for both desktop and mobile viewing
- **Beautiful Animations**: Smooth transitions and motion effects using Framer Motion
- **Detailed Information**: Click on any media item to view comprehensive details
- **Active Session Tracking**: See who's watching/listening and for how long
- **Dark Theme**: Easy on the eyes with a sleek, dark interface

## Prerequisites

- Node.js (v16+)
- A running Plex Media Server or compatible API
- API endpoints for media data and thumbnails, preferably with the custom [plex-activity-tracker](https://github.com/caleb-vanlue/plex-activity-tracker) API, which listens for Plex webhooks, and [file-storage](https://github.com/caleb-vanlue/file-storage) API, which transfers files over a network

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/caleb-vanlue/plex-dashboard.git
   cd plex-dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory with the following variables:

   ```
   NEXT_PUBLIC_MEDIA_API_URL=http://your-media-api-url
   NEXT_PUBLIC_FILES_API_URL=http://your-files-api-url
   NEXT_PUBLIC_FETCH_TIMEOUT=8000
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Configuration

The dashboard can be configured through environment variables:

| Variable                    | Description                      | Default                 |
| --------------------------- | -------------------------------- | ----------------------- |
| `NEXT_PUBLIC_MEDIA_API_URL` | URL for the media API            | `http://localhost:3000` |
| `NEXT_PUBLIC_FILES_API_URL` | URL for the files/thumbnails API | `http://localhost:3001` |
| `NEXT_PUBLIC_FETCH_TIMEOUT` | Timeout for API requests (in ms) | `8000`                  |

## Media API

The dashboard expects the following API endpoint:

- `GET /media/current` - Returns currently playing media across your server

The API should return data in the following format:

```typescript
interface MediaData {
  tracks: Track[]; // Currently playing music tracks
  movies: Movie[]; // Currently playing movies
  episodes: Episode[]; // Currently playing TV episodes
}
```

See `types/media.ts` for detailed type definitions.

## Customization

### Styling

The application uses Tailwind CSS for styling. You can customize the appearance by modifying:

- `globals.css` - Contains CSS variables for colors and animations
- Individual component files - Contains Tailwind classes

### Polling Interval

You can adjust how frequently the dashboard polls for updates by modifying the `pollingInterval` prop in `MediaDashboard.tsx` or when using the `useMediaData` hook.

## Architecture

The application follows a standard Next.js structure:

- `components/` - React components
- `hooks/` - Custom React hooks
- `pages/` - Next.js pages/routes
- `types/` - TypeScript type definitions
- `utils/` - Utility functions

Key components:

- `MediaDashboard` - Main container component
- `MovieCard`, `MusicCard` - Media item display cards
- `NavigationTabs` - Tabs for switching between media types
- `useMediaData` - Hook for fetching and refreshing media data

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
