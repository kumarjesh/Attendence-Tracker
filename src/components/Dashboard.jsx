import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line
} from 'recharts';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Activity, BrainCircuit, AlertTriangle, TrendingUp, Printer, Bell, CheckSquare } from 'lucide-react';
import { getActiveSchedule } from '../utils/timetable';

const COLORS = ['#10b981', '#ef4444']; 
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Dashboard({ user, timetable }) {
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    subjectStats: {},
    dayStats: {},
    dailyTrendData: []
  });
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user || !timetable) return;
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'attendance'));
        
        let totalPresent = 0;
        let totalAbsent = 0;
        const subjectStats = {};
        const dayStats = {};

        // Initialize day stats
        DAY_ORDER.forEach(day => {
          dayStats[day] = { name: day, Absent: 0 };
        });

        // Initialize last 7 days trend
        const dailyTrend = {};
        const today = new Date();
        const last7Days = Array.from({length: 7}).map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          return format(d, 'yyyy-MM-dd');
        }).reverse();
        
        last7Days.forEach(date => {
          dailyTrend[date] = { date: format(new Date(date), 'MMM d'), Present: 0, Total: 0, percentage: 0 };
        });

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isHoliday) return;
          
          const records = data.records;
          const dayOfWeek = data.dayOfWeek;
          
          const activeTimetable = getActiveSchedule(timetable, data.date);
          const daySubjects = activeTimetable ? activeTimetable[dayOfWeek] || [] : [];
          
          if (!records) return;

          Object.keys(records).forEach(index => {
            const record = records[index];
            const period = daySubjects[index];
            
            const status = typeof record === 'string' ? record : record?.status;
            let subjectName = typeof period === 'string' ? period : period?.subject;
            
            if (typeof record !== 'string' && record?.overrideSubject) {
              subjectName = record.overrideSubject;
            }
            
            if (!subjectName || status === 'Cancelled' || !status) return;

            if (!subjectStats[subjectName]) {
              subjectStats[subjectName] = { name: subjectName, Present: 0, Absent: 0, Total: 0 };
            }

            if (status === 'Present') {
              totalPresent++;
              subjectStats[subjectName].Present++;
              if (dailyTrend[data.date]) dailyTrend[data.date].Present++;
            } else if (status === 'Absent') {
              totalAbsent++;
              subjectStats[subjectName].Absent++;
              if (dayStats[dayOfWeek]) {
                dayStats[dayOfWeek].Absent++;
              }
            }
            subjectStats[subjectName].Total++;
            if (dailyTrend[data.date]) dailyTrend[data.date].Total++;
          });
        });

        const dailyTrendData = Object.values(dailyTrend).map(day => {
          return {
            ...day,
            percentage: day.Total === 0 ? 0 : Math.round((day.Present / day.Total) * 100)
          };
        });

        // Notifications Check
        const newNotifications = [];
        const todayStr = format(today, 'yyyy-MM-dd');
        const todayDayOfWeek = format(today, 'EEEE');
        
        // 1. Check if today's attendance is marked
        const activeTimetableForToday = getActiveSchedule(timetable, todayStr);
        const todayHasClasses = activeTimetableForToday && activeTimetableForToday[todayDayOfWeek] && activeTimetableForToday[todayDayOfWeek].length > 0;
        let todayMarked = false;
        querySnapshot.forEach(doc => {
          if (doc.id === todayStr) todayMarked = true;
        });
        
        if (todayHasClasses && !todayMarked) {
          newNotifications.push({
            id: 'attendance',
            type: 'warning',
            title: "Don't forget!",
            message: "You haven't marked today's attendance yet.",
            icon: <Bell size={18} />
          });
        }

        // 2. Fetch pending tasks with upcoming/overdue deadlines
        try {
          const tasksQuery = query(collection(db, 'users', user.uid, 'tasks'), where('completed', '==', false));
          const tasksSnapshot = await getDocs(tasksQuery);
          let urgentTasks = 0;
          tasksSnapshot.forEach(doc => {
            const t = doc.data();
            if (t.dueDate) {
              const date = parseISO(t.dueDate);
              if (isPast(date) || isToday(date)) {
                urgentTasks++;
              }
            }
          });
          
          if (urgentTasks > 0) {
            newNotifications.push({
              id: 'tasks',
              type: 'danger',
              title: "Tasks Due!",
              message: `You have ${urgentTasks} task(s) due today or overdue.`,
              icon: <CheckSquare size={18} />
            });
          }
        } catch (err) {
          console.error("Error fetching tasks for notifications", err);
        }

        setStats({ totalPresent, totalAbsent, subjectStats, dayStats, dailyTrendData });
        setNotifications(newNotifications);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [user, timetable]);

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  const pieData = [
    { name: 'Present', value: stats.totalPresent },
    { name: 'Absent', value: stats.totalAbsent }
  ];

  const totalClasses = stats.totalPresent + stats.totalAbsent;
  const overallPercentage = totalClasses === 0 ? 0 : Math.round((stats.totalPresent / totalClasses) * 100);

  // Prepare radar chart data (Percentage of attendance per subject)
  const radarData = Object.values(stats.subjectStats).map(sub => ({
    subject: sub.name.length > 10 ? sub.name.substring(0, 10) + '...' : sub.name,
    attendance: sub.Total === 0 ? 0 : Math.round((sub.Present / sub.Total) * 100),
    fullMark: 100
  }));

  const dayBarData = Object.values(stats.dayStats)
    .filter(d => d.name !== 'Sunday')
    .map(d => ({ ...d, name: d.name.substring(0, 3) }));

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 65) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  // Generate Insights
  const generateInsights = () => {
    const insights = [];
    if (totalClasses === 0) return [{ type: 'info', text: "Start tracking attendance to generate insights." }];

    // Subject warnings
    Object.values(stats.subjectStats).forEach(sub => {
      const pct = sub.Total === 0 ? 0 : Math.round((sub.Present / sub.Total) * 100);
      if (pct < 75) {
        insights.push({ type: 'danger', text: `Warning: ${sub.name} is critically low at ${pct}%. Do not miss the next class!` });
      } else if (pct < 80) {
        insights.push({ type: 'warning', text: `${sub.name} is at ${pct}%. Be careful not to drop below 75%.` });
      }
    });

    // Day pattern
    let maxAbsentDay = { name: '', Absent: -1 };
    Object.values(stats.dayStats).forEach(day => {
      if (day.Absent > maxAbsentDay.Absent) {
        maxAbsentDay = day;
      }
    });
    if (maxAbsentDay.Absent > 0) {
      insights.push({ type: 'info', text: `Pattern detected: You tend to miss classes on ${maxAbsentDay.name}s the most (${maxAbsentDay.Absent} absences).` });
    }

    if (overallPercentage >= 90) {
      insights.push({ type: 'success', text: `Excellent overall attendance (${overallPercentage}%). Keep up the great work!` });
    }

    return insights.slice(0, 4); // Show top 4
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print-break-inside-avoid">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of your attendance performance.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg transition-colors"
        >
          <Printer size={18} />
          <span className="hidden sm:inline">Export PDF</span>
        </button>
      </div>

      {/* Notifications Banners */}
      {notifications.length > 0 && (
        <div className="space-y-3 no-print">
          {notifications.map(notif => (
            <div key={notif.id} className={`p-4 rounded-xl flex items-start gap-3 shadow-sm border ${
              notif.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'
            }`}>
              <div className={`p-2 rounded-full shrink-0 ${notif.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {notif.icon}
              </div>
              <div>
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm opacity-90 mt-0.5">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-break-inside-avoid">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Overall Attendance</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{overallPercentage}%</h3>
            <p className="text-xs text-gray-400 mt-1">Requires 75% minimum</p>
          </div>
          <div className={`p-4 rounded-full ${overallPercentage >= 75 ? 'bg-emerald-100 text-emerald-600' : overallPercentage >= 65 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
            <Activity size={24} />
          </div>
        </div>
        
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 h-40">
            {totalClasses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={35} outerRadius={60} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No data</div>
            )}
          </div>
          <div className="w-full sm:w-1/2 sm:pl-6 sm:border-l border-gray-100 mt-4 sm:mt-0">
            <h3 className="text-lg font-semibold text-gray-800">Total Classes</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Present</span>
                <span className="font-medium">{stats.totalPresent}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Absent</span>
                <span className="font-medium">{stats.totalAbsent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm print-break-inside-avoid">
        <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-4">
          <BrainCircuit className="text-indigo-600" size={20} />
          Smart Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-lg flex items-start gap-3 border ${
              insight.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              insight.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              'bg-white border-indigo-100 text-indigo-800'
            }`}>
              {insight.type === 'danger' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : 
               insight.type === 'warning' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> :
               <TrendingUp size={18} className="mt-0.5 shrink-0" />}
              <p className="text-sm font-medium">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart (Subject Strengths) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print-break-inside-avoid">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Subject Performance Radar</h3>
          <p className="text-xs text-gray-500 mb-6">Visualizes your attendance percentage across all subjects.</p>
          <div className="h-64">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#6b7280', fontSize: 10}} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Attendance %" dataKey="attendance" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Day of Week Absences */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print-break-inside-avoid">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Absences by Day</h3>
          <p className="text-xs text-gray-500 mb-6">See which days of the week you miss classes the most.</p>
          <div className="h-64">
            {stats.totalAbsent > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6b7280'}} interval={0} />
                  <YAxis tick={{fontSize: 11, fill: '#6b7280'}} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f9fafb'}} />
                  <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No absences recorded</div>
            )}
          </div>
        </div>
      </div>


      {/* Progress Bars per Subject */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print-break-inside-avoid">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Subject Progress</h3>
        <div className="space-y-6">
          {Object.values(stats.subjectStats).map((subject, idx) => {
            const percentage = subject.Total === 0 ? 0 : Math.round((subject.Present / subject.Total) * 100);
            return (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{subject.name}</span>
                  <span className="font-semibold text-gray-900">{percentage}% <span className="text-gray-400 font-normal ml-1">({subject.Present}/{subject.Total})</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          {Object.keys(stats.subjectStats).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No subject data available</p>}
        </div>
      </div>
    </div>
  );
}
