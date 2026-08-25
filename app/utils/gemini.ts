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
        responseMimeType: "application/json", 
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT CHUYÊN GIA BIÊN TẬP VÀ CHUẨN HÓA GIÁO ÁN SƯ PHẠM.
Bối cảnh: ${contextInfo}
${GENERAL_GUIDELINES}

--- QUY TẮC TRÌNH BÀY MỤC TIÊU CHUNG (BẮT BUỘC) ---
Trong phần "Mục tiêu" chung của bài học, bạn phải bổ sung định dạng phân tách rõ ràng như sau:
- Năng lực số (Theo PPCT & TT 02/2025/TT-BGDĐT):
  + [Mã NLS]: [Nội dung tương ứng]
- Năng lực trí tuệ nhân tạo (AI) (Theo QĐ 2422/QĐ-BGDĐT):
  + [Mã AI]: [Nội dung tương ứng]
`;

  if (options.inclusive) {
    prompt += `- Giáo dục hòa nhập: [Các giải pháp hỗ trợ học sinh hòa nhập/khuyết tật của bài học] (Đặt ở dòng CUỐI CÙNG của Mục tiêu chung).\n`;
  }

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- NHIỆM VỤ CHÈN THÊM ---
1. ${INTEGRATION_RULES.nls}
2. ${INTEGRATION_RULES.ai}
3. ${INTEGRATION_RULES.inclusive}
`;

  if (options.foreignLang) prompt += `4. ${INTEGRATION_RULES.foreignLang}\n`;
  if (options.bilingual) prompt += `5. ${INTEGRATION_RULES.bilingual}\n`;

  prompt += `
--- ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON chứa các thao tác tìm và chèn vào đúng vị trí (Mục tiêu chung và các Hoạt động):
[
  {
    "target_text": "Đoạn văn bản gốc có thật làm mỏ neo (VD: tiêu đề 'Mục tiêu' hoặc 'a) Mục tiêu:')",
    "insert_text": "Nội dung cần chèn theo đúng định dạng phân tách nhóm",
    "color": "00008B"
  }
]
CHỈ TRẢ VỀ JSON THUẦN TÚY.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}