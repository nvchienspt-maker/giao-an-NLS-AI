import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateLessonPlan(
  apiKey: string, 
  modelName: string, 
  lessonContent: string, 
  options: { ai: boolean, inclusion: boolean }
) {
  if (!apiKey) throw new Error("Vui lòng thiết lập API Key.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Xây dựng Prompt động
  let prompt = `Bạn là một chuyên gia thiết kế giáo án. Hãy cấu trúc lại nội dung bài học sau:\n\n${lessonContent}\n\nYêu cầu bổ sung:\n`;
  
  if (options.ai) {
    prompt += "- Tích hợp các nội dung liên quan đến năng lực Trí tuệ nhân tạo (AI) vào các hoạt động thực hành.\n";
  }
  if (options.inclusion) {
    prompt += "- Thêm các phương pháp và giải pháp sư phạm đặc thù cho giáo dục hòa nhập để hỗ trợ học sinh khuyết tật (ví dụ: điều chỉnh tài liệu trực quan, giảm tải nhận thức, v.v.).\n";
  }

  const result = await model.generateContent(prompt);
  return result.response.text();
}