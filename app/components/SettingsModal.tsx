import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, model, setModel }: SettingsModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState(model);

  // Đồng bộ dữ liệu khi modal được mở
  useEffect(() => {
    setTempKey(apiKey);
    setTempModel(model);
  }, [apiKey, model, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey);
    setModel(tempModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1e2330] w-full max-w-md rounded-xl p-6 text-white shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            Thiết lập Model & API Key
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-300">Chọn Model AI</p>
          
          <div 
            className={`p-3 border rounded-lg cursor-pointer ${tempModel === 'gemini-pro' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'}`}
            onClick={() => setTempModel('gemini-pro')}
          >
            <div className="font-medium text-blue-400">Gemini Pro <span className="text-xs bg-green-600 text-white px-2 py-1 rounded ml-2">Mặc định</span></div>
          </div>

          <div 
            className={`p-3 border rounded-lg cursor-pointer ${tempModel === 'gemini-1.5-pro-latest' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'}`}
            onClick={() => setTempModel('gemini-1.5-pro-latest')}
          >
            <div className="font-medium text-blue-400">Gemini 1.5 Pro</div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-300">Nhập Gemini API Key của bạn</p>
          <input 
            type="password" 
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            className="w-full bg-[#11141c] border border-gray-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="AIzaSy..."
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
        >
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}