export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const CLIENT_IDS = (process.env.DATALAB_CLIENT_IDS || '').split(',');
  const CLIENT_SECRETS = (process.env.DATALAB_CLIENT_SECRETS || '').split(',');

  const CLIENT_ID = CLIENT_IDS[0]?.trim();
  const CLIENT_SECRET = CLIENT_SECRETS[0]?.trim();

  return res.status(200).json({
    raw: {
      ids: process.env.DATALAB_CLIENT_IDS?.substring(0, 50) + '...',
      secrets: process.env.DATALAB_CLIENT_SECRETS?.substring(0, 50) + '...'
    },
    parsed: {
      idsArray: CLIENT_IDS.map(id => id.substring(0, 10) + '...'),
      secretsArray: CLIENT_SECRETS.map(s => s.substring(0, 10) + '...'),
      firstId: CLIENT_ID?.substring(0, 20) + '...',
      firstSecret: CLIENT_SECRET?.substring(0, 20) + '...',
      idLength: CLIENT_ID?.length,
      secretLength: CLIENT_SECRET?.length
    }
  });
}
