# Security Analysis - M365 Copilot MCP Server

## 安全分析报告 (Security Analysis Report)

### 问题概述 (Problem Overview)

本项目作为一个Model Context Protocol (MCP)服务器，需要处理Microsoft 365的敏感凭据和访问令牌。主要安全关注点包括：

1. **凭据缓存的可移植性** - 缓存的凭据文件是否可以被复制到其他电脑使用？
2. **令牌存储安全** - 访问令牌如何存储和保护？
3. **认证持久化** - 认证记录的安全性如何？
4. **数据传输安全** - API调用的数据如何保护？

---

## 当前安全机制分析 (Current Security Mechanism Analysis)

### 1. 认证记录存储 (Authentication Record Storage)

**位置**: `~/.IdentityService/m365-copilot-mcp-auth.json`

**内容**: AuthenticationRecord包含的是**非敏感的账户元数据**，包括：
- 用户名 (username)
- 租户ID (tenant ID)
- 授权端点 (authority)

**重要说明**: 
- ✅ **不包含任何令牌或密钥**
- ✅ 文件权限设置为 `0600` (仅所有者可读写)
- ⚠️ 仅存储账户标识信息，不是访问凭据

**代码位置**: `src/auth/identity.ts:91-105`

```typescript
// 写入文件时限制权限 (0600 = 仅所有者读写)
fs.writeFileSync(authRecordPath, serialized, { 
  encoding: 'utf-8', 
  mode: 0o600  // 重要的安全措施
});
```

### 2. 访问令牌缓存 (Access Token Cache)

**存储位置**:
- **Windows**: `%LOCALAPPDATA%\.IdentityService\m365-copilot-mcp-cache`
- **macOS**: `~/Library/Application Support/.IdentityService/m365-copilot-mcp-cache`
- **Linux**: `~/.IdentityService/m365-copilot-mcp-cache`

**加密保护**: 使用 `@azure/identity-cache-persistence` 插件，依赖操作系统级别的加密：
- **Windows**: DPAPI (Data Protection API) - 绑定到用户账户
- **macOS**: Keychain - 绑定到用户账户和系统
- **Linux**: LibSecret - 绑定到用户会话

**代码位置**: `src/auth/identity.ts:24,172-176`

```typescript
// 启用持久化令牌缓存
useIdentityPlugin(cachePersistencePlugin);

// 配置令牌缓存持久化选项
tokenCachePersistenceOptions: {
  enabled: true,
  name: 'm365-copilot-mcp-cache',
}
```

### 3. 内存中的令牌缓存 (In-Memory Token Cache)

**位置**: `AuthenticationManager.tokenCache` (Map对象)

**生命周期**: 仅在进程运行期间存在

**风险评估**: 
- ✅ 进程结束后自动清除
- ⚠️ 可能被内存转储攻击获取（但攻击者需要系统级访问权限）

---

## 核心安全问题：凭据可移植性 (Core Security Issue: Credential Portability)

### 问题：缓存的凭据能否在其他电脑上使用？

**简短回答**: **在大多数情况下不能，但存在一定风险**

### 详细分析：

#### ✅ **令牌缓存的保护 (Token Cache Protection)**

**Windows (DPAPI)**:
- ✅ 令牌使用DPAPI加密，密钥绑定到Windows用户账户
- ✅ 即使复制到其他电脑，**无法解密**（不同的用户/机器 = 不同的DPAPI密钥）
- ✅ **风险：低** - 需要攻击者同时获取用户的Windows密码和缓存文件

**macOS (Keychain)**:
- ✅ 令牌存储在macOS Keychain，绑定到用户账户和系统
- ✅ 复制到其他电脑**无法访问**
- ✅ **风险：低** - macOS Keychain提供强加密

**Linux (LibSecret)**:
- ✅ 令牌存储在系统密钥环中
- ⚠️ **风险：中** - 取决于具体的密钥环实现（gnome-keyring, KWallet等）
- ⚠️ 某些配置下可能不够安全

#### ⚠️ **认证记录的风险 (Authentication Record Risk)**

**文件**: `~/.IdentityService/m365-copilot-mcp-auth.json`

**虽然不包含令牌，但仍有风险**:

1. **信息泄露**: 
   - 包含用户名、租户ID等信息
   - 攻击者可以了解账户结构

2. **重放攻击的可能性**:
   - 单独复制此文件无法直接获取访问权限
   - 但在某些边缘情况下，如果攻击者能够：
     - 获取用户的Microsoft账户密码
     - 使用相同的Azure AD应用程序
     - 复制AuthenticationRecord文件
   - 可能**绕过多因素认证的某些检查**（因为系统认为是"已知设备"）

