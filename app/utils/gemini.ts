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
1. "nang_luc_chung": Chỉ dành cho Năng lực số và Năng lực AI ở Mục tiêu chung.
2. "cuoi_muc_tieu": Chỉ dành cho Giáo dục hòa nhập ở phần Mục tiêu tổng.
3. "hoat_dong": Dành cho các tích hợp vào MỤC TIÊU CỦA TỪNG HOẠT ĐỘNG cụ thể. BẠN BẮT BUỘC PHẢI QUÉT TOÀN BỘ GIÁO ÁN VÀ TẠO ĐỦ OBJECT CHO TẤT CẢ CÁC HOẠT ĐỘNG (Ví dụ: Hoạt động 1, Hoạt động 2, Hoạt động 3...). Không được bỏ sót bất kỳ hoạt động nào.

Lưu ý: "content" phải là một Mảng (Array) các dòng. Mỗi dòng bắt đầu bằng "-" hoặc "+".

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN LUÔN chèn vào "nang_luc_chung" và tất cả các "hoat_dong" (Màu: 00008B).
`;

  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn "Năng lực AI" vào "nang_luc_chung" và tất cả các "hoat_dong" (Màu: B8860B).\n`;
  } else {
    prompt += `- [ĐÃ TẮT] KHÔNG chèn Năng lực AI.\n`;
  }

  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và lồng ghép vào "hoat_dong".\n`;
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
Trả về mảng JSON thuần túy theo cấu trúc mẫu sau (Lưu ý phải có đủ object cho TẤT CẢ hoạt động):
[
  {
    "position": "nang_luc_chung",
    "content": [
      "- Năng lực số (Theo PPCT):",
      "+ 5.1.NC1a: ..."
    ],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "Hoạt động 1",
    "content": [
      "- Phát triển năng lực số (...): ..."
    ],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "Hoạt động 2",
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