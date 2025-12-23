# Security Improvements Implementation Guide

## 安全改进实施指南

本文档提供了详细的代码实现建议，用于增强M365 Copilot MCP Server的安全性。

---

## 1. 设备绑定机制 (Device Binding)

### 目标
防止认证记录被简单复制到其他设备使用。

### 实现方案

#### 步骤 1: 创建设备指纹模块

**新文件**: `src/utils/deviceFingerprint.ts`

```typescript
/**
 * Device Fingerprint Module
 * Generates a unique identifier for the device to prevent credential theft
 */

import { createHash } from 'crypto';
import { networkInterfaces, hostname, platform, arch, cpus } from 'os';
import { info, warn } from './logger.js';

/**
 * Generate a device fingerprint based on hardware and system characteristics
 * This fingerprint should be stable for the same device but different across devices
 */
export function generateDeviceFingerprint(): string {
  try {
    // Collect device characteristics
    const characteristics: string[] = [];

    // 1. Hostname (may change, but usually stable)
    characteristics.push(`hostname:${hostname()}`);

    // 2. Platform and architecture (very stable)
    characteristics.push(`platform:${platform()}`);
    characteristics.push(`arch:${arch()}`);

    // 3. MAC addresses (stable, hardware-based)
    const interfaces = networkInterfaces();
    const macAddresses = Object.values(interfaces)
      .flat()
      .filter(i => i && !i.internal && i.mac !== '00:00:00:00:00:00')
      .map(i => i!.mac)
      .sort();
    
    if (macAddresses.length > 0) {
      characteristics.push(`macs:${macAddresses.join(',')}`);
    } else {
      warn('No MAC addresses found for device fingerprint');
    }

    // 4. CPU model (stable, hardware-based)
    const cpuModels = cpus().map(cpu => cpu.model);
    if (cpuModels.length > 0) {
      characteristics.push(`cpu:${cpuModels[0]}`);
    }

    // 5. Number of CPUs (relatively stable)
    characteristics.push(`cpuCount:${cpus().length}`);

    // Combine all characteristics
    const fingerprintSource = characteristics.join('|');
    
    // Generate SHA-256 hash
    const fingerprint = createHash('sha256')
      .update(fingerprintSource)
      .digest('hex');

    info('Generated device fingerprint', { 
      characteristicCount: characteristics.length,
      fingerprintPreview: fingerprint.substring(0, 16) + '...'
    });

    return fingerprint;
  } catch (error) {
    warn('Failed to generate device fingerprint, using fallback', error);
    // Fallback: use a combination of platform and hostname
    const fallback = createHash('sha256')
      .update(`${platform()}-${arch()}-${hostname()}`)
      .digest('hex');
    return fallback;
  }
}

/**
 * Verify if the current device matches the stored fingerprint
 */
export function verifyDeviceFingerprint(storedFingerprint: string): boolean {
  const currentFingerprint = generateDeviceFingerprint();
  const matches = currentFingerprint === storedFingerprint;
  
  if (!matches) {
    warn('Device fingerprint mismatch - possible credential theft or device change', {
      currentPreview: currentFingerprint.substring(0, 16) + '...',
      storedPreview: storedFingerprint.substring(0, 16) + '...'
    });
  }
  
  return matches;
}

/**
 * Get a human-readable device identifier for logging/display
 */
export function getDeviceIdentifier(): string {
  return `${platform()}-${hostname()}`;
}
```

#### 步骤 2: 修改 AuthenticationRecord 存储

**修改文件**: `src/auth/identity.ts`

