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

  let prompt = `BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH VÀ ĐỊNH VỊ CẤU TRÚC GIÁO ÁN SƯ PHẠM.
Bối cảnh: ${contextInfo}

--- QUY TẮC ĐỊNH DẠNG BẮT BUỘC (CỰC KỲ QUAN TRỌNG) ---
- Mỗi mã năng lực (cả Năng lực số và Năng lực AI nếu có) PHẢI nằm trên MỘT DÒNG RIÊNG BIỆT, bắt đầu bằng dấu gạch đầu dòng (- ). 
- TUYỆT ĐỐI KHÔNG gộp nhiều mã năng lực trên cùng một dòng văn bản.
- Ví dụ định dạng đúng:
  - Năng lực số (2.2.NC1a): Chia sẻ thông tin và nội dung qua công nghệ số.
  - Năng lực số (2.5.NC1a): Thực hiện quy tắc ứng xử trên mạng.

--- NHIỆM VỤ ---
Phân tích nội dung giáo án gốc để chèn các nội dung tích hợp vào các vị trí logic:
1. "general_goal": Phần Mục tiêu chung của bài học.
2. "activity_goal": Phần "a) Mục tiêu" bên trong các Hoạt động giảng dạy cụ thể.

--- CÁC TÙY CHỌN ĐƯỢC BẬT TRÊN GIAO DIỆN ---
- Năng lực số: LUÔN LUÔN chèn (Mã màu: #00008B).
`;

  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn "Năng lực trí tuệ nhân tạo (AI)" theo QĐ 2422/QĐ-BGDĐT[cite: 2] (Mã màu: #B8860B). Mỗi mã AI nằm trên một dòng riêng biệt có gạch đầu dòng.\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Năng lực AI.\n`;
  }

  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn giải pháp "Giáo dục hòa nhập" xuống dòng CUỐI CÙNG của mục tiêu tổng bài học, và lồng ghép vào các hoạt động (Mã màu: #8B0000).\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Giáo dục hòa nhập.\n`;
  }

  if (options.foreignLang) {
    prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL): Chèn thuật ngữ Tiếng Anh chuyên ngành vào các từ khóa chính.\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG tích hợp CLIL.\n`;
  }

  if (options.bilingual) {
    prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh: Chèn bản dịch tiếng Anh vào hoạt động Khởi động.\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG tạo song ngữ.\n`;
  }

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy theo cấu trúc sau (mỗi mục năng lực dùng ký tự xuống dòng \\n cho từng dòng gạch đầu dòng):
[
  {
    "position": "general_goal",
    "content": "- Năng lực số (2.2.NC1a): Nội dung 1\\n- Năng lực số (2.5.NC1a): Nội dung 2",
    "color": "00008B"
  }
]
CHỈ TRẢ VỀ JSON, KHÔNG KÈM GÌ KHÁC.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi kết nối AI.");
  }
}