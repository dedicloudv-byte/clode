// Cloudflare Worker VLESS Script - Fixed Version
// Support: WebSocket, TCP over WebSocket, Auto UUID

// ============= KONFIGURASI =============
// GANTI DOMAIN INI DENGAN DOMAIN WORKER ANDA
const WORKER_DOMAIN = 'cl.agen.workers.dev';

// UUID statis (atau bisa diganti manual)
const USER_ID = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

const SUB_PATH = '/sub';
const VLESS_PATH = '/vless';

// ProxyIP untuk bypass (opsional)
const PROXY_IPS = [
  'cdn.xn--b6gac.eu.org',
  'cdn-all.xn--b6gac.eu.org',
  'workers.cloudflare.cyou'
];

// ============= WORKER HANDLER =============
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Handle subscription endpoint
    if (pathname === SUB_PATH) {
      return handleSubscription(request);
    }

    // Handle VLESS WebSocket
    if (pathname === VLESS_PATH) {
      if (request.headers.get('upgrade') === 'websocket') {
        return handleVLESS(request);
      }
      return new Response('WebSocket connection required', { status: 400 });
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

  webSocket.addEventListener('message', async (event) => {
    try {
      const data = new Uint8Array(event.data);
      
      if (addressRemote) {
        // Forward data to remote
        const tcpSocket = connect({
          hostname: addressRemote,
          port: portRemote,
        });
        
        remoteSocketToWS(tcpSocket, webSocket);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        return;
      }

      // Process VLESS header
      const { hasError, message, addressRemote: addr, portRemote: port, rawClientData } = 
        await processVlessHeader(data.buffer);
      
      if (hasError) {
        webSocket.close(1002, message);
        return;
      }

      addressRemote = addr;
      portRemote = port;

      // Connect to remote
      const tcpSocket = connect({
        hostname: addressRemote,
        port: portRemote,
      });

      // Create VLESS response
      const vlessResponse = new Uint8Array([0, 0]);
      
      remoteSocketToWS(tcpSocket, webSocket, vlessResponse, rawClientData);
      
    } catch (error) {
      console.error('VLESS error:', error);
      webSocket.close(1002, error.message);
    }
  });

  webSocket.addEventListener('close', () => {
    console.log('WebSocket closed');
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// ============= VLESS PROTOCOL PROCESSING =============
async function processVlessHeader(buffer) {
  if (buffer.byteLength < 24) {
    return { hasError: true, message: "Invalid header length" };
  }

  const dataView = new DataView(buffer);
  
  // Check version
  const version = dataView.getUint8(0);
  if (version !== 0) {
    return { hasError: true, message: `Unsupported version: ${version}` };
  }

  // Extract UUID
  const uuidBytes = new Uint8Array(buffer.slice(1, 17));
  const uuid = stringify(uuidBytes);
  
  if (uuid !== USER_ID) {
    return { hasError: true, message: "Invalid UUID" };
  }

  // Extract options length
  const optLength = dataView.getUint8(17);
  
  // Extract command
  const cmdIndex = 18 + optLength;
  const command = dataView.getUint8(cmdIndex);
  
  if (command !== 1) {
    return { hasError: true, message: `Unsupported command: ${command}` };
  }

  // Extract port
  const portIndex = cmdIndex + 1;
  const portRemote = dataView.getUint16(portIndex);

  // Extract address
  const addressIndex = portIndex + 2;
  const addressType = dataView.getUint8(addressIndex);
  
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = '';

  switch (addressType) {
    case 1: // IPv4
      addressLength = 4;
      const ipv4 = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + 4));
      addressValue = Array.from(ipv4).join('.');
      break;
      
    case 2: // Domain
      addressLength = dataView.getUint8(addressValueIndex);
      addressValueIndex += 1;
      const domainBytes = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
      addressValue = new TextDecoder().decode(domainBytes);
      break;
      
    case 3: // IPv6
      addressLength = 16;
      const ipv6Bytes = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + 16));
      const ipv6Parts = [];
      for (let i = 0; i < 16; i += 2) {
        ipv6Parts.push(((ipv6Bytes[i] << 8) | ipv6Bytes[i + 1]).toString(16));
      }
      addressValue = ipv6Parts.join(':');
      break;
      
    default:
      return { hasError: true, message: `Unsupported address type: ${addressType}` };
  }

  if (!addressValue) {
    return { hasError: true, message: "Invalid address" };
  }

  // Raw client data (payload)
  const rawDataIndex = addressValueIndex + addressLength;
  const rawClientData = buffer.slice(rawDataIndex);

  return {
    hasError: false,
    addressRemote: addressValue,
    portRemote,
    rawClientData: rawClientData.byteLength > 0 ? new Uint8Array(rawClientData) : null,
  };
}

// ============= SOCKET HANDLER =============
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponse, rawClientData) {
  try {
    let hasResponded = false;
    const reader = remoteSocket.readable.getReader();
    
    // Send initial data if exists
    if (rawClientData && rawClientData.length > 0) {
      const writer = remoteSocket.writable.getWriter();
      await writer.write(rawClientData);
      writer.releaseLock();
    }
    
    // Read from remote and send to WebSocket
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (webSocket.readyState !== 1) break;

      if (!hasResponded && vlessResponse) {
        // Send VLESS response header + first chunk
        const combined = new Uint8Array(vlessResponse.length + value.length);
        combined.set(vlessResponse, 0);
        combined.set(value, vlessResponse.length);
        webSocket.send(combined);
        hasResponded = true;
      } else {
        webSocket.send(value);
      }
    }
  } catch (error) {
    console.error('Socket relay error:', error);
    webSocket.close(1002, error.message);
  }
}

