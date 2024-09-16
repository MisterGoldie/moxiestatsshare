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
    moxieInProcess?: {
      FarcasterMoxieClaimDetails?: Array<{
        processingAmount?: string;
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
  todayEarnings: string;
  lifetimeEarnings: string;
  moxieInProcess: string;
  moxieClaimed: string;
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
      moxieInProcess: FarcasterMoxieClaimDetails(
        input: {filter: {fid: {_eq: $fid}}, blockchain: ALL}
      ) {
        FarcasterMoxieClaimDetails {
          processingAmount
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
    const todayEarnings = data.data.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const lifetimeEarnings = data.data.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const moxieInProcess = data.data.moxieInProcess?.FarcasterMoxieClaimDetails?.[0]?.processingAmount || '0';
    const moxieClaimed = data.data.moxieClaimed?.FarcasterMoxieClaimDetails?.[0]?.claimedAmount || '0';
    const farScore = socialInfo.farcasterScore?.farScore || null;
    const username = socialInfo.profileName || null;

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      todayEarnings: todayEarnings,
      lifetimeEarnings: lifetimeEarnings,
      moxieInProcess: moxieInProcess,
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
      <h1>$MOXIE stats V2 earnings tracker by @goldie. Only viewable on Warpcast</h1>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0e6fa' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'black' }}>Error: No FID</h1>
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

  const backgroundImageUrl = 'https://bafybeic3f4uenita4argk5knvzm7xnkagqjz4beawbvnilruwoilfb7q7e.ipfs.w3s.link/Frame%2059%20(7).png';

  const shareText = userInfo 
    ? `I've earned ${Number(userInfo.todayEarnings).toFixed(2)} $MOXIE today and ${Number(userInfo.lifetimeEarnings).toFixed(2)} $MOXIE all-time 😏! Check your @moxie.eth stats. Frame by @goldie`
    : 'Check your @moxie.eth stats on Farcaster!';
  
  const shareUrl = `https://moxiestatsv2.vercel.app/api/share?fid=${fid}&todayEarnings=${userInfo?.todayEarnings}&lifetimeEarnings=${userInfo?.lifetimeEarnings}&moxieInProcess=${userInfo?.moxieInProcess}&moxieClaimed=${userInfo?.moxieClaimed}&username=${userInfo?.username}&farScore=${userInfo?.farScore}&pfpUrl=${encodeURIComponent(pfpUrl || '')}`;
  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

  console.log('Rendering frame');
  try {
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
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '30px',
            display: 'flex',
            alignItems: 'center',
            width: '100%'
          }}>
            {pfpUrl ? (
              <img 
                src={pfpUrl} 
                alt="Profile" 
                style={{ 
                  width: '200px', 
                  height: '200px', 
                  borderRadius: '50%',
                  border: '3px solid black'
                }}
              />
            ) : (
              <div style={{ 
                width: '200px', 
                height: '200px', 
                borderRadius: '50%', 
                backgroundColor: '#ccc', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '3px solid black',
                fontSize: '72px',
                color: '#333'
              }}>
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div style={{ marginLeft: 'auto', marginRight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <p style={{ 
                fontSize: '72px', 
                color: 'black', 
                margin: '0 0 10px 0',
                fontWeight: 'bold'
              }}>
                @{userInfo?.username || displayName || 'Unknown'}
              </p>
              <p style={{ 
                fontSize: '24px', 
                color: 'black', 
                margin: '0',
                fontWeight: 'bold'
              }}>
                FID: {fid}
              </p>
              {userInfo && userInfo.farScore !== null && (
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
          
          {errorMessage ? (
            <p style={{ fontSize: '46px', color: 'red', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Error: {errorMessage}</p>
          ) : userInfo ? (
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
                  {Number(userInfo.todayEarnings).toFixed(2)}
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
                  {Number(userInfo.lifetimeEarnings).toFixed(2)}
                </p>
              </div>
              <div style={{ width: '45%', textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
                <p style={{ 
                  fontSize: '28px', 
                  color: '#FFFFFF',
                  marginBottom: '10px'
                }}>
                  Moxie in process
                </p>
                <p style={{ 
                  fontSize: '46px', 
                  fontWeight: 'bold', 
                  color: '#000000',
                }}>
                  {Number(userInfo.moxieInProcess).toFixed(2)}
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
                  {Number(userInfo.moxieClaimed).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '55px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No user data available</p>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0e6fa' }}>
          <h1 style={{ fontSize: '60px', marginBottom: '20px', color: 'black' }}>Render Error</h1>
          <p style={{ fontSize: '50px', textAlign: 'center', color: 'black' }}>
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

app.frame('/share', async (c) => {
  const fid = c.req.query('fid');
  const todayEarnings = c.req.query('todayEarnings');
  const lifetimeEarnings = c.req.query('lifetimeEarnings');
  const moxieInProcess = c.req.query('moxieInProcess');
  const moxieClaimed = c.req.query('moxieClaimed');
  const username = c.req.query('username');
  const farScore = c.req.query('farScore');
  const pfpUrl = decodeURIComponent(c.req.query('pfpUrl') || '');
  
  if (!fid || !todayEarnings || !lifetimeEarnings || !moxieInProcess || !moxieClaimed) {
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
    todayEarnings,
    lifetimeEarnings,
    moxieInProcess,
    moxieClaimed,
    farScore: farScore ? parseFloat(farScore) : null,
    pfpUrl
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
          {userInfo.pfpUrl ? (
            <img 
              src={userInfo.pfpUrl} 
              alt="Profile" 
              style={{ 
                width: '200px', 
                height: '200px', 
                borderRadius: '50%',
                border: '3px solid black'
              }}
            />
          ) : (
            <div style={{ 
              width: '200px', 
              height: '200px', 
              borderRadius: '50%', 
              backgroundColor: '#ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '3px solid black',
              fontSize: '72px',
              color: '#333'
            }}>
              {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
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
              {Number(userInfo.todayEarnings).toFixed(2)}
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
              {Number(userInfo.lifetimeEarnings).toFixed(2)}
            </p>
          </div>
          <div style={{ width: '45%', textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '28px', 
              color: '#FFFFFF',
              marginBottom: '10px'
            }}>
              Moxie in process
            </p>
            <p style={{ 
              fontSize: '46px', 
              fontWeight: 'bold', 
              color: '#000000',
            }}>
              {Number(userInfo.moxieInProcess).toFixed(2)}
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
              {Number(userInfo.moxieClaimed).toFixed(2)}
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
