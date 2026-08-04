const https = require('https');

// DeepSeek API 配置
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_HOST = 'api.deepseek.com';
const API_PATH = '/chat/completions';
const MODEL = 'deepseek-chat';
const TEMPERATURE = 0.5;

/**
 * 构造生成菜谱的 prompt
 * @param {string[]} dishNames 菜名数组
 * @returns {string}
 */
function buildPrompt(dishNames) {
  return `请为以下每道菜生成一份完整的家庭菜谱：${dishNames.join('、')}。

要求：
1. 为每道菜生成详细菜谱，适合日常家庭烹饪
2. 每道菜必须包含以下字段：
   - name: 菜名（与输入一致）
   - category: 分类，如"荤菜""素菜""汤羹""主食""海鲜"等
   - ingredients: 食材列表（字符串数组，每项包含食材名称和用量，如"鸡腿 2个""生抽 1勺"）
   - steps: 烹饪步骤（字符串数组，按顺序描述，每一步清晰具体）
   - tips: 小贴士（字符串，提供1-2条实用烹饪技巧或注意事项）
3. 食材用量按2-3人份估算
4. 步骤控制在3-8步之间

重要：严格只返回纯 JSON 格式，不要返回 markdown 代码块、不要添加任何解释性文字，不要包裹在 \`\`\` 中。返回格式如下：
{
  "dishes": [
    {
      "name": "菜名",
      "category": "分类",
      "ingredients": ["食材1 用量", "食材2 用量"],
      "steps": ["步骤1", "步骤2"],
      "tips": "小贴士内容"
    }
  ]
}`;
}

/**
 * 调用 DeepSeek Chat API
 * @param {string} prompt
 * @returns {Promise<object>}
 */
function callDeepSeek(prompt, retryCount = 3) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一个专业的中餐家庭菜谱生成助手，擅长根据菜名生成详细、实用、适合家庭烹饪的菜谱。你必须严格只返回纯 JSON 格式。' },
        { role: 'user', content: prompt }
      ],
      temperature: TEMPERATURE,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const options = {
      hostname: API_HOST,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 20000 // 单次 20 秒超时
    };

    console.log(`[generateBlindboxDishes] 请求 DeepSeek API，prompt 长度: ${prompt.length}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`[generateBlindboxDishes] API 响应状态码: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 503 || res.statusCode === 502 || res.statusCode === 529) {
            reject({ retryable: true, statusCode: res.statusCode, message: `DeepSeek 服务繁忙 [${res.statusCode}]` });
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ retryable: false, message: `API 错误 [${res.statusCode}]: ${json.error?.message || data}` });
          }
        } catch (e) {
          reject({ retryable: false, message: `API 返回非 JSON: ${data}` });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[generateBlindboxDishes] 请求失败:`, err.message);
      reject({ retryable: true, message: `请求失败: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ retryable: true, message: '请求超时（20秒）' });
    });

    req.write(body);
    req.end();
  }).catch(err => {
    if (err.retryable && retryCount > 0) {
      const delay = Math.pow(2, 3 - retryCount) * 1000 + Math.random() * 500;
      console.log(`[generateBlindboxDishes] 请求失败，${delay}ms 后第 ${4 - retryCount} 次重试...`);
      return new Promise((resolve) => setTimeout(resolve, delay)).then(() => callDeepSeek(prompt, retryCount - 1));
    }
    throw new Error(err.message || 'DeepSeek API 调用失败');
  });
}

/**
 * 解析 AI 返回的 JSON 内容
 * @param {string} content
 * @returns {object[]}
 */
function parseDishes(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // 尝试清理 markdown 代码块
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    parsed = JSON.parse(cleaned);
  }

  if (!Array.isArray(parsed.dishes)) {
    throw new Error('AI 返回格式不正确，缺少 dishes 数组');
  }

  // 校验每道菜的字段
  const requiredFields = ['name', 'category', 'ingredients', 'steps', 'tips'];
  parsed.dishes.forEach((dish, idx) => {
    for (const field of requiredFields) {
      if (!(field in dish)) {
        throw new Error(`第 ${idx + 1} 道菜缺少字段: ${field}`);
      }
    }
    if (!Array.isArray(dish.ingredients)) {
      throw new Error(`第 ${idx + 1} 道菜 ingredients 不是数组`);
    }
    if (!Array.isArray(dish.steps)) {
      throw new Error(`第 ${idx + 1} 道菜 steps 不是数组`);
    }
  });

  return parsed.dishes;
}

// 云函数入口
exports.main = async (event, context) => {
  console.log('[generateBlindboxDishes] 云函数被调用，event:', JSON.stringify(event));

  // 检查 API Key
  if (!API_KEY) {
    console.error('[generateBlindboxDishes] 环境变量 DEEPSEEK_API_KEY 未配置');
    return {
      success: false,
      error: '服务器配置错误：API Key 未配置'
    };
  }

  // 校验参数
  const { dishNames } = event;
  if (!Array.isArray(dishNames) || dishNames.length === 0) {
    console.error('[generateBlindboxDishes] 参数错误，dishNames:', dishNames);
    return {
      success: false,
      error: '参数错误：dishNames 必须为非空数组'
    };
  }

  if (dishNames.length > 10) {
    console.error('[generateBlindboxDishes] 菜名数量过多:', dishNames.length);
    return {
      success: false,
      error: '一次最多生成 10 道菜的菜谱'
    };
  }

  // 过滤空字符串
  const validNames = dishNames.filter(n => typeof n === 'string' && n.trim() !== '');
  if (validNames.length === 0) {
    return {
      success: false,
      error: '参数错误：菜名不能为空'
    };
  }

  try {
    const prompt = buildPrompt(validNames);
    const response = await callDeepSeek(prompt);

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 响应中无内容');
    }

    console.log(`[generateBlindboxDishes] AI 原始响应:`, content.substring(0, 500) + '...');

    const dishes = parseDishes(content);
    console.log(`[generateBlindboxDishes] 成功生成 ${dishes.length} 道菜谱`);

    return {
      success: true,
      dishes
    };
  } catch (err) {
    console.error('[generateBlindboxDishes] 生成失败:', err.message);
    return {
      success: false,
      error: err.message || '菜谱生成失败，请稍后重试'
    };
  }
};
