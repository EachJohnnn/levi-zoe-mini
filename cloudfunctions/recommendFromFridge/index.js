const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'api.deepseek.com';
const DEEPSEEK_API_PATH = '/chat/completions';

exports.main = async (event, context) => {
  console.log('[recommendFromFridge] 云函数开始执行');
  console.log('[recommendFromFridge] 请求参数:', JSON.stringify(event, null, 2));

  try {
    // 参数校验
    const { fridgeItems } = event;
    if (!Array.isArray(fridgeItems) || fridgeItems.length === 0) {
      console.warn('[recommendFromFridge] 参数错误: fridgeItems 为空或格式不正确');
      return {
        success: false,
        error: '请提供冰箱中的食材列表，格式为 fridgeItems: [{name, amount}, ...]'
      };
    }

    // 检查 API Key
    if (!DEEPSEEK_API_KEY) {
      console.error('[recommendFromFridge] 环境变量 DEEPSEEK_API_KEY 未设置');
      return {
        success: false,
        error: '服务配置异常，请联系管理员'
      };
    }

    // 构建食材描述
    const ingredientList = fridgeItems
      .map(item => `${item.name}${item.amount ? `(${item.amount})` : ''}`)
      .join('、');
    console.log('[recommendFromFridge] 食材列表:', ingredientList);

    // 构建系统 Prompt
    const systemPrompt = `你是一位专业的家庭厨师，擅长根据现有食材推荐美味的家常菜。请严格按照以下要求输出：

1. 根据用户提供的食材，生成 1-2 道新菜推荐
2. 每道菜必须包含以下字段：
   - name: 菜名（字符串）
   - ingredients: 所需食材数组，每项为 {name, amount} 格式
   - steps: 简化版烹饪步骤数组（字符串数组，每步控制在30字以内）
   - matchScore: 匹配度（1-5的整数，5表示完全可以用现有食材制作）
   - missingIngredients: 缺少的食材数组（字符串数组，如果没有缺少则传空数组）
3. 必须优先使用用户已有的食材
4. 如果食材不够做一道完整的菜，标注 missingIngredients
5. 只返回纯 JSON，不要任何多余文字、markdown 格式或代码块

返回格式示例：
{
  "recommendations": [
    {
      "name": "番茄炒蛋",
      "ingredients": [
        {"name": "鸡蛋", "amount": "3个"},
        {"name": "番茄", "amount": "2个"}
      ],
      "steps": [
        "番茄切块，鸡蛋打散备用",
        "热锅凉油，倒入蛋液炒至凝固盛出",
        "锅中留底油，炒番茄出汁",
        "倒入鸡蛋翻炒均匀，加盐调味出锅"
      ],
      "matchScore": 5,
      "missingIngredients": []
    }
  ]
}`;

    // 构建用户 Prompt
    const userPrompt = `我冰箱里有以下食材：${ingredientList}。请推荐 1-2 道菜。`;

    // 构建请求体
    const requestBody = JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    console.log('[recommendFromFridge] 开始请求 DeepSeek API...');

    // 发送 HTTPS 请求
    const responseText = await new Promise((resolve, reject) => {
      const options = {
        hostname: DEEPSEEK_API_URL,
        path: DEEPSEEK_API_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        let data = '';
        console.log(`[recommendFromFridge] API 响应状态码: ${res.statusCode}`);

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`DeepSeek API 请求失败，HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (err) => {
        console.error('[recommendFromFridge] 请求错误:', err.message);
        reject(new Error(`网络请求失败: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时（30秒）'));
      });

      req.write(requestBody);
      req.end();
    });

    console.log('[recommendFromFridge] 收到 API 响应');

    // 解析响应
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[recommendFromFridge] 解析 API 响应 JSON 失败:', responseText);
      return {
        success: false,
        error: 'AI 服务响应格式异常'
      };
    }

    const aiContent = responseData.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error('[recommendFromFridge] AI 响应内容为空:', JSON.stringify(responseData));
      return {
        success: false,
        error: 'AI 未返回有效内容'
      };
    }

    console.log('[recommendFromFridge] AI 原始返回:', aiContent);

    // 解析 AI 返回的 JSON
    let aiResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch (parseErr) {
      console.error('[recommendFromFridge] 解析 AI 返回内容失败:', aiContent);
      return {
        success: false,
        error: 'AI 返回内容无法解析为 JSON'
      };
    }

    // 校验返回数据结构
    const recommendations = aiResult.recommendations || [];
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.warn('[recommendFromFridge] AI 未返回任何推荐菜品');
      return {
        success: false,
        error: 'AI 未生成推荐菜品'
      };
    }

    // 规范化每条推荐数据
    const normalizedRecommendations = recommendations.map((item, index) => {
      const normalized = {
        name: String(item.name || '未命名菜品'),
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
        steps: Array.isArray(item.steps) ? item.steps : [],
        matchScore: Math.min(5, Math.max(1, parseInt(item.matchScore) || 3)),
        missingIngredients: Array.isArray(item.missingIngredients) ? item.missingIngredients : []
      };
      console.log(`[recommendFromFridge] 推荐 #${index + 1}: ${normalized.name}, 匹配度: ${normalized.matchScore}`);
      return normalized;
    });

    console.log('[recommendFromFridge] 执行成功，返回', normalizedRecommendations.length, '道推荐');

    return {
      success: true,
      recommendations: normalizedRecommendations
    };

  } catch (err) {
    console.error('[recommendFromFridge] 云函数执行异常:', err.message);
    console.error('[recommendFromFridge] 错误堆栈:', err.stack);
    return {
      success: false,
      error: `服务异常: ${err.message}`
    };
  }
};
