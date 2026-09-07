import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Plus, Trash2, Clock } from 'lucide-react';

const defaultTimetable = {
  Monday: [
    { subject: 'DV LAB/CN LAB', time: '09:00 AM - 09:55 AM' },
    { subject: 'DV LAB/CN LAB', time: '09:55 AM - 10:50 AM' },
    { subject: 'SEPM', time: '11:00 AM - 11:55 AM' },
    { subject: 'TOC', time: '11:55 AM - 12:50 PM' },
    { subject: 'CN', time: '02:15 PM - 03:10 PM' },
    { subject: 'RM', time: '03:10 PM - 04:05 PM' },
    { subject: 'LIBRARY', time: '04:05 PM - 05:00 PM' }
  ],
  Tuesday: [
    { subject: 'DV LAB/CN LAB', time: '09:00 AM - 09:55 AM' },
    { subject: 'DV LAB/CN LAB', time: '09:55 AM - 10:50 AM' },
    { subject: 'UNIX', time: '11:00 AM - 11:55 AM' },
    { subject: 'SEPM', time: '11:55 AM - 12:50 PM' },
    { subject: 'MINIPROJECT', time: '02:15 PM - 03:10 PM' },
    { subject: 'MINIPROJECT', time: '03:10 PM - 04:05 PM' }
  ],
  Wednesday: [
    { subject: 'UNIX', time: '09:00 AM - 09:55 AM' },
    { subject: 'TOC', time: '09:55 AM - 10:50 AM' },
    { subject: 'SEPM', time: '11:00 AM - 11:55 AM' },
    { subject: 'ENV', time: '11:55 AM - 12:50 PM' },
    { subject: 'MINIPROJECT', time: '02:15 PM - 03:10 PM' },
    { subject: 'MINIPROJECT', time: '03:10 PM - 04:05 PM' }
  ],
  Thursday: [
    { subject: 'SEPM', time: '09:00 AM - 09:55 AM' },
    { subject: 'RM', time: '09:55 AM - 10:50 AM' },
    { subject: 'CN', time: '11:00 AM - 11:55 AM' },
    { subject: 'TOC', time: '11:55 AM - 12:50 PM' },
    { subject: 'CN', time: '02:15 PM - 03:10 PM' },
    { subject: 'SEPM', time: '03:10 PM - 04:05 PM' },
    { subject: 'RM', time: '04:05 PM - 05:00 PM' }
  ],
  Friday: [
    { subject: 'CN', time: '09:00 AM - 09:55 AM' },
    { subject: 'TOC', time: '09:55 AM - 10:50 AM' },
    { subject: 'RM', time: '11:00 AM - 11:55 AM' },
    { subject: 'UNIX', time: '11:55 AM - 12:50 PM' },
    { subject: 'ASSIGNMENT', time: '02:15 PM - 03:10 PM' },
    { subject: 'ASSIGNMENT', time: '03:10 PM - 04:05 PM' },
    { subject: 'ASSIGNMENT', time: '04:05 PM - 05:00 PM' }
  ],
  Saturday: [
    { subject: 'RM', time: '09:00 AM - 09:55 AM' },
    { subject: 'CN', time: '09:55 AM - 10:50 AM' },
    { subject: 'TOC', time: '11:00 AM - 11:55 AM' },
    { subject: 'UNIX', time: '11:55 AM - 12:50 PM' }
  ],
  Sunday: []
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Settings({ user, timetable, setTimetable }) {
  const [localTimetable, setLocalTimetable] = useState(defaultTimetable);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (timetable) {
      // Migrate old string arrays to objects if needed
      const migratedTimetable = {};
      let needsMigration = false;
      daysOfWeek.forEach(day => {
        const periods = timetable[day] || [];
        migratedTimetable[day] = periods.map(p => {
          if (typeof p === 'string') {
            needsMigration = true;
            return { subject: p, time: '' };
          }
          return p;
        });
      });
      setLocalTimetable(migratedTimetable);
    } else {
      setLocalTimetable(defaultTimetable);
    }
  }, [timetable]);

  const handleChange = (day, index, field, value) => {
    const updatedDay = [...localTimetable[day]];
    updatedDay[index] = { ...updatedDay[index], [field]: value };
    setLocalTimetable({ ...localTimetable, [day]: updatedDay });
  };

  const addPeriod = (day) => {
    setLocalTimetable({ ...localTimetable, [day]: [...localTimetable[day], { subject: '', time: '' }] });
  };

  const removePeriod = (day, index) => {
    const updatedDay = localTimetable[day].filter((_, i) => i !== index);
    setLocalTimetable({ ...localTimetable, [day]: updatedDay });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'timetable'), localTimetable);
      setTimetable(localTimetable);
      setMessage('Timetable saved successfully!');
    } catch (error) {
      console.error('Error saving timetable:', error);
      setMessage('Error saving timetable. Try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-xl font-semibold text-gray-800">Edit Timetable</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-3 mx-4 mt-4 text-sm rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-10">
        {daysOfWeek.map((day) => (
          <div key={day} className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-semibold text-gray-800 text-lg">{day}</h3>
              <button
                onClick={() => addPeriod(day)}
                className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700 p-1"
              >
                <Plus size={16} /> Add Period
              </button>
            </div>
            
            {localTimetable[day]?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localTimetable[day].map((period, index) => (
                  <div key={index} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50 relative group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Period {index + 1}</span>
                      <button
                        onClick={() => removePeriod(day, index)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove period"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      value={period.subject}
                      onChange={(e) => handleChange(day, index, 'subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Subject name"
                    />
                    
                    <div className="relative">
                      <Clock size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={period.time}
                        onChange={(e) => handleChange(day, index, 'time', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. 09:00 AM - 09:55 AM"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No classes scheduled.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
