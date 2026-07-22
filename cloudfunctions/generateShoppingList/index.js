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

  const { dishes } = event || {}
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!dishes || dishes.length === 0) {
    return { success: false, error: '菜品列表不能为空' }
  }

  const userContent = dishes.map(d => `${d.name}: ${(d.ingredients || []).join(', ')}`).join('\n')
  console.log('=== userContent ===', userContent)

  const systemPrompt = `你是一个购物清单助手。根据菜品汇总食材和配料，返回JSON。
规则：
1. "items"=需要购买的食材(肉/蛋/蔬菜等)
2. "condiments"=家里常备的配料(盐/油/酱油/糖/葱/姜/蒜等)
3. 相同食材合并数量
4. 只返回JSON，不要任何其他文字

格式：{"items":[{"name":"...","amount":"..."}],"condiments":[{"name":"...","amount":"..."}]}`

  const requestBody = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `生成购物清单：\n${userContent}` }
    ],
    temperature: 0.3,
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
    console.log('=== API 状态码 ===', result.statusCode)
    console.log('=== API 完整返回 ===', JSON.stringify(result.body))

    if (result.statusCode !== 200) {
      return { success: false, error: `API错误 ${result.statusCode}: ${JSON.stringify(result.body)}` }
    }

    const choice = result.body.choices?.[0]
    console.log('=== choice ===', JSON.stringify(choice))

    if (!choice) {
      return { success: false, error: `AI 未返回 choices，finish_reason: ${result.body.choices?.[0]?.finish_reason || 'unknown'}` }
    }

    const content = choice.message?.content || ''
    console.log('=== AI content ===', content)

    if (!content) {
      return { success: false, error: `AI 返回空内容，finish_reason: ${choice.finish_reason || 'unknown'}` }
    }

    // 清理
    let cleanContent = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()

    // 截断修复
    if (!cleanContent.endsWith('}')) {
      const lastBrace = cleanContent.lastIndexOf('}')
      if (lastBrace > 0) cleanContent = cleanContent.substring(0, lastBrace + 1)
    }

    let data
    try {
      data = JSON.parse(cleanContent)
    } catch (parseErr) {
      console.error('JSON 解析失败，内容：', cleanContent)
      return { success: false, error: `JSON解析失败: ${parseErr.message}, 内容: ${cleanContent.substring(0, 300)}` }
    }

    return { success: true, data }
  } catch (err) {
    console.error('云函数内部错误：', err)
    return { success: false, error: err.message || '未知错误' }
  }
}