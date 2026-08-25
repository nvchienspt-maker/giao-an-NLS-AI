import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

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
  
  // Các state quản lý tự động tải Model
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Đồng bộ dữ liệu khi modal được mở
  useEffect(() => {
    setTempKey(apiKey);
    setTempModel(model);
  }, [apiKey, model, isOpen]);

  // Logic tự động lấy danh sách Model khi người dùng nhập API Key
  useEffect(() => {
    if (!tempKey) {
        setAvailableModels([]);
        return;
    }

    const fetchModels = async () => {
      setIsLoadingModels(true);
      setFetchError('');
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${tempKey}`);
        const data = await res.json();
        
        if (data.error) {
          setFetchError(data.error.message);
          setAvailableModels([]);
          return;
        }

        if (data.models) {
          // Chỉ lọc lấy các model hỗ trợ tạo văn bản (generateContent)
          const validModels = data.models.filter((m: any) => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
          );
          
          const formattedModels = validModels.map((m: any) => ({
            name: m.name.replace('models/', ''), // Bỏ tiền tố models/ để dùng chuẩn cho SDK
            displayName: m.displayName
          }));

          setAvailableModels(formattedModels);

          // Tự động chọn model nếu chưa có hoặc model cũ không tồn tại trong danh sách mới
          if (formattedModels.length > 0) {
             const currentExists = formattedModels.find((m: any) => m.name === tempModel);
             if (!currentExists) {
                 // Ưu tiên tự động chọn gemini-pro nếu có, nếu không thì chọn model đầu tiên của danh sách
                 const proModel = formattedModels.find((m: any) => m.name.includes('gemini-pro'));
                 setTempModel(proModel ? proModel.name : formattedModels[0].name);
             }
          }
        }
      } catch (err: any) {
         setFetchError('Lỗi kết nối mạng khi tải danh sách Model.');
      } finally {
        setIsLoadingModels(false);
      }
    };

    // Sử dụng debounce 800ms để tránh gọi API liên tục khi đang thao tác copy/gõ phím
    const timeoutId = setTimeout(() => {
        fetchModels();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [tempKey]); // Chạy lại logic mỗi khi tempKey thay đổi

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

        {/* Input nhập Key được đưa lên trên */}
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-300">Nhập Gemini API Key của bạn</p>
          <input 
            type="password" 
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            className={`w-full bg-[#11141c] border ${fetchError ? 'border-red-500' : 'border-gray-600'} rounded p-3 text-white focus:outline-none focus:border-blue-500`}
            placeholder="AIzaSy..."
          />
          {fetchError && <p className="text-xs text-red-400 mt-1">{fetchError}</p>}
        </div>
        
        {/* Danh sách Model tự động */}
        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-300 flex items-center gap-2">
            Chọn Model AI 
            {isLoadingModels && <Loader2 size={14} className="animate-spin text-blue-400" />}
          </p>
          
          <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                     <div 
                        key={m.name}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${tempModel === m.name ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                        onClick={() => setTempModel(m.name)}
                      >
                        <div className="font-medium text-blue-400 text-sm">{m.displayName}</div>
                        <div className="text-xs text-gray-400 mt-1">{m.name}</div>
                      </div>
                  ))
              ) : (
                  <p className="text-sm text-gray-500 italic p-3 border border-dashed border-gray-700 rounded-lg text-center bg-[#11141c]">
                      {isLoadingModels ? 'Đang tải danh sách...' : 'Vui lòng nhập API Key hợp lệ để tải danh sách Model.'}
                  </p>
              )}
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={!tempKey || availableModels.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}