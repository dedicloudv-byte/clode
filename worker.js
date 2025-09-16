// Cloudflare Worker VLESS Script dengan UUID Auto-Generate
// Support: WebSocket, TCP over WebSocket, Auto UUID

// ============= KONFIGURASI =============
const USER_ID = crypto.randomUUID(); // Auto-generate UUID
const WORKER_DOMAIN = 'cl.agen.workers.dev/'; // Ganti dengan domain worker Anda
const SUB_DOMAIN = 'sub'; // Subdomain untuk subscription
const SUB_PATH = '/sub'; // Path untuk subscription
const VLESS_PATH = '/vless'; // Path untuk VLESS connection

// Daftar ProxyIP untuk bypass (opsional)
const PROXY_IPS = [
  'cdn.xn--b6gac.eu.org',
  'cdn-all.xn--b6gac.eu.org',
  'workers.cloudflare.cyou'
];

// ============= WORKER HANDLER =============
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // Handle subscription endpoint
    if (pathname === SUB_PATH) {
      return handleSubscription(request, env);
    }

    // Handle VLESS WebSocket
    if (pathname === VLESS_PATH) {
      if (request.headers.get('upgrade') === 'websocket') {
        return handleVLESS(request);
      }
    }

    // Default response - fake website
    return new Response(generateFakeWebsite(), {
      headers: { 'content-type': 'text/html' }
    });
  }
};

// ============= VLESS HANDLER =============
async function handleVLESS(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);

  webSocket.accept();

  let addressRemote = '';
  let portRemote = 80;
  let rawClientData;

  webSocket.addEventListener('message', async (event) => {
    try {
      if (addressRemote) {
        const tcpSocket = connect({
          hostname: addressRemote,
          port: portRemote,
        });

        remoteSocketToWS(tcpSocket, webSocket, null, null);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(event.data);
        writer.releaseLock();
        return;
      }

      const { hasError, message, portRemote: port, addressRemote: addr, rawClientData: rawData } = await processVlessHeader(event.data);
      
      addressRemote = addr;
      portRemote = port;
      rawClientData = rawData;

      if (hasError) {
        throw new Error(message);
      }

      const tcpSocket = connect({
        hostname: addressRemote,
        port: portRemote,
      });

      remoteSocketToWS(tcpSocket, webSocket, rawClientData, null);
    } catch (error) {
      console.error('VLESS processing error:', error);
      webSocket.close(1000, error.message);
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// ============= VLESS PROTOCOL PROCESSING =============
async function processVlessHeader(buffer) {
  if (buffer.byteLength < 24) {
    return { hasError: true, message: "Invalid VLESS header length" };
  }

  const version = new Uint8Array(buffer.slice(0, 1));
  if (version[0] !== 0) {
    return { hasError: true, message: `Unsupported version: ${version[0]}` };
  }

  const slicedBuffer = new Uint8Array(buffer.slice(1, 17));
  const byteArray = Array.from(slicedBuffer);
  const uuidString = stringify(byteArray);
  
  if (uuidString !== USER_ID) {
    return { hasError: true, message: "Invalid UUID" };
  }

  const optLength = new Uint8Array(buffer.slice(17, 18))[0];
  const command = new Uint8Array(buffer.slice(18 + optLength, 18 + optLength + 1))[0];
  
  if (command !== 1) {
    return { hasError: true, message: `Unsupported command: ${command}` };
  }

  const portIndex = 18 + optLength + 1;
  const portBuffer = buffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);

  const addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(buffer.slice(addressIndex, addressIndex + 1));
  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = '';

  switch (addressType) {
    case 1: // IPv4
      addressLength = 4;
      addressValue = Array.from(new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + addressLength))).join('.');
      break;
    case 2: // Domain
      addressLength = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 3: // IPv6
      addressLength = 16;
      const dataView = new DataView(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(':');
      break;
    default:
      return { hasError: true, message: `Unsupported address type: ${addressType}` };
  }

  if (!addressValue) {
    return { hasError: true, message: "Invalid address" };
  }

  return {
    hasError: false,
    addressRemote: addressValue,
    portRemote,
    rawClientData: buffer.slice(addressValueIndex + addressLength),
  };
}

// ============= SOCKET HANDLER =============
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry) {
  let remoteChunkCount = 0;
  let chunks = [];
  const reader = remoteSocket.readable.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (webSocket.readyState !== 1) {
      break;
    }

    if (vlessResponseHeader && remoteChunkCount === 0) {
      webSocket.send(await new Blob([vlessResponseHeader, value]).arrayBuffer());
    } else {
      webSocket.send(value);
    }

    remoteChunkCount++;
  }
}

// ============= SUBSCRIPTION HANDLER =============
async function handleSubscription(request, env) {
  const workerDomain = WORKER_DOMAIN;
  
  const vlessConfigs = [
    // TCP config
    {
      name: `VLESS-TCP-${workerDomain}`,
      protocol: 'vless',
      address: workerDomain,
      port: 443,
      uuid: USER_ID,
      network: 'ws',
      path: VLESS_PATH,
      tls: true
    },
    // WebSocket config  
    {
      name: `VLESS-WS-${workerDomain}`,
      protocol: 'vless',
      address: workerDomain,
      port: 443,
      uuid: USER_ID,
      network: 'ws',
      path: VLESS_PATH,
      tls: true
    }
  ];

  // Generate VLESS URLs
  const vlessUrls = vlessConfigs.map(config => {
    const params = new URLSearchParams({
      encryption: 'none',
      security: 'tls',
      type: config.network,
      host: config.address,
      path: config.path,
      sni: config.address
    });
    
    return `vless://${config.uuid}@${config.address}:${config.port}?${params.toString()}#${encodeURIComponent(config.name)}`;
  });

  const subscriptionContent = vlessUrls.join('\n');
  const base64Content = btoa(subscriptionContent);

  return new Response(base64Content, {
    headers: {
      'content-type': 'text/plain;charset=utf-8',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*'
    }
  });
}

// ============= UTILITY FUNCTIONS =============
function stringify(arr) {
  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).substr(1));
  }
  
  const offset = 0;
  return (
    byteToHex[arr[offset + 0]] +
    byteToHex[arr[offset + 1]] +
    byteToHex[arr[offset + 2]] +
    byteToHex[arr[offset + 3]] +
    '-' +
    byteToHex[arr[offset + 4]] +
    byteToHex[arr[offset + 5]] +
    '-' +
    byteToHex[arr[offset + 6]] +
    byteToHex[arr[offset + 7]] +
    '-' +
    byteToHex[arr[offset + 8]] +
    byteToHex[arr[offset + 9]] +
    '-' +
    byteToHex[arr[offset + 10]] +
    byteToHex[arr[offset + 11]] +
    byteToHex[arr[offset + 12]] +
    byteToHex[arr[offset + 13]] +
    byteToHex[arr[offset + 14]] +
    byteToHex[arr[offset + 15]]
  ).toLowerCase();
}

function generateFakeWebsite() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 1rem; }
        .info { 
            margin: 1rem 0; 
            padding: 1rem;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Worker is Online</h1>
        <p>Your Cloudflare Worker is running successfully!</p>
        <div class="info">
            <p><strong>UUID:</strong> ${USER_ID}</p>
            <p><strong>Subscription:</strong> <code>${WORKER_DOMAIN}${SUB_PATH}</code></p>
            <p><strong>VLESS Path:</strong> <code>${VLESS_PATH}</code></p>
        </div>
        <p><small>Powered by Cloudflare Workers</small></p>
    </div>
</body>
</html>`;
}
