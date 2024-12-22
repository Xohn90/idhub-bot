(async () => {
    // 导入所需模块
    const fetch = (await import('node-fetch')).default;  // 导入 node-fetch 模块，用于发送 HTTP 请求
    const chalk = (await import('chalk')).default;  // 导入 chalk 模块，用于输出彩色文字
    const fs = require('fs').promises;  // 导入 fs 模块的 promise 版本，用于文件操作

    // 请求头模板
    const headersTemplate = {
        'Accept': 'application/json, text/plain, */*',  // 接受的响应类型
        'Content-Type': 'application/json; charset=utf-8',  // 请求体的内容类型
        'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"  // 用户代理
    };

    // coday 函数，用于发送 HTTP 请求
    async function coday(url, method, payloadData = null, headers = headersTemplate) {
        try {
            const options = {
                method,  // 请求方法
                headers,  // 请求头
                body: payloadData ? JSON.stringify(payloadData) : null  // 如果有请求体数据，转换为 JSON 格式
            };
            const response = await fetch(url, options);  // 发送请求并等待响应
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);  // 如果响应状态不成功，抛出错误
            return await response.json();  // 返回 JSON 格式的响应数据
        } catch (error) {
            console.error('错误:', error);  // 捕获并输出错误
        }
    }

    // 加载账户会话数据
    async function loadSessions() {
        try {
            const data = await fs.readFile('accounts.txt', 'utf8');
            return data.split('\n').filter(account => account.trim() !== '');
        } catch (error) {
            console.error("加载账户时出错:", error);
            return [];
        }
    }

    async function CheckIn(token, email) {
        const headers = { ...headersTemplate, 'token': `${token}` };  // 添加授权头
        const CheckInPayload = {address: email};  // 登录请求的负载数据

        const checkin = await coday("https://idhub-api.litentry.io/activity/api/v1/checkIn", 'POST', CheckInPayload, headers);

        if (checkin && checkin.status === 200) {
            console.log(chalk.blue(`获取签到积分: ${checkin.data}`));
        } else {
            console.error(chalk.red(`签到失败`));
        }
    }

    // 领取奖励
    async function ClaimCheckIn(token) {
        const headers = { ...headersTemplate, 'token': `${token}` };  // 添加授权头

        const airdrop = await coday("https://idhub-api.litentry.io/activity/api/v1/withdrawAirdrop", 'POST', null, headers);

        if (airdrop && airdrop.data) {
            console.log(chalk.blue(`奖励积分: ${airdrop.data.coins}`));

            const user = await coday("https://idhub-api.litentry.io/activity/api/v1/getUserInfo", 'GET', null, headers);  // 获取用户信息
            const { email, coins, evmAddress } = user.data || {};
            if (email) {
                console.log(chalk.blue(`用户 Email: ${email} | Current ID coins: ${coins} | evmAddress: ${evmAddress}`));
                const dayH = new Date().getHours();
                if (dayH >= 8 && dayH < 12) await CheckIn(token, email);
            } else {
                console.error(chalk.red(`获取用户信息失败`));
            }
        } else {
            console.error(chalk.red(`获取失败`));
        }
    }

    // 主函数
    async function main() {
        const sessions = await loadSessions();  // 加载账户会话数据
        if (sessions.length === 0) {
            console.log("未找到账户信息。");
            return;
        }

        while (true) {
            let nextTime = 4*3600*1000+60000;
            console.log(`\n${Date()}开始为所有账户进行获取...`);

            for (const token of sessions) {
                if (token) await ClaimCheckIn(token);
            }

            console.log(`所有账户已处理。等待4h后进行下一次获取..`);
            await new Promise(resolve => setTimeout(resolve, nextTime));
        }
    }

    main();  // 运行主函数
})();
