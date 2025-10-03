# Implementation Plan for Toast App (Entosis Notification Management)

## Overview
Create a new EVE Online entosis notification management app at `toast.sway.re` and `toast.localhost` that follows the same design patterns, authentication, and infrastructure as the existing timers app.

## Phase 1: Shared Infrastructure Setup
1. **Create shared libraries folder** (`/shared/`) to house reusable components: **DONE**
   - Move EVE ESI library from timers app to shared folder **DONE**
   - Create shared authentication components and utilities **DONE**
   - Create shared UI components (theming, layouts, sign-in components) **DONE**
   - Update timers app to use shared components **DONE**

## Phase 2: Toast Project Foundation
2. **Set up toast project structure**: **DONE**
   - Create `projects/toast/` directory with Next.js 14 structure **DONE**
   - Copy and adapt package.json from timers (same dependencies) **DONE**
   - Set up TypeScript, TailwindCSS, and Prisma configuration **DONE**
   - Create Dockerfile and Dockerfile.dev (following timers pattern) **DONE**

3. **Database schema design**: **DONE**
   - Create Prisma schema for entosis events with fields: **DONE**
     - `id`, `system`, `region`, `status`, `timestamp`, `createdAt` **DONE**
     - `isReinforced`, `userId` (who imported), `notificationHash` (deduplication) **DONE**
   - Add User model integration (reuse from timers via shared schema) **DONE**
   - Set up separate database: `sway_toast` (production) and `sway_toast_dev` (local) **DONE**

## Phase 3: Core Functionality
4. **Entosis notification parsing**: **DONE**
   - Create parser for EVE mail format: "Sovereignty Hub in SYSTEM is being captured TIMESTAMP" **DONE**
   - Implement deduplication logic using notification hash **DONE**
   - Handle both "being captured" and "reinforced mode" notifications **DONE**
   - Auto-update event status when reinforcement notifications arrive **DONE**

5. **Main UI implementation**: **DONE**
   - Create event list showing: `SYSTEM [Region] [STATUS] TimeSinceBeingCaptured Actions` **DONE**
   - Status types: "Being Captured!", "On the way", "Cleared", "Reset", "REINFORCED" **DONE**
   - Filter to show only events ≤6 hours old **DONE**
   - Action buttons: Traveling, Clear, Reset (with user attribution) **DONE**
   - Real-time updates and status management **DONE**

## Phase 4: Integration & Infrastructure
6. **Docker services configuration**: **DONE**
   - Add toast service to `docker-compose.yml` and `docker-compose.local.yml` **DONE**
   - Configure environment variables for toast app **DONE**
   - Set up database connection and health checks **DONE**

7. **Nginx routing setup**: **DONE**
   - Add server blocks for `toast.sway.re` and `toast.localhost` **DONE**
   - Configure proxy_pass to toast container **DONE**
   - Update local development routing **DONE**

8. **Authentication integration**: **DONE**
   - Implement EVE SSO using shared auth components **DONE**
   - Use same NextAuth configuration and styling **DONE**
   - Ensure user sessions work across both apps **DONE**

## Phase 5: Testing & Deployment
9. **Comprehensive testing**: **DONE**
   - Test entosis notification import functionality **DONE**
   - Verify real-time status updates and user actions **DONE**
   - Test authentication flow and cross-app compatibility **DONE**
   - Validate ESI integration for region lookup **DONE**
   - Test both local development and production configurations **DONE**

## Key Design Decisions
- **Shared folder structure**: `/shared/lib/`, `/shared/components/`, `/shared/types/`
- **Database strategy**: Separate databases but shared User model via shared schema
- **Code reuse**: Maximum reuse of ESI library, auth components, and UI patterns
- **Deployment**: Follow same Docker + nginx pattern as timers app
- **Environment variables**: Extend existing .env pattern with toast-specific variables

This plan ensures minimal code duplication while maintaining the existing architecture patterns and providing a seamless user experience across both applications.