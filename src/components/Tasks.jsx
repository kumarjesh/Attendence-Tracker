import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, Circle, Clock, Trash2, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tasksData = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });
      // Sort tasks: incomplete first, then by date (earliest first), then completed.
      tasksData.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        title: newTaskTitle,
        dueDate: newTaskDate || null,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
      setNewTaskDate('');
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      // Optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
      await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
        completed: !currentStatus
      });
      // Re-sort silently
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      setTasks(tasks.filter(t => t.id !== taskId));
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const getDueDateStatus = (dueDate, completed) => {
    if (!dueDate || completed) return null;
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return 'overdue';
    if (isToday(date)) return 'today';
    return 'upcoming';
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Add Task Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-indigo-600" size={24} />
          Tasks & Assignments
        </h2>
        
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 min-w-0 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            required
          />
          <input
            type="date"
            value={newTaskDate}
            onChange={(e) => setNewTaskDate(e.target.value)}
            className="w-full sm:w-40 shrink-0 px-3 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-gray-600"
          />
          <button
            type="submit"
            disabled={isAdding || !newTaskTitle.trim()}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            <span>{isAdding ? 'Adding...' : 'Add Task'}</span>
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {totalCount > 0 ? (
          <div>
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                {completedCount} of {totalCount} tasks completed
              </span>
              <div className="w-32 sm:w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {tasks.map(task => {
                const status = getDueDateStatus(task.dueDate, task.completed);
                return (
                  <div key={task.id} className={`p-4 flex items-start sm:items-center gap-4 transition-colors hover:bg-gray-50 ${task.completed ? 'opacity-70' : ''}`}>
                    <button 
                      onClick={() => handleToggleComplete(task.id, task.completed)}
                      className={`shrink-0 mt-0.5 sm:mt-0 transition-colors ${task.completed ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-300 hover:text-indigo-500'}`}
                    >
                      {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-gray-800 font-medium ${task.completed ? 'line-through text-gray-500' : ''} truncate`}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={12} className={
                            status === 'overdue' ? 'text-red-500' : 
                            status === 'today' ? 'text-orange-500' : 
                            'text-gray-400'
                          } />
                          <span className={`text-xs font-medium ${
                            status === 'overdue' ? 'text-red-600' : 
                            status === 'today' ? 'text-orange-600' : 
                            'text-gray-500'
                          }`}>
                            {status === 'overdue' ? 'Overdue: ' : ''}
                            {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-800">All caught up!</h3>
            <p className="text-gray-500 mt-1">You have no pending tasks. Enjoy your day!</p>
          </div>
        )}
      </div>
    </div>
  );
}
