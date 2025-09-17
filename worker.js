// ===============================
// VLESS Cloudflare Worker Script
// Advanced Features: Multi-UUID, API, Subscription, ProxyIP
// Compatible dengan: v2rayNG, Clash, Surge, Shadowrocket
// ===============================

// ============= KONFIGURASI UTAMA =============
const userIDs = [
  'd342d11e-d424-4583-b36e-524ab1f0afa4',
  'e9e3cc13-db48-4cc1-8c24-7626439a5339',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
];

const sub = 'sub.example.com'; // Subdomain untuk subscription (opsional)
const subconverter = 'url.v1.mk'; // Subscription converter
const subconfig = "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini";

// ProxyIP untuk bypass GFW dan ISP blocking
let proxyIPs = [
  'cdn.xn--b6gac.eu.org',
  'cdn-all.xn--b6gac.eu.org', 
  'workers.cloudflare.cyou',
  'www.visa.com',
  'www.visa.com.sg',
  'www.visa.com.hk',
  'www.visa.com.tw',
  'www.visa.co.jp',
  'www.visakorea.com',
  'www.visa.com.au',
  'www.visa.com.br',
  'www.visa.ca',
  'cis.visa.com',
  'africa.visa.com',
  'ap.visa.com',
  'cemea.visa.com',
  'europe.visa.com',
  'lac.visa.com',
  'na.visa.com'
];

let addresses = [
  '146.70.80.1:8080',
  '146.70.80.2:8080', 
  '146.70.80.3:8080',
  '146.70.80.4:8080',
  '146.70.80.5:8080'
];

let addressesapi = [
  'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt',
  'https://raw.githubusercontent.com/NiREvil/vless/main/sub/ProxyIP',
  'https://raw.githubusercontent.com/tbbatbb/Proxy/main/dist/cloudflare.txt'
];

let addressesnotls = [
  'cdn.xn--b6gac.eu.org:8080',
  'cdn-all.xn--b6gac.eu.org:8080',
  'workers.cloudflare.cyou:8080'
];

let addressesnotlsapi = [
  'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'
];

let addressescsv = [
  'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.csv'
];

const DLS = 8;
const FileName = 'vless';
const BotToken = '';
const ChatID = ''; 

// ============= MAIN WORKER HANDLER =============
export default {
  async fetch(request, env, ctx) {
    try {
      userIDs.forEach(id => {
        if (!isValidUUID(id)) {
          throw new Error(`Invalid UUID: ${id}`);
        }
      });

      const url = new URL(request.url);
      const token = url.searchParams.get('token');
      
      if (url.pathname.startsWith('/')) {
        if (url.pathname === `/${userIDs[0]}`) {
          const vlessConfig = getVLESSConfig(userIDs[0], request.headers.get('Host'));
          return new Response(`${vlessConfig}`, {
            status: 200,
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            }
          });
        } else if (url.pathname === `/${userIDs[0]}/ty`) {
          const vlessConfig = getVLESSConfig(userIDs[0], request.headers.get('Host'));
          const now = Date.now();
          const timestamp = Math.floor(now / 1000);
          const today = new Date(now);
          const expire = Math.floor(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).getTime() / 1000);
          const total = 99 * 1024 * 1024 * 1024;
          return new Response(`${vlessConfig}`, {
            status: 200,
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
              "subscription-userinfo": `upload=0; download=0; total=${total}; expire=${expire}`,
            }
          });
        }
      }

      if (url.pathname.startsWith('/sub')) {
        const host = request.headers.get('Host');
        const userAgent = request.headers.get('User-Agent') || 'v2rayN/6.23';
        const subscriptionContent = await generateSubscription(userIDs, host, userAgent, url);
        
        return new Response(btoa(subscriptionContent), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-cache'
          }
        });
      }

      if (url.pathname.startsWith('/bestip')) {
        const headers = request.headers;
        const html = getBestIPHTML();
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        });
      }

      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        const url = new URL(request.url);
        switch (url.pathname) {
          case '/':
            return new Response(getIndexHTML(request), {
              headers: {
                'content-type': 'text/html; charset=utf-8',
              },
            });
          case `/${userIDs[0]}`:
            return new Response(getVLESSConfig(userIDs[0], request.headers.get('Host')), {
              headers: {
                'content-type': 'text/html; charset=utf-8',
              },
            });
          default:
            return new Response('Not found', { status: 404 });
        }
      } else {
        return await vlessOverWSHandler(request);
      }
    } catch (err) {
      return new Response(err.toString());
    }
  },
};

