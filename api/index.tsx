import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your actual API key

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$MOXIE Earnings Tracker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

interface AirstackApiResponse {
  data: {
    socialInfo?: {
      Social?: Array<{
        profileName?: string;
        profileImage?: string;
        farcasterScore?: {
          farScore?: number;
          farBoost?: number;
        };
      }>;
    };
    todayEarnings?: {
      FarcasterMoxieEarningStat?: Array<{
        allEarningsAmount?: string;
      }>;
    };
    lifetimeEarnings?: {
      FarcasterMoxieEarningStat?: Array<{
        allEarningsAmount?: string;
      }>;
    };
    moxieClaimed?: {
      FarcasterMoxieClaimDetails?: Array<{
        claimedAmount?: string;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface MoxieUserInfo {
  profileName: string | null;
  profileImage: string | null;
  todayEarnings: number;
  lifetimeEarnings: number;
  farBoost: number | null;
  moxieClaimed: number;
  farScore: number | null;
  username: string | null;
}

async function getMoxieUserInfo(fid: string): Promise<MoxieUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const query = `
    query MoxieEarnings($fid: String!) {
      socialInfo: Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          profileName
          profileImage
          farcasterScore {
            farScore
            farBoost
          }
        }
      }
      todayEarnings: FarcasterMoxieEarningStats(
        input: {timeframe: TODAY, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: $fid}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
        }
      }
      lifetimeEarnings: FarcasterMoxieEarningStats(
        input: {timeframe: LIFETIME, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: $fid}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
        }
      }
      moxieClaimed: FarcasterMoxieClaimDetails(
        input: {filter: {fid: {_eq: $fid}}, blockchain: ALL}
      ) {
        FarcasterMoxieClaimDetails {
          claimedAmount
        }
      }
    }
  `;

  const variables = { fid: fid };

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as AirstackApiResponse;

    if (data.errors) {
      throw new Error('GraphQL errors in the response');
    }

    const socialInfo = data.data.socialInfo?.Social?.[0] || {};
    const todayEarnings = Number(data.data.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0');
    const lifetimeEarnings = Number(data.data.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0');
    const moxieClaimed = Number(data.data.moxieClaimed?.FarcasterMoxieClaimDetails?.[0]?.claimedAmount || '0');
    const farScore = socialInfo.farcasterScore?.farScore || null;
    const farBoost = socialInfo.farcasterScore?.farBoost || null;
    const username = socialInfo.profileName || null;

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      todayEarnings: todayEarnings,
      lifetimeEarnings: lifetimeEarnings,
      farBoost: farBoost,
      moxieClaimed: moxieClaimed,
      farScore: farScore,
      username: username,
    };
  } catch (error) {
    console.error('Detailed error in getMoxieUserInfo:', error);
    throw error;
  }
}

app.frame('/', () => {
  const gifUrl = 'https://bafybeieo7vvxff3xadbfaylxdrk5rqkadf23bou2nj6aunakitxvdtp47i.ipfs.w3s.link/IMG_7916%201.gif' // GIF URL link
  const baseUrl = 'https://moxiestatsv2.vercel.app' // Replace with your actual base URL

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>$MOXIE Earnings Tracker</title>
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${gifUrl}">
      <meta property="fc:frame:button:1" content="Check stats">
      <meta property="fc:frame:button:1:action" content="post">
      <meta property="fc:frame:post_url" content="${baseUrl}/api/check">
    </head>
    <body>
      <h1>$MOXIE stats V2 Earnings tracker by @goldie. Only viewable on Warpcast. Follow Goldie on Warpcast - https://warpcast.com/goldie </h1>
    </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
})

app.frame('/check', async (c) => {
  console.log('Entering /check frame');
  const { fid } = c.frameData || {};
  const { displayName } = c.var.interactor || {};

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1000px', height: '1000px', backgroundColor: '#1E1E1E' }}>
          <h1 style={{ fontSize: '36px', color: '#FF6B6B' }}>Error: No FID</h1>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  let userInfo: MoxieUserInfo | null = null;
  let errorMessage = '';

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    userInfo = await getMoxieUserInfo(fid.toString());
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
    errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  }

  const backgroundGradient = 'linear-gradient(135deg, #4A148C, #880E4F)';

  const shareText = userInfo 
    ? `I've earned ${userInfo.todayEarnings.toFixed(2)} $MOXIE today and ${userInfo.lifetimeEarnings.toFixed(2)} $MOXIE all-time! My FarBoost score is ${typeof userInfo.farBoost === 'number' ? userInfo.farBoost.toFixed(2) : 'N/A'}. Check your @moxie.eth stats. Frame by @goldie`
    : 'Check your @moxie.eth stats on Farcaster!';
  
  const shareUrl = `https://moxiestatsv2.vercel.app/api/share?fid=${fid}&todayEarnings=${userInfo?.todayEarnings}&lifetimeEarnings=${userInfo?.lifetimeEarnings}&farBoost=${userInfo?.farBoost}&moxieClaimed=${userInfo?.moxieClaimed}&username=${userInfo?.username}&farScore=${userInfo?.farScore}`;
  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

  console.log('Rendering frame');
  try {
    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '1000px', 
          height: '1000px', 
          background: backgroundGradient,
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          padding: '40px',
          boxSizing: 'border-box',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              @{userInfo?.username || displayName || 'Unknown'}
            </h1>
            <p style={{ fontSize: '24px', margin: '0', opacity: 0.8 }}>FID: {fid}</p>
            {userInfo && userInfo.farScore !== null && (
              <p style={{ fontSize: '24px', margin: '10px 0 0 0', opacity: 0.8 }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
          
          {errorMessage ? (
            <p style={{ fontSize: '28px', color: '#FF6B6B', textAlign: 'center' }}>Error: {errorMessage}</p>
          ) : userInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', flex: 1, justifyContent: 'center' }}>
              <StatBox label="Moxie earned today" value={userInfo.todayEarnings} />
              <StatBox label="Moxie earned all-time" value={userInfo.lifetimeEarnings} />
              <StatBox label="FarBoost Score" value={userInfo.farBoost} />
              <StatBox label="Moxie claimed" value={userInfo.moxieClaimed} />
            </div>
          ) : (
            <p style={{ fontSize: '28px', textAlign: 'center' }}>No user data available</p>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: '18px', opacity: 0.7, margin: 0 }}>
              Frame by @goldie | Powered by Moxie
            </p>
          </div>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>,
        <Button.Link href={farcasterShareURL}>Share</Button.Link>,
      ]
    });
  } catch (renderError) {
    console.error('Error rendering frame:', renderError);
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1000px', height: '1000px', backgroundColor: '#1E1E1E' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: '#FF6B6B' }}>Render Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>
            {renderError instanceof Error ? renderError.message : 'An unknown error occurred during rendering'}
          </p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>
      ]
    });
  }
});

