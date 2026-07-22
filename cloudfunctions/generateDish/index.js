// cloudfunctions/generateDish/index.js
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 封装 https 请求（支持 Promise）
 */
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          })
        }
      })
    })

    req.on('error', reject)
    if (postData) {
      req.write(postData)
    }
    req.end()
  })
}

exports.main = async (event, context) => {
  console.log('generateDish 开始执行，收到参数：', event)

  const { dishName } = event || {}

  // ==================== 请在这里填你的 DeepSeek API Key ====================
  const apiKey = process.env.DEEPSEEK_API_KEY   // ←←← 必须替换成你自己的
  // ======================================================================

  if (!dishName) {
    return {
      success: false,
      error: '菜名不能为空'
    }
  }

  const systemPrompt = `你是一个专业的中文家常菜菜谱助手。请严格只返回纯JSON，不要任何多余文字、解释或代码块标记。

格式必须如下：
{
  "name": "菜名",
  "category": "家常菜",
  "ingredients": ["食材1 用量", "食材2 用量"],
  "steps": ["步骤1详细描述", "步骤2详细描述"],
  "tips": "烹饪小贴士",
  "videoLinks": []
}

重要规则：
1. videoLinks 字段：如果没有真实可靠的公开B站或抖音视频链接，必须返回空数组 []，绝对不要编造任何链接（包括 never gonna give you up 之类的假链接）。
2. ingredients 和 steps 要详细实用。
3. category 尽量从以下选择：家常菜、湘菜、川菜、粤菜、主食、汤品、甜品、早餐、其他。`

  const requestBody = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `菜名：${dishName}。请生成实用、详细的家常菜菜谱。` }
    ],
    temperature: 0.7,
    max_tokens: 2000
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
    console.log('DeepSeek 状态码：', result.statusCode)
    console.log('DeepSeek 原始返回：', JSON.stringify(result.body, null, 2))

    if (result.statusCode !== 200) {
      return {
        success: false,
        error: `DeepSeek API 错误 ${result.statusCode}: ${JSON.stringify(result.body)}`
      }
    }

    const content = result.body.choices?.[0]?.message?.content || ''
    console.log('AI 返回内容：', content)

    // 清理可能的 ```json 包裹
    let cleanContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/g, '')
      .trim()

    const dishData = JSON.parse(cleanContent)

    return {
      success: true,
      dishData: dishData
    }
  } catch (err) {
    console.error('云函数内部错误：', err)
    return {
      success: false,
      error: err.message || '未知错误'
    }
  }
}