'use client';
import { useState } from 'react';
import { Settings, FileText, Loader2, Cpu, HeartHandshake, Globe, Languages, Download } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Đổi key để dọn cache cũ
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key_v5', '');
  const [model, setModel] = useLocalStorage('gemini_model_v5', 'gemini-pro');
  
  const [subject, setSubject] = useState('Tin học');
  const [grade, setGrade] = useState('Lớp 10');
  const [file, setFile] = useState<File | null>(null);
  
  const [options, setOptions] = useState({ 
    ai: false, 
    inclusive: false, 
    foreignLang: false, 
    bilingual: false 
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return alert('Vui lòng chọn tệp giáo án đầu vào!');
    if (!apiKey) return alert('Vui lòng thiết lập API Key!');
    
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

  // Hàm xuất file Word từ HTML
  const exportToWord = () => {
    if (!result) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Giáo án</title></head><body>";
    const footer = "</body></html>";
    const htmlContent = document.getElementById("ai-result-content")?.innerHTML || "";
    
    const sourceHTML = header + htmlContent + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    // Xuất định dạng .doc để Microsoft Word tự động chuyển thể CSS HTML sang màu sắc đoạn văn
    fileDownload.download = `Giao_An_Tich_Hop_${subject}_${grade}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="min-h-screen bg-[#11141c] text-gray-200 font-sans p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><FileText size={24} className="text-white"/></div>
            SOẠN GIÁO ÁN NĂNG LỰC SỐ
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600/20"
        >
          <Settings size={18} /> Thiết lập API Key
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          
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

          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Tài liệu đầu vào</h2>
            <div className="border border-dashed border-gray-600 rounded-xl p-6 bg-[#181c25] flex items-center gap-4">
               <div className="relative">
                 <input type="file" accept=".docx, .pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                 <button className="bg-[#243b6b] hover:bg-[#2d4a86] text-blue-100 px-6 py-2.5 rounded-lg font-medium pointer-events-none">Chọn tệp</button>
               </div>
               <div className="flex-1 overflow-hidden">
                 {file ? (
                   <div className="flex flex-col">
                      <span className="text-gray-300 text-sm truncate">{file.name}</span>
                      <span className="text-green-500 text-sm flex items-center gap-1 mt-1"><FileText size={14}/> Sẵn sàng</span>
                   </div>
                 ) : <span className="text-gray-500 text-sm">Chưa có tệp nào được chọn (.docx, .pdf)</span>}
               </div>
            </div>
          </section>

          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
             <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Tùy chọn nâng cao</h2>
             <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.ai ? 'border-yellow-600 bg-yellow-600/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.ai} onChange={e => setOptions({...options, ai: e.target.checked})} />
                  <div><p className="font-medium text-yellow-500">Thêm năng lực trí tuệ nhân tạo (Màu vàng tối)</p></div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.inclusive ? 'border-red-600 bg-red-600/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.inclusive} onChange={e => setOptions({...options, inclusive: e.target.checked})} />
                  <div><p className="font-medium text-red-500">Thêm giải pháp giáo dục hòa nhập (Màu đỏ tối)</p></div>
                </label>
                {/* Giữ nguyên checkbox 3 & 4 */}
             </div>
          </section>

          <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-[#1c5dfd] hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 className="animate-spin" /> Đang xử lý dữ liệu với AI...</> : 'Tạo Giáo Án'}
          </button>
        </div>

        <div className="space-y-6">
          {result && (
            <div className="bg-[#1e2330] rounded-xl border border-green-500/30 overflow-hidden flex flex-col h-full">
              <div className="bg-green-500/10 p-4 border-b border-green-500/20 flex justify-between items-center">
                <h3 className="font-bold text-green-400">Giáo án đã hoàn thiện</h3>
                <button onClick={exportToWord} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition">
                  <Download size={16} /> Tải file Word
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[800px] bg-white text-black custom-scrollbar">
                {/* Render HTML trực tiếp từ Gemini */}
                <div id="ai-result-content" dangerouslySetInnerHTML={{ __html: result }} className="prose max-w-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} />
    </div>
  );
}