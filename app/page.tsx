'use client';
import { useState } from 'react';
import { Settings, FileText, Loader2, Cpu, HeartHandshake, Globe, Languages } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key', '');
  const [model, setModel] = useLocalStorage('gemini_model', 'gemini-1.5-flash');
  
  // Trạng thái cấu hình giáo án
  const [subject, setSubject] = useState('Tin học');
  const [grade, setGrade] = useState('Lớp 10');
  const [file, setFile] = useState<File | null>(null);
  
  // Trạng thái 4 tuỳ chọn nâng cao
  const [options, setOptions] = useState({ 
    ai: false, 
    inclusive: false, 
    foreignLang: false, 
    bilingual: false 
  });

  // Trạng thái xử lý
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return alert('Vui lòng chọn tệp giáo án đầu vào!');
    if (!apiKey) return alert('Vui lòng thiết lập API Key ở góc trên bên phải!');
    
    setIsLoading(true);
    setResult('');
    
    try {
      const textContent = await extractTextFromFile(file);
      const contextInfo = `Môn học: ${subject}, Khối lớp: ${grade}`;
      const aiResponse = await generateLessonPlan(apiKey, model, textContent, options, contextInfo);
      setResult(aiResponse);
    } catch (error: any) {
      alert(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#11141c] text-gray-200 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><FileText size={24} className="text-white"/></div>
            SOẠN GIÁO ÁN NĂNG LỰC SỐ
          </h1>
          <p className="text-sm text-gray-400 mt-1">Hỗ trợ tích hợp Năng lực số toàn cấp</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600/20 transition"
        >
          <Settings size={18} /> Thiết lập API Key
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* CỘT TRÁI: FORM CẤU HÌNH */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Kế hoạch bài dạy */}
          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Thông tin Kế hoạch bài dạy</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-gray-300">Môn học <span className="text-red-500">*</span></label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#11141c] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                  <option>Tin học</option>
                  <option>Toán</option>
                  <option>Ngữ Văn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-300">Khối lớp <span className="text-red-500">*</span></label>
                <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full bg-[#11141c] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                  <option>Lớp 10</option>
                  <option>Lớp 11</option>
                  <option>Lớp 12</option>
                </select>
              </div>
            </div>
          </section>

          {/* 2. Tài liệu đầu vào (Thiết kế theo image_78ca1b.png) */}
          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Tài liệu đầu vào</h2>
            <div className="border border-dashed border-gray-600 rounded-xl p-6 bg-[#181c25] flex flex-col sm:flex-row items-start sm:items-center gap-4">
               {/* Nút giả lập input file */}
               <div className="relative">
                 <input 
                    type="file" 
                    accept=".docx, .pdf" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 <button className="bg-[#243b6b] hover:bg-[#2d4a86] text-blue-100 px-6 py-2.5 rounded-lg font-medium pointer-events-none">
                    Chọn tệp
                 </button>
               </div>
               
               {/* Hiển thị tên file đã chọn */}
               <div className="flex-1 overflow-hidden">
                 {file ? (
                   <div className="flex flex-col">
                      <span className="text-gray-300 text-sm truncate">{file.name}</span>
                      <span className="text-green-500 text-sm flex items-center gap-1 mt-1">
                        <FileText size={14}/> {file.name}
                      </span>
                   </div>
                 ) : (
                   <span className="text-gray-500 text-sm">Chưa có tệp nào được chọn (.docx, .pdf)</span>
                 )}
               </div>
            </div>
          </section>

          {/* 3. Tuỳ chọn nâng cao (4 chức năng cốt lõi) */}
          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
             <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Tùy chọn nâng cao</h2>
             <div className="space-y-3">
                {/* Checkbox 1: AI */}
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.ai ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-500" checked={options.ai} onChange={e => setOptions({...options, ai: e.target.checked})} />
                  <div>
                    <p className="font-medium text-blue-400 flex items-center gap-2"><Cpu size={16}/> Thêm năng lực trí tuệ nhân tạo vào giáo án</p>
                    <p className="text-xs text-gray-400 mt-1">AI sẽ phân tích và gắn năng lực AI phù hợp vào các hoạt động dạy học.</p>
                  </div>
                </label>

                {/* Checkbox 2: Khuyết tật / Hòa nhập */}
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.inclusive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-purple-500" checked={options.inclusive} onChange={e => setOptions({...options, inclusive: e.target.checked})} />
                  <div>
                    <p className="font-medium text-purple-400 flex items-center gap-2"><HeartHandshake size={16}/> Thêm năng lực cho giáo án giáo dục hòa nhập</p>
                    <p className="text-xs text-gray-400 mt-1">Bổ sung phương pháp, giải pháp hỗ trợ học sinh khuyết tật tham gia bài học.</p>
                  </div>
                </label>

                {/* Checkbox 3: Ngoại ngữ CLIL */}
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.foreignLang ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-emerald-500" checked={options.foreignLang} onChange={e => setOptions({...options, foreignLang: e.target.checked})} />
                  <div>
                    <p className="font-medium text-emerald-400 flex items-center gap-2"><Globe size={16}/> Tích hợp năng lực ngoại ngữ</p>
                    <p className="text-xs text-gray-400 mt-1">Tích hợp thuật ngữ tiếng Anh chuyên ngành theo phương pháp CLIL.</p>
                  </div>
                </label>

                {/* Checkbox 4: Song ngữ */}
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.bilingual ? 'border-teal-500 bg-teal-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-teal-500" checked={options.bilingual} onChange={e => setOptions({...options, bilingual: e.target.checked})} />
                  <div>
                    <p className="font-medium text-teal-400 flex items-center gap-2"><Languages size={16}/> Tạo song ngữ Việt - Anh một phần giáo án</p>
                    <p className="text-xs text-gray-400 mt-1">AI ưu tiên dịch thuật phần Khởi động, trò chơi hoặc hoạt động có từ khóa tiếng Anh.</p>
                  </div>
                </label>
             </div>
          </section>

          {/* Nút Submit */}
          <button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full bg-[#1c5dfd] hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-lg shadow-lg shadow-blue-900/20"
          >
            {isLoading ? <><Loader2 className="animate-spin" /> Đang xử lý dữ liệu với AI...</> : 'Tạo Giáo Án'}
          </button>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ VÀ HƯỚNG DẪN */}
        <div className="space-y-6">
          {!result && (
            <div className="bg-[#1c5dfd] rounded-xl p-6 text-white shadow-xl shadow-blue-900/20">
              <h3 className="font-bold text-lg mb-4 border-b border-blue-400 pb-2">Hướng dẫn nhanh</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3"><span className="bg-white text-blue-600 font-bold rounded-full min-w-6 w-6 h-6 flex items-center justify-center">1</span> Cập nhật API Key ở góc trên.</li>
                <li className="flex gap-3"><span className="bg-white text-blue-600 font-bold rounded-full min-w-6 w-6 h-6 flex items-center justify-center">2</span> Chọn môn học, khối lớp.</li>
                <li className="flex gap-3"><span className="bg-white text-blue-600 font-bold rounded-full min-w-6 w-6 h-6 flex items-center justify-center">3</span> Tải lên tệp giáo án gốc.</li>
                <li className="flex gap-3"><span className="bg-white text-blue-600 font-bold rounded-full min-w-6 w-6 h-6 flex items-center justify-center">4</span> Chọn các tuỳ chọn AI, Hòa nhập, Ngoại ngữ và Bấm Tạo.</li>
              </ul>
            </div>
          )}

          {/* Khối hiển thị kết quả */}
          {result && (
            <div className="bg-[#1e2330] rounded-xl border border-green-500/30 overflow-hidden flex flex-col h-full max-h-[800px]">
              <div className="bg-green-500/10 p-4 border-b border-green-500/20 flex justify-between items-center">
                <h3 className="font-bold text-green-400">Giáo án đã hoàn thiện</h3>
              </div>
              <div className="p-6 overflow-y-auto prose prose-invert max-w-none text-sm text-gray-300 custom-scrollbar">
                {/* Ở môi trường thực tế, bạn có thể dùng thư viện react-markdown để render biến {result} */}
                <div style={{ whiteSpace: 'pre-wrap' }}>{result}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} />
    </div>
  );
}