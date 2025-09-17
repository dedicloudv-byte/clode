# 🚀 Advanced VLESS Cloudflare Worker

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?logo=cloudflare)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/vless-worker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)](https://github.com/yourusername/vless-worker/releases)

🌟 **Production-ready VLESS proxy server** deployed on Cloudflare Workers with comprehensive features:

- ✅ **Multi-UUID Support** - Support multiple users with different UUIDs
- ✅ **Global ProxyIP** - 18+ global proxy IPs for bypassing restrictions  
- ✅ **Auto Subscription** - Standard subscription format for all clients
- ✅ **Best IP Testing** - Built-in latency testing for optimal performance
- ✅ **Modern UI** - Beautiful responsive web interface
- ✅ **Zero Config** - Deploy and use immediately

## 🚀 One-Click Deploy

[![Deploy with Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/vless-worker)

## 📋 Features

### 🔧 Core Features
- **VLESS Protocol**: Full support for VLESS over WebSocket + TLS
- **Multi-UUID**: Support multiple users with individual UUIDs
- **Auto-Subscription**: Standard base64 subscription for all clients
- **ProxyIP Rotation**: 18+ global proxy IPs with automatic selection
- **Smart Routing**: Intelligent routing with fallback mechanisms

### 🌐 Network Features
- **Global CDN**: Powered by Cloudflare's 200+ data centers
- **TLS 1.3**: Latest encryption with perfect forward secrecy
- **WebSocket**: Optimized WebSocket transport with path customization
- **DNS over HTTPS**: Built-in secure DNS resolution
- **IPv4/IPv6**: Full dual-stack support

### 📱 Client Compatibility
| Client | Android | iOS | Windows | macOS | Linux |
|--------|---------|-----|---------|-------|-------|
| **v2rayNG** | ✅ | - | - | - | - |
| **v2rayN** | - | - | ✅ | - | ✅ |
| **Shadowrocket** | - | ✅ | - | - | - |
| **Quantumult X** | - | ✅ | - | - | - |
| **Clash** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Surge** | - | ✅ | - | ✅ | - |

### 🎨 Web Interface
- **Responsive Design**: Works perfectly on all devices
- **Real-time Stats**: Live connection and performance statistics  
- **Best IP Testing**: Built-in latency tester for optimal node selection
- **One-Click Copy**: Easy configuration copying with visual feedback
- **Multi-language**: Support for multiple languages

## ⚡ Quick Start

### Method 1: One-Click Deploy
1. Click the **Deploy** button above
2. Login to Cloudflare
3. Deploy to Workers
4. Access your worker URL
5. Copy VLESS link to your client

### Method 2: Manual Deploy
```bash
# Clone repository
git clone https://github.com/yourusername/vless-worker.git
cd vless-worker

# Deploy to Cloudflare Workers
npx wrangler deploy

# Your worker is ready at:
# https://vless-worker.your-username.workers.dev
```

## ⚙️ Configuration

### Basic Setup
Edit the UUIDs in `_worker.js`:
```javascript
const userIDs = [
  'd342d11e-d424-4583-b36e-524ab1f0afa4', // User 1
  'e9e3cc13-db48-4cc1-8c24-7626439a5339', // User 2  
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'  // User 3
];
```

### Generate New UUIDs
```bash
# Linux/Mac
uuidgen

# Windows PowerShell  
[System.Guid]::NewGuid()

# Online Generator
https://www.uuidgenerator.net/
```

### Custom Domain (Optional)
1. Go to Cloudflare Workers Dashboard
2. Select your worker → **Settings** → **Triggers**
3. **Add Custom Domain**
4. Enter your domain/subdomain
5. Update client configurations

## 📱 Client Setup

### v2rayNG (Android)

#### Quick Import
1. Open worker URL in browser
2. Copy the VLESS link
3. Open v2rayNG → **+** → **Import config from Clipboard**

#### Subscription (Recommended)
1. Copy subscription link from worker homepage  
2. v2rayNG → **☰** → **Subscription setting** → **+**
3. Add subscription URL: `https://your-worker-domain.com/sub`
4. Update subscription

#### Manual Configuration
- **Address**: `your-worker-domain.com`
- **Port**: `443`
- **UUID**: `your-uuid-from-worker`
- **Security**: `TLS`
- **Network**: `ws`
- **Path**: `/?ed=2048`
- **Host**: `your-worker-domain.com`

### Clash Configuration

```yaml
proxies:
  - name: "🚩CF-Worker"
    type: vless
    server: your-worker-domain.com
    port: 443
    uuid: your-uuid-here
    network: ws
    tls: true
    udp: true
    ws-opts:
      path: "/?ed=2048"
      headers:
        Host: your-worker-domain.com
```

### Surge Configuration

```ini
[Proxy]
🚩CF-Worker = vless, your-worker-domain.com, 443, username=your-uuid-here, ws=true, ws-path=/?ed=2048, ws-headers=Host:your-worker-domain.com, tls=true, sni=your-worker-domain.com
```

## 🔗 API Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `/` | Main homepage with configuration | HTML |
| `/sub` | Subscription for all clients | Base64 encoded configs |
| `/bestip` | Best IP testing tool | HTML interface |
| `/{uuid}` | Single VLESS configuration | Plain text |
| `/{uuid}/ty` | Config with traffic info | With subscription headers |

## 🌍 Global ProxyIPs

The worker includes 18+ global proxy IPs for optimal performance:

```javascript
// CDN Endpoints
'cdn.xn--b6gac.eu.org'
'cdn-all.xn--b6gac.eu.org' 
'workers.cloudflare.cyou'

// Visa Global Network
'www.visa.com'
'www.visa.com.sg'
'www.visa.com.hk'
'www.visa.co.jp'
// ... and more
```

These IPs help bypass ISP restrictions and improve connection stability.

## 🛠️ Advanced Features

### Best IP Testing
- Access `/bestip` on your worker domain
- Test latency to all proxy IPs
- Choose the fastest IPs for your location
- Real-time ping testing with visual results

### Multi-User Support
- Support up to unlimited users with different UUIDs
- Each user gets individual configuration
- Automatic load balancing across proxy IPs
- Individual traffic statistics (coming soon)

### Smart Fallback
- Automatic failover between proxy IPs
- DNS over HTTPS for blocked regions
- Multiple port support (80, 443, 8080, etc.)
- Protocol detection and optimization

## 📊 Performance

- **Global Latency**: < 50ms (varies by location)
- **Throughput**: Up to 1Gbps per connection
- **Uptime**: 99.9% (Cloudflare SLA)
- **Concurrent Connections**: 1000+ per worker
- **Geographic Coverage**: 200+ cities worldwide

## 🔒 Security

### Encryption
- **Transport**: TLS 1.3 with AEAD encryption
- **Application**: VLESS protocol with UUID authentication  
- **DNS**: DNS over HTTPS (DoH) to 1.1.1.1
- **Headers**: Custom headers for traffic camouflage

### Privacy
- **No Logging**: Zero logging policy
- **No Personal Data**: Only UUID for authentication
- **Traffic Encryption**: End-to-end encryption
- **Geographic Routing**: No traffic inspection

## 🚨 Troubleshooting

### Connection Issues

#### ❌ "Connection failed"
- Check if UUID matches exactly
- Verify domain name spelling
- Try different ProxyIPs from `/bestip`
- Check if client supports VLESS

#### ❌ "Invalid UUID"  
- Ensure UUID format is correct (8-4-4-4-12)
- Copy UUID exactly from worker homepage
- Regenerate UUID if necessary

#### ❌ "WebSocket error"
- Verify path is `/?ed=2048`
- Enable TLS in client settings
- Check Host header matches domain
- Try port 80 for restricted networks

#### ❌ "DNS resolution failed"
- Use custom domain instead of `.workers.dev`
- Check if domain is blocked in your region
- Try different DNS servers (1.1.1.1, 8.8.8.8)

### Performance Issues

#### 🐌 Slow speed
- Use `/bestip` to find fastest ProxyIP
- Try different global proxy IPs
- Check if your ISP throttles international traffic
- Test at different times of day

#### ⏰ High latency
- Select ProxyIP closest to your location
- Avoid `.workers.dev` domains in some regions
- Use custom domain for better routing

## 📈 Monitoring

### Worker Dashboard
- Real-time requests and errors
- Performance metrics and logs  
- Traffic analysis and patterns
- Alert configuration for downtime

### Best Practices
- Monitor subscription update frequency
- Check error rates in dashboard
- Set up alerts for unusual traffic
- Regular UUID rotation for security

## 🔄 Updates & Maintenance

### Automatic Updates
- ProxyIP lists auto-refresh
- Cloudflare Workers auto-update
- Global CDN optimization
- Security patches applied automatically

### Manual Maintenance
- UUID rotation (recommended monthly)
- ProxyIP optimization based on performance
- Custom domain SSL certificate renewal
- Worker configuration updates

## 📝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`  
5. **Open** a Pull Request

### Development Setup
```bash
# Clone and setup
git clone https://github.com/yourusername/vless-worker.git
cd vless-worker
npm install

# Local development
npx wrangler dev

# Deploy to staging
npx wrangler deploy --env staging
```

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/vless-worker&type=Date)](https://star-history.com/#yourusername/vless-worker&Date)

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless edge computing
- [VLESS Protocol](https://github.com/XTLS/Xray-core) - Modern proxy protocol
- [v2rayNG](https://github.com/2dust/v2rayNG) - Android client
- Community contributors and beta testers

## 📞 Support

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/yourusername/vless-worker/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/yourusername/vless-worker/discussions)
- **📖 Documentation**: [Wiki](https://github.com/yourusername/vless-worker/wiki)
- **🆘 Help**: [Telegram Group](https://t.me/vless_worker)

---

<div align="center">

**⭐ Star this repository if it helps you!**

Made with ❤️ for the global community

![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-orange?logo=cloudflare&logoColor=white)

</div> **Traffic Info**: Upload/download statistics in subscription

## 🚀 Quick Deploy

### One-Click Deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/vless-worker)

### Manual Deploy

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/vless-worker.git
   cd vless-worker
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Deploy Worker**
   ```bash
   npx wrangler deploy
   ```

4. **Access Your Worker**
   ```
   https://your-worker.your-username.workers.dev
   ```

## ⚙️ Configuration

### Basic Configuration

Edit the `CONFIG` object in `_worker.js`:

```javascript
const CONFIG = {
  // Auto-generate UUID (set 'auto') or use custom UUID
  uuid: 'auto',
  
  // Primary proxy IP for bypassing restrictions
  proxyIP: 'cdn.xn--b6gac.eu.org',
  
  // API configuration
  api: {
    enabled: true,
    token: 'your-secret-api-token-here' // ⚠️ Change this!
  },
  
  // Custom paths
  vless: {
    path: '/vless' // VLESS WebSocket path
  },
  
  subscription: {
    path: '/sub' // Subscription path
  }
};
```

### Environment Variables (Optional)

Set these in Cloudflare Workers dashboard:

```bash
API_TOKEN=your-secret-api-token
CUSTOM_UUID=your-custom-uuid-here
PROXY_IP=your-preferred-proxy-ip
```

## 📱 Client Setup

### v2rayNG (Android)

#### Method 1: Import URL
1. Copy the VLESS URL from your worker homepage
2. Open v2rayNG → **+** → **Import config from Clipboard**

#### Method 2: Manual Configuration
1. Open v2rayNG → **+** → **Manually input**
2. Fill in the details:
   - **Remarks**: Your-Worker-Name
   - **Address**: your-worker.your-username.workers.dev
   - **Port**: 443
   - **UUID**: (from worker homepage)
   - **Security**: TLS
   - **Network**: ws (WebSocket)
   - **Path**: /vless
   - **Host**: your-worker.your-username.workers.dev

#### Method 3: Subscription
1. Open v2rayNG → **☰** → **Subscription setting**
2. **+** → Add subscription
3. **Remarks**: Your-Subscription-Name
4. **URL**: https://your-worker.your-username.workers.dev/sub
5. **Update** → Select subscription → **Update**

### Clash (Windows/Mac/Linux)

Add to your `config.yaml`:

```yaml
proxies:
  - name: "VLESS-Worker"
    type: vless
    server: your-worker.your-username.workers.dev
    port: 443
    uuid: your-uuid-here
    network: ws
    tls: true
    ws-opts:
      path: /vless
      headers:
        Host: your-worker.your-username.workers.dev
```

### Surge (iOS/Mac)

Add to Surge configuration:

```ini
[Proxy]
VLESS-Worker = vless, your-worker.your-username.workers.dev, 443, username=your-uuid-here, ws=true, ws-path=/vless, ws-headers=Host:your-worker.your-username.workers.dev, tls=true, sni=your-worker.your-username.workers.dev
```

## 🔌 API Usage

### Authentication

All API endpoints require authentication:

```bash
# Method 1: Query parameter
curl "https://your-worker.your-username.workers.dev/api/info?token=your-api-token"

# Method 2: Authorization header
curl -H "Authorization: Bearer your-api-token" "https://your-worker.your-username.workers.dev/api/info"
```

### Endpoints

#### 📊 GET /api/info
Get worker information and status
```bash
curl "https://your-worker.your-username.workers.dev/api/info?token=your-token"
```

Response:
```json
{
  "status": "online",
  "version": "2.0.0",
  "hostname": "your-worker.your-username.workers.dev",
  "uuid": "12345678-1234-4567-8901-123456789abc",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "features": {
    "vless": true,
    "subscription": true,
    "proxyIP": true,
    "multiUUID": true
  }
}
```

#### ⚙️ GET /api/config
Get VLESS configuration
```bash
curl "https://your-worker.your-username.workers.dev/api/config?token=your-token"
```

Response:
```json
{
  "server": "your-worker.your-username.workers.dev",
  "port": 443,
  "uuid": "12345678-1234-4567-8901-123456789abc",
  "encryption": "none",
  "network": "ws",
  "path": "/vless",
  "security": "tls",
  "url": "vless://12345678-1234-4567-8901-123456789abc@your-worker.your-username.workers.dev:443?encryption=none&security=tls&type=ws&host=your-worker.your-username.workers.dev&path=%2Fvless&sni=your-worker.your-username.workers.dev#VLESS-your-worker.your-username.workers.dev"
}
```

#### 📈 GET /api/stats
Get usage statistics
```bash
curl "https://your-worker.your-username.workers.dev/api/stats?token=your-token"
```

Response:
```json
{
  "connections": 42,
  "uptime": 1640995200,
  "traffic": {
    "upload": 1073741824,
    "download": 2147483648
  },
  "nodes": 8
}
```

#### 🌍 GET /api/nodes
Get proxy node information
```bash
curl "https://your-worker.your-username.workers.dev/api/nodes?token=your-token"
```

Response:
```json
{
  "total": 8,
  "nodes": [
    {
      "id": 1,
      "address": "cdn.xn--b6gac.eu.org",
      "status": "online",
      "ping": 25,
      "country": "SG"
    }
  ]
}
```

## 🛠️ Advanced Features

### Custom Proxy IP

Add `?proxyip=your-proxy-ip` to your VLESS URL:

```
vless://uuid@worker-domain:443?proxyip=custom-proxy.com&...
```

### Multiple Configurations

The subscription endpoint automatically generates multiple configurations with different proxy IPs for redundancy.

### Custom Domain

1. Go to Cloudflare Workers dashboard
2. Select your worker
3. **Settings** → **Triggers** → **Add Custom Domain**
4. Enter your domain/subdomain
5. Update client configurations with your custom domain

## 🔒 Security

### Best Practices

1. **Change API Token**: Always change the default API token
2. **Custom UUID**: Consider using a custom UUID instead of auto-generated
3. **Custom Paths**: Change default paths (`/vless`, `/sub`) for better security
4. **Monitor Usage**: Regularly check API statistics for unusual activity
5. **Rotate Tokens**: Periodically rotate your API tokens

### Security Features

- **TLS Encryption**: All connections are encrypted with TLS
- **Token Authentication**: API endpoints are protected with token auth
- **UUID Validation**: Only valid UUIDs are accepted
- **Rate Limiting**: Built-in Cloudflare rate limiting
- **DDoS Protection**: Cloudflare's DDoS protection

## 📊 Monitoring

### Worker Dashboard
- Monitor requests, errors, and performance in Cloudflare Workers dashboard
- Set up alerts for errors or unusual traffic patterns

### API Monitoring
- Use the `/api/stats` endpoint to track usage
- Monitor connection counts and traffic patterns
- Set up automated monitoring scripts

### Logs
- Check Real-time Logs in Cloudflare Workers dashboard
- Monitor WebSocket connections and errors
- Track API usage and authentication attempts

## 🛠️ Troubleshooting

### Common Issues

#### ❌ "Invalid UUID" Error
**Solution**: Check that your UUID matches the one shown on the worker homepage

#### ❌ "WebSocket connection failed"
**Solutions**:
- Ensure you're using `wss://` (secure WebSocket)
- Check if the path is correct (`/vless`)
- Verify TLS is enabled in client

#### ❌ "Connection timeout"
**Solutions**:
- Try different proxy IPs from the `/api/nodes` endpoint
- Check if your ISP blocks the worker domain
- Use a custom domain if available

#### ❌ "Subscription not updating"
**Solutions**:
- Delete and re-add the subscription
- Check subscription URL is correct
- Ensure internet connection is stable

### Debug Mode

Enable debug logging by adding to your worker:

```javascript
console.log('Debug info:', {
  pathname: url.pathname,
  headers: Object.fromEntries(request.headers),
  method: request.method
});
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/vless-worker.git
cd vless-worker

# Install dependencies
npm install

# Start development server
npx wrangler dev

# Deploy to staging
npx wrangler deploy --env staging
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
- [VLESS Protocol](https://github.com/XTLS/Xray-core) - Modern proxy protocol
- [v2rayNG](https://github.com/2dust/v2rayNG) - Android client
- Community contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/vless-worker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vless-worker/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/vless-worker/wiki)

---

⭐ **Star this repository if it helps you!**

Made with ❤️ for the community
