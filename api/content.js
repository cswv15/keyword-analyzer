export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const keyword = req.query.keyword || req.body?.keyword;
  
  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  // 검색 API 키 순환 사용
  const clientIds = (process.env.SEARCH_CLIENT_IDS || 'sS6nZd_tLRq8hEjfYdYU,Zl9BbpVQKdGxICjUQ2Hj').split(',');
  const clientSecrets = (process.env.SEARCH_CLIENT_SECRETS || 'nJLlVGRPUy,ot7pI3ZeX9').split(',');
  
  const currentIndex = Math.floor(Date.now() / 60000) % clientIds.length;
  const CLIENT_ID = clientIds[currentIndex].trim();
  const CLIENT_SECRET = clientSecrets[currentIndex].trim();

  try {
    // 블로그 검색
    const blogResponse = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET
        }
      }
    );

    // 카페 검색
    const cafeResponse = await fetch(
      `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(keyword)}&display=1&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET
        }
      }
    );

    const blogData = await blogResponse.json();
    const cafeData = await cafeResponse.json();

    // 경쟁도 계산 로직 (블로그 + 카페 발행량 기준)
    const blogCount = blogData.total || 0;
    const cafeCount = cafeData.total || 0;
    const totalContent = blogCount + cafeCount;

    let competitionLevel = '낮음';
    if (totalContent > 100000) {
      competitionLevel = '높음';
    } else if (totalContent > 50000) {
      competitionLevel = '중간';
    }

    return res.status(200).json({
      keyword,
      blog: {
        total: blogCount,
        items: blogData.items || []
      },
      cafe: {
        total: cafeCount,
        items: cafeData.items || []
      },
      totalContent,
      competitionLevel,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Content API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch content data', message: error.message });
  }
}
