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

--- QUY TẮC ĐỊNH DẠNG BẮT BUỘC ĐỂ XUỐNG DÒNG TRONG WORD ---
Để đảm bảo các nội dung không bị dính liền vào nhau, bạn PHẢI phân tách các ý thành một MẢNG (Array). 
- Dòng tiêu đề năng lực (Ví dụ: "- Năng lực số...") là 1 phần tử của mảng.
- Dòng nội dung chi tiết (Ví dụ: "+ 2.2.NC1a: ...") là 1 phần tử tiếp theo của mảng.

--- NHIỆM VỤ ---
Phân tích nội dung giáo án gốc để chèn các nội dung vào các vị trí logic:
1. "general_goal": Phần Mục tiêu chung của bài học.
2. "activity_goal": Phần "a) Mục tiêu" bên trong các Hoạt động giảng dạy.

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN LUÔN chèn.
`;

  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn "Năng lực trí tuệ nhân tạo (AI)".\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Năng lực AI.\n`;
  }

  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn giải pháp "Giáo dục hòa nhập" xuống cuối mục tiêu tổng.\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Giáo dục hòa nhập.\n`;
  }

  if (options.foreignLang) {
    prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG tích hợp CLIL.\n`;
  }

  if (options.bilingual) {
    prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
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
Trả về mảng JSON thuần túy theo cấu trúc sau. Lưu ý thuộc tính "content" phải là một Array các chuỗi:
[
  {
    "position": "general_goal",
    "content": [
      "- Năng lực số (Theo PPCT & TT 02/2025/TT-BGDĐT):",
      "+ 5.1.NC1a: Sử dụng thiết bị mạng phù hợp...",
      "- Năng lực trí tuệ nhân tạo (AI) (Theo QĐ 2422/QĐ-BGDĐT):",
      "+ AI.1.1.CB: Nhận biết vai trò..."
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