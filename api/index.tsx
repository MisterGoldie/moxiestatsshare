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
          tvl?: string;
          farRank?: number;
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
  tvl: string | null;
  farRank: number | null;
}

// Define StatBox component once, to be used by both /check and /share routes
const StatBox = ({ label, value }: { label: string, value: number | string | null | undefined }) => (
  <div style={{ 
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    padding: '15px',
    borderRadius: '15px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    width: '22%',
    height: '120px',
    textAlign: 'center'
  }}>
    <p style={{ 
      fontSize: '20px', 
      margin: '0 0 5px 0', 
      opacity: 0.8,
      fontWeight: 'bold'
    }}>
      {label}
    </p>
    <p style={{ 
      fontSize: '32px', 
      fontWeight: 'bold', 
      margin: 0 
    }}>
      {typeof value === 'number' 
        ? value.toFixed(2) 
        : typeof value === 'string'
          ? value
          : 'N/A'}
    </p>
  </div>
);

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
            tvl
            farRank
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
    const tvl = socialInfo.farcasterScore?.tvl || null;
    const farRank = socialInfo.farcasterScore?.farRank || null;

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      todayEarnings,
      lifetimeEarnings,
      farBoost,
      moxieClaimed,
      farScore,
      username,
      tvl,
      farRank,
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
  const { displayName, pfpUrl } = c.var.interactor || {};

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1200px', height: '630px', backgroundColor: '#1E1E1E' }}>
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
    userInfo = await Promise.race([
      getMoxieUserInfo(fid.toString()),
    ]);
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
    errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  }

  const backgroundImage = 'https://bafybeifsk34tmrw7la4fq5oooo2knuud4wwlqkglz25d7lo4q5qpjk5mva.ipfs.w3s.link/Frame%2063.png';

  const shareText = userInfo 
    ? `I've earned ${userInfo.todayEarnings.toFixed(2)} $MOXIE today and ${userInfo.lifetimeEarnings.toFixed(2)} $MOXIE all-time! My FarBoost score is ${typeof userInfo.farBoost === 'number' ? userInfo.farBoost.toFixed(2) : 'N/A'}. Check your @moxie.eth stats. Frame by @goldie`
    : 'Check your @moxie.eth stats on Farcaster!';
  
  const shareUrl = `https://moxiestatsv2.vercel.app/api/share?fid=${fid}&todayEarnings=${userInfo?.todayEarnings}&lifetimeEarnings=${userInfo?.lifetimeEarnings}&farBoost=${userInfo?.farBoost}&moxieClaimed=${userInfo?.moxieClaimed}&username=${userInfo?.username}&farScore=${userInfo?.farScore}`;
  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

  console.log('Rendering frame');
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '1200px', 
        height: '628px', 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '30px',
        boxSizing: 'border-box',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <img 
            src={pfpUrl || 'https://placeholder.com/150'} 
            alt="Profile"
            style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              marginRight: '20px',
              border: '3px solid white'
            }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              @{userInfo?.username || displayName || 'Unknown'}
            </h1>
            <p style={{ fontSize: '24px', margin: '0', opacity: 0.8 }}>FID: {fid}</p>
            {userInfo && userInfo.farScore !== null && (
              <p style={{ fontSize: '24px', margin: '5px 0 0 0', opacity: 0.8 }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        {errorMessage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ fontSize: '28px', color: '#FF6B6B', textAlign: 'center' }}>Error: {errorMessage}</p>
            <p style={{ fontSize: '24px', textAlign: 'center' }}>Please try again later.</p>
          </div>
        ) : userInfo ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flex: 1 }}>
            <StatBox label="Moxie earned today" value={userInfo.todayEarnings} />
            <StatBox label="Moxie earned all-time" value={userInfo.lifetimeEarnings} />
            <StatBox label="FarBoost Score" value={userInfo.farBoost} />
            <StatBox label="Moxie claimed" value={userInfo.moxieClaimed} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ fontSize: '28px', textAlign: 'center' }}>Loading data...</p>
            <p style={{ fontSize: '24px', textAlign: 'center' }}>Please try again in a moment.</p>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '20px', opacity: 0.7, margin: 0 }}>
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
});

app.frame('/share', async (c) => {
  console.log('Entering /share route');
  const { fid, todayEarnings, lifetimeEarnings, farBoost, moxieClaimed, username, farScore } = c.req.query();
  console.log('Query params:', { fid, todayEarnings, lifetimeEarnings, farBoost, moxieClaimed, username, farScore });

  if (!fid || !todayEarnings || !lifetimeEarnings || !farBoost || !moxieClaimed) {
    console.log('Error: Incomplete data');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1200px', height: '630px', backgroundColor: '#1E1E1E' }}>
          <h1 style={{ fontSize: '36px', color: '#FF6B6B' }}>Error: Incomplete data</h1>
        </div>
      ),
      intents: [<Button action="/check">Check Your Stats</Button>]
    });
  }

  const backgroundImage = 'https://bafybeifsk34tmrw7la4fq5oooo2knuud4wwlqkglz25d7lo4q5qpjk5mva.ipfs.w3s.link/Frame%2063.png';

  console.log('Rendering share image');
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '1200px', 
        height: '628px', 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '30px',
        boxSizing: 'border-box',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(255, 255, 255, 0.2)', 
            marginRight: '20px',
            border: '3px solid white'
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              @{username || 'Unknown'}
            </h1>
            <p style={{ fontSize: '24px', margin: '0', opacity: 0.8 }}>FID: {fid}</p>
            {farScore && (
              <p style={{ fontSize: '24px', margin: '5px 0 0 0', opacity: 0.8 }}>
                Farscore: {Number(farScore).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flex: 1 }}>
          <StatBox label="Moxie earned today" value={Number(todayEarnings)} />
          <StatBox label="Moxie earned all-time" value={Number(lifetimeEarnings)} />
          <StatBox label="FarBoost Score" value={Number(farBoost)} />
          <StatBox label="Moxie claimed" value={Number(moxieClaimed)} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '20px', opacity: 0.7, margin: 0 }}>
            Frame by @goldie | Powered by Moxie
          </p>
        </div>
      </div>
    ),
    intents: [<Button action="/check">Check Your Stats</Button>]
  });
});

export const GET = handle(app);
export const POST = handle(app);