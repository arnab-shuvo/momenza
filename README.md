# Momenza

A clean, fast task manager for Android (and soon iOS) built with React Native + Expo.

<!-- Add screenshots here -->
<!-- ![Home Screen](screenshots/home.png) ![Task List](screenshots/tasks.png) -->

---

## Features

### Projects
- Create, edit, archive, and delete projects
- Colour-coded project cards
- Due-today badge on each project card
- Sort projects by due date, name, or task count
- Summary strip showing total open tasks, due today, and completed this week

### Tasks
- Quick-add bar pinned at the top of every task list — type and hit Enter to add multiple tasks fast
- Drag-to-reorder tasks
- Complete / uncomplete tasks with an animated gradient checkbox
- Batch select with long press → archive or delete multiple tasks at once
- Filter by keyword or date range
- Sort by priority, alphabetically, or by date

### Calendar View
- Visual calendar showing tasks with dates
- Switch between list and calendar view per project or globally

### Archive
- Archived tasks grouped by project
- Tasks from archived projects shown automatically
- Restore or permanently delete from archive

### Share & Import
- Generate a QR code to share tasks between devices
- Share as a deep link — recipient taps the link and tasks import automatically
- Tasks import into the correct project by name on the receiving device

### Task Detail
- Edit title, description, date, and date ranges
- Copy title or description to clipboard with one tap
- Complete, archive, or delete from the detail view

### Other
- Dark and light theme
- Android hardware back button navigates correctly through the app
- Persistent storage using SQLite (works fully offline)

---

## Tech Stack

| | |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Storage | expo-sqlite (SQLite) |
| Navigation | Custom state-based (no React Navigation) |
| Icons | @expo/vector-icons (Feather) |
| Gradients | expo-linear-gradient |
| QR | react-native-qrcode-svg |
| Camera | expo-camera |
| Clipboard | expo-clipboard |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo`

### Install
```bash
git clone https://github.com/arnab-shuvo/momenza.git
cd momenza
npm install
```

### Run (Expo Go)
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone.

### Run on Android device/emulator
```bash
npx expo run:android
```
Requires JDK 17 and Android Studio with SDK installed.

### Build Android APK (via EAS)
```bash
eas build --profile preview --platform android
```

---

## Project Structure

```
src/
  components/     # All UI components
  hooks/          # useTasks, useProjects
  context/        # ThemeContext
  types/          # Task, Project, Filter types
  theme.ts        # Colours, spacing, typography
App.tsx           # DB init + migration
app.json          # Expo config
```

---

## License

MIT
