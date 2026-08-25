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

--- QUY TẮC ĐỊNH DẠNG VÀ PHÂN LUỒNG VỊ TRÍ ---
Bạn phải chia nhỏ các nội dung chèn vào 3 vị trí (position) sau đây:
1. "nang_luc_chung": Chỉ dành cho Năng lực số và Năng lực AI.
2. "cuoi_muc_tieu": Chỉ dành cho Giáo dục hòa nhập ở phần Mục tiêu tổng.
3. "hoat_dong": Dành cho các tích hợp vào từng hoạt động cụ thể.

Lưu ý định dạng: "content" phải là một Mảng (Array) các dòng. Cứ mỗi mã năng lực hoặc mỗi ý phải nằm trên 1 phần tử của mảng, bắt đầu bằng dấu "-" hoặc "+".

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN LUÔN chèn vào "nang_luc_chung" và "hoat_dong" (Mã màu: 00008B).
`;

  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn "Năng lực AI" (QĐ 2422/QĐ-BGDĐT) vào "nang_luc_chung" và "hoat_dong" (Mã màu: B8860B).\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Năng lực AI.\n`;
  }

  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và lồng ghép vào "hoat_dong" (Mã màu: 8B0000).\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Giáo dục hòa nhập.\n`;
  }

  if (options.foreignLang) prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  if (options.bilingual) prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
  if (appendixContent) prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy theo cấu trúc mẫu sau:
[
  {
    "position": "nang_luc_chung",
    "content": [
      "- Năng lực số (Theo PPCT & TT 02/2025/TT-BGDĐT):",
      "+ 5.1.NC1a: Thực hiện được việc chia sẻ...",
      "- Năng lực trí tuệ nhân tạo (AI):",
      "+ AI.1.3.CB: Hiểu được tầm quan trọng..."
    ],
    "color": "00008B"
  },
  {
    "position": "cuoi_muc_tieu",
    "content": [
      "- Giải pháp giáo dục hòa nhập:",
      "+ Hỗ trợ học sinh có khó khăn..."
    ],
    "color": "8B0000"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "Hoạt động 1",
    "content": [
      "- Phát triển năng lực số (...): ..."
    ],
    "color": "00008B"
  }
]
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi kết nối AI.");
  }
}