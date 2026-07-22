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
  console.log('=== 收到参数 ===', JSON.stringify(event))
  const { dishes } = event

  if (!dishes || dishes.length === 0) {
    return { success: false, error: '菜品列表不能为空' }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY

  const systemPrompt = `你是一个专业的家常菜做菜规划助手。请为提供的多道菜生成智能备菜 + 做菜 SOP。
规则：
1. 合并共享食材，优化顺序（先备菜，后做菜）
2. 考虑时间和逻辑（例如先打鸡蛋，再分份）
3. 严格只返回纯JSON，不要任何多余文字、解释、代码"}`

  const userContent = dishes.map(d => `《${d.name}》\n食材：${(d.ingredients || []).join('、')}\n步骤：${(d.steps || []).join('、')}`).join('\n\n')

  console.log('=== userContent ===', userContent)

  try {
    const response = await httpsRequest({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }, JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }))

    console.log('=== API 状态码 ===', response.statusCode)
    console.log('=== API 返回 ===', JSON.stringify(response.body))

    if (response.statusCode !== 200) {
      return { success: false, error: `API错误 ${response.statusCode}: ${JSON.stringify(response.body)}` }
    }

    const choice = response.body.choices?.[0]
    if (!choice) {
      return { success: false, error: 'AI 未返回内容' }
    }

    const content = choice.message?.content || ''
    console.log('=== AI content ===', content)

    if (!content) {
      return { success: false, error: `AI 返回空内容，finish_reason: ${choice.finish_reason || 'unknown'}` }
    }

    let cleanContent = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()

    // 截断修复
    if (!cleanContent.endsWith('}')) {
      const lastBrace = cleanContent.lastIndexOf('}')
      if (lastBrace > 0) cleanContent = cleanContent.substring(0, lastBrace + 1)
    }

    let sop
    try {
      sop = JSON.parse(cleanContent)
    } catch (parseErr) {
      return { success: false, error: `JSON解析失败: ${parseErr.message}, 内容: ${cleanContent.substring(0, 300)}` }
    }

    return { success: true, sop }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}
