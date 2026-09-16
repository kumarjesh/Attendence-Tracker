import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Calendar as CalendarIcon, CheckCircle2, XCircle, Slash, Clock, MessageSquare, FileText, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { getActiveSchedule } from '../utils/timetable';

export default function DailyTracker({ user, timetable }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [attendance, setAttendance] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayOfWeek = format(currentDate, 'EEEE');
  const activeTimetable = getActiveSchedule(timetable, dateStr);
  const todaySubjects = activeTimetable ? activeTimetable[dayOfWeek] || [] : [];
  
  const allUniqueSubjects = useMemo(() => {
    if (!activeTimetable) return [];
    const subjects = new Set();
    Object.values(activeTimetable).forEach(dayPeriods => {
      if (Array.isArray(dayPeriods)) {
        dayPeriods.forEach(p => {
          const name = typeof p === 'string' ? p : p.subject;
          if (name && name.trim()) subjects.add(name.trim());
        });
      }
    });
    return Array.from(subjects).sort();
  }, [activeTimetable]);
  
  const [editingSubject, setEditingSubject] = useState(null);

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
            initial[index] = { status: null, note: '', lectureNote: '' }; // object structure
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

  const handleLectureNoteChange = (index, lectureNote) => {
    setAttendance(prev => {
      const current = prev[index] || { status: null, note: '' };
      return {
        ...prev,
        [index]: { ...current, lectureNote }
      };
    });
  };

  const saveSubjectSwap = (index, newValue) => {
    if (editingSubject && editingSubject.index === index && newValue) {
      setAttendance(prev => {
        const current = prev[index] || { status: null, note: '', lectureNote: '' };
        return {
          ...prev,
          [index]: { ...current, overrideSubject: newValue }
        };
      });
      setEditingSubject(null);
    } else {
      setEditingSubject(null);
    }
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

  const handleDayClick = (day) => {
    setCurrentDate(day);
    setCalendarViewDate(day);
    setIsCalendarOpen(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarViewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const header = (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(wd => (
          <div key={wd} className="text-center text-xs font-semibold text-gray-500">{wd}</div>
        ))}
      </div>
    );

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        days.push(
          <div
            key={day.toISOString()}
            onClick={() => handleDayClick(cloneDay)}
            className={`p-2 flex justify-center items-center text-sm rounded-lg cursor-pointer transition-colors ${
              !isSameMonth(day, monthStart)
                ? "text-gray-300 hover:bg-gray-50"
                : isSameDay(day, currentDate)
                ? "bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700"
                : isSameDay(day, new Date())
                ? "bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                : "text-gray-700 hover:bg-gray-100 hover:text-indigo-600"
            }`}
          >
            <span>{formattedDate}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 mt-3 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-[280px] z-50 animate-in fade-in slide-in-from-top-2">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))} className="p-1 hover:bg-gray-100 rounded-md text-gray-600"><ChevronLeft size={18} /></button>
          <div className="font-bold text-gray-800">{format(calendarViewDate, "MMMM yyyy")}</div>
          <button onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))} className="p-1 hover:bg-gray-100 rounded-md text-gray-600"><ChevronRight size={18} /></button>
        </div>
        {header}
        <div className="flex flex-col gap-1">{rows}</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors shrink-0">&larr;</button>
          
          <div className="flex items-center justify-center gap-2 font-semibold text-gray-800 text-base sm:text-lg relative flex-1">
            <button 
              onClick={() => {
                setCalendarViewDate(currentDate);
                setIsCalendarOpen(!isCalendarOpen);
              }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <CalendarIcon size={20} className="text-indigo-600 shrink-0" />
              <span className="group-hover:text-indigo-600 transition-colors truncate">
                {format(currentDate, 'MMM d, yyyy')} ({dayOfWeek})
              </span>
            </button>
            
            {isCalendarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                {renderCalendar()}
              </>
            )}
          </div>

          <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors shrink-0">&rarr;</button>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0"
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
              
              const record = attendance[index] || { status: null, note: '', lectureNote: '' };
              // Backward compatibility for old string records
              const status = typeof record === 'string' ? record : record.status;
              const note = typeof record === 'string' ? '' : record.note;
              const lectureNote = typeof record === 'string' ? '' : (record.lectureNote || '');
              const overrideSubject = typeof record === 'string' ? null : record.overrideSubject;
              const displaySubject = overrideSubject || subjectName;

              return (
                <div key={index} className="flex flex-col p-4 border border-gray-100 rounded-xl gap-4 hover:border-indigo-100 hover:shadow-sm transition-all bg-gray-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-1/2">
                      <span className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        {editingSubject?.index === index ? (
                           <div className="flex items-center gap-2">
                             <select
                               autoFocus
                               value={editingSubject.value}
                               onChange={(e) => saveSubjectSwap(index, e.target.value)}
                               onBlur={() => setEditingSubject(null)}
                               className="px-2 py-1.5 border border-indigo-300 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                             >
                               <option value="" disabled>Select a subject...</option>
                               {allUniqueSubjects.map(sub => (
                                 <option key={sub} value={sub}>{sub}</option>
                               ))}
                             </select>
                           </div>
                        ) : (
                          <div className="flex items-center gap-2 group/edit">
                            <span className="font-semibold text-gray-800 block text-lg">{displaySubject}</span>
                            {overrideSubject && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Swapped</span>}
                            <button 
                              onClick={() => setEditingSubject({ index, value: displaySubject })}
                              className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1"
                              title="Edit Subject for today"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                        {periodTime && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-1 font-medium">
                            <Clock size={12} /> {periodTime}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                      <button
                        onClick={() => handleStatusChange(index, 'Present')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none ${
                          status === 'Present' 
                            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle2 size={16} className={`shrink-0 ${status === 'Present' ? 'text-emerald-600' : ''}`} />
                        Present
                      </button>
                      <button
                        onClick={() => handleStatusChange(index, 'Absent')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none ${
                          status === 'Absent' 
                            ? 'bg-red-100 text-red-800 border-2 border-red-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <XCircle size={16} className={`shrink-0 ${status === 'Absent' ? 'text-red-600' : ''}`} />
                        Absent
                      </button>
                      <button
                        onClick={() => handleStatusChange(index, 'Cancelled')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none ${
                          status === 'Cancelled' 
                            ? 'bg-gray-200 text-gray-800 border-2 border-gray-500 shadow-sm' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Slash size={16} className={`shrink-0 ${status === 'Cancelled' ? 'text-gray-700' : ''}`} />
                        Cancelled
                      </button>
                    </div>
                  </div>

                  {/* Absence Note Input (Only show if Absent) */}
                  {status === 'Absent' && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 w-full">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50/50 border border-red-100 rounded-lg focus-within:ring-2 focus-within:ring-red-400 focus-within:border-red-400 transition-all">
                        <MessageSquare size={16} className="text-red-400 shrink-0" />
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => handleNoteChange(index, e.target.value)}
                          placeholder="Reason for absence (e.g., Got fever, Went home)"
                          className="w-full bg-transparent outline-none text-sm text-red-800 placeholder:text-red-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* Lecture Note / Task Input (Always show) */}
                  <div className="mt-2 w-full">
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                      <FileText size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      <textarea
                        value={lectureNote}
                        onChange={(e) => handleLectureNoteChange(index, e.target.value)}
                        placeholder="Lecture notes, tasks, or assignments given..."
                        rows="2"
                        className="w-full bg-transparent outline-none resize-none text-sm text-gray-700 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
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