3. **文件权限风险**:
   - ✅ 设置了 `0600` 权限
   - ⚠️ 但在共享系统或备份中可能被访问

---

## 其他安全隐患 (Other Security Risks)

### 1. ⚠️ **默认Azure AD应用使用公共ClientID**

**当前实现**: `src/auth/identity.ts:123`
```typescript
const DEFAULT_CLIENT_ID = 'f44ab954-9e38-4330-aa49-e93d73ab0ea6';
```

**风险**:
- 所有用户共享同一个Azure AD应用注册
- 如果该应用被滥用或吊销，所有用户受影响
- 无法进行组织级别的访问控制

**影响**: 中等

**缓解措施**:
- ✅ 已提供自定义ClientID选项（环境变量配置）
- 建议企业用户使用自己的Azure AD应用

### 2. ⚠️ **无设备指纹或绑定机制**

**当前实现**: 
- 无设备唯一标识符
- 无硬件绑定机制
- 仅依赖操作系统的加密

**风险**:
- 虚拟机克隆场景下可能存在风险
- 如果攻击者能够复制整个用户环境（如VM快照），可能获取访问权限

**影响**: 低到中等（取决于使用场景）

### 3. ⚠️ **令牌刷新机制的透明性**

**当前实现**: `src/auth/identity.ts:186-236`
- 令牌自动刷新
- 无额外验证或通知

**风险**:
- 如果令牌被盗，可能长期有效
- 用户不知道令牌何时刷新

**影响**: 低

### 4. ⚠️ **日志可能包含敏感信息**

**当前实现**: 
- 日志记录到stderr
- 包含请求参数、错误详情

**风险检查**: `src/utils/httpClient.ts:20-24`
```typescript
debug(`Making ${method} request to ${url}`, {
  endpoint,
  hasBody: !!body,
  bodyKeys: body ? Object.keys(body) : []
});
```

**评估**:
- ✅ 不直接记录令牌内容
- ⚠️ 但错误消息可能包含敏感API响应

**影响**: 低

### 5. ✅ **HTTPS传输安全**

**当前实现**: `src/utils/httpClient.ts:18`
```typescript
const url = `https://graph.microsoft.com${endpoint}`;
```

**评估**:
- ✅ 所有API调用使用HTTPS
- ✅ 依赖Node.js的TLS实现
- ✅ 证书验证默认启用

**风险**: 极低

### 6. ⚠️ **无令牌撤销通知机制**

**当前实现**:
- 用户注销时清除本地缓存
- 但不通知Azure AD撤销令牌

**风险**:
- 已发放的令牌在过期前仍然有效
- 注销不是立即生效

**影响**: 低（令牌有效期通常较短）

---

## 安全改进建议 (Security Improvement Recommendations)

### 🔴 高优先级 (High Priority)

#### 1. 添加设备绑定机制
**建议**:
```typescript
// 生成设备唯一标识符
import { createHash } from 'crypto';
import { networkInterfaces } from 'os';

function getDeviceFingerprint(): string {
  const interfaces = networkInterfaces();
  const macAddresses = Object.values(interfaces)
    .flat()
    .filter(i => i && !i.internal && i.mac !== '00:00:00:00:00:00')
    .map(i => i.mac)
    .sort();
  
  const hostInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  const fingerprint = createHash('sha256')
    .update(macAddresses.join('-') + hostInfo)
    .digest('hex');
  
  return fingerprint;
}

// 在保存AuthenticationRecord时包含设备指纹
// 验证时检查设备指纹是否匹配
```

**好处**:
- 防止凭据文件被简单复制到其他设备
- 增加攻击难度

**实施工作量**: 中等

#### 2. 增强AuthenticationRecord的安全性
**建议**:
```typescript
// 使用操作系统的加密API加密AuthenticationRecord
// 而不是明文存储（即使它只包含元数据）

// Windows: 使用DPAPI
// macOS/Linux: 使用keytar或类似库

// 示例（跨平台）:
import keytar from 'keytar';

