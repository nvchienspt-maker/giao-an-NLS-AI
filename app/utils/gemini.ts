import { GoogleGenerativeAI } from '@google/generative-ai';

// Định nghĩa kiểu dữ liệu cho options
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
  contextInfo: string
) {
  if (!apiKey) throw new Error("Vui lòng thiết lập API Key.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // 1. Khởi tạo Vai trò và Bối cảnh (System Prompt)
  let prompt = `Bạn là một Chuyên gia Giáo dục, Thiết kế chương trình và Giáo dục hòa nhập xuất sắc. 
Bối cảnh bài học: ${contextInfo}.

Nhiệm vụ của bạn là phân tích, biên tập và nâng cấp giáo án dưới đây dựa trên các tiêu chí cụ thể được yêu cầu. Giữ nguyên cấu trúc các hoạt động chính của giáo án gốc nhưng tích hợp khéo léo các yếu tố mới vào từng bước (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng).

--- NỘI DUNG GIÁO ÁN GỐC ---
${lessonContent}
-----------------------------

--- CÁC YÊU CẦU TÍCH HỢP BẮT BUỘC ---
`;

  // 2. Xử lý logic 4 Checkbox
  if (options.ai) {
    prompt += `
[1. TÍCH HỢP NĂNG LỰC TRÍ TUỆ NHÂN TẠO - AI]
- Trong phần mục tiêu, thêm 1 gạch đầu dòng về năng lực AI mà học sinh đạt được.
- Trong các hoạt động học tập, gợi ý giáo viên sử dụng công cụ AI nào (như ChatGPT, Gemini, Perplexity...) hoặc phương pháp nào để minh họa bài học hoặc hỗ trợ học sinh thực hành. Ghi chú rõ phần này bằng tiền tố "**[Năng lực AI]**".
`;
  }

  if (options.inclusive) {
    prompt += `
[2. GIÁO DỤC HÒA NHẬP (Dành cho học sinh khuyết tật)]
- Dưới mỗi hoạt động dạy học, HÃY THÊM MỘT MỤC riêng có tên "**[Hỗ trợ Giáo dục Hòa nhập]**".
- Tại mục này, cung cấp giải pháp sư phạm cụ thể cho 2 nhóm: 
  + Học sinh khiếm thị/khiếm thính (VD: mô tả bằng lời, phụ đề, sử dụng thẻ xúc giác).
  + Học sinh khuyết tật trí tuệ nhẹ hoặc rối loạn tập trung (VD: chia nhỏ lệnh, giảm tải nhận thức, hướng dẫn từng bước 1-1).
`;
  }

  if (options.foreignLang) {
    prompt += `
[3. PHƯƠNG PHÁP CLIL (Năng lực Ngoại ngữ)]
- Gắn kèm các thuật ngữ Tiếng Anh chuyên ngành (trong ngoặc đơn) ngay cạnh các khái niệm quan trọng bằng tiếng Việt xuyên suốt giáo án.
- Cuối giáo án, tạo một "**Bảng Thuật ngữ (Glossary)**" nhỏ gồm 5-10 từ vựng Anh-Việt xuất hiện trong bài.
`;
  }

  if (options.bilingual) {
    prompt += `
[4. HOẠT ĐỘNG SONG NGỮ VIỆT - ANH]
- Hãy chọn DUY NHẤT phần "Hoạt động Khởi động (Warm-up)" hoặc một Trò chơi học tập để thiết kế hoàn toàn dưới dạng Song ngữ (Tiếng Việt kèm bản dịch Tiếng Anh in nghiêng ngay bên dưới). 
- Các câu khẩu lệnh của Giáo viên (Teacher's script) trong phần này phải có cả Tiếng Anh để giáo viên dễ dàng sử dụng trên lớp.
`;
  }

  if (!options.ai && !options.inclusive && !options.foreignLang && !options.bilingual) {
     prompt += "- Bạn chỉ cần định dạng lại giáo án gốc cho chuẩn sư phạm, trình bày đẹp mắt và logic hơn mà không cần thêm nội dung đặc thù.\n";
  }

  // 3. Quy tắc đầu ra
  prompt += `
--- QUY TẮC TRÌNH BÀY ĐẦU RA ---
- Trả về kết quả hoàn toàn bằng Markdown định dạng đẹp.
- Không in ra các thẻ code block như \`\`\`markdown, chỉ in nội dung trực tiếp.
- Làm nổi bật (in đậm) các phần được thêm mới để giáo viên dễ nhận biết.
`;

  // 4. Gọi API
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với Gemini API.");
  }
}