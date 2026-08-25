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
        responseMimeType: "application/json", // BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT HỆ THỐNG TÌM KIẾM VÀ ĐỀ XUẤT VỊ TRÍ CHÈN VĂN BẢN TRÊN NỀN HTML.
Bối cảnh: ${contextInfo}
${GENERAL_GUIDELINES}
`;

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PPCT]\nTìm tên bài học của "Giáo án gốc" trong Phụ lục này để lấy đúng mã năng lực và diễn giải chèn vào "Mục tiêu bài học".\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC (Mã HTML)]
${lessonContent}

--- NHIỆM VỤ ---
Bạn KHÔNG được viết lại giáo án. Nhiệm vụ của bạn là tìm các vị trí phù hợp trong mã HTML trên để chèn thêm nội dung mới.
Quy tắc chèn và màu sắc (TUYỆT ĐỐI KHÔNG DÙNG THẺ IN ĐẬM CHO CÁC NỘI DUNG NÀY):
- ${INTEGRATION_RULES.nls}
`;

  if (options.ai) prompt += `- ${INTEGRATION_RULES.ai}\n`;
  if (options.inclusive) prompt += `- ${INTEGRATION_RULES.inclusive}\n`;
  if (options.foreignLang) prompt += `- ${INTEGRATION_RULES.foreignLang}\n`;
  if (options.bilingual) prompt += `- ${INTEGRATION_RULES.bilingual}\n`;

  prompt += `
--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Bạn PHẢI trả về một mảng JSON chứa các object mô tả thao tác chèn:
[
  {
    "anchorText": "Copy Y HỆT một đoạn văn bản/mã HTML từ Giáo án gốc (dài khoảng 10-20 từ, bao gồm cả thẻ <strong>, <td>... nếu có) nằm ngay TRƯỚC vị trí bạn muốn chèn. Phải copy đúng 100% từng khoảng trắng để hệ thống có thể tìm thấy.",
    "insertHTML": "Mã HTML chứa nội dung bạn chèn thêm (Ví dụ: '<br><span style=\"color: #00008B;\">...</span>')"
  }
]
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}