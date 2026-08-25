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
  contextInfo: string,
  appendixContent?: string
) {
  if (!apiKey) throw new Error("Vui lòng thiết lập API Key.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // Tăng giới hạn token đầu ra để tránh bị cắt ngang giáo án dài
  const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { maxOutputTokens: 8192 } 
  });

  let prompt = `Bạn là một Chuyên gia Giáo dục. Nhiệm vụ: Biên tập giáo án dưới đây. GIỮ NGUYÊN CẤU TRÚC, TIÊU ĐỀ của giáo án gốc.
Bối cảnh: ${contextInfo}.
`;

  if (appendixContent) {
    prompt += `
--- PHỤ LỤC NĂNG LỰC ---
Tìm tên bài học của "Giáo án gốc" trong Phụ lục này. Trích xuất chính xác tên các Năng lực tương ứng và bổ sung vào phần "Mục tiêu bài học" của giáo án.
${appendixContent}
------------------------
`;
  }

  prompt += `
--- GIÁO ÁN GỐC ---
${lessonContent}
-------------------

--- YÊU CẦU TÍCH HỢP ---
- QUAN TRỌNG: TUYỆT ĐỐI KHÔNG IN ĐẬM (bold) các nội dung được thêm mới.
- BẤT KỲ nội dung nào liên quan đến "Năng lực số" (sẵn có hoặc thêm vào) PHẢI được bọc trong: <span style="color: #00008B;">Nội dung NLS</span>
`;

  if (options.ai) {
    prompt += `- Thêm nội dung hướng dẫn Năng lực AI. Bọc trong: <span style="color: #B8860B;">Nội dung Năng lực AI</span>\n`;
  }

  if (options.inclusive) {
    prompt += `- Thêm giải pháp Giáo dục hòa nhập. Bọc trong: <span style="color: #8B0000;">Nội dung Giáo dục hòa nhập</span>\n`;
  }

  if (options.foreignLang) {
    prompt += `- Tích hợp thuật ngữ Tiếng Anh (CLIL) trong ngoặc đơn cạnh từ khóa tiếng Việt.\n`;
  }

  if (options.bilingual) {
    prompt += `- Chọn 1 hoạt động (VD: Khởi động) để dịch thành song ngữ Việt - Anh.\n`;
  }

  prompt += `
--- ĐẦU RA ---
Trả về kết quả bằng mã HTML thuần túy (dùng <h1>, <p>, <ul>, <table>).
KHÔNG dùng Markdown. KHÔNG bọc trong \`\`\`html.
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    return text;
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với Gemini API.");
  }
}