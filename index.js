const app = require("express")();
let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

let browser;
let page;

// Create the browser instance and page outside the route handler
(async () => {
  browser = await puppeteer.launch({ headless: true, executablePath: executablePath(), args: ['--no-sandbox'] });
  page = await browser.newPage();
})();

app.get('/preview-video', async (req, res) => {
  const title = req.query.title;
  console.log('\n---------------------------');
  console.log(title)
  const query = title.replace(/\s/g, '+');

  try {
    // Change the current page URL for each new request
    await page.goto(`https://www.youtube.com/results?search_query=${query + '+trailer'}`, { timeout: 999999999 });

    // Wait for the search results to load
    await page.waitForSelector('#contents span#text');

    // Extract the video ID, duration, and channel name of the first video in the search results
    const videoData = await page.$eval('#contents ytd-video-renderer a#thumbnail', (element) => {
      const url = new URL(element.href);
      const videoId = url.searchParams.get('v');
      const durationElement = element.parentElement.querySelector('span#text');
      const duration = durationElement ? durationElement.innerText.trim() : '';
      const channelElement = element.parentElement.parentElement.querySelector('.ytd-channel-name a');
      const channelName = channelElement ? channelElement.innerText.trim() : '';
      return { videoId, duration, channelName };
    });

    console.log('Video ID:', videoData.videoId);
    console.log('Duration:', videoData.duration);
    console.log('Channel Name:', videoData.channelName);
    res.json(videoData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to fetch video details.' });
  }
});


app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;


// let options = {};

// if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
//   options = {
//     args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
//     defaultViewport: chrome.defaultViewport,
//     executablePath: await chrome.executablePath,
//     headless: true,
//     ignoreHTTPSErrors: true,
//   };
// }