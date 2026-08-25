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
  const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { 
        maxOutputTokens: 8192,
        temperature: 0.2 // Hạ độ sáng tạo xuống thấp nhất để AI không tự ý viết lại hay tóm tắt văn bản gốc
      } 
  });

  let prompt = `Bạn là một hệ thống xử lý tài liệu giáo dục chính xác tuyệt đối. 
Nhiệm vụ của bạn là: SAO CHÉP Y NGUYÊN 100% nội dung và cấu trúc (HTML) của "Giáo án gốc", CHỈ THỰC HIỆN CHÈN THÊM các nội dung mới theo yêu cầu vào các vị trí phù hợp. 
TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, cắt xén, lược bỏ, viết lại câu hay thay đổi bất kỳ từ ngữ, bảng biểu nào của giáo án gốc.

Bối cảnh: ${contextInfo}.
`;

  if (appendixContent) {
    prompt += `
--- PHỤ LỤC NĂNG LỰC ---
Tìm tên bài học của "Giáo án gốc" trong Phụ lục này. Trích xuất chính xác tên các Năng lực tương ứng và CHÈN THÊM vào phần "Mục tiêu bài học" của giáo án.
${appendixContent}
------------------------
`;
  }

  prompt += `
--- GIÁO ÁN GỐC (Định dạng HTML) ---
${lessonContent}
-------------------

--- YÊU CẦU TÍCH HỢP CHÈN THÊM ---
- QUAN TRỌNG: TUYỆT ĐỐI KHÔNG IN ĐẬM (bold) các nội dung được chèn thêm.
- BẤT KỲ nội dung "Năng lực số" nào được chèn thêm PHẢI bọc trong thẻ: <span style="color: #00008B;">Nội dung NLS</span>
`;

  if (options.ai) {
    prompt += `- CHÈN THÊM nội dung hướng dẫn Năng lực AI. Bọc trong: <span style="color: #B8860B;">Nội dung Năng lực AI</span>\n`;
  }

  if (options.inclusive) {
    prompt += `- CHÈN THÊM giải pháp Giáo dục hòa nhập. Bọc trong: <span style="color: #8B0000;">Nội dung Giáo dục hòa nhập</span>\n`;
  }

  if (options.foreignLang) {
    prompt += `- CHÈN THÊM thuật ngữ Tiếng Anh (CLIL) trong ngoặc đơn cạnh từ khóa tiếng Việt tương ứng.\n`;
  }

  if (options.bilingual) {
    prompt += `- CHÈN THÊM phần dịch tiếng Anh ngay bên dưới các câu tiếng Việt tại 1 hoạt động (VD: Khởi động).\n`;
  }

  prompt += `
--- ĐẦU RA ---
Trả về kết quả bằng mã HTML chứa toàn bộ giáo án gốc cùng cấu trúc bảng biểu nguyên vẹn và các đoạn được chèn thêm.
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