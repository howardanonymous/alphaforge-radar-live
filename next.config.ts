const nextConfig = {
  output: 'export', // 這是關鍵，強制產生靜態網頁
  images: { unoptimized: true }, // GitHub Pages 不支援預設的圖片優化，必須設為 true
  basePath: "/alphaforge-radar-live", // 必須跟你的 Repository 名稱完全一樣
};

export default nextConfig;