const https = require('https');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_HOST = 'api.deepseek.com';
const DEEPSEEK_API_PATH = '/chat/completions';

// ===== Fallback 候选池（AI 不可用时使用）=====
const FALLBACK_POOL = [
  { name: '番茄炒蛋', tags: ['清淡', '快手菜', '素菜', '家常菜'], brief: '经典家常菜，酸甜开胃', reason: '零失败快手菜，厨房新手也能轻松驾驭' },
  { name: '鱼香肉丝', tags: ['酸甜', '普通', '猪肉', '川菜'], brief: '川菜经典，酸甜微辣', reason: '下饭神器，口感层次丰富' },
  { name: '蒜蓉西兰花', tags: ['清淡', '快手菜', '素菜', '家常菜'], brief: '清爽健康，蒜香扑鼻', reason: '低卡健康，几分钟就能出锅' },
  { name: '宫保鸡丁', tags: ['微辣', '普通', '鸡肉', '川菜'], brief: '麻辣鲜香，花生酥脆', reason: '经典川味，鸡肉嫩滑入味' },
  { name: '清蒸鲈鱼', tags: ['清淡', '普通', '海鲜', '粤菜'], brief: '原汁原味，鲜嫩可口', reason: '最大程度保留鱼肉鲜美' },
  { name: '麻婆豆腐', tags: ['中辣', '普通', '素菜', '川菜'], brief: '麻辣鲜香，豆腐嫩滑', reason: '川菜代表，配米饭一绝' },
  { name: '可乐鸡翅', tags: ['咸鲜', '普通', '鸡肉', '家常菜'], brief: '甜咸适口，骨肉酥烂', reason: '大人小孩都爱吃的人气菜' },
  { name: '青椒炒肉', tags: ['微辣', '快手菜', '猪肉', '家常菜'], brief: '家常小炒，鲜香下饭', reason: '简单快手，青椒爽脆肉片香' },
  { name: '番茄牛腩', tags: ['酸甜', '慢炖', '牛肉', '家常菜'], brief: '酸甜浓郁，牛肉酥烂', reason: '慢炖入味，汤汁拌饭超赞' },
  { name: '酸辣土豆丝', tags: ['微辣', '快手菜', '素菜', '家常菜'], brief: '酸辣爽脆，开胃下饭', reason: '国民家常菜，成本低味道好' },
  { name: '红烧肉', tags: ['咸鲜', '慢炖', '猪肉', '家常菜'], brief: '肥而不腻，入口即化', reason: '经典硬菜，宴客必备' },
  { name: '蒜蓉粉丝蒸虾', tags: ['咸鲜', '普通', '海鲜', '粤菜'], brief: '虾鲜蒜香，粉丝吸汁', reason: '蒸菜健康，颜值和味道双在线' },
  { name: '干锅花菜', tags: ['中辣', '普通', '素菜', '湘菜'], brief: '干香微辣，锅气十足', reason: '湘菜经典，花菜爽脆入味' },
  { name: '糖醋里脊', tags: ['酸甜', '普通', '猪肉', '鲁菜'], brief: '外酥里嫩，酸甜开胃', reason: '老少皆宜的经典鲁菜' },
  { name: '白切鸡', tags: ['清淡', '普通', '鸡肉', '粤菜'], brief: '皮爽肉嫩，原汁原味', reason: '粤菜经典，最能体现鸡的品质' },
  { name: '水煮牛肉', tags: ['中辣', '普通', '牛肉', '川菜'], brief: '麻辣鲜香，牛肉嫩滑', reason: '川菜硬菜，视觉和味觉双重冲击' },
  { name: '冬阴功汤', tags: ['微辣', '普通', '海鲜', '东南亚'], brief: '酸辣开胃，椰香浓郁', reason: '泰式经典，风味独特难忘' },
  { name: '虾仁滑蛋', tags: ['清淡', '快手菜', '海鲜', '粤菜'], brief: '嫩滑鲜美，营养丰富', reason: '十分钟快手菜，高蛋白低脂肪' },
  { name: '回锅肉', tags: ['微辣', '普通', '猪肉', '川菜'], brief: '肉片干香，咸鲜微辣', reason: '川菜之首，下饭之王' },
  { name: '咖喱鸡', tags: ['咸鲜', '普通', '鸡肉', '东南亚'], brief: '浓郁咖喱，椰香四溢', reason: '东南亚风味，配米饭超满足' },
  { name: '蚝油生菜', tags: ['清淡', '快手菜', '素菜', '粤菜'], brief: '脆嫩爽口，蚝香鲜美', reason: '三分钟出锅，健康又美味' },
  { name: '酸菜鱼', tags: ['微辣', '普通', '海鲜', '川菜'], brief: '酸辣开胃，鱼肉鲜嫩', reason: '汤鲜味美，一碗接一碗' },
  { name: '黑椒牛柳', tags: ['咸鲜', '快手菜', '牛肉', '家常菜'], brief: '黑椒浓香，牛柳嫩滑', reason: '中西合璧，快手又有仪式感' },
  { name: '地三鲜', tags: ['咸鲜', '普通', '素菜', '家常菜'], brief: '东北经典，咸鲜下饭', reason: '蔬菜也能做得如此有滋味' },
  { name: '香煎三文鱼', tags: ['清淡', '快手菜', '海鲜', '家常菜'], brief: '外酥里嫩，油脂香醇', reason: '高级食材简单做，营养丰富' },
];

