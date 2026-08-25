'use client';
import { patchDocx } from './utils/docxModifier';
import { useState, useEffect } from 'react';
import { Settings, FileText, Loader2, Cpu, HeartHandshake, Globe, Languages, Download, AlertCircle, Copy } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateLessonPlan } from './utils/gemini';
import { extractTextFromFile } from './utils/fileReader';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key_v6', '');
  const [model, setModel] = useLocalStorage('gemini_model_v6', 'gemini-3.5-flash');
  
  // Thay thế useState bằng useLocalStorage để trình duyệt tự động ghi nhớ
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
  
  // State mới để quản lý lỗi hiển thị trên giao diện
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(''); // Xóa lỗi khi chọn lại file
    }
  };

  const handleAppendixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAppendixFile(e.target.files[0]);
      setErrorMessage('');
    }
  };

  // ... (giữ nguyên phần trên của page.tsx) ...

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
      // 1. Chỉ trích xuất Text thô để AI đọc (tránh mọi lỗi 429 quá tải token do hình ảnh)
      const textContent = await extractTextFromFile(file);
      let appendixText = appendixFile ? await extractTextFromFile(appendixFile) : "";
      const contextInfo = `Môn học: ${subject}, Khối lớp: ${grade}`;
      
      // 2. Nhận bộ lệnh JSON từ AI
      const aiResponseJSON = await generateLessonPlan(apiKey, model, textContent, options, contextInfo, appendixText);
      
      let instructions = [];
      try {
        instructions = JSON.parse(aiResponseJSON);
      } catch (e) {
        throw new Error("AI không trả về đúng định dạng JSON. Vui lòng thử lại.");
      }

      // 3. Gọi cỗ máy Tiêm dữ liệu vào file GỐC (.docx)
      setProgressText("Đang vá dữ liệu và đóng gói file...");
      const modifiedDocxBlob = await patchDocx(file, instructions);
      
      // 4. Tự động tải xuống ngay lập tức file đã tích hợp
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
      
      // 5. TẠO BẢN TÓM TẮT ĐỂ HIỂN THỊ LÊN GIAO DIỆN WEB (KHÔNG HIỆN TOÀN BỘ GIÁO ÁN)
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

    // Fix ảnh: Khóa cứng kích thước (pixel) chuẩn theo file gốc, giới hạn tối đa bằng khổ A4
    const images = tempDiv.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      
      // Lấy kích thước thật của ảnh
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      
      // Khổ A4 trừ lề 2 bên sẽ còn khoảng 450px. Nếu ảnh to hơn thì thu nhỏ theo tỷ lệ.
      if (w > 450) {
        const ratio = 450 / w;
        w = 450;
        h = h * ratio;
      }
      
      // Ép cứng pixel vào thẻ HTML để Word đọc chính xác
      if (w > 0) {
        img.setAttribute('width', Math.round(w).toString());
        img.setAttribute('height', Math.round(h).toString());
      }
      
      // Gỡ bỏ toàn bộ style CSS gây nhiễu cho Word
      img.style.width = '';
      img.style.maxWidth = '';
      img.style.height = '';
    }

    // Gỡ bỏ ép buộc layout bảng để trả về định dạng bảng mặc định của file gốc
    const tables = tempDiv.getElementsByTagName('table');
    for (let i = 0; i < tables.length; i++) {
      tables[i].style.width = '100%';
      tables[i].style.tableLayout = 'auto'; // Để Word tự cân đối cột như ban đầu
    }

    const processedHTML = tempDiv.innerHTML;
    
    const header = `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset='utf-8'>
        <title>Giáo án</title>
        <style>
          @page WordSection1 { size: 21.0cm 29.7cm; margin: 2.0cm; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table, td, th { border: 1pt solid black; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
    `;
    const footer = "</div></body></html>";
    
    const sourceHTML = header + processedHTML + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = `Giao_An_${subject}_${grade}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  };

  // ... (giữ nguyên phần giao diện return) ...

  return (
    <div className="min-h-screen bg-[#11141c] text-gray-200 font-sans p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-4 gap-4">
        {/* Tiêu đề Logo */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><FileText size={24} className="text-white"/></div>
            SOẠN GIÁO ÁN NĂNG LỰC SỐ
          </h1>
        </div>

        {/* Thông tin người thiết kế (Khu vực giữa) */}
        <div className="hidden md:flex flex-col items-center justify-center text-center flex-1">
          <span className="text-sm font-bold text-blue-400 tracking-widest uppercase">
            Phát triển bởi NVC Spaces -{" "}
            <a
              href="https://chienzz.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-300 hover:underline transition-colors"
            >
              https://chienzz.web.app
            </a>
          </span>

          <span className="text-xs text-gray-500 mt-1">
            Hệ thống AI Hỗ trợ Giáo dục THPT
          </span>
        </div>

        {/* Nút API Key */}
        <div className="flex-shrink-0">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600/20 whitespace-nowrap"
          >
            <Settings size={18} /> Thiết lập API Key
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          
          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Thông tin Kế hoạch bài dạy</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-gray-300">Môn học <span className="text-red-500">*</span></label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#11141c] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                  {/* Các môn xuyên suốt */}
                  <option>Tin học</option>
                  <option>Toán</option>
                  <option>Ngoại ngữ</option>
                  <option>Công nghệ</option>
                  <option>Giáo dục thể chất</option>
                  <option>Nghệ thuật (Âm nhạc, Mĩ thuật)</option>
                  <option>Hoạt động trải nghiệm, hướng nghiệp</option>
                  
                  {/* Nhóm Ngữ văn / Tiếng Việt */}
                  <option>Tiếng Việt (Tiểu học)</option>
                  <option>Ngữ văn</option>
                  
                  {/* Nhóm Đạo đức / GDCD / GDKT&PL */}
                  <option>Đạo đức (Tiểu học)</option>
                  <option>Giáo dục công dân (THCS)</option>
                  <option>Giáo dục Kinh tế và Pháp luật (THPT)</option>
                  
                  {/* Nhóm Tự nhiên */}
                  <option>Tự nhiên và Xã hội (Lớp 1-3)</option>
                  <option>Khoa học (Lớp 4-5)</option>
                  <option>Khoa học tự nhiên (THCS)</option>
                  <option>Vật lí (THPT)</option>
                  <option>Hóa học (THPT)</option>
                  <option>Sinh học (THPT)</option>
                  
                  {/* Nhóm Xã hội */}
                  <option>Lịch sử và Địa lí (Tiểu học & THCS)</option>
                  <option>Lịch sử (THPT)</option>
                  <option>Địa lí (THPT)</option>
                  
                  {/* Khác */}
                  <option>Giáo dục quốc phòng và an ninh</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-300">Khối lớp <span className="text-red-500">*</span></label>
                <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full bg-[#11141c] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                  <option>Lớp 12</option>
                  <option>Lớp 11</option>
                  <option>Lớp 10</option>
                  <option>Lớp 9</option>
                  <option>Lớp 8</option>
                  <option>Lớp 7</option>
                  <option>Lớp 6</option>
                  <option>Lớp 5</option>
                  <option>Lớp 4</option>
                  <option>Lớp 3</option>
                  <option>Lớp 2</option>
                  <option>Lớp 1</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-[#1e2330] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-blue-400 mb-4 border-l-4 border-blue-500 pl-3">Tài liệu đầu vào</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-dashed border-gray-600 rounded-xl p-5 bg-[#181c25] flex flex-col items-start gap-4">
                 <div>
                   <p className="text-sm text-gray-300 font-medium">1. Giáo án gốc <span className="text-red-500">*</span></p>
                   <p className="text-xs text-gray-500 mt-1">Giáo án cần biên tập (.docx, .pdf)</p>
                 </div>
                 <div className="flex items-center gap-3 w-full">
                   <div className="relative shrink-0">
                     <input type="file" accept=".docx, .pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                     <button className="bg-[#243b6b] hover:bg-[#2d4a86] text-blue-100 px-4 py-2 rounded-lg text-sm font-medium pointer-events-none">Tải tệp lên</button>
                   </div>
                   <div className="flex-1 overflow-hidden">
                     {file ? (
                        <div className="flex flex-col">
                           <span className="text-gray-300 text-xs truncate" title={file.name}>{file.name}</span>
                           <span className="text-green-500 text-[10px] flex items-center gap-1 mt-0.5"><FileText size={10}/> Đã tải</span>
                        </div>
                     ) : <span className="text-gray-600 text-xs italic">Chưa chọn tệp</span>}
                   </div>
                 </div>
              </div>

              <div className="border border-dashed border-gray-600 rounded-xl p-5 bg-[#181c25] flex flex-col items-start gap-4">
                 <div>
                   <p className="text-sm text-gray-300 font-medium">2. Phụ lục Năng lực (Tùy chọn)</p>
                   <p className="text-xs text-gray-500 mt-1">Danh sách phân phối chương trình</p>
                 </div>
                 <div className="flex items-center gap-3 w-full">
                   <div className="relative shrink-0">
                     <input type="file" accept=".docx, .pdf" onChange={handleAppendixChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                     <button className="bg-[#1c2a38] border border-gray-600 hover:bg-[#253646] text-gray-300 px-4 py-2 rounded-lg text-sm font-medium pointer-events-none">Tải Phụ lục</button>
                   </div>
                   <div className="flex-1 overflow-hidden">
                     {appendixFile ? (
                        <div className="flex flex-col">
                           <span className="text-gray-300 text-xs truncate" title={appendixFile.name}>{appendixFile.name}</span>
                           <span className="text-green-500 text-[10px] flex items-center gap-1 mt-0.5"><FileText size={10}/> Đã tải</span>
                        </div>
                     ) : <span className="text-gray-600 text-xs italic">Chưa có phụ lục</span>}
                   </div>
                 </div>
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
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${options.inclusive ? 'border-red-600 bg-red-600/10' : 'border-gray-700 hover:bg-gray-800'}`}>
                  <input type="checkbox" className="mt-1" checked={options.inclusive} onChange={e => setOptions({...options, inclusive: e.target.checked})} />
                  <div>
                     <p className="font-medium text-red-500 flex items-center gap-2"><HeartHandshake size={16}/> Thêm giải pháp giáo dục hòa nhập</p>
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

          {/* KHU VỰC HIỂN THỊ LỖI MỚI */}
          {errorMessage && (
            <div className="relative bg-red-950/40 border border-red-800/50 rounded-xl p-5 mt-4">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle size={18}/> Đã xảy ra lỗi
              </h4>
              <p className="text-red-300 text-sm font-mono whitespace-pre-wrap break-words pr-12">
                {errorMessage}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(errorMessage);
                  alert('Đã copy lỗi vào bộ nhớ tạm!');
                }}
                className="absolute top-4 right-4 bg-red-900/30 hover:bg-red-800/50 text-red-300 p-2 rounded-lg transition-colors flex flex-col items-center gap-1"
                title="Copy mã lỗi"
              >
                <Copy size={16} />
                <span className="text-[10px]">Copy</span>
              </button>
            </div>
          )}
        </div>

        {/* CỘT BÊN PHẢI (LUÔN HIỂN THỊ) */}
        <div className="space-y-6">
          <div className="bg-[#1e2330] rounded-xl border border-green-500/30 overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Thanh Header của khung kết quả */}
            <div className="bg-green-500/10 p-4 border-b border-green-500/20 flex justify-between items-center">
              <h3 className="font-bold text-green-400">Giáo án đã hoàn thiện</h3>
              <button 
                onClick={exportToWord} 
                disabled={!result} // Khóa nút tải nếu chưa có kết quả
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition shadow-lg ${result ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-70'}`}
              >
                <Download size={16} /> Tải file Word (.doc)
              </button>
            </div>
            
            {/* Nội dung kết quả */}
            <div className="p-6 overflow-y-auto max-h-[800px] flex-1 bg-white text-black custom-scrollbar">
              {result ? (
                // Nếu đã chạy xong AI, hiển thị báo cáo
                <div id="ai-result-content" dangerouslySetInnerHTML={{ __html: result }} className="prose max-w-none" />
              ) : (
                // Nếu chưa chạy, hiển thị trạng thái chờ (Empty State)
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className="bg-gray-100 p-6 rounded-full mb-4">
                    <FileText size={48} className="text-gray-300" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-500 mb-2">Chưa có dữ liệu hiển thị</h4>
                  <p className="text-center text-sm text-gray-400 max-w-xs">
                    Vui lòng tải giáo án lên, chọn các tùy chọn tích hợp và bấm <b>"Tạo Giáo Án"</b> để bắt đầu.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} />
   {/* KHU VỰC CHÂN TRANG (FOOTER) */}
     <footer className="max-w-7xl mx-auto mt-12 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm pb-8">
  
        <p>
          © {new Date().getFullYear()} Thiết kế & Phát triển bởi{" "}
          
          <a
            href="https://chienzz.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            NVC Spaces
          </a>
          .
        </p>

        <p className="mt-2 md:mt-0">
          Công cụ tự động hóa tích hợp Năng lực số và AI theo chuẩn của Bộ GD&ĐT.
        </p>

      </footer>

      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} apiKey={apiKey} setApiKey={setApiKey} model={model} setModel={setModel} />
    </div>
  );
}