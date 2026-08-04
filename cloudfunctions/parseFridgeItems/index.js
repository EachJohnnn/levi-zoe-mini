const https = require('https');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * 主入口函数
 * @param {Object} event - 云函数传入参数
 * @param {Object} context - 云函数运行上下文
 */
exports.main = async (event, context) => {
  console.log('[parseFridgeItems] 云函数被调用');
  console.log('[parseFridgeItems] 请求参数:', JSON.stringify(event));

  try {
    // 1. 参数校验
    const { text } = event;
    if (!text || typeof text !== 'string') {
      console.error('[parseFridgeItems] 参数错误: text 不能为空');
      return {
        success: false,
        error: '参数错误: text 不能为空，且必须为字符串'
      };
    }

    // 2. 检查 API Key
    if (!DEEPSEEK_API_KEY) {
      console.error('[parseFridgeItems] 环境变量 DEEPSEEK_API_KEY 未设置');
      return {
        success: false,
        error: '服务器配置错误: DEEPSEEK_API_KEY 未设置'
      };
    }

    // 3. 构建 Prompt
    const systemPrompt = `你是一个食材解析助手。请从用户的自由文本中提取食材信息，并以严格的 JSON 格式返回。

要求：
1. 只返回 JSON，不要任何其他文字说明
2. JSON 格式: {"items": [{"name": "食材名", "amount": "数量/单位"}]}
3. 如果用户没有写数量或单位，amount 留空字符串 ""
4. 食材名称要标准化（如"蕃茄"->"番茄"）
5. 不要猜测用户没有提到的食材`;

    const userPrompt = `请解析以下食材列表：\n\n${text.trim()}`;

    console.log('[parseFridgeItems] 准备调用 DeepSeek API，用户输入:', text);

    // 4. 调用 DeepSeek API
    const apiResponse = await callDeepSeekAPI(systemPrompt, userPrompt);

    // 5. 解析 API 返回的 JSON
    const parsedItems = parseAIResponse(apiResponse);

    console.log('[parseFridgeItems] 解析成功，结果:', JSON.stringify(parsedItems));

    return {
      success: true,
      items: parsedItems
    };

  } catch (err) {
    console.error('[parseFridgeItems] 云函数执行异常:', err);
    return {
      success: false,
      error: err.message || '未知错误'
    };
  }
};

/**
 * 调用 DeepSeek Chat Completion API
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userPrompt - 用户提示词
 * @returns {Promise<string>} - AI 返回的文本内容
 */
function callDeepSeekAPI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // 低温度，确保输出稳定
      max_tokens: 2048,
      response_format: { type: 'json_object' } // 强制 JSON 输出
    });

    const options = {
      hostname: DEEPSEEK_API_URL,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 秒超时
    };

    console.log('[parseFridgeItems] 发送 HTTPS 请求到 DeepSeek API...');

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`[parseFridgeItems] API 响应状态码: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonResponse = JSON.parse(data);
            const content = jsonResponse.choices?.[0]?.message?.content;
            if (content) {
              console.log('[parseFridgeItems] API 返回内容:', content);
              resolve(content);
            } else {
              reject(new Error('API 返回数据格式异常，未找到 content 字段'));
            }
          } catch (parseErr) {
            reject(new Error(`解析 API 响应 JSON 失败: ${parseErr.message}`));
          }
        } else {
          let errorMsg = `API 请求失败，状态码: ${res.statusCode}`;
          try {
            const errorBody = JSON.parse(data);
            errorMsg += `, 错误信息: ${errorBody.error?.message || data}`;
          } catch {
            errorMsg += `, 响应体: ${data}`;
          }
          reject(new Error(errorMsg));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[parseFridgeItems] HTTPS 请求错误:', err);
      reject(new Error(`网络请求失败: ${err.message}`));
    });

    req.on('timeout', () => {
      console.error('[parseFridgeItems] HTTPS 请求超时');
      req.destroy();
      reject(new Error('请求 DeepSeek API 超时（30秒）'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * 解析 AI 返回的 JSON 字符串
 * @param {string} aiResponse - AI 返回的文本
 * @returns {Array} - 食材列表
 */
function parseAIResponse(aiResponse) {
  try {
    // 清理可能存在的 markdown 代码块标记
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    // 校验返回结构
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('AI 返回的 JSON 中缺少 items 数组');
    }

    // 校验并清洗每一项
    const validatedItems = parsed.items.map((item, index) => {
      if (!item.name || typeof item.name !== 'string') {
        throw new Error(`第 ${index + 1} 项缺少有效的 name 字段`);
      }
      return {
        name: item.name.trim(),
        amount: (item.amount || '').toString().trim()
      };
    }).filter(item => item.name); // 过滤掉空名称

    return validatedItems;

  } catch (err) {
    console.error('[parseFridgeItems] 解析 AI 响应失败:', err);
    console.error('[parseFridgeItems] 原始 AI 响应:', aiResponse);
    throw new Error(`AI 响应解析失败: ${err.message}`);
  }
}