// 根据偏好从 Fallback 池筛选
function getFallbackCandidates(preferences, existingDishes) {
  const { taste, time, meat, cuisine } = preferences || {};
  const existingSet = new Set((existingDishes || []).map(d => d.replace(/[\s\(\)（）]/g, '')));

  // 计算每道菜的匹配分
  const scored = FALLBACK_POOL.map(item => {
    let score = 0;
    if (taste && taste !== '不限' && item.tags.includes(taste)) score += 3;
    if (time && time !== '不限' && item.tags.includes(time)) score += 3;
    if (meat && meat !== '不限' && item.tags.includes(meat)) score += 3;
    if (cuisine && cuisine !== '不限' && item.tags.includes(cuisine)) score += 3;
    return { ...item, score };
  });

  // 排除已有菜品（模糊匹配）
  const filtered = scored.filter(item => {
    const normalizedName = item.name.replace(/[\s\(\)（）]/g, '');
    return !existingSet.has(normalizedName);
  });

  // 按匹配分排序，同分随机打乱
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  // 取前 3 个，不足则补充
  const result = filtered.slice(0, 3);
  if (result.length < 3) {
    const usedNames = new Set(result.map(r => r.name));
    const extras = scored.filter(s => !usedNames.has(s.name) && !filtered.find(f => f.name === s.name));
    extras.sort(() => Math.random() - 0.5);
    while (result.length < 3 && extras.length > 0) {
      result.push(extras.shift());
    }
  }

  return result.map(({ name, brief, reason }) => ({ name, brief, reason }));
}

// 构建 AI prompt
function buildPrompt(preferences, freeText, existingDishes) {
  const { taste, time, meat, cuisine } = preferences || {};

  const preferenceLines = [
    taste && `口味偏好：${taste}`,
    time && `时间限制：${time}`,
    meat && `肉类选择：${meat}`,
    cuisine && `菜系偏好：${cuisine}`,
  ].filter(Boolean);

  const existingList = Array.isArray(existingDishes) && existingDishes.length > 0
    ? existingDishes.join('、')
    : '无';

  return `你是一位精通中餐的AI厨师助手。请根据以下用户偏好，推荐3道候选菜品。

用户偏好：
${preferenceLines.length > 0 ? preferenceLines.join('\n') : '无特定偏好'}
${freeText ? `\n用户补充描述：${freeText}` : ''}

已有菜品（请避免推荐同名或高度相似的菜）：${existingList}

要求：
1. 生成3道候选菜，每道菜包含：
   - name：菜名（简洁中文）
   - brief：一句话简介，不超过20字
   - reason：一句话推荐理由
2. 尽量避开已有菜品列表中的菜名（同名或高度相似的不生成）
3. 只返回纯 JSON，不要 markdown 代码块，不要其他说明文字
4. JSON 格式如下：
{"candidates":[{"name":"菜名","brief":"简介","reason":"推荐理由"},{"name":"菜名","brief":"简介","reason":"推荐理由"},{"name":"菜名","brief":"简介","reason":"推荐理由"}]}`;
}

