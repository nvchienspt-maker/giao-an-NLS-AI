import { GoogleGenerativeAI } from '@google/generative-ai';
import { GENERAL_GUIDELINES, INTEGRATION_RULES } from './competencies';

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
        // Ép AI trả về chuẩn JSON để code JavaScript có thể đọc và xử lý
        responseMimeType: "application/json",
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH VÀ ĐỀ XUẤT VỊ TRÍ CHÈN VĂN BẢN.
Bối cảnh: ${contextInfo}
${GENERAL_GUIDELINES}
`;

  if (appendixContent) {
    prompt += `\nPhụ lục PPCT (Dùng để lấy mã và diễn giải Năng lực số vào phần Mục tiêu):\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- NHIỆM VỤ ---
Bạn không được viết lại giáo án. Bạn chỉ cần tìm các vị trí phù hợp trong "Giáo án gốc", sau đó tạo ra nội dung cần chèn theo các quy tắc dưới đây.

Quy tắc hiển thị (Mã HTML):
- ${INTEGRATION_RULES.nls}
`;

  if (options.ai) prompt += `- ${INTEGRATION_RULES.ai}\n`;
  if (options.inclusive) prompt += `- ${INTEGRATION_RULES.inclusive}\n`;
  if (options.foreignLang) prompt += `- ${INTEGRATION_RULES.foreignLang}\n`;
  if (options.bilingual) prompt += `- ${INTEGRATION_RULES.bilingual}\n`;

  prompt += `
--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON) ---
Bạn PHẢI trả về một mảng JSON (JSON array) chứa các object. Mỗi object đại diện cho một hành động chèn nội dung vào giáo án.
Cấu trúc object:
{
  "anchorText": "Một đoạn văn bản CÓ THẬT và CHÍNH XÁC trong giáo án gốc để làm mỏ neo xác định vị trí (Ví dụ: 'Mục tiêu: HS có khái niệm về AI')",
  "insertHTML": "Mã HTML chứa nội dung bạn muốn chèn NGAY BÊN DƯỚI đoạn mỏ neo đó (Ví dụ: '<br><span style=\"color: #00008B;\">Năng lực số: ...</span>')"
}

Lưu ý: "anchorText" phải ngắn gọn (khoảng 10-20 từ) nhưng phải xuất hiện chính xác 100% trong giáo án gốc để hệ thống có thể dùng hàm thay thế (replace).
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); // Chuỗi này giờ đây là một mảng JSON hợp lệ
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}