async function saveSecureAuthRecord(authRecord: AuthenticationRecord): Promise<void> {
  const serviceName = 'm365-copilot-mcp';
  const accountName = authRecord.username;
  const serialized = serializeAuthenticationRecord(authRecord);
  
  await keytar.setPassword(serviceName, accountName, serialized);
}
```

**好处**:
- 利用操作系统的安全存储
- 与令牌缓存使用相同的安全级别

**实施工作量**: 中等

**注意**: 需要添加原生依赖，可能影响跨平台兼容性

#### 3. 实施令牌撤销机制
**建议**:
```typescript
// 在logout函数中添加令牌撤销
export async function logout(): Promise<void> {
  try {
    // 1. 获取当前令牌
    const authManager = getAuthManager();
    const token = await authManager.getAccessToken(REQUIRED_SCOPES);
    
    // 2. 调用Azure AD撤销端点
    await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // 3. 清除本地缓存（现有逻辑）
    // ...
  } catch (error) {
    // 即使撤销失败，也继续清除本地缓存
  }
}
```

**好处**:
- 立即使令牌失效
- 提高安全性

**实施工作量**: 低

### 🟡 中优先级 (Medium Priority)

#### 4. 添加异常活动检测
**建议**:
```typescript
// 记录每次token获取的元数据
interface TokenUsageLog {
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  scopes: string[];
}

// 检测异常模式
// - 短时间内大量token请求
// - 来自不同IP的请求（如果可获取）
// - 在非工作时间的请求
```

**好处**:
- 帮助检测凭据被盗用
- 提供审计日志

**实施工作量**: 高

#### 5. 实施自动令牌轮换
**建议**:
```typescript
// 定期强制刷新令牌，即使未过期
// 缩短令牌有效期窗口

const MAX_TOKEN_LIFETIME = 1 * 60 * 60 * 1000; // 1小时

// 在getAccessToken中添加检查
if (cached && cached.issuedAt + MAX_TOKEN_LIFETIME < Date.now()) {
  // 强制刷新
}
```

**好处**:
- 限制被盗令牌的有效时间

**实施工作量**: 低

#### 6. 改进日志安全性
**建议**:
```typescript
// 创建敏感数据过滤器
function sanitizeLogData(data: any): any {
  const sensitive = ['token', 'password', 'secret', 'authorization'];
  // 递归处理对象，移除或掩码敏感字段
  // ...
}