// Updated helper component for stat boxes
const StatBox = ({ label, value }: { label: string, value: number | null | undefined }) => (
  <div style={{ 
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
  }}>
    <p style={{ fontSize: '24px', margin: '0 0 10px 0', opacity: 0.8 }}>{label}</p>
    <p style={{ fontSize: '42px', fontWeight: 'bold', margin: 0 }}>
      {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
    </p>
  </div>
);

app.frame('/share', async (c) => {
  const fid = c.req.query('fid');
  const todayEarnings = c.req.query('todayEarnings');
  const lifetimeEarnings = c.req.query('lifetimeEarnings');
  const farBoost = c.req.query('farBoost');
  const moxieClaimed = c.req.query('moxieClaimed');
  const username = c.req.query('username');
  const farScore = c.req.query('farScore');
  
  if (!fid || !todayEarnings || !lifetimeEarnings || !farBoost || !moxieClaimed) {
    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#f0e6fa',
          color: 'black',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Error: Incomplete data provided</h1>
        </div>
      ),
      intents: [
        <Button action="/check">Check Your Stats</Button>
      ]
    });
  }

  const userInfo = {
    username,
    todayEarnings: Number(todayEarnings),
    lifetimeEarnings: Number(lifetimeEarnings),
    farBoost: Number(farBoost),
    moxieClaimed: Number(moxieClaimed),
    farScore: farScore ? Number(farScore) : null
  };

  const backgroundImageUrl = 'https://bafybeic3f4uenita4argk5knvzm7xnkagqjz4beawbvnilruwoilfb7q7e.ipfs.w3s.link/Frame%2059%20(7).png';

  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ marginLeft: 'auto', marginRight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ 
              fontSize: '72px', 
              color: 'black', 
              margin: '0 0 10px 0',
              fontWeight: 'bold'
            }}>
              @{userInfo.username || 'Unknown'}
            </p>
            <p style={{ 
              fontSize: '24px', 
              color: 'black', 
              margin: '0',
              fontWeight: 'bold'
            }}>
              FID: {fid}
            </p>
            {userInfo.farScore !== null && (
              <p style={{ 
                fontSize: '24px', 
                color: 'black', 
                margin: '5px 0 0 0',
                fontWeight: 'bold'
              }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          position: 'absolute', 
          top: '46%', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: '100%' 
        }}>
          <div style={{ width: '45%', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '28px', 
              color: '#FFFFFF',
              marginBottom: '10px'
            }}>
              Moxie earned today
            </p>
            <p style={{ 
              fontSize: '46px', 
              fontWeight: 'bold', 
              color: '#000000',
            }}>
              {userInfo.todayEarnings.toFixed(2)}
            </p>
          </div>
          <div style={{ width: '45%', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '28px', 
              color: '#FFFFFF',
              marginBottom: '10px'
            }}>
              Moxie earned all-time
            </p>
            <p style={{ 
              fontSize: '46px', 
              fontWeight: 'bold', 
              color: '#000000',
            }}>
              {userInfo.lifetimeEarnings.toFixed(2)}
            </p>
          </div>
          <div style={{ width: '45%', textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '28px', 
              color: '#FFFFFF',
              marginBottom: '10px'
            }}>
              FarBoost Score
            </p>
            <p style={{ 
              fontSize: '46px', 
              fontWeight: 'bold', 
              color: '#000000',
            }}>
              {typeof userInfo.farBoost === 'number' ? userInfo.farBoost.toFixed(2) : 'N/A'}
            </p>
          </div>
          <div style={{ width: '45%', textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '28px', 
              color: '#FFFFFF',
              marginBottom: '10px'
            }}>
              Moxie claimed
            </p>
            <p style={{ 
              fontSize: '46px', 
              fontWeight: 'bold', 
              color: '#000000',
            }}>
              {userInfo.moxieClaimed.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    ),
    intents: [
      <Button action="/check">Check Your Stats</Button>
    ]
  });
});

export const GET = handle(app);
export const POST = handle(app);