import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import DailyTracker from './components/DailyTracker';
import Settings from './components/Settings';
import AbsenceLog from './components/AbsenceLog';
import Tasks from './components/Tasks';
import { LayoutDashboard, CalendarCheck, Settings as SettingsIcon, GraduationCap, FileText, CheckSquare } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [activeTab, setActiveTab] = useState('tracker');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch timetable
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'timetable'));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.versions) {
              setTimetable(data);
            } else {
              // Backward compatibility for old format
              setTimetable({
                versions: [
                  {
                    effectiveDate: '2000-01-01',
                    schedule: data
                  }
                ]
              });
            }
          } else {
            setTimetable(null); // will fall back to default in Settings
          }
        } catch (error) {
          console.error("Error fetching timetable:", error);
        }
      } else {
        setTimetable(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-8 border border-gray-100">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Track Your Attendance</h1>
          <p className="text-gray-500 text-lg">Manage your college classes, visualize your progress, and stay above the 75% mark effortlessly.</p>
          <div className="pt-6 border-t border-gray-100 flex justify-center">
            <Auth user={user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <GraduationCap size={28} className="text-indigo-600" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
                AttendanceTracker
              </span>
            </div>
            <Auth user={user} />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Tabs Container */}
        <div className="flex sm:hidden overflow-x-auto pb-4 mb-6 space-x-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'tracker' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <CalendarCheck size={16} /> Daily Tracker
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <SettingsIcon size={16} /> Settings
          </button>
          <button 
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'log' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <FileText size={16} /> Absence Log
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <CheckSquare size={16} /> Tasks
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop Sidebar Navigation */}
          <div className="hidden sm:block w-64 shrink-0 space-y-2">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'tracker' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:translate-x-1'
              }`}
            >
              <CalendarCheck size={20} />
              Daily Tracker
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:translate-x-1'
              }`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'settings' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:translate-x-1'
              }`}
            >
              <SettingsIcon size={20} />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'log' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:translate-x-1'
              }`}
            >
              <FileText size={20} />
              Absence Log
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'tasks' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:translate-x-1'
              }`}
            >
              <CheckSquare size={20} />
              Tasks
            </button>
          </div>

          {/* Render Active View */}
          <div className="flex-1 min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'tracker' && <DailyTracker user={user} timetable={timetable} />}
              {activeTab === 'dashboard' && <Dashboard user={user} timetable={timetable} />}
              {activeTab === 'settings' && <Settings user={user} timetable={timetable} setTimetable={setTimetable} />}
              {activeTab === 'log' && <AbsenceLog user={user} timetable={timetable} />}
              {activeTab === 'tasks' && <Tasks user={user} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
