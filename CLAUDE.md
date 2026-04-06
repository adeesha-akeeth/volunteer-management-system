# Volunteer Management System

## Overview
Full-stack mobile app built as SE2020 university assignment. Solo project.

## Tech Stack
- Frontend: React Native (Expo SDK 55, react-native 0.83.2, react 19.2.0)
- Backend: Node.js / Express
- Database: MongoDB Atlas (free M0 tier, Mumbai region)
- Hosting: Render (auto-deploys from GitHub)
- Build: EAS Build (Expo account: adeesha-akeeth)

## Live API
https://volunteer-management-system-qux8.onrender.com

## GitHub Repo
adeesha-akeeth/volunteer-management-system

## Key Rules
- NEVER test with localhost — all testing via live Render URL only
- Local MongoDB is blocked by ISP; use MongoDB Atlas only
- Batch frontend changes before triggering EAS builds
- Run `npx expo export --platform android` before any build to catch bundle errors
- FormData requires special Content-Type handling in api.js interceptor

## Modules
Opportunity, Application, Hours & Attendance, Feedback & Reviews, Donation, Certificate
Plus: Auth, Volunteer Profile, Organization Profile

## Project Structure
- /backend — Express API server
- /frontend — React Native (Expo) app
```

---

## Step 6 — Use Claude Code

Once inside the project, you can just type naturally:
```
claude "explain the structure of my backend routes"
claude "add validation to the Application model"
claude "find any bugs in my FavouritesScreen.js"
claude "write a git commit message for my latest changes"