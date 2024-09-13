import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import { neynar } from 'frog/middlewares';
import fetch from 'node-fetch';

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

interface MoxieUserInfo {
  profileName: string | null;
  profileImage: string | null;
  todayEarnings: string;
  lifetimeEarnings: string;
  farScore: number | null;
}

interface ApiResponse {
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

    const data = await response.json() as ApiResponse;

    if (data.errors) {
      throw new Error('GraphQL errors in the response');
    }

    const socialInfo = data.data.socialInfo?.Social?.[0] || {};
    const todayEarnings = data.data.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const lifetimeEarnings = data.data.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const farScore = socialInfo.farcasterScore?.farScore || null;

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      todayEarnings: todayEarnings,
      lifetimeEarnings: lifetimeEarnings,
      farScore: farScore,
    };
  } catch (error) {
    console.error('Detailed error in getMoxieUserInfo:', error);
    throw error;
  }
}

app.frame('/', (c) => {
  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmNa4UgwGS1LZFCFqQ8yyPkLZ2dHomUh1WyrmEFkv3TY2s';
  
  return c.res({
    image: (
      <div
        style={{
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
        }}
      />
    ),
    intents: [
      <Button action="/check">Check stats</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ color: 'white', fontSize: '36px' }}>Error: No FID</h1>
        </div>
      ),
      intents: [<Button action="/">Back</Button>]
    });
  }

  let userInfo: MoxieUserInfo;
  try {
    userInfo = await getMoxieUserInfo(fid.toString());
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ color: 'white', fontSize: '36px' }}>Error fetching user info</h1>
        </div>
      ),
      intents: [<Button action="/">Back</Button>]
    });
  }

  const shareText = `I've earned ${Number(userInfo.todayEarnings).toFixed(2)} $MOXIE today and ${Number(userInfo.lifetimeEarnings).toFixed(2)} $MOXIE all-time 😏! Check your @moxie.eth stats. Frame by @goldie`;
  const shareUrl = `https://moxiestats.vercel.app/api/share?fid=${fid}`;
  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#f0e6fa', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {pfpUrl ? (
            <img src={pfpUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', marginRight: '20px' }} />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#a64dff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '20px' }}>
              <span style={{ color: 'white', fontSize: '60px' }}>{displayName ? displayName.charAt(0).toUpperCase() : 'U'}</span>
            </div>
          )}
          <div>
            <h1 style={{ color: '#4a0080', fontSize: '48px', margin: '0' }}>@{displayName || userInfo.profileName || 'Unknown'}</h1>
            <p style={{ color: '#666', fontSize: '24px', margin: '5px 0' }}>FID: {fid} | Farscore: {userInfo.farScore?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', flex: 1 }}>
          {[
            { title: 'Moxie earned today', value: userInfo.todayEarnings },
            { title: 'Moxie earned all-time', value: userInfo.lifetimeEarnings },
            { title: 'Moxie in progress', value: null },
            { title: 'How much Moxie you\'ve claimed', value: null }
          ].map(({ title, value }, index) => (
            <div key={index} style={{ backgroundColor: '#d9b3ff', borderRadius: '15px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
              <h2 style={{ color: '#4a0080', fontSize: '22px', margin: '0 0 10px 0' }}>{title}</h2>
              <p style={{ color: '#4a0080', fontSize: value ? '36px' : '24px', margin: '0', fontWeight: 'bold' }}>{value ? Number(value).toFixed(2) : 'N/A'}</p>
            </div>
          ))}
        </div>
        <p style={{ color: '#666', fontSize: '18px', textAlign: 'center', marginTop: '20px' }}>frame by @goldie</p>
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button action="/check">Refresh</Button>,
      <Button.Link href={farcasterShareURL}>Share</Button.Link>,
    ],
  });
});

app.frame('/share', async (c) => {
  const fid = c.req.query('fid');
  
  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ color: 'white', fontSize: '48px' }}>Error: No FID provided</h1>
        </div>
      ),
      intents: [<Button action="/check">Check Your Stats</Button>]
    });
  }

  let userInfo: MoxieUserInfo;
  try {
    userInfo = await getMoxieUserInfo(fid.toString());
  } catch (error) {
    console.error('Error fetching user info:', error);
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ color: 'white', fontSize: '48px' }}>Error fetching user info</h1>
        </div>
      ),
      intents: [<Button action="/check">Check Your Stats</Button>]
    });
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#f0e6fa', padding: '20px' }}>
        <h1 style={{ color: '#4a0080', fontSize: '48px', margin: '0 0 10px 0' }}>@{userInfo.profileName || 'Unknown'}</h1>
        <p style={{ color: '#666', fontSize: '24px', margin: '0 0 20px 0' }}>FID: {fid} | Farscore: {userInfo.farScore?.toFixed(2) || 'N/A'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px' }}>
          <div style={{ backgroundColor: '#d9b3ff', borderRadius: '15px', padding: '15px', textAlign: 'center' }}>
            <h2 style={{ color: '#4a0080', fontSize: '22px', margin: '0 0 10px 0' }}>Moxie earned today</h2>
            <p style={{ color: '#4a0080', fontSize: '36px', margin: '0', fontWeight: 'bold' }}>{Number(userInfo.todayEarnings).toFixed(2)}</p>
          </div>
          <div style={{ backgroundColor: '#d9b3ff', borderRadius: '15px', padding: '15px', textAlign: 'center' }}>
            <h2 style={{ color: '#4a0080', fontSize: '22px', margin: '0 0 10px 0' }}>Moxie earned all-time</h2>
            <p style={{ color: '#4a0080', fontSize: '36px', margin: '0', fontWeight: 'bold' }}>{Number(userInfo.lifetimeEarnings).toFixed(2)}</p>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '18px', textAlign: 'center', marginTop: '20px' }}>frame by @goldie</p>
      </div>
    ),
    intents: [<Button action="/check">Check Your Stats</Button>]
  });
});

export const GET = handle(app);
export const POST = handle(app);