import puppeteer from "puppeteer";
import fs from "fs";

const USERNAME = "pratham82";
const LIST_URL = `https://letterboxd.com/${USERNAME}/watchlist/`;

async function scrapeWatchlist() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(LIST_URL, { waitUntil: "networkidle2" });

  // Scroll to the bottom to load all movies
  let prevHeight = 0;
  while (true) {
    const currentHeight = await page.evaluate("document.body.scrollHeight");
    if (currentHeight === prevHeight) break;
    prevHeight = currentHeight;
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Extract data directly from the react-component divs
  const movies = await page.$$eval(".react-component[data-component-class='LazyPoster']", (elements) =>
    elements.map((el) => {
      const title = el.getAttribute("data-item-name");
      const link = el.getAttribute("data-item-link");
      const img = el.getAttribute("data-poster-url");
      return {
        title,
        link: link ? `https://letterboxd.com${link}` : null,
        poster: img ? `https://letterboxd.com${img}` : null,
      };
    })
  );

  console.log(`✅ Found ${movies.length} movies`);
  console.log(movies.slice(0, 5)); // print first few

  await browser.close();

  // Save to file
  fs.writeFileSync("watchlist.json", JSON.stringify(movies, null, 2));
  console.log("📁 Saved to watchlist.json");
}

scrapeWatchlist().catch((err) => {
  console.error("❌ Error scraping Letterboxd:", err.message);
});

