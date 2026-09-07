import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO } from 'date-fns';
import { FileText, Calendar as CalendarIcon, MessageSquare, Download } from 'lucide-react';

export default function AbsenceLog({ user, timetable }) {
  const [absences, setAbsences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAbsences = async () => {
      if (!user || !timetable) return;
      setIsLoading(true);
      try {
        // We fetch all records. In a production app with years of data, you'd want to paginate or limit this.
        const q = query(collection(db, 'users', user.uid, 'attendance'));
        const querySnapshot = await getDocs(q);
        
        const missedClasses = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isHoliday) return; // Skip holidays completely
          
          const records = data.records;
          const daySubjects = timetable[data.dayOfWeek] || [];
          
          if (!records) return;

          Object.keys(records).forEach(index => {
            const record = records[index];
            const period = daySubjects[index];
            
            const status = typeof record === 'string' ? record : record?.status;
            const note = typeof record === 'string' ? '' : record?.note;
            const subjectName = typeof period === 'string' ? period : period?.subject;
            const periodTime = typeof period === 'string' ? '' : period?.time;
            
            if (status === 'Absent' && subjectName) {
              missedClasses.push({
                date: data.date,
                dayOfWeek: data.dayOfWeek,
                subject: subjectName,
                time: periodTime,
                note: note || 'No reason provided'
              });
            }
          });
        });

        // Sort chronologically (newest first)
        missedClasses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setAbsences(missedClasses);
      } catch (error) {
        console.error("Error fetching absence log:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAbsences();
  }, [user, timetable]);

  const handleExportCSV = () => {
    if (absences.length === 0) return;
    
    const headers = ['Date', 'Day', 'Subject', 'Time', 'Note'];
    const csvRows = [headers.join(',')];
    
    absences.forEach(absence => {
      const row = [
        absence.date,
        absence.dayOfWeek,
        `"${absence.subject}"`,
        `"${absence.time}"`,
        `"${absence.note.replace(/"/g, '""')}"` // Escape double quotes for CSV
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `absence_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="text-indigo-600" size={24} />
            Absence Log
          </h2>
          <p className="text-sm text-gray-500 mt-1">A historical record of all classes you missed and your notes.</p>
        </div>
        {absences.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {absences.length > 0 ? (
          <div className="space-y-4">
            {absences.map((absence, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 border border-red-100 bg-red-50/30 rounded-xl hover:shadow-sm transition-all">
                <div className="shrink-0 w-32">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <CalendarIcon size={14} className="text-red-500" />
                    {format(parseISO(absence.date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{absence.dayOfWeek}</div>
                </div>
                
                <div className="flex-1 border-l-2 border-red-100 pl-4">
                  <h4 className="font-semibold text-gray-900 text-lg">{absence.subject}</h4>
                  {absence.time && <p className="text-sm text-gray-500 mb-2">{absence.time}</p>}
                  
                  <div className="bg-white border border-gray-100 rounded-lg p-3 text-sm text-gray-700 flex items-start gap-2 mt-2 shadow-sm">
                    <MessageSquare size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                    <span className="italic">{absence.note}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Perfect Record!</h3>
            <p className="text-gray-500 mt-1">You haven't missed any classes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
