import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    const t = msg.type().toUpperCase();
    const txt = msg.text();
    console.log(`[${t}] ${txt}`);
    if (t === 'ERROR') errors.push(txt);
  });
  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]`, err.message);
    errors.push(err.message);
  });

  console.log('--- Loading page ---');
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0', timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'ss_lobby.png' });
  console.log('Screenshot: ss_lobby.png');

  // Type a name
  await page.type('#name-input', 'TestUser');
  await new Promise(r => setTimeout(r, 300));

  // Click "Jugar Solo" (btn-solo)
  console.log('--- Clicking btn-solo ---');
  await page.click('#btn-solo');
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'ss_after_play.png' });
  console.log('Screenshot: ss_after_play.png');

  // Check visible screens
  const visible = await page.evaluate(() => {
    const screens = ['lobby', 'hub', 'game', 'arcade', 'quiz-wrap', 'win', 'fs-tip'];
    const result = {};
    for (const id of screens) {
      const el = document.getElementById(id);
      if (el) {
        const style = window.getComputedStyle(el);
        result[id] = {
          hidden: el.classList.contains('hidden'),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        };
      } else {
        result[id] = 'NOT FOUND';
      }
    }
    // Also check canvas
    const canvas = document.querySelector('canvas');
    result['canvas'] = canvas ? { width: canvas.width, height: canvas.height, display: window.getComputedStyle(canvas).display } : 'NOT FOUND';
    return result;
  });
  console.log('--- Visible screens after play click ---');
  console.log(JSON.stringify(visible, null, 2));

  // Wait a bit more and screenshot again
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'ss_after_6s.png' });
  console.log('Screenshot: ss_after_6s.png');

  if (errors.length) {
    console.log('\n=== ERRORS DETECTED ===');
    errors.forEach(e => console.log(' -', e));
  } else {
    console.log('\nNo errors detected.');
  }

  await browser.close();
})();