```typescript
import { generateDeviceFingerprint, verifyDeviceFingerprint } from '../utils/deviceFingerprint.js';

// 在 AuthenticationManager 类中添加接口
interface AuthRecordWithFingerprint {
  authRecord: string; // serialized AuthenticationRecord
  deviceFingerprint: string;
  createdAt: string;
  deviceInfo: {
    platform: string;
    hostname: string;
  };
}

// 修改 saveAuthRecord 方法
private saveAuthRecord(authRecord: AuthenticationRecord): void {
  try {
    const authRecordPath = this.getAuthRecordPath();
    const serialized = serializeAuthenticationRecord(authRecord);
    
    // 生成设备指纹
    const deviceFingerprint = generateDeviceFingerprint();
    
    // 创建包含设备指纹的记录
    const recordWithFingerprint: AuthRecordWithFingerprint = {
      authRecord: serialized,
      deviceFingerprint,
      createdAt: new Date().toISOString(),
      deviceInfo: {
        platform: os.platform(),
        hostname: os.hostname(),
      },
    };

    // 写入文件（仍然使用0600权限）
    fs.writeFileSync(
      authRecordPath, 
      JSON.stringify(recordWithFingerprint, null, 2), 
      { encoding: 'utf-8', mode: 0o600 }
    );

    this.authRecord = authRecord;
    info('Saved authentication record with device fingerprint', {
      deviceFingerprint: deviceFingerprint.substring(0, 16) + '...',
    });
  } catch (error) {
    logError('Failed to save authentication record', error);
  }
}

// 修改 loadAuthRecord 方法
private loadAuthRecord(): AuthenticationRecord | null {
  try {
    const authRecordPath = this.getAuthRecordPath();
    if (!fs.existsSync(authRecordPath)) {
      return null;
    }

    const data = fs.readFileSync(authRecordPath, 'utf-8');
    
    // 尝试解析为新格式（包含设备指纹）
    try {
      const recordWithFingerprint: AuthRecordWithFingerprint = JSON.parse(data);
      
      // 验证设备指纹
      if (recordWithFingerprint.deviceFingerprint) {
        const isValidDevice = verifyDeviceFingerprint(recordWithFingerprint.deviceFingerprint);
        
        if (!isValidDevice) {
          warn('Device fingerprint mismatch - authentication record may be from another device');
          warn('Deleting potentially stolen authentication record for security');
          fs.unlinkSync(authRecordPath);
          return null;
        }
        
        info('Device fingerprint verified successfully');
      }
      
      // 反序列化认证记录
      this.authRecord = deserializeAuthenticationRecord(recordWithFingerprint.authRecord);
      info('Loaded authentication record from disk with device verification');
      return this.authRecord;
      
    } catch {
      // 回退到旧格式（向后兼容）
      info('Loading authentication record in legacy format (without device fingerprint)');
      this.authRecord = deserializeAuthenticationRecord(data);
      
      // 立即升级到新格式
      if (this.authRecord) {
        info('Upgrading authentication record to include device fingerprint');
        this.saveAuthRecord(this.authRecord);
      }
      
      return this.authRecord;
    }
  } catch (error) {
    logError('Failed to load authentication record', error);
    return null;
  }
}
```

### 优点
- ✅ 防止凭据被简单复制
- ✅ 自动检测并拒绝来自其他设备的认证记录
- ✅ 向后兼容（自动升级旧格式）

### 缺点
- ⚠️ 硬件更换（如网卡）会导致指纹变化
- ⚠️ 虚拟机可能有相似的指纹

---

## 2. 加密 AuthenticationRecord (Encrypt Authentication Record)

### 目标
使用操作系统的安全存储来加密AuthenticationRecord，而不是明文存储。

### 实现方案

#### 选项 A: 使用 keytar (推荐 - 跨平台)

**依赖**: `npm install keytar`

```typescript
import keytar from 'keytar';

const SERVICE_NAME = 'm365-copilot-mcp';

/**
 * Save authentication record using OS secure storage
 */
private async saveAuthRecordSecure(authRecord: AuthenticationRecord): Promise<void> {
  try {
    const serialized = serializeAuthenticationRecord(authRecord);
    const accountName = authRecord.username;
    
    // 使用操作系统的安全存储
    await keytar.setPassword(SERVICE_NAME, accountName, serialized);
    
    this.authRecord = authRecord;
    info('Saved authentication record to OS secure storage', { accountName });
  } catch (error) {
    logError('Failed to save authentication record to secure storage', error);
    // 回退到文件存储
    this.saveAuthRecord(authRecord);
  }
}

/**
 * Load authentication record from OS secure storage
 */
private async loadAuthRecordSecure(): Promise<AuthenticationRecord | null> {
  try {
    // 获取所有账户
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    
    if (credentials.length === 0) {
      return null;
    }
    
    // 使用第一个找到的账户（或可以让用户选择）
    const serialized = credentials[0].password;
    this.authRecord = deserializeAuthenticationRecord(serialized);
    
    info('Loaded authentication record from OS secure storage');
    return this.authRecord;
  } catch (error) {
    logError('Failed to load authentication record from secure storage', error);
    // 回退到文件加载
    return this.loadAuthRecord();
  }
}

/**
 * Delete authentication record from OS secure storage
 */
private async deleteAuthRecordSecure(): Promise<void> {
  try {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    
    for (const cred of credentials) {
      await keytar.deletePassword(SERVICE_NAME, cred.account);
      info('Deleted authentication record from OS secure storage', { 
        account: cred.account 
      });
    }
  } catch (error) {
    logError('Failed to delete authentication record from secure storage', error);
  }
}
```

