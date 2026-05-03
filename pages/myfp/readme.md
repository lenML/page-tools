---
title: myfp
desc: 浏览器指纹查看工具，包括ip地址
---

# myfp

浏览器指纹查看

### 🧩 Puppeteer 对接说明

1. **全局函数**：`window.getFingerprintResult()` 返回一个 `Promise`，该 Promise 会在指纹和 IP 数据加载完成后自动 resolve（无论成功或失败）。
2. **返回值结构**：
   ```json
   {
     "fingerprint": "访问者ID",
     "components": {
       /* 所有指纹特征组件 */
     },
     "ipData": {
       /* ipinfo.io 返回的 IP 信息 */
     }
   }
   ```
   如果发生错误，返回的对象中会包含 `error` 字段，且其他字段为 `null`。
3. **Puppeteer 调用示例**：
   ```javascript
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   await page.goto("https://lenml.github.io/page-tools/myfp/");
   // 等待数据就绪并获取
   const result = await page.evaluate(() => window.getFingerprintResult());
   console.log(result);
   ```
   Puppeteer 无需关心内部加载状态，直接 `await` 即可。
