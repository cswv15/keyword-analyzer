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

  // 데이터랩 API 키 순환 사용 (여러 개 설정 가능)
  const clientIds = (process.env.DATALAB_CLIENT_IDS || 'r5hg8grkxz,mdhj1s5lzd,dqxcmk1kqq').split(',');
  const clientSecrets = (process.env.DATALAB_CLIENT_SECRETS || 'aqv5hxJKwv,fQVKBkzESc,xhX4rHCPcA').split(',');
  
  const currentIndex = Math.floor(Date.now() / 60000) % clientIds.length;
  const CLIENT_ID = clientIds[currentIndex].trim();
  const CLIENT_SECRET = clientSecrets[currentIndex].trim();

  // 최근 1년 날짜 계산
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  const formatDate = (date) => date.toISOString().split('T')[0];

  const requestBody = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: 'month',
    keywordGroups: [
      {
        groupName: keyword,
        keywords: [keyword]
      }
    ],
    device: '',
    ages: [],
    gender: ''
  };

  try {
    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Datalab API Error:', data);
      return res.status(response.status).json({ error: 'Datalab API error', details: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Datalab Request Error:', error);
    return res.status(500).json({ error: 'Failed to fetch datalab data', message: error.message });
  }
}
