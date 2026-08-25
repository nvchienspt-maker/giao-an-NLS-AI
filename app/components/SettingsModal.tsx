import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

interface AIModel {
  name: string;
  displayName: string;
}

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, model, setModel }: SettingsModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState(model);
  
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setTempKey(apiKey);
    setTempModel(model || 'gemini-pro');
  }, [apiKey, model, isOpen]);

  // Tự động quét API Key và chốt Model
  useEffect(() => {
    if (!tempKey || tempKey.trim().length < 20) {
        setAvailableModels([]);
        setStatusMsg('');
        setIsError(false);
        return;
    }

    const fetchModels = async () => {
      setIsLoading(true);
      setStatusMsg('Đang quét danh sách Model khả dụng...');
      setIsError(false);
      
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${tempKey.trim()}`);
        const data = await res.json();
        
        if (data.error) {
          setIsError(true);
          setStatusMsg(data.error.message);
          setAvailableModels([]);
          return;
        }

        if (data.models) {
          const validModels = data.models.filter((m: any) => 
            m.supportedGenerationMethods?.includes('generateContent')
          ).map((m: any) => ({
            name: m.name.replace('models/', ''),
            displayName: m.displayName
          }));

          setAvailableModels(validModels);

          if (validModels.length > 0) {
             // Ưu tiên chọn gemini-pro để đảm bảo tương thích mọi API Key
             const bestModel = validModels.find((m: any) => m.name === 'gemini-pro') 
                            || validModels[0];
             
             setTempModel(bestModel.name);
             setIsError(false);
             setStatusMsg(`✅ Hợp lệ! Tự động chọn: ${bestModel.displayName}`);
          }
        }
      } catch (err: any) {
         setIsError(true);
         setStatusMsg('Lỗi mạng, không thể kết nối tới máy chủ AI.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => fetchModels(), 600);
    return () => clearTimeout(timeoutId);
  }, [tempKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey.trim());
    setModel(tempModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2330] w-full max-w-md rounded-xl p-6 text-white shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">Thiết lập AI</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white transition" /></button>
        </div>

        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-gray-300">Nhập API Key của bạn</label>
          <input 
            type="password" 
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            className={`w-full bg-[#11141c] border ${isError ? 'border-red-500' : 'border-gray-600'} rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition`}
            placeholder="Dán AIzaSy... vào đây"
          />
          <div className="h-6 flex items-center">
            {isLoading && <p className="text-xs text-blue-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> {statusMsg}</p>}
            {!isLoading && statusMsg && (
                <p className={`text-xs flex items-center gap-1 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                    {isError ? <AlertCircle size={12}/> : null} {statusMsg}
                </p>
            )}
          </div>
        </div>
        
        <div className="space-y-2 mb-8">
          <label className="text-sm font-medium text-gray-300">Model đang dùng</label>
          <select 
            value={tempModel} 
            onChange={(e) => setTempModel(e.target.value)}
            disabled={availableModels.length === 0}
            className="w-full bg-[#11141c] border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 appearance-none"
          >
            {availableModels.length > 0 ? (
              availableModels.map(m => (
                <option key={m.name} value={m.name}>{m.displayName} ({m.name})</option>
              ))
            ) : (
              <option>{tempModel}</option>
            )}
          </select>
        </div>

        <button 
          onClick={handleSave}
          disabled={!tempKey || isError || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Lưu & Bắt đầu sử dụng
        </button>
      </div>
    </div>
  );
}