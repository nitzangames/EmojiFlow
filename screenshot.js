const puppeteer = require('/usr/local/lib/node_modules/puppeteer');

(async () => {
  var args = process.argv.slice(2);
  var clickPlay = args.indexOf('--play') >= 0;
  args = args.filter(function(a) { return a !== '--play'; });
  var url = args[0] || 'http://localhost:8899';
  var output = args[1] || '/tmp/game-screenshot.png';

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  if (clickPlay) {
    // Click center of Play button (canvas coords 540,1050 → viewport 270,525)
    await page.mouse.click(270, 525);
    await new Promise(r => setTimeout(r, 1500));
  }

  await page.screenshot({ path: output, fullPage: false });
  await browser.close();
  console.log('Screenshot saved to ' + output);
})();
