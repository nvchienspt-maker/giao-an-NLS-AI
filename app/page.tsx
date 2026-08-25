'use client';
import { patchDocx } from './utils/docxModifier';
import { useState, useEffect } from 'react';
import { Settings, FileText, Loader2, Cpu, HeartHandshake, Globe, Languages, Download, AlertCircle, Copy, Sun, Moon } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key_v6', '');
  const [model, setModel] = useLocalStorage('gemini_model_v6', 'gemini-3.5-flash');
  
  // Trạng thái Giao diện Sáng/Tối (Mặc định là Tối)
  const [isDarkMode, setIsDarkMode] = useLocalStorage('theme_mode', true);

  const [subject, setSubject] = useLocalStorage('gemini_subject', 'Tin học');
  const [grade, setGrade] = useLocalStorage('gemini_grade', 'Lớp 12');
  
  const [file, setFile] = useState<File | null>(null);
  const [appendixFile, setAppendixFile] = useState<File | null>(null);
  
  const [options, setOptions] = useState({ 
    ai: false, 
    inclusive: false, 
    foreignLang: false, 
    bilingual: false 
  });

  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // BỘ BIẾN MÀU (THEME) - Đảm bảo Light Mode sáng tinh khiết
  const theme = {
    bgMain: isDarkMode ? 'bg-[#11141c]' : 'bg-[#f8f9fa]',
    textMain: isDarkMode ? 'text-gray-200' : 'text-gray-800',
    textTitle: isDarkMode ? 'text-white' : 'text-gray-900',
    bgCard: isDarkMode ? 'bg-[#1e2330]' : 'bg-white',
    borderCard: isDarkMode ? 'border-gray-800' : 'border-gray-200 shadow-sm',
    bgInput: isDarkMode ? 'bg-[#11141c]' : 'bg-white',
    borderInput: isDarkMode ? 'border-gray-700' : 'border-gray-300',
    textInput: isDarkMode ? 'text-white' : 'text-gray-900',
    bgDropzone: isDarkMode ? 'bg-[#181c25]' : 'bg-gray-50',
    borderDropzone: isDarkMode ? 'border-gray-600' : 'border-gray-300',
    textLabel: isDarkMode ? 'text-gray-300' : 'text-gray-700',
    textMuted: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    bgHover: isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    borderUnselected: isDarkMode ? 'border-gray-700' : 'border-gray-300',
    borderHeader: isDarkMode ? 'border-gray-800' : 'border-gray-200',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage('');
    }
  };

  const handleAppendixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAppendixFile(e.target.files[0]);
      setErrorMessage('');
    }
  };

  const handleGenerate = async () => {
    setErrorMessage('');
    if (!file) { setErrorMessage('Vui lòng chọn tệp giáo án (.docx)!'); return; }
    if (!apiKey) { setErrorMessage('Vui lòng thiết lập API Key!'); return; }
    
    setIsLoading(true);
    setResult('');
    let secondsWaited = 0;
    setProgressText("Hệ thống đang nội suy vị trí cần chèn...");

    const progressInterval = setInterval(() => {
      secondsWaited += 2; 
      setProgressText(`AI đang tính toán cấu trúc tài liệu... Vui lòng đợi (${secondsWaited}s)`);
    }, 2000);
    
    try {
      const textContent = await extractTextFromFile(file);
      let appendixText = appendixFile ? await extractTextFromFile(appendixFile) : "";
      const contextInfo = `Môn học: ${subject}, Khối lớp: ${grade}`;
      
      const aiResponseJSON = await generateLessonPlan(apiKey, model, textContent, options, contextInfo, appendixText);
      
      let instructions = [];
      try {
        instructions = JSON.parse(aiResponseJSON);
      } catch (e) {
        throw new Error("AI không trả về đúng định dạng JSON. Vui lòng thử lại.");
      }

      setProgressText("Đang vá dữ liệu và đóng gói file...");
      const modifiedDocxBlob = await patchDocx(file, instructions);
      
      const url = URL.createObjectURL(modifiedDocxBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${file.name}_NLS.docx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      clearInterval(progressInterval);
      setProgressText('Hoàn tất!');
      
      let summaryHTML = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';
      summaryHTML += '<div style="background-color: #f0fdf4; color: #166534; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; border: 1px solid #bbf7d0;">✅ Đã tích hợp thành công! File giáo án hoàn chỉnh đã được tải xuống máy của bạn. Dưới đây là thống kê các năng lực AI đã tự động chèn vào:</div>';
      
      instructions.forEach((inst: any, idx: number) => {
        const title = inst.position === 'nang_luc_chung' ? '🎯 MỤC TIÊU CHUNG (Đầu giáo án)' :
                      inst.position === 'cuoi_muc_tieu' ? '🤝 GIÁO DỤC HÒA NHẬP (Cuối mục tiêu)' :
                      `📝 ${inst.activity_keyword ? inst.activity_keyword.toUpperCase() : 'HOẠT ĐỘNG'}`;
                      
        summaryHTML += `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #ffffff;">`;
        summaryHTML += `<div style="font-weight: bold; color: #374151; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">${idx + 1}. ${title}</div>`;
        
        const parseLines = (lines: string[] | string | undefined, colorHex: string) => {
           if (!lines) return '';
           const arr = Array.isArray(lines) ? lines : lines.split('\n');
           return arr.filter(l => l.trim()).map(l => `<div style="color: ${colorHex}; margin-left: 16px; margin-bottom: 4px;">${l}</div>`).join('');
        };
        
        summaryHTML += parseLines(inst.nls, '#00008B');
        summaryHTML += parseLines(inst.ai, '#B8860B');
        summaryHTML += parseLines(inst.gdhn, '#8B0000');
        summaryHTML += `</div>`;
      });
      summaryHTML += '</div>';
      
      setResult(summaryHTML);

    } catch (error: any) {
      clearInterval(progressInterval);
      setErrorMessage(`[Lỗi hệ thống]:\n${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToWord = () => {
    if (!result) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = document.getElementById("ai-result-content")?.innerHTML || "";

    const images = tempDiv.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      let w = img.naturalWidth; let h = img.naturalHeight;
      if (w > 450) { const ratio = 450 / w; w = 450; h = h * ratio; }
      if (w > 0) { img.setAttribute('width', Math.round(w).toString()); img.setAttribute('height', Math.round(h).toString()); }
      img.style.width = ''; img.style.maxWidth = ''; img.style.height = '';
    }

    const tables = tempDiv.getElementsByTagName('table');
    for (let i = 0; i < tables.length; i++) { tables[i].style.width = '100%'; tables[i].style.tableLayout = 'auto'; }

    const header = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset='utf-8'><title>Giáo án</title><style>@page WordSection1 { size: 21.0cm 29.7cm; margin: 2.0cm; } div.WordSection1 { page: WordSection1; } body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; } table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } table, td, th { border: 1pt solid black; padding: 8px; vertical-align: top; }</style></head><body><div class="WordSection1">`;
    const footer = "</div></body></html>";
    
    const blob = new Blob(['\ufeff', header + tempDiv.innerHTML + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload); fileDownload.href = url; fileDownload.download = `Giao_An_${subject}_${grade}.doc`;
    fileDownload.click(); document.body.removeChild(fileDownload); URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 transition-colors duration-300 ${theme.bgMain} ${theme.textMain}`}>
      <header className={`flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 gap-4 ${theme.borderHeader}`}>
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white flex items-center justify-center">
            <FileText size={24} />
          </div>
          
          <div>
            <h1 className={`text-2xl font-bold ${theme.textTitle}`}>
              SOẠN GIÁO ÁN NĂNG LỰC SỐ - LITE
            </h1>

            {/* LINK BÊN DƯỚI */}
            <a
              href="https://nvc-khbd.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-blue-500 hover:text-blue-600 hover:underline transition-colors inline-block mt-0.5"
            >
              🔗 Bản đầy đủ (Đang phát triển)
            </a>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center text-center flex-1">
          <span className="text-sm font-bold text-blue-500 tracking-widest uppercase">
            Phát triển bởi: {" "}
            <a href="https://chienzz.web.app" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 hover:underline transition-colors">
              NVC Spaces
            </a>
          </span>
          <span className={`text-xs mt-1 ${theme.textMuted}`}>Hệ thống AI Hỗ trợ Giáo dục THPT</span>
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          {/* Nút Toggle Light/Dark Mode */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700' : 'bg-white border-gray-300 text-yellow-500 hover:bg-gray-100 shadow-sm'}`}
            title={isDarkMode ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} className="text-slate-600" />}
          </button>

          <button onClick={() => setIsModalOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${isDarkMode ? 'bg-blue-600/10 text-blue-400 border-blue-600/30 hover:bg-blue-600/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
            <Settings size={18} /> Thiết lập API Key
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          
          <section className={`p-6 rounded-xl border ${theme.bgCard} ${theme.borderCard}`}>
            <h2 className="text-lg font-semibold text-blue-500 mb-4 border-l-4 border-blue-500 pl-3">Thông tin Kế hoạch bài dạy</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm mb-2 ${theme.textLabel}`}>Môn học <span className="text-red-500">*</span></label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className={`w-full border rounded-lg p-3 focus:border-blue-500 outline-none ${theme.bgInput} ${theme.borderInput} ${theme.textInput}`}>
                  <option>Tin học</option><option>Toán</option><option>Ngoại ngữ</option><option>Công nghệ</option><option>Giáo dục thể chất</option><option>Nghệ thuật (Âm nhạc, Mĩ thuật)</option><option>Hoạt động trải nghiệm, hướng nghiệp</option><option>Tiếng Việt (Tiểu học)</option><option>Ngữ văn</option><option>Đạo đức (Tiểu học)</option><option>Giáo dục công dân (THCS)</option><option>Giáo dục Kinh tế và Pháp luật (THPT)</option><option>Tự nhiên và Xã hội (Lớp 1-3)</option><option>Khoa học (Lớp 4-5)</option><option>Khoa học tự nhiên (THCS)</option><option>Vật lí (THPT)</option><option>Hóa học (THPT)</option><option>Sinh học (THPT)</option><option>Lịch sử và Địa lí (Tiểu học & THCS)</option><option>Lịch sử (THPT)</option><option>Địa lí (THPT)</option><option>Giáo dục quốc phòng và an ninh</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${theme.textLabel}`}>Khối lớp <span className="text-red-500">*</span></label>
                <select value={grade} onChange={e => setGrade(e.target.value)} className={`w-full border rounded-lg p-3 focus:border-blue-500 outline-none ${theme.bgInput} ${theme.borderInput} ${theme.textInput}`}>
                  <option>Lớp 12</option><option>Lớp 11</option><option>Lớp 10</option><option>Lớp 9</option><option>Lớp 8</option><option>Lớp 7</option><option>Lớp 6</option><option>Lớp 5</option><option>Lớp 4</option><option>Lớp 3</option><option>Lớp 2</option><option>Lớp 1</option>
                </select>
              </div>
            </div>
          </section>

          <section className={`p-6 rounded-xl border ${theme.bgCard} ${theme.borderCard}`}>
            <h2 className="text-lg font-semibold text-blue-500 mb-4 border-l-4 border-blue-500 pl-3">Tài liệu đầu vào</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`border border-dashed rounded-xl p-5 flex flex-col items-start gap-4 ${theme.bgDropzone} ${theme.borderDropzone}`}>
                 <div>
                   <p className={`text-sm font-medium ${theme.textLabel}`}>1. Giáo án gốc <span className="text-red-500">*</span></p>
                   <p className={`text-xs mt-1 ${theme.textMuted}`}>Giáo án cần biên tập (.docx, .pdf)</p>
                 </div>
                 <div className="flex items-center gap-3 w-full">
                   <div className="relative shrink-0">
                     <input type="file" accept=".docx, .pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                     <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium pointer-events-none shadow-sm">Tải tệp lên</button>
                   </div>
                   <div className="flex-1 overflow-hidden">
                     {file ? (
                        <div className="flex flex-col"><span className={`text-xs truncate ${theme.textLabel}`} title={file.name}>{file.name}</span><span className="text-green-500 text-[10px] flex items-center gap-1 mt-0.5"><FileText size={10}/> Đã tải</span></div>
                     ) : <span className={`text-xs italic ${theme.textMuted}`}>Chưa chọn tệp</span>}
                   </div>
                 </div>
              </div>

              <div className={`border border-dashed rounded-xl p-5 flex flex-col items-start gap-4 ${theme.bgDropzone} ${theme.borderDropzone}`}>
                 <div>
                   <p className={`text-sm font-medium ${theme.textLabel}`}>2. Phụ lục Năng lực (Tùy chọn)</p>
                   <p className={`text-xs mt-1 ${theme.textMuted}`}>Danh sách phân phối chương trình</p>
                 </div>
                 <div className="flex items-center gap-3 w-full">
                   <div className="relative shrink-0">
                     <input type="file" accept=".docx, .pdf" onChange={handleAppendixChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                     <button className={`border px-4 py-2 rounded-lg text-sm font-medium pointer-events-none ${isDarkMode ? 'bg-[#1c2a38] border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700 shadow-sm'}`}>Tải Phụ lục</button>
                   </div>
                   <div className="flex-1 overflow-hidden">
                     {appendixFile ? (
                        <div className="flex flex-col"><span className={`text-xs truncate ${theme.textLabel}`} title={appendixFile.name}>{appendixFile.name}</span><span className="text-green-500 text-[10px] flex items-center gap-1 mt-0.5"><FileText size={10}/> Đã tải</span></div>
                     ) : <span className={`text-xs italic ${theme.textMuted}`}>Chưa có phụ lục</span>}
                   </div>
                 </div>
              </div>
            </div>
          </section>

          <section className={`p-6 rounded-xl border ${theme.bgCard} ${theme.borderCard}`}>
             <h2 className="text-lg font-semibold text-blue-500 mb-4 border-l-4 border-blue-500 pl-3">Tùy chọn nâng cao</h2>
             <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.ai ? (isDarkMode ? 'border-yellow-600 bg-yellow-600/10' : 'border-yellow-500 bg-yellow-50') : `${theme.borderUnselected} ${theme.bgHover}`}`}>
                  <input type="checkbox" className="mt-1 cursor-pointer" checked={options.ai} onChange={e => setOptions({...options, ai: e.target.checked})} />
                  <div><p className="font-medium text-yellow-500 flex items-center gap-2"><Cpu size={16}/> Thêm năng lực trí tuệ nhân tạo (AI) vào giáo án</p></div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.inclusive ? (isDarkMode ? 'border-red-600 bg-red-600/10' : 'border-red-500 bg-red-50') : `${theme.borderUnselected} ${theme.bgHover}`}`}>
                  <input type="checkbox" className="mt-1 cursor-pointer" checked={options.inclusive} onChange={e => setOptions({...options, inclusive: e.target.checked})} />
                  <div><p className="font-medium text-red-500 flex items-center gap-2"><HeartHandshake size={16}/> Thêm giải pháp giáo dục hòa nhập</p></div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.foreignLang ? (isDarkMode ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50') : `${theme.borderUnselected} ${theme.bgHover}`}`}>
                  <input type="checkbox" className="mt-1 cursor-pointer" checked={options.foreignLang} onChange={e => setOptions({...options, foreignLang: e.target.checked})} />
                  <div><p className="font-medium text-emerald-500 flex items-center gap-2"><Globe size={16}/> Tích hợp năng lực ngoại ngữ (CLIL)</p></div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${options.bilingual ? (isDarkMode ? 'border-teal-500 bg-teal-500/10' : 'border-teal-500 bg-teal-50') : `${theme.borderUnselected} ${theme.bgHover}`}`}>
                  <input type="checkbox" className="mt-1 cursor-pointer" checked={options.bilingual} onChange={e => setOptions({...options, bilingual: e.target.checked})} />
                  <div><p className="font-medium text-teal-500 flex items-center gap-2"><Languages size={16}/> Tạo song ngữ Việt - Anh một phần giáo án</p></div>
                </label>
             </div>
          </section>

          <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-[#1c5dfd] hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-80 shadow-md">
            {isLoading ? (
              <><div className="flex items-center gap-2 mb-1"><Loader2 className="animate-spin" size={20} /> Đang xử lý...</div><span className="text-xs text-blue-200">{progressText}</span></>
            ) : 'Tạo Giáo Án'}
          </button>

          {errorMessage && (
            <div className={`relative border rounded-xl p-5 mt-4 ${isDarkMode ? 'bg-red-950/40 border-red-800/50' : 'bg-red-50 border-red-200'}`}>
              <h4 className="text-red-500 font-semibold mb-2 flex items-center gap-2"><AlertCircle size={18}/> Đã xảy ra lỗi</h4>
              <p className={`text-sm font-mono whitespace-pre-wrap break-words pr-12 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{errorMessage}</p>
              <button onClick={() => { navigator.clipboard.writeText(errorMessage); alert('Đã copy lỗi!'); }} className={`absolute top-4 right-4 p-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${isDarkMode ? 'bg-red-900/30 hover:bg-red-800/50 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}>
                <Copy size={16} /><span className="text-[10px]">Copy</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`rounded-xl border overflow-hidden flex flex-col h-full min-h-[500px] ${isDarkMode ? 'bg-[#1e2330] border-gray-800' : 'bg-white border-green-200 shadow-sm'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#181c25] border-gray-800' : 'bg-green-50 border-green-200'}`}>
              <h3 className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-green-600'}`}>Giáo án đã hoàn thiện</h3>
              <button onClick={exportToWord} disabled={!result} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition shadow-sm ${result ? 'bg-green-600 hover:bg-green-700 text-white' : (isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}`}>
                <Download size={16} /> Tải file Word (.doc)
              </button>
            </div>
            
            {/* ĐÃ FIX NỀN TRẮNG TẠI ĐÂY */}
            <div className={`p-6 overflow-y-auto max-h-[800px] flex-1 custom-scrollbar ${isDarkMode ? 'bg-[#11141c] text-gray-300' : 'bg-[#fcfcfc] text-black'}`}>
              {result ? (
                // Nếu có kết quả, bọc trong 1 trang giấy trắng cho dễ đọc text (giống style Word)
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-white text-black' : ''}`}>
                  <div id="ai-result-content" dangerouslySetInnerHTML={{ __html: result }} className="prose max-w-none" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-[#1e2330]' : 'bg-gray-50'}`}>
                    <FileText size={48} className={isDarkMode ? 'text-gray-600' : 'text-gray-300'} />
                  </div>
                  <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Chưa có dữ liệu hiển thị</h4>
                  <p className={`text-center text-sm max-w-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                    Vui lòng tải giáo án lên, chọn các tùy chọn tích hợp và bấm <b>"Tạo Giáo Án"</b> để bắt đầu.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className={`max-w-7xl mx-auto mt-12 pt-6 border-t flex flex-col md:flex-row justify-between items-center text-sm pb-8 ${isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
        <p>
          © {new Date().getFullYear()} Thiết kế & Phát triển bởi{' '}
          <a href="https://chienzz.web.app" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-500 hover:text-blue-600 hover:underline transition-colors">
            NVC Spaces
          </a>{' '}
          - Zalo: 0975.702.250 (Nguyễn Văn Chiến).
        </p>
        <p className="mt-2 md:mt-0 flex items-center gap-1">
          <span>Công cụ tự động hóa tích hợp Năng lực số và AI theo chuẩn của Bộ GD&ĐT.</span>
          <a
            href="https://nvc-khbd.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-medium ml-1"
          >
            🔗 Bản đầy đủ
          </a>
        </p>
      </footer>

      {/* Truyền isDarkMode sang cho Modal để đồng bộ màu sắc */}
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} isDarkMode={isDarkMode} />
    </div>
  );
}