// ============= SUBSCRIPTION HANDLER =============
async function handleSubscription(request) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  const configs = [
    // VLESS WebSocket config
    `vless://${USER_ID}@${hostname}:443?encryption=none&security=tls&type=ws&host=${hostname}&path=${encodeURIComponent(VLESS_PATH)}&sni=${hostname}#VLESS-${hostname}`
  ];

  const subscriptionContent = configs.join('\n');
  
  // Encode to base64
  const encoder = new TextEncoder();
  const data = encoder.encode(subscriptionContent);
  const base64 = btoa(String.fromCharCode(...data));

  return new Response(base64, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    }
  });
}

// ============= UTILITY FUNCTIONS =============
function stringify(arr) {
  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).substr(1));
  }
  
  return [
    byteToHex[arr[0]], byteToHex[arr[1]], 
    byteToHex[arr[2]], byteToHex[arr[3]], '-',
    byteToHex[arr[4]], byteToHex[arr[5]], '-',
    byteToHex[arr[6]], byteToHex[arr[7]], '-',
    byteToHex[arr[8]], byteToHex[arr[9]], '-',
    byteToHex[arr[10]], byteToHex[arr[11]], 
    byteToHex[arr[12]], byteToHex[arr[13]], 
    byteToHex[arr[14]], byteToHex[arr[15]]
  ].join('').toLowerCase();
}

function generateFakeWebsite() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CloudFlare Worker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; display: flex;
            align-items: center; justify-content: center; padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1); padding: 2rem;
            border-radius: 15px; backdrop-filter: blur(10px);
            text-align: center; max-width: 600px; width: 100%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        h1 { margin-bottom: 1rem; font-size: 2.5rem; }
        .status { color: #4ade80; font-weight: bold; margin-bottom: 2rem; }
        .info-box { 
            background: rgba(255,255,255,0.1); padding: 1.5rem;
            border-radius: 10px; margin: 1rem 0; text-align: left;
        }
        .info-title { font-weight: bold; color: #fbbf24; margin-bottom: 0.5rem; }
        .code { 
            background: rgba(0,0,0,0.3); padding: 0.5rem; 
            border-radius: 5px; font-family: monospace; 
            word-break: break-all; margin: 0.5rem 0;
        }
        .url-box { 
            background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981;
            padding: 1rem; border-radius: 8px; margin: 1rem 0;
        }
        .copy-btn {
            background: #10b981; color: white; border: none;
            padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;
            margin-top: 0.5rem; font-size: 0.9rem;
        }
        .copy-btn:hover { background: #059669; }
        .footer { margin-top: 2rem; opacity: 0.8; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 VLESS Worker</h1>
        <div class="status">✅ Status: Online & Ready</div>
        
        <div class="info-box">
            <div class="info-title">📋 Connection Info:</div>
            <div><strong>UUID:</strong> <span class="code">${USER_ID}</span></div>
            <div><strong>Domain:</strong> <span class="code">${WORKER_DOMAIN}</span></div>
            <div><strong>Path:</strong> <span class="code">${VLESS_PATH}</span></div>
            <div><strong>Protocol:</strong> VLESS over WebSocket + TLS</div>
        </div>

        <div class="url-box">
            <div class="info-title">🔗 v2rayNG Import URL:</div>
            <div class="code" id="vlessUrl">vless://${USER_ID}@${WORKER_DOMAIN}:443?encryption=none&security=tls&type=ws&host=${WORKER_DOMAIN}&path=${encodeURIComponent(VLESS_PATH)}&sni=${WORKER_DOMAIN}#VLESS-${WORKER_DOMAIN}</div>
            <button class="copy-btn" onclick="copyToClipboard('vlessUrl')">📋 Copy URL</button>
        </div>

        <div class="info-box">
            <div class="info-title">📱 Subscription Link:</div>
            <div class="code" id="subUrl">${WORKER_DOMAIN}${SUB_PATH}</div>
            <button class="copy-btn" onclick="copyToClipboard('subUrl')">📋 Copy Subscription</button>
        </div>

        <div class="info-box">
            <div class="info-title">⚙️ Manual Configuration:</div>
            <div><strong>Server:</strong> ${WORKER_DOMAIN}</div>
            <div><strong>Port:</strong> 443</div>
            <div><strong>UUID:</strong> ${USER_ID}</div>
            <div><strong>Encryption:</strong> none</div>
            <div><strong>Network:</strong> WebSocket (ws)</div>
            <div><strong>Path:</strong> ${VLESS_PATH}</div>
            <div><strong>TLS:</strong> enabled</div>
            <div><strong>Host:</strong> ${WORKER_DOMAIN}</div>
        </div>

        <div class="footer">
            <p>🔒 Secure Connection | 🌐 Global CDN | ⚡ High Performance</p>
            <p><small>Powered by Cloudflare Workers</small></p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const btn = element.nextElementSibling;
                const originalText = btn.textContent;
                btn.textContent = '✅ Copied!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#10b981';
                }, 2000);
            });
        }
    </script>
</body>
</html>`;
}
