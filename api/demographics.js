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

  // ✅ 쉼표로 구분된 값 파싱
  const CLIENT_IDS = (process.env.DATALAB_CLIENT_IDS || '').split(',');
  const CLIENT_SECRETS = (process.env.DATALAB_CLIENT_SECRETS || '').split(',');

  const CLIENT_ID = CLIENT_IDS[0]?.trim();
  const CLIENT_SECRET = CLIENT_SECRETS[0]?.trim();

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'No Datalab API credentials configured'
    });
  }

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

  try {
    // 성별 데이터 수집
    const genderRequests = ['f', 'm'].map(async (gender) => {
      const genderBody = { ...baseBody, gender };
      const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(genderBody)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Gender API error:', errorData);
        throw new Error(`Datalab API error: ${JSON.stringify(errorData)}`);
      }
      
      return res.json();
    });

    const [femaleData, maleData] = await Promise.all(genderRequests);

    // 연령별 데이터 수집
    const ageGroups = [
      { label: '10대', codes: ['1','2'] },
      { label: '20대', codes: ['3','4'] },
      { label: '30대', codes: ['5','6'] },
      { label: '40대', codes: ['7','8'] },
      { label: '50대', codes: ['9','10'] },
      { label: '60대 이상', codes: ['11'] }
    ];

    const ageRequests = ageGroups.map(async (group) => {
      const ageBody = { ...baseBody, ages: group.codes };
      const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ageBody)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Age API error:', errorData);
        throw new Error(`Datalab API error: ${JSON.stringify(errorData)}`);
      }
      
      const data = await res.json();
      return { label: group.label, data };
    });

    const ageResults = await Promise.all(ageRequests);

    // 최근 30개 데이터 포인트 합산
    const sumLast30 = (apiResponse) => {
      const arr = apiResponse?.results?.[0]?.data || [];
      const last30 = arr.slice(-30);
      return last30.reduce((sum, item) => sum + (item.ratio || 0), 0);
    };

    // 성별 비율 계산
    const femaleSum = sumLast30(femaleData);
    const maleSum = sumLast30(maleData);
    const genderTotal = femaleSum + maleSum || 1;

    // 연령별 비율 계산
    const ageSums = ageResults.map(group => ({
      label: group.label,
      sum: sumLast30(group.data)
    }));
    const ageTotal = ageSums.reduce((sum, item) => sum + item.sum, 0) || 1;

    const result = {
      gender: {
        female: Math.round((femaleSum / genderTotal) * 100),
        male: Math.round((maleSum / genderTotal) * 100)
      },
      age: ageSums.map(item => ({
        age: item.label,
        ratio: Math.round((item.sum / ageTotal) * 100)
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