// 调用 DeepSeek API（带重试）
function callDeepSeek(prompt, retryCount = 3) {
  return new Promise((resolve, reject) => {
    if (!DEEPSEEK_API_KEY) {
      reject(new Error('DEEPSEEK_API_KEY 未配置'));
      return;
    }

    const requestBody = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的中餐推荐助手，只输出纯 JSON，不输出任何其他内容。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const options = {
      hostname: DEEPSEEK_API_HOST,
      path: DEEPSEEK_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
      timeout: 15000,
    };

    console.log('[generateBlindboxCandidates] 开始请求 DeepSeek API');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[generateBlindboxCandidates] API 响应状态码:', res.statusCode);

        if (res.statusCode === 503 || res.statusCode === 502 || res.statusCode === 529) {
          // 服务端过载，可重试
          reject({ retryable: true, statusCode: res.statusCode, message: `DeepSeek 服务繁忙 [${res.statusCode}]` });
          return;
        }

        if (res.statusCode !== 200) {
          reject({ retryable: false, message: `DeepSeek API 请求失败，状态码: ${res.statusCode}, 响应: ${data}` });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content;
          if (!content) {
            reject({ retryable: false, message: 'DeepSeek API 返回内容为空' });
            return;
          }
          resolve(content);
        } catch (err) {
          reject({ retryable: false, message: `解析 DeepSeek 响应失败: ${err.message}, 原始响应: ${data}` });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[generateBlindboxCandidates] 请求错误:', err.message);
      reject({ retryable: true, message: `DeepSeek API 请求错误: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ retryable: true, message: 'DeepSeek API 请求超时' });
    });

    req.write(requestBody);
    req.end();
  }).catch(err => {
    if (err.retryable && retryCount > 0) {
      const delay = Math.pow(2, 3 - retryCount) * 1000 + Math.random() * 500;
      console.log(`[generateBlindboxCandidates] 请求失败，${delay}ms 后第 ${4 - retryCount} 次重试...`);
      return new Promise((resolve) => setTimeout(resolve, delay)).then(() => callDeepSeek(prompt, retryCount - 1));
    }
    throw new Error(err.message || 'DeepSeek API 调用失败');
  });
}

// 解析 AI 返回的 JSON
function parseCandidates(content) {
  let cleanContent = content.trim();

  // 去除可能的 markdown 代码块
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  cleanContent = cleanContent.trim();

  const parsed = JSON.parse(cleanContent);

  if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
    throw new Error('AI 返回的 JSON 缺少 candidates 数组');
  }

  // 校验每个候选菜的结构
  parsed.candidates.forEach((item, index) => {
    if (!item.name || typeof item.name !== 'string') {
      throw new Error(`第 ${index + 1} 个候选菜缺少 name 字段`);
    }
    if (!item.brief || typeof item.brief !== 'string') {
      throw new Error(`第 ${index + 1} 个候选菜缺少 brief 字段`);
    }
    if (!item.reason || typeof item.reason !== 'string') {
      throw new Error(`第 ${index + 1} 个候选菜缺少 reason 字段`);
    }
  });

  return parsed.candidates;
}

// 云函数入口
exports.main = async (event, context) => {
  console.log('[generateBlindboxCandidates] 云函数被调用，event:', JSON.stringify(event));

  const { preferences, freeText, existingDishes } = event;

  // 参数校验
  if (!preferences || typeof preferences !== 'object') {
    console.error('[generateBlindboxCandidates] 参数错误: preferences 缺失或格式不正确');
    return {
      success: false,
      error: 'preferences 参数缺失或格式不正确',
    };
  }

  try {
    const prompt = buildPrompt(preferences, freeText, existingDishes);
    console.log('[generateBlindboxCandidates] 构建的 prompt 长度:', prompt.length);

    let candidates;
    let fromFallback = false;

    try {
      const aiResponse = await callDeepSeek(prompt);
      console.log('[generateBlindboxCandidates] AI 原始响应:', aiResponse.substring(0, 200) + '...');
      candidates = parseCandidates(aiResponse);
      console.log('[generateBlindboxCandidates] 解析成功，候选菜数量:', candidates.length);
    } catch (aiErr) {
      console.error('[generateBlindboxCandidates] AI 调用失败，切换到 Fallback:', aiErr.message);
      candidates = getFallbackCandidates(preferences, existingDishes);
      fromFallback = true;
      console.log('[generateBlindboxCandidates] Fallback 生成候选菜数量:', candidates.length);
    }

    return {
      success: true,
      candidates,
      fromFallback,
    };
  } catch (err) {
    console.error('[generateBlindboxCandidates] 处理异常:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
};
