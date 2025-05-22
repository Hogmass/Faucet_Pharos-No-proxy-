const fs = require("fs");
const fetch = require("node-fetch");

// Hàm màu sắc console
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
};

const headers = {
  referer: "https://testnet.pharosnetwork.xyz/",
  authorization:
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Nzg4OTQ0OTEsImlhdCI6MTc0NzM1ODQ5MSwic3ViIjoiMHg0ODE3MzZjNjUzZDU2QjM5MTNiMjgyNzI0MTI1RmFkOTQwYWRiMTQ4In0.dAElbmbjmucnv4LbOpZj1QUENvZh_gCdb6NkkSwLaKg",
};

async function faucet(address) {
  try {
    const res = await fetch(
      `https://api.pharosnetwork.xyz/faucet/daily?address=${address}`,
      {
        method: "POST",
        headers,
      }
    );

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.log(
        colors.red(`❌ Invalid JSON for ${address}: ${parseErr.message}`)
      );
      return false;
    }

    const code = data?.code;
    const msg = data?.msg || data?.message || "";

    if (code === 0 && msg.toLowerCase() === "ok") {
      console.log(colors.green(`✅ Done! : ${address}`));
      return true;
    } else if (code === 1 && msg.includes("faucet did not cooldown")) {
      console.log(colors.yellow(`⏳ Cooldown : ${address}`));
      return true;
    } else {
      console.log(
        colors.red(`❌ Not removed: ${address} → ${JSON.stringify(data)}`)
      );
      return false;
    }
  } catch (err) {
    console.error(colors.red(`❌ Fetch error for ${address}: ${err.message}`));
    return false;
  }
}

async function runAll() {
  let wallets = fs
    .readFileSync("wallets.txt", "utf-8")
    .split("\n")
    .filter(Boolean);
  let toBeRemoved = [];

  const concurrency = 100;
  let index = 0;

  async function next() {
    if (index >= wallets.length) return;
    const address = wallets[index++];
    const removed = await faucet(address);
    if (removed) toBeRemoved.push(address);
    return next();
  }

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(next());
  }

  await Promise.all(promises);

  const remainingWallets = wallets.filter(
    (addr) => !toBeRemoved.includes(addr)
  );
  fs.writeFileSync("wallets.txt", remainingWallets.join("\n"), "utf-8");

  console.log(
    colors.magenta(
      `\n🧹 Removed (${toBeRemoved.length}) Wallet Success in wallets.txt`
    )
  );
  console.log(
    colors.green(`📦 Remaining wallets in file: ${remainingWallets.length}\n`)
  );
}

async function autoRun() {
  while (true) {
    await runAll();

    const remaining = fs
      .readFileSync("wallets.txt", "utf-8")
      .split("\n")
      .filter(Boolean);

    if (remaining.length === 0) {
      console.log(
        colors.magenta("🎉 Đã xử lý hết tất cả ví. Kết thúc chương trình.")
      );
      process.exit(0);
    }

    console.log(colors.yellow("⏳ Đợi 5 phút trước khi chạy lại...\n"));
    await new Promise((res) => setTimeout(res, 5 * 60 * 1000)); // 5 phút
  }
}

// Chạy tự động
autoRun();

