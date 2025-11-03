// scrape-letterboxd.js (ESM version)
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const LIST_URL = "https://letterboxd.com/pratham82/watchlist/"; // change if needed

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    console.log("HTTP status:", res.status);
    console.log("HTML length:", res.data.length);

    fs.writeFileSync("page.html", res.data);
    return res.data;
  } catch (err) {
    if (err.response) {
      console.error(
        "HTTP error:",
        err.response.status,
        err.response.statusText
      );
    } else {
      console.error("Fetch error:", err.message);
    }
    throw err;
  }
}

function parseMovies(html) {
  const $ = cheerio.load(html);
  const movies = [];

  $(".poster-container").each((i, el) => {
    const img = $(el).find("img");
    const title =
      img.attr("alt") ||
      img.attr("title") ||
      img.attr("data-title");
    const href = $(el).find("a").attr("href");
    if (title && href) {
      movies.push({
        title: title.trim(),
        link: "https://letterboxd.com" + href,
      });
    }
  });

  // Fallback: '.list-film'
  if (movies.length === 0) {
    $(".list-film").each((i, el) => {
      const title = $(el).find(".film-title a").text().trim();
      const href = $(el).find(".film-title a").attr("href");
      if (title)
        movies.push({
          title,
          link: href ? "https://letterboxd.com" + href : null,
        });
    });
  }

  // Fallback: any /film/ link
  if (movies.length === 0) {
    $('a[href*="/film/"]').each((i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (href && title && title.length > 0) {
        if (!movies.find((m) => m.link === "https://letterboxd.com" + href)) {
          movies.push({ title, link: "https://letterboxd.com" + href });
        }
      }
    });
  }

  return movies;
}

(async () => {
  try {
    const html = await fetchHtml(LIST_URL);
    const movies = parseMovies(html);
    console.log("Found movies:", movies.length);

    if (movies.length === 0) {
      console.log("No movies found. Inspect page.html for structure.");
    } else {
      console.log(JSON.stringify(movies, null, 2));
    }
  } catch (err) {
    console.error("Script failed:", err.message);
  }
})();

