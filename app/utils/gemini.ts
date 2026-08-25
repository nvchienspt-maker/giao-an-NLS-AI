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
        maxOutputTokens: 819200, 
        temperature: 0.0, 
        topK: 1,
        topP: 0.1
      } 
  });

  let prompt = `BẠN LÀ MỘT CÔNG CỤ TÌM VÀ THAY THẾ VĂN BẢN TRÊN NỀN HTML.
NHIỆM VỤ TỐI THƯỢNG: Trả về ĐÚNG MỘT MÃ HTML HOÀN CHỈNH TỪ ĐẦU ĐẾN CUỐI CỦA GIÁO ÁN GỐC. 
CẢNH BÁO MỨC ĐỘ CAO NHẤT: TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT, KHÔNG ĐƯỢC LƯỢC BỎ, KHÔNG ĐƯỢC CẮT XÉN BẤT KỲ MỘT ĐOẠN VĂN HAY BẢNG BIỂU NÀO TRONG "GIÁO ÁN GỐC". NẾU BẠN BỎ SÓT DỮ LIỆU, ĐÓ LÀ LỖI NGHIÊM TRỌNG.

Bối cảnh: ${contextInfo}
${GENERAL_GUIDELINES}
`;

  if (appendixContent) {
    prompt += `
[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]
Tìm tên bài học của "Giáo án gốc" trong Phụ lục này. Lấy mã năng lực tương ứng, tự diễn giải và CHÈN THÊM vào "Mục tiêu bài học".
Phụ lục:
${appendixContent}
`;
  }

  prompt += `
[GIÁO ÁN GỐC (HTML)]
${lessonContent}

--- QUY TẮC BẢO TOÀN VÀ CHÈN THÊM ---
1. SAO CHÉP Y NGUYÊN 100% nội dung, bảng biểu, danh sách của Giáo án gốc. Chỉ được chèn thêm nội dung mới vào giữa các thẻ HTML hiện có.
2. KHÔNG IN ĐẬM: Tuyệt đối không dùng thẻ <b> hay <strong> cho các nội dung tự chèn thêm.
3. QUY TẮC MÀU SẮC (Dùng thuộc tính style="color: ...;"):
   - ${INTEGRATION_RULES.nls}
`;

  // Tự động chèn quy tắc dựa trên tuỳ chọn của người dùng
  if (options.ai) {
    prompt += `   - ${INTEGRATION_RULES.ai}\n`;
  }
  if (options.inclusive) {
    prompt += `   - ${INTEGRATION_RULES.inclusive}\n`;
  }
  if (options.foreignLang) {
    prompt += `   - ${INTEGRATION_RULES.foreignLang}\n`;
  }
  if (options.bilingual) {
    prompt += `   - ${INTEGRATION_RULES.bilingual}\n`;
  }

  prompt += `\nTRẢ VỀ MÃ HTML THUẦN TÚY (KHÔNG bọc trong \`\`\`html). PHẢI HOÀN CHỈNH 100% CHIỀU DÀI CỦA GIÁO ÁN GỐC. BẮT ĐẦU!`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    return text;
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}