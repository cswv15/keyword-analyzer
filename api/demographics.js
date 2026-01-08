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

  const CLIENT_ID = process.env.NAVER_DATALAB_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET;

  // 최근 1년 기간 설정
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const baseBody = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: 'month',
    keywordGroups: [
      {
        groupName: keyword,
        keywords: [keyword]
      }
    ]
  };

  // 🔍 디버깅용 로그
  const debugInfo = {
    keyword,
    dateRange: `${formatDate(startDate)} ~ ${formatDate(endDate)}`,
    hasClientId: !!CLIENT_ID,
    hasClientSecret: !!CLIENT_SECRET
  };

  try {
    // 테스트: 성별 하나만 먼저 확인
    const testBody = { ...baseBody, gender: 'f' };
    const testRes = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBody)
    });

    const testData = await testRes.json();
    
    // 🔍 실제 API 응답 구조 확인
    console.log('=== Naver Datalab Test Response ===');
    console.log('Status:', testRes.status);
    console.log('Response:', JSON.stringify(testData, null, 2));

    // API 응답 그대로 반환 (디버깅용)
    return res.status(200).json({
      debug: debugInfo,
      apiStatus: testRes.status,
      apiResponse: testData,
      dataStructure: {
        hasResults: !!testData.results,
        resultsLength: testData.results?.length,
        firstResult: testData.results?.[0],
        dataLength: testData.results?.[0]?.data?.length,
        sampleData: testData.results?.[0]?.data?.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Naver Datalab API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch demographics', 
      message: error.message,
      debug: debugInfo
    });
  }
}