// ============= VLESS WEBSOCKET HANDLER =============
async function vlessOverWSHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);
  webSocket.accept();

  let address = '';
  let portWithRandomLog = '';
  const log = (info, event) => {
    console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
  };
  const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';

  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

  let remoteSocketWapper = {
    value: null,
  };
  let udpStreamWrite = null;
  let isDns = false;

  readableWebSocketStream.pipeTo(new WritableStream({
    async write(chunk, controller) {
      if (isDns && udpStreamWrite) {
        return await udpStreamWrite(chunk);
      }
      if (remoteSocketWapper.value) {
        const writer = remoteSocketWapper.value.writable.getWriter()
        await writer.write(chunk);
        writer.releaseLock();
        return;
      }

      const {
        hasError,
        message,
        portRemote = 443,
        addressRemote = '',
        rawDataIndex,
        vlessVersion = new Uint8Array([0, 0]),
        isUDP,
      } = processVlessHeader(chunk, userIDs);
      address = addressRemote;
      portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '} `;
      if (hasError) {
        throw new Error(message);
        return;
      }
      if (isUDP) {
        if (portRemote === 53) {
          isDns = true;
        } else {
          throw new Error('UDP proxy only enable for DNS which is port 53');
          return;
        }
      }
      const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
      const rawClientData = chunk.slice(rawDataIndex);

      if (isDns) {
        const { write } = await handleUDPOutBound(webSocket, vlessResponseHeader, log);
        udpStreamWrite = write;
        udpStreamWrite(rawClientData);
        return;
      }
      handleTCPOutBound(remoteSocketWapper, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log);
    },
    close() {
      log(`readableWebSocketStream is close`);
    },
    abort(reason) {
      log(`readableWebSocketStream is abort`, JSON.stringify(reason));
    },
  })).catch((err) => {
    log('readableWebSocketStream pipeTo error', err);
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// ============= VLESS PROTOCOL PROCESSING =============
function processVlessHeader(vlessBuffer, userIDs) {
  if (vlessBuffer.byteLength < 24) {
    return {
      hasError: true,
      message: 'invalid data',
    };
  }
  const version = new Uint8Array(vlessBuffer.slice(0, 1));
  let isValidUser = false;
  let isUDP = false;
  const slicedBuffer = new Uint8Array(vlessBuffer.slice(1, 17));
  const byteArray = Array.from(slicedBuffer);
  const uuidString = stringify(byteArray);

  const checkUuid = userIDs.some(userID => checkUuidEndsWith(uuidString, userID));
  console.log(`checkUuid: ${checkUuid}`);

  isValidUser = checkUuid;
  if (!isValidUser) {
    return {
      hasError: true,
      message: 'invalid user',
    };
  }

  const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
  const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];

  if (command === 1) {
    isUDP = false;
  } else if (command === 2) {
    isUDP = true;
  } else {
    return {
      hasError: true,
      message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`,
    };
  }
  const portIndex = 18 + optLength + 1;
  const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);

  let addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1));

  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = '';
  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
      break;
    case 2:
      addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 3:
      addressLength = 16;
      const dataView = new DataView(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(':');
      break;
    default:
      return {
        hasError: true,
        message: `invild  addressType is ${addressType}`,
      };
  }
  if (!addressValue) {
    return {
      hasError: true,
      message: `addressValue is empty, addressType is ${addressType}`,
    };
  }

  return {
    hasError: false,
    addressRemote: addressValue,
    addressType,
    portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    vlessVersion: version,
    isUDP,
  };
}

// ============= TCP OUTBOUND HANDLER =============
async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log) {
  async function connectAndWrite(address, port) {
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(address)) address = `${atob('d3d3Lg==')}${address}${atob('LnNzbGlwLmlv')}`;
    const tcpSocket = connect({
      hostname: address,
      port: port,
    });
    remoteSocket.value = tcpSocket;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket;
  }

  async function retry() {
    if (proxyIPs.length === 0) {
      console.log('Tidak ada proxyIP yang tersisa untuk dicoba');
      return;
    }
    const randomProxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
    const tcpSocket = await connectAndWrite(randomProxyIP, portRemote);
    tcpSocket.closed.catch(error => {
      console.log('Koneksi ke', randomProxyIP, 'tertutup:', error);
    }).finally(() => {
      proxyIPs = proxyIPs.filter(ip => ip !== randomProxyIP);
    });
    remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
  }

  const tcpSocket = await connectAndWrite(addressRemote, portRemote);
  remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
}

// ============= WEBSOCKET UTILITIES =============
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener('message', (event) => {
        if (readableStreamCancel) {
          return;
        }
        const message = event.data;
        controller.enqueue(message);
      });

      webSocketServer.addEventListener('close', () => {
        if (readableStreamCancel) {
          return;
        }
        controller.close();
      });
      webSocketServer.addEventListener('error', (err) => {
        log('webSocketServer has error');
        controller.error(err);
      });
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },

    pull(controller) {
    },

    cancel(reason) {
      if (readableStreamCancel) {
        return;
      }
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      webSocketServer.close();
    }
  });

  return stream;
}

async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry, log) {
  let remoteChunkCount = 0;
  let chunks = [];
  let vlessHeader = vlessResponseHeader;
  let hasIncomingData = false;

  await remoteSocket.readable
    .pipeTo(
      new WritableStream({
        start() {
        },
        async write(chunk, controller) {
          hasIncomingData = true;
          if (webSocket.readyState !== WS_READY_STATE_OPEN) {
            controller.error('webSocket.readyState is not open, maybe close');
          }
          if (vlessHeader) {
            webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
            vlessHeader = null;
          } else {
            webSocket.send(chunk);
          }
        },
        close() {
          log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
        },
        abort(reason) {
          console.error(`remoteConnection!.readable abort`, reason);
        },
      })
    )
    .catch((error) => {
      console.error(`remoteSocketToWS has exception `, error.stack || error);
      safeCloseWebSocket(webSocket);
    });

  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}

// ============= DNS OVER UDP HANDLER =============
async function handleUDPOutBound(webSocket, vlessResponseHeader, log) {
  let isVlessHeaderSent = false;
  const transformStream = new TransformStream({
    start(controller) {
    },
    transform(chunk, controller) {
      for (let index = 0; index < chunk.byteLength;) {
        const lengthBuffer = chunk.slice(index, index + 2);
        const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
        const udpData = new Uint8Array(chunk.slice(index + 2, index + 2 + udpPakcetLength));
        index = index + 2 + udpPakcetLength;
        controller.enqueue(udpData);
      }
    },
    flush(controller) {
    }
  });

  transformStream.readable
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          const resp = await fetch('https://1.1.1.1/dns-query',
            {
              method: 'POST',
              headers: {
                'content-type': 'application/dns-message',
              },
              body: chunk,
            })
          const dnsQueryResult = await resp.arrayBuffer();
          const udpSize = dnsQueryResult.byteLength;
          const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);
          if (webSocket.readyState === WS_READY_STATE_OPEN) {
            log(`doh success and dns message length is ${udpSize}`);
            if (isVlessHeaderSent) {
              webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
            } else {
              webSocket.send(await new Blob([vlessResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
              isVlessHeaderSent = true;
            }
          }
        }
      })
    )
    .catch((error) => {
      log('dns udp has error' + error)
    });

  const writer = transformStream.writable.getWriter();

  return {
    write(chunk) {
      writer.write(chunk);
    }
  };
}

// ============= SUBSCRIPTION GENERATOR =============
async function generateSubscription(userIDs, hostName, userAgent, url) {
  const subParams = url.searchParams;
  const vlessConfigs = [];

  for (const userID of userIDs) {
    const commonUrlPart = `:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#`;

    // Add different types of configs
    vlessConfigs.push(`vless://${userID}@${hostName}${commonUrlPart}${encodeURIComponent(`🚩CF-${hostName}`)}`);
    
    // Add proxyIP configs
    for (let i = 0; i < Math.min(proxyIPs.length, 5); i++) {
      vlessConfigs.push(`vless://${userID}@${proxyIPs[i]}${commonUrlPart}${encodeURIComponent(`🚩CF-${proxyIPs[i]}`)}`);
    }

    // Add different ports for variety
    const ports = [80, 8080, 8443, 2052, 2082, 2086, 2095];
    for (const port of ports.slice(0, 3)) {
      if (port !== 443) {
        const portUrlPart = `:${port}?encryption=none&security=${port === 80 ? 'none' : 'tls'}&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#`;
        vlessConfigs.push(`vless://${userID}@${hostName}${portUrlPart}${encodeURIComponent(`🚩CF-${hostName}-${port}`)}`);
      }
    }
  }

  return vlessConfigs.join('\n');
}

// ============= VLESS CONFIG GENERATOR =============
function getVLESSConfig(userID, hostName) {
  const vlessMain = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${encodeURIComponent(`🚩CF-${hostName}`)}`;
  return `${vlessMain}`;
}

// ============= HTML RESPONSES =============
function getIndexHTML(request) {
  const url = new URL(request.url);
  const host = url.hostname;
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 VLESS Cloudflare Worker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333; min-height: 100vh; padding: 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: white; font-size: 3rem; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .status { background: rgba(255,255,255,0.95); padding: 20px; border-radius: 15px; margin-bottom: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .status h2 { color: #4CAF50; margin-bottom: 15px; display: flex; align-items: center; }
        .status h2:before { content: "✅"; margin-right: 10px; font-size: 1.2em; }
        .config-section { background: rgba(255,255,255,0.95); padding: 25px; border-radius: 15px; margin-bottom: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .config-section h3 { color: #2196F3; margin-bottom: 20px; font-size: 1.3em; }
        .config-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #2196F3; }
        .config-item label { font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
        .config-item .value { font-family: monospace; background: #e9ecef; padding: 8px; border-radius: 4px; word-break: break-all; font-size: 0.9em; }
        .btn { display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 5px; transition: all 0.3s; border: none; cursor: pointer; font-size: 1em; }
        .btn:hover { background: #1976D2; transform: translateY(-2px); }
        .btn-success { background: #4CAF50; }
        .btn-success:hover { background: #45a049; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .copy-btn { background: #FF9800; font-size: 0.9em; padding: 8px 16px; margin-left: 10px; }
        .copy-btn:hover { background: #F57C00; }
        .note { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .uuid-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .uuid-item { background: #e3f2fd; color: #1565c0; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 0.85em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 VLESS Worker</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 1.2em;">High Performance Proxy Service</p>
        </div>

        <div class="status">
            <h2>服务状态</h2>
            <p><strong>域名:</strong> ${host}</p>
            <p><strong>协议:</strong> VLESS over WebSocket + TLS</p>
            <p><strong>节点数量:</strong> ${proxyIPs.length} 个全球节点</p>
            <div class="uuid-list">
                ${userIDs.map(id => `<span class="uuid-item">${id}</span>`).join('')}
            </div>
        </div>

        <div class="grid">
            <div class="config-section">
                <h3>📱 v2rayNG 配置</h3>
                <div class="config-item">
                    <label>服务器地址:</label>
                    <div class="value">${host}</div>
                </div>
                <div class="config-item">
                    <label>端口:</label>
                    <div class="value">443</div>
                </div>
                <div class="config-item">
                    <label>用户ID:</label>
                    <div class="value">${userIDs[0]}</div>
                </div>
                <div class="config-item">
                    <label>传输协议:</label>
                    <div class="value">ws (WebSocket)</div>
                </div>
                <div class="config-item">
                    <label>路径:</label>
                    <div class="value">/?ed=2048</div>
                </div>
                <div class="config-item">
                    <label>TLS:</label>
                    <div class="value">开启</div>
                </div>
            </div>

            <div class="config-section">
                <h3>🔗 快速导入</h3>
                <div class="config-item">
                    <label>VLESS 链接:</label>
                    <div class="value" id="vlessLink">${getVLESSConfig(userIDs[0], host)}</div>
                    <button class="btn copy-btn" onclick="copyToClipboard('vlessLink')">复制链接</button>
                </div>
                <div class="config-item">
                    <label>订阅链接:</label>
                    <div class="value" id="subLink">https://${host}/sub</div>
                    <button class="btn copy-btn" onclick="copyToClipboard('subLink')">复制订阅</button>
                </div>
            </div>
        </div>

        <div class="config-section">
            <h3>🌐 全球节点</h3>
            <p>本服务提供 ${proxyIPs.length} 个全球高速节点，自动选择最优线路：</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
                ${proxyIPs.slice(0, 12).map(ip => `<div style="background: #f0f8ff; padding: 8px; border-radius: 6px; text-align: center; font-family: monospace; font-size: 0.85em;">${ip}</div>`).join('')}
            </div>
        </div>

        <div class="config-section">
            <h3>📊 使用说明</h3>
            <div class="note">
                <p><strong>支持的客户端：</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Android: v2rayNG, SagerNet, Clash for Android</li>
                    <li>iOS: Shadowrocket, Quantumult X, Surge</li>
                    <li>Windows: v2rayN, Clash for Windows</li>
                    <li>macOS: ClashX, V2RayU</li>
                    <li>Linux: v2ray-core, Clash</li>
                </ul>
            </div>
            
            <div style="margin-top: 20px;">
                <a href="/sub" class="btn btn-success">🔄 获取订阅配置</a>
                <a href="/bestip" class="btn">🚀 优选IP测试</a>
                <a href="/${userIDs[0]}" class="btn">📋 获取配置信息</a>
            </div>
        </div>

        <div class="config-section">
            <h3>⚡ 性能特点</h3>
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 2em; color: #4CAF50;">🌍</div>
                    <h4>全球CDN</h4>
                    <p>基于Cloudflare全球网络，低延迟高可用</p>
                </div>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 2em; color: #2196F3;">🔒</div>
                    <h4>安全加密</h4>
                    <p>TLS 1.3加密，WebSocket伪装流量</p>
                </div>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 2em; color: #FF9800;">⚡</div>
                    <h4>高速稳定</h4>
                    <p>多节点负载均衡，智能选择最优路径</p>
                </div>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 2em; color: #9C27B0;">🛡️</div>
                    <h4>抗干扰</h4>
                    <p>多种ProxyIP绕过网络限制</p>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; color: rgba(255,255,255,0.8);">
            <p>🔒 安全 • 🌐 全球 • ⚡ 高速 • 🛡️ 稳定</p>
            <p style="margin-top: 10px; font-size: 0.9em;">Powered by Cloudflare Workers</p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent.trim();
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showCopySuccess();
                }).catch(err => {
                    fallbackCopyTextToClipboard(text);
                });
            } else {
                fallbackCopyTextToClipboard(text);
            }
        }
        
        function fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showCopySuccess();
            } catch (err) {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            }
            
            document.body.removeChild(textArea);
        }
        
        function showCopySuccess() {
            const notification = document.createElement('div');
            notification.textContent = '✅ 已复制到剪贴板';
            notification.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #4CAF50; color: white; padding: 12px 24px;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000; font-weight: bold;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 1500);
        }
    </script>
</body>
</html>`;
}

function getBestIPHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 优选IP测试</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333; min-height: 100vh; padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: white; font-size: 2.5rem; margin-bottom: 10px; }
        .test-section { background: rgba(255,255,255,0.95); padding: 25px; border-radius: 15px; margin-bottom: 25px; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 20px; }
        .ip-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; }
        .ip-address { font-family: monospace; font-weight: bold; color: #1976D2; }
        .ping-result { margin-top: 8px; font-size: 0.9em; }
        .ping-good { color: #4CAF50; }
        .ping-medium { color: #FF9800; }
        .ping-bad { color: #f44336; }
        .btn { background: #2196F3; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; margin: 5px; }
        .btn:hover { background: #1976D2; }
        .status { text-align: center; margin: 20px 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 优选IP测试工具</h1>
            <p style="color: rgba(255,255,255,0.9);">测试Cloudflare CDN节点延迟，选择最优IP</p>
        </div>

        <div class="test-section">
            <h3>🔍 延迟测试</h3>
            <div style="margin: 20px 0;">
                <button class="btn" onclick="startPingTest()">开始测试</button>
                <button class="btn" onclick="stopPingTest()">停止测试</button>
                <button class="btn" onclick="clearResults()">清除结果</button>
            </div>
            <div class="status" id="status">点击"开始测试"来测试节点延迟</div>
            <div class="test-grid" id="results"></div>
        </div>

        <div class="test-section">
            <h3>📋 使用说明</h3>
            <ul style="line-height: 1.8; padding-left: 20px;">
                <li><strong style="color: #4CAF50;">绿色 (&lt;100ms):</strong> 优秀，推荐使用</li>
                <li><strong style="color: #FF9800;">黄色 (100-300ms):</strong> 良好，可以使用</li>
                <li><strong style="color: #f44336;">红色 (&gt;300ms):</strong> 较慢，不推荐</li>
                <li>测试结果仅供参考，实际效果可能因网络环境而异</li>
                <li>建议选择延迟最低的几个IP地址使用</li>
            </ul>
        </div>
    </div>

    <script>
        let testIPs = ${JSON.stringify(proxyIPs)};
        let isTestingActive = false;
        let testResults = [];

        async function pingTest(ip) {
            const start = Date.now();
            try {
                const response = await fetch(\`https://\${ip}/cdn-cgi/trace\`, { 
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(5000)
                });
                const end = Date.now();
                return end - start;
            } catch (error) {
                return -1;
            }
        }

        async function startPingTest() {
            if (isTestingActive) return;
            
            isTestingActive = true;
            testResults = [];
            document.getElementById('status').textContent = '测试进行中...';
            document.getElementById('results').innerHTML = '';

            for (let i = 0; i < testIPs.length && isTestingActive; i++) {
                const ip = testIPs[i];
                document.getElementById('status').textContent = \`正在测试 \${i + 1}/\${testIPs.length}: \${ip}\`;
                
                const ping = await pingTest(ip);
                const result = { ip, ping };
                testResults.push(result);
                
                displayResult(result);
            }

            if (isTestingActive) {
                testResults.sort((a, b) => {
                    if (a.ping === -1) return 1;
                    if (b.ping === -1) return -1;
                    return a.ping - b.ping;
                });
                
                document.getElementById('results').innerHTML = '';
                testResults.forEach(displayResult);
                document.getElementById('status').textContent = '测试完成！结果已按延迟排序。';
            }
            
            isTestingActive = false;
        }

        function stopPingTest() {
            isTestingActive = false;
            document.getElementById('status').textContent = '测试已停止';
        }

        function clearResults() {
            document.getElementById('results').innerHTML = '';
            document.getElementById('status').textContent = '结果已清除';
            testResults = [];
        }

        function displayResult(result) {
            const resultsDiv = document.getElementById('results');
            const card = document.createElement('div');
            card.className = 'ip-card';
            
            let pingClass = 'ping-bad';
            let pingText = '超时';
            
            if (result.ping !== -1) {
                if (result.ping < 100) {
                    pingClass = 'ping-good';
                } else if (result.ping < 300) {
                    pingClass = 'ping-medium';
                }
                pingText = \`\${result.ping}ms\`;
            }
            
            card.innerHTML = \`
                <div class="ip-address">\${result.ip}</div>
                <div class="ping-result \${pingClass}">延迟: \${pingText}</div>
            \`;
            
            resultsDiv.appendChild(card);
        }
    </script>
</body>
</html>`;
}

// ============= UTILITY FUNCTIONS =============
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function checkUuidEndsWith(uuid, userID) {
  return uuid.endsWith(userID.substr(-12));
}

function stringify(arr) {
  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).substr(1));
  }
  return [
    byteToHex[arr[0]], byteToHex[arr[1]], byteToHex[arr[2]], byteToHex[arr[3]], '-',
    byteToHex[arr[4]], byteToHex[arr[5]], '-', byteToHex[arr[6]], byteToHex[arr[7]], '-',
    byteToHex[arr[8]], byteToHex[arr[9]], '-', byteToHex[arr[10]], byteToHex[arr[11]],
    byteToHex[arr[12]], byteToHex[arr[13]], byteToHex[arr[14]], byteToHex[arr[15]]
  ].join('').toLowerCase();
}

function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { error: null };
  }
  try {
    base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return { earlyData: arryBuffer.buffer, error: null };
  } catch (error) {
    return { error };
  }
}

function safeCloseWebSocket(socket) {
  try {
    if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CONNECTING) {
      socket.close();
    }
  } catch (error) {
    console.error('safeCloseWebSocket error', error);
  }
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CONNECTING = 0;
