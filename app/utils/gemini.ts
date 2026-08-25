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
        responseMimeType: "application/json", // ÉP TRẢ VỀ JSON THUẦN
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT HỆ THỐNG ĐỊNH VỊ VÀ ĐỀ XUẤT NỘI DUNG CHÈN VÀO TÀI LIỆU.
Bối cảnh: ${contextInfo}

--- QUY TẮC ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về MỘT MẢNG JSON các hành động chèn dữ liệu. Cấu trúc mỗi object:
[
  {
    "target_text": "Copy CHÍNH XÁC một đoạn văn bản/câu ngắn (từ 5-15 từ) từ 'Giáo án gốc' nằm ngay TRƯỚC vị trí bạn muốn chèn. Ví dụ: 'Mục tiêu: HS có khái niệm về AI'",
    "insert_text": "Nội dung Năng lực bạn muốn chèn NGAY BÊN DƯỚI đoạn mốc đó. (Tuyệt đối không dùng thẻ HTML, chỉ viết text thuần).",
    "color": "Mã màu Hex (VD: 00008B cho NLS, B8860B cho AI, 8B0000 cho Hòa nhập)"
  }
]
`;

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PPCT]\nTìm tên bài học trong Phụ lục để lấy mã và diễn giải Năng lực tương ứng, sau đó đề xuất lệnh chèn vào sau các mục tiêu của giáo án.\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- NHIỆM VỤ TÍCH HỢP ---
1. Năng lực số: Chèn vào các mục tiêu. Màu bắt buộc: 00008B
`;

  if (options.ai) prompt += `2. Năng lực AI: Chèn vào mục tiêu hoặc hoạt động. Màu bắt buộc: B8860B\n`;
  if (options.inclusive) prompt += `3. Giáo dục hòa nhập: Chèn vào phần phương pháp hỗ trợ dưới các hoạt động. Màu bắt buộc: 8B0000\n`;
  if (options.foreignLang) prompt += `4. Ngoại ngữ CLIL: Chèn thuật ngữ TA. Màu bắt buộc: 006400\n`;
  if (options.bilingual) prompt += `5. Song ngữ: Chèn bản dịch tiếng Anh xuống dưới câu tiếng Việt tại phần Khởi động.\n`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}