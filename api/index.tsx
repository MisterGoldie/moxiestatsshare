  import { Button, Frog } from 'frog';
  import { handle } from 'frog/vercel';
  import fetch from 'node-fetch';
  import { neynar } from 'frog/middlewares';

  const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
  const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your actual API key

  export const app = new Frog({
    basePath: '/api',
    imageOptions: { width: 1500, height: 1500 },
    imageAspectRatio: '1:1',
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
    };
    errors?: Array<{ message: string }>;
  }

  interface MoxieUserInfo {
    profileName: string | null;
    profileImage: string | null;
    todayEarnings: string;
    lifetimeEarnings: string;
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
      const farScore = socialInfo.farcasterScore?.farScore || null;
      const username = socialInfo.profileName || null;
  
      return {
        profileName: socialInfo.profileName || null,
        profileImage: socialInfo.profileImage || null,
        todayEarnings: todayEarnings,
        lifetimeEarnings: lifetimeEarnings,
        farScore: farScore,
        username: username,
      };
    } catch (error) {
      console.error('Detailed error in getMoxieUserInfo:', error);
      throw error;
    }
  }

  app.frame('/', (c) => {
    const backgroundImageUrl = 'https://bafybeiexemztgtb3j2aj6piespw3auqz5ql4xshjkrzun3swmzvdv2snai.ipfs.w3s.link/Page%201.png';
    
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1DA1F2',
        }} />
      ),
      intents: [
        <Button action="/check">Check stats</Button>,
      ],
    });
  });

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
  
    const backgroundImageUrl = 'https://bafybeih4ucb5wtdjinquwsqu4azm5z2tseu27jqsbgxyn2psqmpglo2fva.ipfs.w3s.link/Page%202%20(4).png';
  
    const shareText = userInfo 
      ? `I've earned ${Number(userInfo.todayEarnings).toFixed(2)} $MOXIE today and ${Number(userInfo.lifetimeEarnings).toFixed(2)} $MOXIE all-time 😏! Check your @moxie.eth stats. Frame by @goldie`
      : 'Check your @moxie.eth stats on Farcaster!';
    
    const shareUrl = `https://moxiestatsv2.vercel.app//share?fid=${fid}`;
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
              <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column' }}>
                <p style={{ 
                  fontSize: '48px', 
                  color: 'black', 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  margin: '0 0 10px 0'
                }}>
                  @{userInfo?.username || displayName || 'Unknown'}
                </p>
                <p style={{ 
                  fontSize: '24px', 
                  color: 'black', 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  margin: '0'
                }}>
                  FID: {fid}
                </p>
                {userInfo && userInfo.farScore !== null && (
                  <p style={{ 
                    fontSize: '24px', 
                    color: 'black', 
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    margin: '5px 0 0 0'
                  }}>
                    Farscore: {userInfo.farScore.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            
            {errorMessage ? (
              <p style={{ fontSize: '55px', color: 'red', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Error: {errorMessage}</p>
            ) : userInfo ? (
              <div style={{ display: 'flex', width: '100%', justifyContent: 'center', position: 'absolute', top: '46%' }}>
                <p style={{ 
                  fontSize: '60px', 
                  fontWeight: 'bold', 
                  color: '#FFFFFF'
                }}>
                  {Number(userInfo.todayEarnings).toFixed(2)}
                </p>
                <p style={{ 
                  fontSize: '60px', 
                  fontWeight: 'bold', 
                  color: '#FFFFFF'
                }}>
                  {Number(userInfo.lifetimeEarnings).toFixed(2)}
                </p>
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
    
    if (!fid) {
      return c.res({
        image: (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#1DA1F2',
            color: 'white',
            fontFamily: 'Arial, sans-serif'
          }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Error: No FID provided</h1>
          </div>
        ),
        intents: [
          <Button action="/check">Check Your Stats</Button>
        ]
      });
    }

    let userInfo: MoxieUserInfo | null = null;
    try {
      userInfo = await getMoxieUserInfo(fid);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }

    const backgroundImageUrl = 'https://bafybeih4ucb5wtdjinquwsqu4azm5z2tseu27jqsbgxyn2psqmpglo2fva.ipfs.w3s.link/Page%202%20(4).png';

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
          padding: '20px', 
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <p style={{ 
              fontSize: '30px', 
              marginTop: '10px', 
              color: 'black', 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              FID: {fid}
            </p>
            {userInfo && userInfo.farScore !== null && (
              <p style={{ 
                fontSize: '30px', 
                marginTop: '5px', 
                color: 'black', 
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
          
          {userInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '50px', marginBottom: '10px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {Number(userInfo.todayEarnings).toFixed(2)} $MOXIE today
              </p>
              <p style={{ fontSize: '55px', marginBottom: '10px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {Number(userInfo.lifetimeEarnings).toFixed(2)} $MOXIE all-time
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '55px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No user data available</p>
          )}
        </div>
      ),
      intents: [
        <Button action="/check">Check Your Stats</Button>
      ]
    });
  });
  export const GET = handle(app);
  export const POST = handle(app);