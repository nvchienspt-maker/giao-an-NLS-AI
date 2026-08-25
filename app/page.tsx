'use client';
import { useState, useEffect } from 'react';
import { Settings, FileText, Loader2, Cpu, HeartHandshake, Globe, Languages, Download } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key_v6', '');
  const [model, setModel] = useLocalStorage('gemini_model_v6', 'gemini-3.5-flash');
  
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
  const [progressText, setProgressText] = useState('');
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
    
    // Khởi tạo danh sách các tiến trình dựa vào tùy chọn
    const steps = [
      "Đang trích xuất dữ liệu từ tệp gốc...",
      "Đang gửi dữ liệu và bối cảnh môn học tới AI...",
      "AI đang phân tích và cấu trúc lại Kế hoạch bài dạy...",
      options.ai ? "Đang tích hợp Năng lực Trí tuệ nhân tạo (Màu vàng)..." : "",
      options.inclusive ? "Đang bổ sung phương pháp Giáo dục hòa nhập (Màu đỏ)..." : "",
      options.foreignLang ? "Đang gắn thuật ngữ chuyên ngành (CLIL)..." : "",
      options.bilingual ? "Đang tạo phân đoạn Song ngữ Việt - Anh..." : "",
      "Đang rà soát và định dạng lại giao diện kết quả..."
    ].filter(Boolean); // Bỏ các chuỗi rỗng

    let stepIndex = 0;
    setProgressText(steps[0]);

    // Tạo hiệu ứng nhảy tiến trình mỗi 2 giây
    const progressInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setProgressText(steps[stepIndex]);
      }
    }, 2500);
    
    try {
      const textContent = await extractTextFromFile(file);
      const contextInfo = `Môn học: ${subject}, Khối lớp: ${grade}`;
      const aiResponse = await generateLessonPlan(apiKey, model, textContent, options, contextInfo);
      
      clearInterval(progressInterval);
      setProgressText('Hoàn tất!');
      setResult(aiResponse);
    } catch (error: any) {
      clearInterval(progressInterval);
      alert(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToWord = () => {
    if (!result) return;
    
    // Gói kết quả vào cấu trúc HTML có hỗ trợ Word Encoding
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Giáo án</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
          h1, h2, h3 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
          table, th, td { border: 1px solid black; padding: 8px; }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const htmlContent = document.getElementById("ai-result-content")?.innerHTML || "";
    
    const sourceHTML = header + htmlContent + footer;
    const blob = new Blob(['\ufeff', sourceHTML], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    
    // Xuất ra file .doc (Word nhận diện CSS màu Xanh, Vàng, Đỏ một cách hoàn hảo)
    fileDownload.download = `Giao_An_${subject}_${grade}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
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
                      <span className="text-green-500 text-sm flex items-center gap-1 mt-1"><FileText size={14}/> Đã tải lên</span>
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
                  <div>
                     <p className="font-medium text-yellow-500 flex items-center gap-2"><Cpu size={16}/> Thêm năng lực trí tuệ nhân tạo vào giáo án</p>
                     <p className="text-xs text-gray-400 mt-1">Được làm nổi bật bằng <span className="text-yellow-600 font-bold">Màu Vàng Tối</span></p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.inclusive ? 'border-red-600 bg-red-600/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.inclusive} onChange={e => setOptions({...options, inclusive: e.target.checked})} />
                  <div>
                     <p className="font-medium text-red-500 flex items-center gap-2"><HeartHandshake size={16}/> Thêm giải pháp giáo dục hòa nhập</p>
                     <p className="text-xs text-gray-400 mt-1">Được làm nổi bật bằng <span className="text-red-700 font-bold">Màu Đỏ Tối</span></p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.foreignLang ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.foreignLang} onChange={e => setOptions({...options, foreignLang: e.target.checked})} />
                  <div><p className="font-medium text-emerald-400 flex items-center gap-2"><Globe size={16}/> Tích hợp năng lực ngoại ngữ (CLIL)</p></div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.bilingual ? 'border-teal-500 bg-teal-500/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.bilingual} onChange={e => setOptions({...options, bilingual: e.target.checked})} />
                  <div><p className="font-medium text-teal-400 flex items-center gap-2"><Languages size={16}/> Tạo song ngữ Việt - Anh một phần giáo án</p></div>
                </label>
             </div>
          </section>

          <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-[#1c5dfd] hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-80">
            {isLoading ? (
              <>
                <div className="flex items-center gap-2 mb-1"><Loader2 className="animate-spin" size={20} /> Đang xử lý...</div>
                <span className="text-xs text-blue-200">{progressText}</span>
              </>
            ) : 'Tạo Giáo Án'}
          </button>
        </div>

        <div className="space-y-6">
          {result && (
            <div className="bg-[#1e2330] rounded-xl border border-green-500/30 overflow-hidden flex flex-col h-full">
              <div className="bg-green-500/10 p-4 border-b border-green-500/20 flex justify-between items-center">
                <h3 className="font-bold text-green-400">Giáo án đã hoàn thiện</h3>
                <button onClick={exportToWord} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition shadow-lg">
                  <Download size={16} /> Tải file Word (.doc)
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[800px] bg-white text-black custom-scrollbar">
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