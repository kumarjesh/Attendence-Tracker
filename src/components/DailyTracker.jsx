import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Calendar as CalendarIcon, CheckCircle2, XCircle, Slash, Clock, MessageSquare } from 'lucide-react';

export default function DailyTracker({ user, timetable }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [attendance, setAttendance] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayOfWeek = format(currentDate, 'EEEE');
  const todaySubjects = timetable ? timetable[dayOfWeek] || [] : [];

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'users', user.uid, 'attendance', dateStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsHoliday(data.isHoliday || false);
          setHolidayName(data.holidayName || '');
          setAttendance(data.records || {});
        } else {
          setIsHoliday(false);
          setHolidayName('');
          // Initialize empty attendance for today's subjects
          const initial = {};
          todaySubjects.forEach((_, index) => {
            initial[index] = { status: null, note: '' }; // object structure
          });
          setAttendance(initial);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [user, dateStr, timetable, dayOfWeek]);

  const handleStatusChange = (index, status) => {
    setAttendance(prev => {
      const current = prev[index] || { note: '' };
      return {
        ...prev,
        [index]: { ...current, status }
      };
    });
  };

  const handleNoteChange = (index, note) => {
    setAttendance(prev => {
      const current = prev[index] || { status: null };
      return {
        ...prev,
        [index]: { ...current, note }
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    try {
      const dataToSave = {
        date: dateStr,
        dayOfWeek,
        isHoliday,
        holidayName: isHoliday ? holidayName : '',
        records: isHoliday ? {} : attendance,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid, 'attendance', dateStr), dataToSave);
      setMessage('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage('Error saving attendance.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const handleDatePick = (e) => {
    if (e.target.value) {
      setCurrentDate(parseISO(e.target.value));
    }
  };

  if (!timetable) {
    return <div className="p-8 text-center text-gray-500">Please set up your timetable in Settings first.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">&larr;</button>
          
          <div className="flex items-center gap-2 font-semibold text-gray-800 text-lg relative group">
            <CalendarIcon size={20} className="text-indigo-600" />
            <input 
              type="date" 
              value={dateStr}
              onChange={handleDatePick}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <span className="cursor-pointer group-hover:text-indigo-600 transition-colors">
              {format(currentDate, 'MMM d, yyyy')} ({dayOfWeek})
            </span>
          </div>

          <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">&rarr;</button>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Record'}
        </button>
      </div>

      {message && (
        <div className={`p-3 mx-4 mt-4 text-sm rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50/50 border border-orange-100 rounded-lg">
          <input
            type="checkbox"
            id="holidayToggle"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500 cursor-pointer"
          />
          <label htmlFor="holidayToggle" className="font-medium text-orange-800 cursor-pointer select-none">
            Mark as Holiday
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : isHoliday ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-medium text-gray-700">Holiday Name</label>
            <input
              type="text"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="e.g., Ganesha Chaturthi"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-sm text-gray-500">Classes for today will be excluded from attendance calculations.</p>
          </div>
        ) : todaySubjects.length > 0 ? (
          <div className="space-y-4">
            {todaySubjects.map((period, index) => {
              // Backward compatibility check
              const subjectName = typeof period === 'string' ? period : period.subject;
              const periodTime = typeof period === 'string' ? '' : period.time;
              
              if (!subjectName || !subjectName.trim()) return null;
              
              const record = attendance[index] || { status: null, note: '' };
              // Backward compatibility for old string records
              const status = typeof record === 'string' ? record : record.status;
              const note = typeof record === 'string' ? '' : record.note;

              return (
                <div key={index} className="flex flex-col p-4 border border-gray-100 rounded-xl gap-4 hover:border-indigo-100 hover:shadow-sm transition-all bg-gray-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-gray-800 block text-lg">{subjectName}</span>
                        {periodTime && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-1 font-medium">
                            <Clock size={12} /> {periodTime}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleStatusChange(index, 'Present')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          status === 'Present' 
                            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle2 size={16} className={status === 'Present' ? 'text-emerald-600' : ''} />
                        Present
                      </button>
                      <button
                        onClick={() => handleStatusChange(index, 'Absent')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          status === 'Absent' 
                            ? 'bg-red-100 text-red-800 border-2 border-red-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <XCircle size={16} className={status === 'Absent' ? 'text-red-600' : ''} />
                        Absent
                      </button>
                      <button
                        onClick={() => handleStatusChange(index, 'Cancelled')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          status === 'Cancelled' 
                            ? 'bg-gray-200 text-gray-800 border-2 border-gray-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Slash size={16} className={status === 'Cancelled' ? 'text-gray-700' : ''} />
                        Cancelled
                      </button>
                    </div>
                  </div>

                  {/* Absence Note Input (Only show if Absent) */}
                  {status === 'Absent' && (
                    <div className="mt-2 pl-11 pr-2 animate-in fade-in slide-in-from-top-2">
                      <div className="relative">
                        <MessageSquare size={14} className="absolute left-3 top-2.5 text-red-400" />
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => handleNoteChange(index, e.target.value)}
                          placeholder="Reason for absence (e.g., Got fever, Went home)"
                          className="w-full pl-9 pr-3 py-2 bg-red-50/50 border border-red-100 rounded-md text-sm text-red-800 placeholder:text-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No classes scheduled for {dayOfWeek}.</p>
            <p className="text-sm text-gray-400 mt-1">Enjoy your day off!</p>
          </div>
        )}
      </div>
    </div>
  );
}
