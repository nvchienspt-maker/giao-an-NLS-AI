'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Eye, EyeOff, Key as KeyIcon, ExternalLink, Settings } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  isDarkMode: boolean;
}

interface AIModel {
  name: string;
  displayName: string;
}

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, model, setModel, isDarkMode }: SettingsModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState(model);
  const [showKey, setShowKey] = useState(false); // Trạng thái ẩn/hiện mật khẩu
  
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setTempKey(apiKey);
    setTempModel(model || 'gemini-3.5-flash');
  }, [apiKey, model, isOpen]);

  // Logic tự động kiểm tra Key và lấy danh sách Model từ code cũ
  useEffect(() => {
    if (!tempKey || tempKey.trim().length < 20) {
        setAvailableModels([]);
        setStatusMsg('');
        setIsError(false);
        return;
    }

    const fetchModels = async () => {
      setIsLoading(true);
      setStatusMsg('Đang kiểm tra API Key...');
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
          // LỌC CỨNG: Bỏ các model 1.5 và 2.5 bị Google khóa
          const validModels = data.models.filter((m: any) => 
            m.supportedGenerationMethods?.includes('generateContent') &&
            !m.name.includes('1.5') && 
            !m.name.includes('2.5')
          ).map((m: any) => ({
            name: m.name.replace('models/', ''),
            displayName: m.displayName
          }));

          setAvailableModels(validModels);

          if (validModels.length > 0) {
             // Ưu tiên chọn 3.5-flash hoặc 3.6-flash
             const bestModel = validModels.find((m: any) => m.name.includes('3.5-flash')) 
                            || validModels.find((m: any) => m.name.includes('3.6-flash'))
                            || validModels.find((m: any) => m.name === 'gemini-pro')
                            || validModels[0];
             
             setTempModel(bestModel.name);
             setIsError(false);
             setStatusMsg(`✅ Đã tự động nhận diện: ${bestModel.displayName}`);
          } else {
             setIsError(true);
             setStatusMsg('API Key không hỗ trợ các model thế hệ mới.');
          }
        }
      } catch (err: any) {
         setIsError(true);
         setStatusMsg('Lỗi mạng, không thể kết nối tới Google AI.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchModels();
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [tempKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey.trim());
    setModel(tempModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-[#1e2330] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#181c25]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings size={20} className="text-blue-500"/> Thiết lập Hệ thống
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700 p-1.5 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-300">
                Google Gemini API Key <span className="text-red-500">*</span>
              </label>
              {/* Nút Lấy Key chuyển lên đây cho gọn gàng */}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Lấy Key <ExternalLink size={12} />
              </a>
            </div>
            
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"} 
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className={`w-full bg-[#11141c] border ${isError ? 'border-red-500' : 'border-gray-600'} rounded-lg p-3 pr-12 text-white focus:outline-none focus:border-blue-500 transition font-mono text-sm`}
                placeholder="Dán AIzaSy... vào đây"
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400 p-1 transition-colors"
                title={showKey ? "Ẩn API Key" : "Hiện API Key"}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="h-5 flex items-center mt-1">
              {isLoading && <p className="text-xs text-blue-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin"/> {statusMsg}</p>}
              {!isLoading && statusMsg && (
                  <p className={`text-xs flex items-center gap-1.5 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                      {isError ? <AlertCircle size={12}/> : null} {statusMsg}
                  </p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Model đang dùng (Tự động)</label>
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
        </div>

        <div className="p-5 border-t border-gray-800 bg-[#181c25] flex justify-end">
          <button 
            onClick={handleSave}
            disabled={!tempKey || isError || isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}