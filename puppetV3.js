import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const USERNAME = process.env.LETTERBOXD_USER;
if (!USERNAME) {
  console.error("❌ Missing environment variable: LETTERBOXD_USER");
  process.exit(1);
}

const BASE_URL = `https://letterboxd.com/${USERNAME}/watchlist/`;
const OUTPUT_FILE = "./watchlist.json";

async function fetchLetterboxdWatchlist() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let movies = [];
  let pageNum = 1;

  while (true) {
    const url = pageNum === 1 ? BASE_URL : `${BASE_URL}page/${pageNum}/`;
    console.log(`📄 Fetching page ${pageNum}...`);

    await page.goto(url, { waitUntil: "networkidle2" });

    const pageMovies = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".griditem .react-component"));
      return items.map((el) => ({
        title: el.getAttribute("data-item-full-display-name"),
        link: `https://letterboxd.com${el.getAttribute("data-item-link")}`,
        image: el.querySelector("img")?.src || null,
      }));
    });

    if (!pageMovies.length) break;
    movies.push(...pageMovies);

    const hasNextPage = await page.$(".paginate-next");
    if (!hasNextPage) break;

    pageNum++;
  }

  await browser.close();
  return movies;
}

function saveToFile(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`💾 Saved ${data.length} movies to ${filePath}`);
}

function pickRandomMovie(movies) {
  const randomIndex = Math.floor(Math.random() * movies.length);
  return movies[randomIndex];
}

// 🚀 Run directly (for n8n Execute Command)
fetchLetterboxdWatchlist()
  .then((movies) => {
    if (!movies.length) {
      console.log("⚠️ No movies found — check if your watchlist is public.");
      return;
    }

    console.log(`✅ Found ${movies.length} movies for @${USERNAME}`);
    saveToFile(movies, OUTPUT_FILE);

    const randomMovie = pickRandomMovie(movies);
    console.log(`🎲 Random Pick: ${randomMovie.title}`);
    console.log(JSON.stringify(randomMovie, null, 2));
  })
  .catch((err) => {
    console.error("❌ Error fetching watchlist:", err.message);
  });

