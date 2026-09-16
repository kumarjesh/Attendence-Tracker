import React, { useState } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, AlertTriangle, Key } from 'lucide-react';

export default function TimetableUploader({ onExtract }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [model, setModel] = useState(localStorage.getItem('gemini_model') || 'gemini-2.5-flash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleModelChange = (e) => {
    const val = e.target.value;
    setModel(val);
    localStorage.setItem('gemini_model', val);
  };

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPEG, etc.). PDF extraction requires a backend server.');
      return;
    }

    if (!apiKey) {
      setError('Please provide a Gemini API key first.');
      return;
    }

    setError('');
    setSuccess('');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result.split(',')[1];
      const mimeType = file.type;
      
      try {
        const result = await extractTimetableWithGemini(base64Image, mimeType);
        if (result && result.Monday) {
          onExtract(result);
          setSuccess('Timetable successfully extracted!');
        } else {
          setError('Failed to parse timetable format from the image.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error processing image with Gemini API.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError('Error reading file.');
      setIsProcessing(false);
    };
  };

  const extractTimetableWithGemini = async (base64Image, mimeType) => {
    const prompt = `Extract the timetable from this image. 
Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text. Use standard subject names. If a day is empty, provide an empty array.
{
  "Monday": [ { "subject": "Math", "time": "09:00 AM - 10:00 AM" } ],
  "Tuesday": [],
  "Wednesday": [],
  "Thursday": [],
  "Friday": [],
  "Saturday": [],
  "Sunday": []
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Image } }
          ]
        }
      ]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let content = data.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown formatting from the response
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <ImageIcon className="text-indigo-600" size={20} />
          Auto-Extract Timetable (AI)
        </h3>
        <p className="text-sm text-gray-500 mt-1">Upload a screenshot of your timetable to automatically populate the periods using Gemini Vision.</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Key size={14} /> Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Stored securely in local storage.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Model
            </label>
            <select
              value={model}
              onChange={handleModelChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Fast)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Accurate)</option>
              <option value="gemini-flash-latest">gemini-flash-latest</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Select the vision model for your API tier.</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors relative">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            title="Upload Image"
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
              <p className="text-sm font-medium text-gray-600">Analyzing image with Gemini...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-indigo-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">Click or drag a screenshot here</p>
              <p className="text-xs text-gray-400 mt-1">Supports PNG, JPG, JPEG</p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="break-all">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">
            <CheckCircle size={16} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}
