const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) })
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { dishes } = event
  const apiKey = process.env.DEEPSEEK_API_KEY 

  if (!dishes || dishes.length === 0) {
    return { success: false, error: '菜品列表不能为空' }
  }

  // ===== 严格提示词：带完整示例 =====
  const systemPrompt = `你是一个专业的家常菜做菜规划助手。请严格按下面的JSON格式返回，不要添加任何其他字段或文字。

必须返回的JSON格式示例：
{
  "prep": [
    {"ingredient":"排骨","quantity":"500克","action":"焯水去腥"},
    {"ingredient":"胡萝卜","quantity":"2根","action":"去皮切丝"}
  ],
  "cook": [
    {"dish":"番茄炒蛋","steps":["热锅倒油炒蛋盛出","炒番茄出汁","倒入鸡蛋翻炒均匀"]},
    {"dish":"红烧排骨","steps":["排骨煎至金黄","加调料和水炖煮30分钟","大火收汁出锅"]}
  ],
  "tips":"总体小贴士，比如火候控制、顺序建议等"
}

字段规则（必须严格遵守）：
1. "prep"：备菜步骤数组。每个元素必须有 ingredient（食材名）、quantity（数量）、action（处理动作）。
2. "cook"：做菜步骤数组。每个元素必须有 dish（菜品名称）和 steps（字符串数组，每道菜的做菜步骤）。
3. "tips"：字符串，做饭的总体建议。
4. 不要返回 dishes、prep_steps、cook_steps 等其他字段，只返回上述三个字段。`

  const userContent = dishes.map(d =>
    `菜品：${d.name}\n食材：${(d.ingredients || []).join('、')}\n步骤：${(d.steps || []).join('、')}`
  ).join('\n\n')

  const requestBody = JSON.stringify({
    model: 'deepseek-chat',      // 更稳定的模型
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为以下 ${dishes.length} 道菜生成备菜和做菜规划：\n\n${userContent}` }
    ],
    temperature: 0.1,            // 低随机性，更确定
    max_tokens: 4000
  })

  const options = {
    hostname: 'api.deepseek.com',
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(requestBody)
    }
  }

  try {
    const result = await httpsRequest(options, requestBody)
    if (result.statusCode !== 200) {
      return { success: false, error: `API错误 ${result.statusCode}: ${JSON.stringify(result.body)}` }
    }

    const content = result.body.choices?.[0]?.message?.content || ''
    // 清理 markdown 包裹
    let cleanContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/g, '')
      .trim()

    // 如果 JSON 被截断，尝试取最后一个 } 之前
    if (!cleanContent.endsWith('}')) {
      const lastBrace = cleanContent.lastIndexOf('}')
      if (lastBrace > 0) cleanContent = cleanContent.substring(0, lastBrace + 1)
    }

    let sop
    try {
      sop = JSON.parse(cleanContent)
    } catch (e) {
      return { success: false, error: `JSON解析失败: ${e.message}`, raw: cleanContent.substring(0, 300) }
    }

    // ===== 云函数端强制格式化：无论AI返回什么，都输出统一格式 =====
    const normalized = { prep: [], cook: [], tips: '' }

    // 处理 prep
    if (Array.isArray(sop.prep)) {
      normalized.prep = sop.prep.map(p => ({
        ingredient: p.ingredient || p.name || '',
        quantity: p.quantity || p.amount || '',
        action: p.action || p.desc || String(p)
      }))
    }

    // 处理 cook（核心：确保每个元素有 dish 和 steps 数组）
    if (Array.isArray(sop.cook)) {
      normalized.cook = sop.cook.map(c => ({
        dish: c.dish || c.name || c.菜名 || '未知菜品',
        steps: Array.isArray(c.steps) ? c.steps.map(s => String(s)) : []
      }))
    }

    // 如果 cook 是空的但 dishes 存在（AI返回了 dishes 格式）
    if (normalized.cook.length === 0 && sop.dishes && Array.isArray(sop.dishes)) {
      normalized.cook = sop.dishes.map(d => {
        if (typeof d === 'string') {
          return { dish: d, steps: [] }
        }
        return {
          dish: d.name || d.dish || '未知菜品',
          steps: Array.isArray(d.steps) ? d.steps.map(s => String(s)) :
                 Array.isArray(d.cook_steps) ? d.cook_steps.map(s => typeof s === 'string' ? s : (s.action || String(s))) : []
        }
      })
    }

    // 如果仍然没有 cook，但存在 cook_steps 旧格式
    if (normalized.cook.length === 0 && sop.cook_steps && Array.isArray(sop.cook_steps)) {
      const dishName = (sop.dishes && sop.dishes[0]) || (dishes[0] && dishes[0].name) || '做菜'
      const dishNameStr = typeof dishName === 'string' ? dishName : (dishName.name || '做菜')
      normalized.cook = [{
        dish: dishNameStr,
        steps: sop.cook_steps.map(s => typeof s === 'string' ? s : (s.action || String(s)))
      }]
    }

    // tips
    normalized.tips = sop.tips || sop.tip || ''

    // 最终校验
    if (normalized.cook.length === 0) {
      return { success: false, error: 'AI 未返回有效的做菜步骤', raw: cleanContent.substring(0, 200) }
    }

    return { success: true, sop: normalized }
  } catch (err) {
    return { success: false, error: err.message }
  }
}