import puppeteer from "puppeteer";

async function fetchLetterboxdWatchlist(username) {
  const baseUrl = `https://letterboxd.com/${username}/watchlist/`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  let movies = [];
  let pageNum = 1;

  while (true) {
    const url = pageNum === 1 ? baseUrl : `${baseUrl}page/${pageNum}/`;
    console.log(`📄 Fetching page ${pageNum}...`);

    await page.goto(url, { waitUntil: "networkidle2" });

    // Scrape the current page
    const pageMovies = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".griditem .react-component"));
      return items.map((el) => ({
        title: el.getAttribute("data-item-full-display-name"),
        link: `https://letterboxd.com${el.getAttribute("data-item-link")}`,
        image: el.querySelector("img")?.src || null,
      }));
    });

    if (!pageMovies.length) break; // no more movies found

    movies = [...movies, ...pageMovies];
    pageNum++;

    // Check if there's a "next" button
    const hasNextPage = await page.$(".paginate-next");
    if (!hasNextPage) break;
  }

  await browser.close();
  return movies;
}

// CLI usage
const username = process.argv[2];
if (!username) {
  console.error("❌ Please provide your Letterboxd username.");
  console.error("Usage: node fetchLetterboxdWatchlist.js <username>");
  process.exit(1);
}

fetchLetterboxdWatchlist(username)
  .then((movies) => {
    if (!movies.length) {
      console.log("⚠️ No movies found — check your username or make sure your watchlist is public.");
    } else {
      console.log(`✅ Found ${movies.length} movies for @${username}:\n`);
      console.log(JSON.stringify(movies, null, 2));
    }
  })
  .catch((err) => {
    console.error("❌ Error fetching watchlist:", err.message);
  });