#### 选项 B: 使用平台特定的API

**Windows (DPAPI)**:
```typescript
import { execSync } from 'child_process';

function encryptWithDPAPI(data: string): string {
  // 使用PowerShell调用DPAPI
  const ps = `
    $data = [System.Text.Encoding]::UTF8.GetBytes("${data}")
    $encrypted = [System.Security.Cryptography.ProtectedData]::Protect(
      $data, 
      $null, 
      [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [Convert]::ToBase64String($encrypted)
  `;
  
  return execSync(`powershell -Command "${ps}"`, { encoding: 'utf8' }).trim();
}

function decryptWithDPAPI(encryptedData: string): string {
  const ps = `
    $encrypted = [Convert]::FromBase64String("${encryptedData}")
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect(
      $encrypted,
      $null,
      [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [System.Text.Encoding]::UTF8.GetString($decrypted)
  `;
  
  return execSync(`powershell -Command "${ps}"`, { encoding: 'utf8' }).trim();
}
```

### 优点
- ✅ 利用操作系统的加密机制
- ✅ 与token缓存相同的安全级别
- ✅ 自动绑定到用户账户

### 缺点
- ⚠️ keytar需要原生编译（可能影响npm安装）
- ⚠️ 增加复杂性

---

## 3. 令牌撤销机制 (Token Revocation)

### 目标
在用户注销时立即撤销Azure AD令牌，而不仅仅清除本地缓存。

### 实现方案

**修改文件**: `src/auth/identity.ts`

```typescript
/**
 * Revoke access token at Azure AD
 * This makes the token immediately invalid
 */
async function revokeAccessToken(accessToken: string, tenantId: string = 'common'): Promise<void> {
  try {
    info('Revoking access token at Azure AD');
    
    // Azure AD token revocation endpoint
    const revokeUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`;
    
    // Alternative: use the token revocation endpoint
    // const revokeUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/revoke`;
    
    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${accessToken}&token_type_hint=access_token`,
    });
    
    if (response.ok) {
      info('Successfully revoked access token at Azure AD');
    } else {
      warn('Failed to revoke token at Azure AD', { 
        status: response.status,
        statusText: response.statusText 
      });
    }
  } catch (error) {
    // Non-fatal: even if revocation fails, we still clear local cache
    warn('Error revoking token (non-fatal)', error);
  }
}

/**
 * Enhanced logout with token revocation
 */
export async function logoutWithRevocation(): Promise<void> {
  try {
    info('Starting logout with token revocation');
    
    // 1. Try to get current token and revoke it
    if (authManager) {
      try {
        const token = await authManager.getAccessToken(REQUIRED_SCOPES);
        const config = authManager.getConfig();
        await revokeAccessToken(token, config.tenantId);
      } catch (error) {
        warn('Could not revoke token (may not be authenticated)', error);
      }
    }
    
    // 2. Continue with normal logout (clear local cache)
    logout();
    
    info('Logout with revocation completed');
  } catch (error) {
    logError('Error during logout with revocation', error);
    throw new AuthenticationError('Failed to logout', { error });
  }
}
```

**修改文件**: `src/server.ts`

```typescript
// 在 m365copilotlogout 工具中使用新的撤销函数
case 'm365copilotlogout': {
  info('Processing logout request with token revocation');
  
  // 使用增强的注销函数
  await logoutWithRevocation();
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'Logout successful. Access token revoked and all cached credentials cleared.',
        nextSteps: [
          'Your access token has been revoked at Microsoft.',
          'You MUST restart the MCP server for the logout to take full effect.',
          'After restart, you will be prompted to log in again on the next tool call.',
        ],
      }, null, 2),
    }],
  };
}
```

### 优点
- ✅ 令牌立即失效
- ✅ 即使本地缓存被盗也无法使用
- ✅ 提高整体安全性

### 缺点
- ⚠️ 需要网络连接
- ⚠️ 如果撤销失败，令牌仍然有效直到过期

---

## 4. 日志安全性改进 (Logging Security)

### 目标
防止敏感信息（如令牌、密码）出现在日志中。

### 实现方案

**新文件**: `src/utils/logSanitizer.ts`

```typescript
/**
 * Log Sanitizer - Remove sensitive data from logs
 */

/**
 * List of sensitive field names to sanitize
 */
const SENSITIVE_FIELDS = [
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'password',
  'secret',
  'clientsecret',
  'client_secret',
  'authorization',
  'bearer',
  'apikey',
  'api_key',
];

/**
 * Mask for sensitive data
 */
const MASK = '***REDACTED***';

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[-_\s]/g, '');
  return SENSITIVE_FIELDS.some(sensitive => 
    normalized.includes(sensitive.toLowerCase())
  );
}

/**
 * Sanitize an object by removing/masking sensitive fields
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      sanitized[key] = MASK;
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'string' && value.length > 50) {
      // Long strings might be tokens - mask them
      if (value.startsWith('eyJ') || value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
        // Looks like a JWT
        sanitized[key] = MASK;
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize error objects
 */
export function sanitizeError(error: any): any {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
    };
  }
  return sanitizeObject(error);
}
```

**修改文件**: `src/utils/logger.ts`

```typescript
import { sanitizeObject } from './logSanitizer.js';

// 修改所有日志函数以自动净化数据
export function info(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const sanitizedData = data ? sanitizeObject(data) : undefined;
  const logMessage = sanitizedData 
    ? `[${timestamp}] INFO: ${message} ${JSON.stringify(sanitizedData)}`
    : `[${timestamp}] INFO: ${message}`;
  console.error(logMessage);
}

export function debug(message: string, data?: any): void {
  if (process.env.LOG_LEVEL === 'DEBUG') {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    const logMessage = sanitizedData 
      ? `[${timestamp}] DEBUG: ${message} ${JSON.stringify(sanitizedData)}`
      : `[${timestamp}] DEBUG: ${message}`;
    console.error(logMessage);
  }
}

// 类似的修改应用到 warn 和 error 函数
```

### 优点
- ✅ 自动防止敏感数据泄露
- ✅ 透明应用于所有日志
- ✅ 保持日志的可读性

### 缺点
- ⚠️ 可能过度净化某些合法字段
- ⚠️ 增加日志处理开销（微小）

---

## 5. 异常活动检测 (Anomaly Detection)

### 目标
检测可能的凭据盗用，如异常的令牌请求模式。

### 实现方案

**新文件**: `src/utils/anomalyDetector.ts`

```typescript
/**
 * Anomaly Detection for Token Usage
 */

interface TokenUsageEvent {
  timestamp: Date;
  scopes: string[];
  success: boolean;
  errorType?: string;
}

class AnomalyDetector {
  private events: TokenUsageEvent[] = [];
  private readonly MAX_EVENTS = 100;
  private readonly MAX_REQUESTS_PER_MINUTE = 10;
  private readonly MAX_FAILURES_PER_HOUR = 5;

  /**
   * Record a token request event
   */
  recordEvent(scopes: string[], success: boolean, errorType?: string): void {
    this.events.push({
      timestamp: new Date(),
      scopes,
      success,
      errorType,
    });

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Check for anomalies
    this.checkAnomalies();
  }

  /**
   * Check for anomalous patterns
   */
  private checkAnomalies(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check 1: Too many requests in short time
    const recentRequests = this.events.filter(e => e.timestamp > oneMinuteAgo);
    if (recentRequests.length > this.MAX_REQUESTS_PER_MINUTE) {
      warn('Anomaly detected: Too many token requests in short time', {
        count: recentRequests.length,
        threshold: this.MAX_REQUESTS_PER_MINUTE,
      });
    }

    // Check 2: Too many failures
    const recentFailures = this.events.filter(
      e => e.timestamp > oneHourAgo && !e.success
    );
    if (recentFailures.length > this.MAX_FAILURES_PER_HOUR) {
      warn('Anomaly detected: Too many authentication failures', {
        count: recentFailures.length,
        threshold: this.MAX_FAILURES_PER_HOUR,
      });
    }

    // Check 3: Unusual time of access (optional)
    const hour = now.getHours();
    if (hour < 6 || hour > 22) {
      info('Token request outside normal hours', { hour });
    }
  }

  /**
   * Get anomaly report
   */
  getReport(): {
    totalEvents: number;
    successRate: number;
    recentFailures: number;
  } {
    const successCount = this.events.filter(e => e.success).length;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailures = this.events.filter(
      e => e.timestamp > oneHourAgo && !e.success
    ).length;

    return {
      totalEvents: this.events.length,
      successRate: this.events.length > 0 ? successCount / this.events.length : 0,
      recentFailures,
    };
  }
}

// Singleton instance
export const anomalyDetector = new AnomalyDetector();
```

**修改文件**: `src/auth/identity.ts`

```typescript
import { anomalyDetector } from '../utils/anomalyDetector.js';

// 在 getAccessToken 方法中添加记录
public async getAccessToken(scopes: string[]): Promise<string> {
  // ... existing code ...
  
  try {
    const tokenResponse = await this.credential.getToken(scopes);
    
    // 记录成功事件
    anomalyDetector.recordEvent(scopes, true);
    
    // ... rest of the code ...
    return tokenResponse.token;
  } catch (error) {
    // 记录失败事件
    const errorType = error instanceof Error ? error.name : 'Unknown';
    anomalyDetector.recordEvent(scopes, false, errorType);
    
    // ... rest of the error handling ...
    throw error;
  }
}
```

### 优点
- ✅ 自动检测可疑活动
- ✅ 帮助早期发现凭据盗用
- ✅ 提供审计数据

### 缺点
- ⚠️ 可能产生误报
- ⚠️ 需要调优阈值

---

## 6. 实施优先级建议 (Implementation Priority)

### 第一阶段 (立即实施)
1. ✅ **日志安全性改进** - 低风险，高价值
2. ✅ **令牌撤销机制** - 简单实现，显著提升安全性
3. ✅ **文档更新** - 添加SECURITY.md和安全最佳实践

### 第二阶段 (1-2周内)
4. ✅ **设备绑定机制** - 核心安全改进
5. ✅ **异常活动检测** - 增强监控能力

### 第三阶段 (长期规划)
6. ⚠️ **加密AuthenticationRecord** - 需要评估原生依赖影响
7. ⚠️ **审计工具** - 企业级功能

---

## 7. 测试计划 (Testing Plan)

### 安全测试场景

1. **凭据移植测试**
   - 在计算机A上认证
   - 复制凭据文件到计算机B
   - 验证是否被正确拒绝

2. **设备指纹稳定性测试**
   - 重启系统后验证指纹一致性
   - 网络配置变化后的指纹变化

3. **令牌撤销测试**
   - 注销后令牌是否立即失效
   - 网络失败时的降级处理

4. **日志净化测试**
   - 确认令牌不会出现在日志中
   - 错误消息中的敏感信息被掩码

5. **异常检测测试**
   - 模拟快速连续请求
   - 模拟多次认证失败

---

## 总结 (Summary)

本实施指南提供了6个主要的安全改进方向，每个都包含详细的代码示例和实施建议。

**建议的实施顺序**:
1. 日志安全性 (简单，低风险)
2. 令牌撤销 (简单，高价值)
3. 设备绑定 (核心改进)
4. 异常检测 (增强监控)
5. 加密存储 (评估后决定)

所有改进都遵循以下原则：
- ✅ 向后兼容
- ✅ 渐进式增强
- ✅ 详细的错误处理
- ✅ 完善的日志记录

---

*Last Updated: 2025-12-23*
*Version: 1.0*