// 在logger中使用
debug(`Request data: ${JSON.stringify(sanitizeLogData(body))}`);
```

**好处**:
- 防止敏感信息泄露到日志

**实施工作量**: 低

### 🟢 低优先级 (Low Priority)

#### 7. 添加安全审计工具
**建议**:
- 提供命令行工具检查凭据文件完整性
- 显示当前认证状态和安全评分
- 检测潜在的安全问题

#### 8. 实施证书固定 (Certificate Pinning)
**建议**:
```typescript
// 固定Microsoft Graph API的证书
// 防止中间人攻击（虽然Node.js已经验证证书）
```

**注意**: 可能导致维护问题，当Microsoft更新证书时

---

## 安全最佳实践指南 (Security Best Practices Guide)

### 对于最终用户 (For End Users)

1. **使用自己的Azure AD应用** 🔴
   - 如果是企业环境，注册自己的应用
   - 配置适当的权限和条件访问策略

2. **定期注销** 🟡
   - 长期不使用时，运行logout清除凭据
   - 特别是在共享或公共计算机上

3. **保护.IdentityService目录** 🔴
   - 确保目录权限正确（仅所有者可访问）
   - 不要共享或备份此目录到不安全的位置

4. **启用多因素认证 (MFA)** 🔴
   - 在Microsoft账户上启用MFA
   - 即使凭据被盗，也需要第二因素

5. **监控Azure AD登录活动** 🟡
   - 定期检查Azure AD门户的登录日志
   - 查找可疑活动

6. **不要在虚拟机快照中包含凭据** 🟡
   - 创建VM快照前先logout
   - 或从快照中排除.IdentityService目录

7. **使用条件访问策略** 🟡
   - 在Azure AD中配置条件访问
   - 限制只能从特定IP、设备或位置访问

### 对于开发者 (For Developers)

1. **遵循最小权限原则**
   - 只请求必需的API权限
   - 定期审查权限需求

2. **及时更新依赖**
   - 保持`@azure/identity`等包最新
   - 关注安全公告

3. **审查代码中的敏感数据处理**
   - 确保不在日志中记录令牌
   - 使用安全的字符串比较

4. **实施安全测试**
   - 添加安全相关的单元测试
   - 使用安全扫描工具

---

## 威胁模型 (Threat Model)

### 威胁场景分析

| 威胁 | 可能性 | 影响 | 风险等级 | 当前缓解措施 | 建议改进 |
|------|--------|------|----------|------------|---------|
| **1. 凭据文件被复制到其他电脑** | 中 | 中 | 🟡 中 | OS级加密（令牌）<br>文件权限（0600） | 添加设备绑定<br>加密AuthRecord |
| **2. 内存转储获取令牌** | 低 | 高 | 🟡 中 | 短期令牌缓存 | 无需改进（需系统级访问） |
| **3. 中间人攻击** | 极低 | 高 | 🟢 低 | HTTPS + 证书验证 | 无需改进 |
| **4. 默认ClientID被滥用** | 低 | 中 | 🟡 中 | 支持自定义ClientID | 文档中强调企业使用自定义ID |
| **5. 日志泄露敏感信息** | 低 | 中 | 🟢 低 | 不记录令牌 | 添加日志净化 |
| **6. VM克隆/快照** | 中 | 中 | 🟡 中 | OS级加密 | 添加设备指纹<br>文档警告 |
| **7. 被盗令牌长期有效** | 低 | 中 | 🟡 中 | Azure AD令牌过期 | 实施主动撤销 |
| **8. 共享系统上的文件访问** | 中 | 高 | 🟡 中 | 文件权限0600 | 无需改进（依赖OS） |
| **9. 备份中的凭据暴露** | 中 | 中 | 🟡 中 | 无 | 文档中警告<br>.gitignore排除 |
| **10. 社会工程学攻击** | 中 | 高 | 🟡 中 | 需用户MFA | 用户教育 |

### 攻击链分析

**场景：攻击者试图复制凭据到其他电脑**

1. **步骤1：获取文件访问**
   - 攻击者需要访问目标电脑上的`~/.IdentityService/`目录
   - **障碍**：需要用户级别的文件系统访问权限

2. **步骤2：复制凭据文件**
   - 复制`m365-copilot-mcp-auth.json`（AuthenticationRecord）
   - 复制`m365-copilot-mcp-cache`（令牌缓存）
   - **障碍**：文件权限0600（仅所有者可读）

3. **步骤3：尝试使用凭据**
   
   **3a. 复制令牌缓存到其他电脑**
   - Windows: DPAPI加密 → **失败**（密钥绑定到原用户/机器）
   - macOS: Keychain → **失败**（系统绑定）
   - Linux: LibSecret → **可能失败**（取决于配置）
   
   **3b. 复制AuthenticationRecord**
   - 单独复制无用（不包含令牌）
   - 需要配合Microsoft账户密码
   - **障碍**：需要知道用户密码，可能还需要MFA

4. **结论**：
   - 🔴 **高难度**在Windows/macOS上
   - 🟡 **中难度**在某些Linux配置上
   - ⚠️ 如果配合VM克隆，难度降低

---

## 合规性考虑 (Compliance Considerations)

### GDPR (欧盟通用数据保护条例)
- ✅ 数据存储在用户本地设备
- ✅ 用户可以随时删除（logout）
- ⚠️ 需要在文档中说明数据处理方式

### SOC 2
- ⚠️ 缺乏审计日志
- ⚠️ 无集中式凭据管理
- 💡 建议：企业用户应使用自己的Azure AD应用并配置审计

### HIPAA / 金融行业
- ⚠️ 本地凭据存储可能不符合某些严格要求
- 💡 建议：使用短期令牌 + 强制MFA

---

## 总结 (Summary)

### 核心问题回答：缓存的凭据能被复制使用吗？

**技术上的回答**：

1. **令牌缓存（最重要的凭据）**：
   - ❌ **不能**在Windows/macOS上简单复制使用（加密绑定到系统）
   - ⚠️ 在Linux上**取决于配置**（某些情况可能可以）

2. **AuthenticationRecord（账户元数据）**：
   - ⚠️ **技术上可以复制**，但单独无用
   - ⚠️ 配合用户密码**可能绕过部分MFA检查**

3. **综合风险评估**：
   - 🟢 **低风险** - 正常使用场景，Windows/macOS系统
   - 🟡 **中风险** - Linux系统，或VM克隆场景
   - 🔴 **高风险** - 共享系统，或凭据+密码同时泄露

### 最重要的安全建议

**立即实施** 🔴：
1. ✅ **使用MFA** - 已经被Microsoft账户支持，强烈建议
2. ✅ **使用自己的Azure AD应用** - 企业用户必须
3. ✅ **保护.IdentityService目录** - 检查文件权限

**推荐实施** 🟡：
1. 添加设备绑定机制
2. 加密AuthenticationRecord
3. 实施令牌撤销
4. 改进日志安全性

**长期规划** 🟢：
1. 添加审计工具
2. 实施异常检测
3. 提供企业级集成选项

---

## 参考资料 (References)

1. [Azure Identity SDK Security](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
2. [Microsoft Graph API Security](https://learn.microsoft.com/en-us/graph/security-authorization)
3. [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/seccng/cng-dpapi)
4. [macOS Keychain](https://developer.apple.com/documentation/security/keychain_services)
5. [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
6. [OWASP Token Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

---

*Last Updated: 2025-12-23*
*Version: 1.0*
