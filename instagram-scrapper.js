import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const url = "https://insta-stories-viewer.com/hoppy_hippo_playland/";
const outputDir = path.join("src", "assets", "img", "instagram");
const outputPath = path.join(outputDir, "profile_pic.png");
const dataOutputPath = path.join("src", "_data", "instagram.json");

const pickImageUrl = (img) => {
  if (img?.src) {
    return img.src;
  }

  if (img?.srcset) {
    const first = img.srcset.split(",")[0]?.trim();
    return first?.split(" ")[0];
  }

  return null;
};

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // открыть реальный браузер
    defaultViewport: null, // использовать размер окна
    args: ["--start-maximized"]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  await page.waitForSelector("img.profile__avatar-pic", { timeout: 30_000 });
  await page.waitForSelector(".profile__stats-posts", { timeout: 30_000 });
  await page.waitForSelector(".profile__stats-followers", { timeout: 30_000 });
  await page.waitForSelector(".profile__stats-follows", { timeout: 30_000 });

  const imgInfo = await page.$eval("img.profile__avatar-pic", (img) => ({
    src: img.getAttribute("src"),
    srcset: img.getAttribute("srcset")
  }));

  const imageUrl = pickImageUrl(imgInfo);

  if (!imageUrl) {
    throw new Error("Profile image URL not found.");
  }

  await fs.promises.mkdir(outputDir, { recursive: true });

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await sharp(buffer).png().toFile(outputPath);

  const stats = await page.evaluate(() => {
    const read = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent?.trim() : null;
    };

    return {
      posts: read(".profile__stats-posts"),
      followers: read(".profile__stats-followers"),
      follows: read(".profile__stats-follows")
    };
  });

  await page.click('[data-tab="profile__tabs-posts"]');
  await page.waitForSelector(".profile__posts", { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  const mediaItems = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".profile__tabs-media-item-inner"));

    return items.map((item) => {
      const img = item.querySelector("img.img-post");
      const typeIcon = item.querySelector(".profile__tabs-media-item-type use");
      const href = typeIcon?.getAttribute("xlink:href") ?? typeIcon?.getAttribute("href");

      return {
        src: img?.getAttribute("src") ?? null,
        typeIcon: href ?? null
      };
    });
  });

  const posts = [];

  for (let i = 0; i < mediaItems.length; i += 1) {
    const item = mediaItems[i];

    if (!item?.src) {
      continue;
    }

    const fileName = `${i}.jpg`;
    const filePath = path.join(outputDir, fileName);

    const imageResponse = await fetch(item.src);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download post image: ${imageResponse.status} ${imageResponse.statusText}`
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await sharp(imageBuffer).jpeg().toFile(filePath);

    let type = null;
    if (item.typeIcon?.endsWith("#ico-photo")) {
      type = "post";
    } else if (item.typeIcon?.endsWith("#ico-play")) {
      type = "video";
    }

    posts.push({
      path: path.join("assets", "img", "instagram", fileName),
      type
    });
  }

  await page.goto("https://www.instagram.com/hoppy_hippo_playland/", {
    waitUntil: "domcontentloaded"
  });
  await page.waitForSelector("a", { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  const postLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/hoppy_hippo_playland/"]'));
    const filtered = anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter(Boolean)
      .filter(
        (href) =>
          href.startsWith("/hoppy_hippo_playland/reel/") ||
          href.startsWith("/hoppy_hippo_playland/p/")
      );

    return Array.from(new Set(filtered)).slice(0, 12);
  });

  const enrichedPosts = posts.map((post, index) => ({
    ...post,
    link: postLinks[index] ? `https://www.instagram.com${postLinks[index]}` : null
  }));

  const data = {
    stats,
    posts: enrichedPosts
  };

  await fs.promises.mkdir(path.dirname(dataOutputPath), { recursive: true });
  await fs.promises.writeFile(dataOutputPath, JSON.stringify(data, null, 2), "utf8");

  await browser.close();
})();
