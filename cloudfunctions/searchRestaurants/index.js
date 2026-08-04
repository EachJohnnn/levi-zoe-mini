const https = require('https');

// 腾讯位置服务 API 配置
// 需要在云函数环境变量中配置 TENCENT_MAP_KEY
const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY;
const API_HOST = 'apis.map.qq.com';

// 调用腾讯位置服务搜索
function searchPlace(keyword, lat, lng) {
  return new Promise((resolve, reject) => {
    if (!TENCENT_MAP_KEY) {
      reject(new Error('TENCENT_MAP_KEY 未配置'));
      return;
    }

    const params = new URLSearchParams({
      key: TENCENT_MAP_KEY,
      keyword: keyword,
      boundary: 'region(全国,0)', // 全国范围
      page_size: 10,
      page_index: 1,
      output: 'json'
    });

    // 如果有经纬度，按距离排序
    if (lat && lng) {
      params.set('location', `${lat},${lng}`);
      params.set('order_by', ' _distance');
    }

    const options = {
      hostname: API_HOST,
      path: `/ws/place/v1/search?${params.toString()}`,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 0) {
            resolve(parsed.data || []);
          } else {
            reject(new Error(`搜索失败: ${parsed.message || parsed.status}`));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`请求失败: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 关键词输入提示（自动补全）
function searchSuggestion(keyword, lat, lng) {
  return new Promise((resolve, reject) => {
    if (!TENCENT_MAP_KEY) {
      reject(new Error('TENCENT_MAP_KEY 未配置'));
      return;
    }

    const params = new URLSearchParams({
      key: TENCENT_MAP_KEY,
      keyword: keyword,
      page_size: 10,
      output: 'json'
    });

    // 如果有经纬度，传入位置并按距离排序
    if (lat && lng) {
      params.set('location', `${lat},${lng}`);
    }

    const options = {
      hostname: API_HOST,
      path: `/ws/place/v1/suggestion?${params.toString()}`,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 0) {
            resolve(parsed.data || []);
          } else {
            reject(new Error(`搜索失败: ${parsed.message || parsed.status}`));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`请求失败: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

exports.main = async (event, context) => {
  const { keyword, lat, lng, type } = event;

  // type: 'search' 表示地点搜索, 'suggestion' 表示关键词提示
  const searchType = type || 'suggestion';

  try {
    if (!keyword || keyword.trim() === '') {
      return {
        success: true,
        data: []
      };
    }

    let results;
    if (searchType === 'search') {
      results = await searchPlace(keyword.trim(), lat, lng);
    } else {
      results = await searchSuggestion(keyword.trim(), lat, lng);
    }

    return {
      success: true,
      data: results
    };
  } catch (err) {
    console.error('[searchRestaurants] 错误:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
};
