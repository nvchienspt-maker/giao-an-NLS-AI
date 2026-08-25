import { GoogleGenerativeAI } from '@google/generative-ai';

interface LessonOptions {
  ai: boolean;
  inclusive: boolean;
  foreignLang: boolean;
  bilingual: boolean;
}

export async function generateLessonPlan(
  apiKey: string, 
  modelName: string, 
  lessonContent: string, 
  options: LessonOptions,
  contextInfo: string
) {
  if (!apiKey) throw new Error("Vui lòng thiết lập API Key.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  let prompt = `Bạn là một Chuyên gia Giáo dục. Nhiệm vụ của bạn là biên tập giáo án dưới đây theo các tiêu chí được yêu cầu. GIỮ NGUYÊN CẤU TRÚC, TIÊU ĐỀ của giáo án gốc.
Bối cảnh: ${contextInfo}.

--- NỘI DUNG GIÁO ÁN GỐC ---
${lessonContent}
-----------------------------

--- CÁC YÊU CẦU TÍCH HỢP BẮT BUỘC ---
- BẤT KỲ phần nội dung nào liên quan đến "Năng lực số" (NLS) sẵn có hoặc bạn thêm vào, PHẢI được bọc trong thẻ HTML: <span style="color: #00008B; font-weight: bold;">Nội dung NLS</span> (Màu xanh dương tối).
`;

  if (options.ai) {
    prompt += `- Thêm nội dung hướng dẫn Năng lực AI vào giáo án. Phần năng lực AI này PHẢI được bọc trong thẻ HTML: <span style="color: #B8860B; font-weight: bold;">Nội dung Năng lực AI</span> (Màu vàng tối).\n`;
  }

  if (options.inclusive) {
    prompt += `- Thêm các giải pháp Giáo dục hòa nhập (hỗ trợ học sinh khuyết tật) vào các hoạt động. Phần này PHẢI được bọc trong thẻ HTML: <span style="color: #8B0000; font-weight: bold;">Nội dung Giáo dục hòa nhập</span> (Màu đỏ tối).\n`;
  }

  if (options.foreignLang) {
    prompt += `- Tích hợp thuật ngữ Tiếng Anh (CLIL) bằng cách mở ngoặc đơn cạnh từ khóa tiếng Việt.\n`;
  }

  if (options.bilingual) {
    prompt += `- Chọn 1 hoạt động (VD: Khởi động) để dịch thành song ngữ Việt - Anh.\n`;
  }

  prompt += `
--- QUY TẮC ĐẦU RA (RẤT QUAN TRỌNG) ---
- TRẢ VỀ TOÀN BỘ KẾT QUẢ BẰNG MÃ HTML (Dùng <h1>, <h2>, <p>, <ul>, <li>, <table>...).
- TUYỆT ĐỐI KHÔNG sử dụng Markdown. KHÔNG bọc kết quả trong \`\`\`html. Chỉ trả về mã HTML thuần túy để tôi có thể render trực tiếp lên trình duyệt và xuất file Word.
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Dọn dẹp thẻ code block nếu AI vẫn lỡ in ra
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    return text;
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với Gemini API.");
  }
}