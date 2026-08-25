'use client';
import { useState } from 'react';
import { Settings, FileText, Loader2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key', '');
  const [model, setModel] = useLocalStorage('gemini_model', 'gemini-1.5-flash');
  const [options, setOptions] = useState({ ai: false, inclusion: false, language: false, bilingual: false });

  // Trạng thái xử lý file & AI
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async () => {
    if (!file) return alert('Vui lòng tải lên file giáo án!');
    if (!apiKey) return alert('Vui lòng thiết lập API Key!');
    
    setIsLoading(true);
    setResult('');
    
    try {
      // 1. Đọc nội dung file
      const textContent = await extractTextFromFile(file);
      
      // 2. Gửi nội dung và tuỳ chọn tới AI
      const aiResponse = await generateLessonPlan(apiKey, model, textContent, options);
      setResult(aiResponse);
    } catch (error: any) {
      alert(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#11141c] text-gray-200 font-sans p-4 md:p-8">
      {/* ... (Giữ nguyên phần header như cũ) ... */}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
        <div className="lg:col-span-2 space-y-6">
          {/* ... (Giữ nguyên các khối Thông tin và Tuỳ chọn nâng cao) ... */}

          {/* Khu vực Upload File (Mới thêm) */}
          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-2">Tài liệu đầu vào</h2>
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              <input 
                type="file" 
                accept=".docx, .pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer mx-auto"
              />
              {file && <p className="mt-2 text-sm text-green-400 flex items-center justify-center gap-2"><FileText size={16}/> {file.name}</p>}
            </div>
          </section>

          {/* Nút Thực thi */}
          <button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="animate-spin" /> Đang xử lý AI...</> : 'Tạo Giáo Án'}
          </button>

          {/* Hiển thị Kết quả */}
          {result && (
            <div className="bg-[#1e2330] p-6 rounded-xl border border-gray-700 mt-6 whitespace-pre-wrap">
              <h2 className="text-lg font-semibold text-green-400 mb-4 border-l-4 border-green-500 pl-2">Kết quả từ AI</h2>
              <div className="text-sm text-gray-300">{result}</div>
            </div>
          )}
        </div>

        {/* ... (Giữ nguyên cột Sidebar Hướng dẫn) ... */}
      </div>

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} />
    </div>
  );
}