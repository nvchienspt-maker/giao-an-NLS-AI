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
        responseMimeType: "application/json", 
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT CHUYÊN GIA BIÊN TẬP GIÁO ÁN SƯ PHẠM.
Bối cảnh: ${contextInfo}

--- NHIỆM VỤ ---
Đọc "Giáo án gốc" và tìm các vị trí sau để chèn thêm nội dung tích hợp (dưới dạng gạch đầu dòng chuẩn sư phạm):
1. Phần "Mục tiêu bài học" (Mục tiêu chung).
2. Phần "Mục tiêu" bên trong các "Hoạt động" (Hoạt động 1, Hoạt động 2...).

--- QUY TẮC ĐỊNH DẠNG VÀ MÀU SẮC (BẮT BUỘC) ---
- Định dạng chuẩn: Phải viết dưới dạng gạch đầu dòng, ví dụ: "- Phát triển năng lực số (Mã số): Nội dung..." hoặc "- Năng lực AI: Nội dung..."
- MÀU SẮC (Dùng mã màu Hex cho thuộc tính màu trong Word):
  * Năng lực số: Mã màu #00008B (Xanh dương tối)
  * Năng lực AI: Mã màu #B8860B (Vàng tối)
  * Giáo dục hòa nhập: Mã màu #8B0000 (Đỏ tối)
`;

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PPCT]\nDùng để tra cứu tên bài và chọn mã Năng lực số (VD: 3.4.NC1a, 5.3.NC1b...) phù hợp nhất:\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- CÁC TÙY CHỌN TÍCH HỢP (CHỈ CHÈN KHI ĐƯỢC BẬT) ---
- Luôn luôn chèn Năng lực số (dựa vào Phụ lục hoặc nội dung bài) vào Mục tiêu bài học và Mục tiêu các hoạt động. (Màu: 00008B)
`;

  // Chỉ bật câu lệnh khi người dùng thực sự tích chọn trong giao diện
  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn tích hợp "Năng lực AI" vào mục tiêu hoặc hoạt động phù hợp. (Mã màu: B8860B)\n`;
  }
  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn giải pháp "Giáo dục hòa nhập" hỗ trợ học sinh khuyết tật vào các hoạt động. (Mã màu: 8B0000)\n`;
  }
  if (options.foreignLang) {
    prompt += `- [ĐÃ BẬT] Chèn thuật ngữ Tiếng Anh chuyên ngành (CLIL) vào các khái niệm chính.\n`;
  }
  if (options.bilingual) {
    prompt += `- [ĐÃ BẬT] Chèn bản dịch tiếng Anh vào hoạt động Khởi động.\n`;
  }

  prompt += `
--- ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON chứa các thao tác tìm và chèn:
[
  {
    "target_text": "Đoạn văn bản gốc có thật nằm trong Mục tiêu bài hoặc Mục tiêu hoạt động để làm mỏ neo",
    "insert_text": "- Phát triển năng lực số (Mã): Nội dung chi tiết...",
    "color": "00008B"
  }
]
CHỈ TRẢ VỀ JSON, KHÔNG KÈM GÌ KHÁC.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}