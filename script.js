// 依赖：SheetJS
const STORAGE = {
  USERS: "raffle_users",
  AWARDS: "raffle_awards",
  WINNERS: "raffle_winners",
  BG_IMG: "raffle_bg",
  ADMIN_PWD: "raffle_admin_pwd" // 后台密码
};

// ====================== 后台密码（可自行修改） ======================
const DEFAULT_PWD = "admin123";

// ====================== 本地存储 ======================
function getStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function setStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ====================== Excel解析 ======================
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        resolve(json);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ====================== 导入名单 ======================
async function importUsers(file) {
  if (!file) return alert("请选择文件");
  const arr = await parseExcel(file);
  const users = arr.slice(1).map(r => (r[0] || "").trim()).filter(Boolean);
  setStorage(STORAGE.USERS, users);
  alert(`导入成功：共 ${users.length} 人`);
  renderAwards();
}

// ====================== 导入奖项 ======================
async function importAwards(file) {
  if (!file) return alert("请选择文件");
  const arr = await parseExcel(file);
  const awards = arr.slice(1).map(r => ({
    name: (r[0] || "").trim(),
    limit: Number(r[1]) || 0,
    count: 0
  })).filter(a => a.name && a.limit > 0);
  setStorage(STORAGE.AWARDS, awards);
  alert(`导入奖项成功：共 ${awards.length} 项`);
  renderAwards();
}

// ====================== 抽奖核心 ======================
function draw(name) {
  name = name.trim();
  const users = getStorage(STORAGE.USERS);
  const awards = getStorage(STORAGE.AWARDS);
  const winners = getStorage(STORAGE.WINNERS);

  // 已中奖
  const already = winners.find(w => w.name === name);
  if (already) return { ok: false, msg: `【${name}】已迎过好运：${already.award}` };

  // 不在名单 → 一马当先
  if (!users.includes(name)) {
    return { ok: true, award: "一马当先", isSpecial: true };
  }

  // 剩余奖项
  const available = awards.filter(a => a.count < a.limit);
  if (available.length === 0) return { ok: false, msg: "所有好运已迎完" };

  // 随机
  const idx = Math.floor(Math.random() * available.length);
  const win = available[idx];

  // 更新计数
  const newAwards = awards.map(a => {
    if (a.name === win.name) a.count += 1;
    return a;
  });
  setStorage(STORAGE.AWARDS, newAwards);

  // 记录中奖
  winners.push({
    name,
    award: win.name,
    time: new Date().toLocaleString()
  });
  setStorage(STORAGE.WINNERS, winners);

  return { ok: true, award: win.name, isSpecial: false };
}

// ====================== 导出中奖 ======================
function exportWinners() {
  const winners = getStorage(STORAGE.WINNERS);
  if (winners.length === 0) return alert("暂无迎好运记录");
  const header = "姓名,好运,时间\n";
  const rows = winners.map(w => `${w.name},${w.award},${w.time}`).join("\n");
  const csv = header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `迎好运名单_${new Date().toLocaleDateString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====================== 背景图 ======================
function setBackground(imgBase64) {
  document.body.style.backgroundImage = `url(${imgBase64})`;
  localStorage.setItem(STORAGE.BG_IMG, imgBase64);
}
function loadBackground() {
  const bg = localStorage.getItem(STORAGE.BG_IMG);
  if (bg) document.body.style.backgroundImage = `url(${bg})`;
}

// ====================== 清空 ======================
function clearAll() {
  if (!confirm("确定清空所有名单、好运、记录？")) return;
  localStorage.clear();
  alert("已清空");
  location.reload();
}

// ====================== 后台密码 ======================
function checkPwd(pwd) {
  return pwd === DEFAULT_PWD;
}

// ====================== 计算剩余好运 ======================
function getRemain() {
  const awards = getStorage(STORAGE.AWARDS);
  return awards.map(a => ({
    name: a.name,
    limit: a.limit,
    count: a.count,
    remain: a.limit - a.count
  }));
}
