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

  // 최근 1개월 기간 설정
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const requestBody = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: 'date',
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
    // 성별 데이터 수집
    const genderRequests = ['m', 'f'].map(async (gender) => {
      const genderBody = { ...requestBody, gender };
      const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(genderBody)
      });
      return res.json();
    });

    const [maleData, femaleData] = await Promise.all(genderRequests);

    // 연령별 데이터 수집
    const ageGroups = ['1', '2', '3', '4', '5', '6'];
    const ageRequests = ageGroups.map(async (age) => {
      const ageBody = { ...requestBody, ages: [age] };
      const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ageBody)
      });
      return res.json();
    });

    const ageData = await Promise.all(ageRequests);

    // 데이터 집계
    const getMeanRatio = (data) => {
      if (!data.results || !data.results[0] || !data.results[0].data) return 0;
      const values = data.results[0].data.map(d => d.ratio);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const maleRatio = getMeanRatio(maleData);
    const femaleRatio = getMeanRatio(femaleData);
    const total = maleRatio + femaleRatio;

    const ageRatios = ageGroups.map((age, index) => getMeanRatio(ageData[index]));
    const ageTotal = ageRatios.reduce((a, b) => a + b, 0);

    const result = {
      gender: {
        male: total > 0 ? Math.round((maleRatio / total) * 100) : 50,
        female: total > 0 ? Math.round((femaleRatio / total) * 100) : 50
      },
      age: ageGroups.map((age, index) => ({
        age: ['10대', '20대', '30대', '40대', '50대', '60대 이상'][index],
        ratio: ageTotal > 0 ? Math.round((ageRatios[index] / ageTotal) * 100) : 0
      }))
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Naver Datalab API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch demographics', 
      message: error.message 
    });
  }
}
