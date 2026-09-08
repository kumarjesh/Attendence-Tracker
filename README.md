# College Attendance Tracker

A modern, highly customizable, single-page React application designed to help college students effortlessly track their daily attendance, visualize their progress, and ensure they stay above the mandatory 75% attendance mark. 

## 🚀 Features

- **Google Authentication**: Secure, one-click login using Firebase Authentication. Your data is tied exclusively to your Google account.
- **Customizable Timetable**: Define your weekly schedule by adding subjects and their specific time slots (e.g., 09:00 AM - 09:55 AM).
- **Daily Tracker**: 
  - Mark yourself as *Present*, *Absent*, or *Cancelled* for each period in your daily schedule.
  - **Absence Notes**: Easily jot down the reason for missing a class (e.g., "Sick", "Went home early") using the integrated note dropdown.
  - **Holiday Mode**: Mark an entire day as a holiday (e.g., "Ganesha Chaturthi") to exclude it from attendance calculations.
  - **Calendar Navigation**: Quickly jump to any past date using the integrated date picker.
- **Smart Analytics Dashboard**:
  - **AI Insights**: Auto-generated text insights highlighting attendance patterns and warning you when specific subjects drop dangerously close to 75%.
  - **Subject Performance Radar**: A dynamic spider-chart mapping out your attendance strengths and weaknesses across all subjects.
  - **Day-of-Week Analysis**: A bar chart that calculates your absences by day, helping you spot skipping patterns (e.g., "You miss Tuesdays the most").
  - **Overall Progress**: Donut charts and subject-specific progress bars giving you a high-level overview of your standing.
- **Absence History Log**:
  - A dedicated historical view of every class you've ever missed, complete with the date, time, subject, and the specific note you wrote.
  - **Export to CSV**: Download your absence history into a spreadsheet (Excel/Google Sheets) with a single click for easy reporting or submission.

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 (via Vite)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Data Visualization**: Recharts
- **Backend & Database**: Firebase (Authentication + Firestore NoSQL Database)
- **Date Formatting**: date-fns

## 🗄️ Database Architecture (Firestore)

All user data is stored securely in **Google Cloud Firestore**. The database is structured dynamically under each user's unique ID (`uid`) to ensure total privacy.

**Data Paths:**
1. **Settings (Timetable):**
   `users/{uid}/settings/timetable`
   - Stores the weekly schedule (Array of `{ subject, time }` objects for Monday - Sunday).
   
2. **Daily Attendance Records:**
   `users/{uid}/attendance/{YYYY-MM-DD}`
   - Stores the attendance data for a specific date.
   - Example schema:
     ```json
     {
       "date": "2026-09-07",
       "dayOfWeek": "Monday",
       "isHoliday": false,
       "records": {
         "0": { "status": "Present", "note": "" },
         "1": { "status": "Absent", "note": "Got fever" }
       }
     }
     ```

## 💻 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## 📱 Deployment

### Firebase Hosting
Because this app utilizes Firebase for both Auth and Database, it is incredibly easy to deploy it to **Firebase Hosting** for free so you can use it on your phone.

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize hosting: `firebase init hosting` (Select the `dist` folder)
4. Build the app: `npm run build`
5. Deploy: `firebase deploy`

### Vercel
You can also deploy this application seamlessly to Vercel. For detailed step-by-step instructions, please refer to the included `Vercel_Workflow_Guide.pdf` file in the repository.
