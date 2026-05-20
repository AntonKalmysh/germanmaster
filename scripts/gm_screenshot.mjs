import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:3000/";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.screenshot({ path: "/tmp/gm_0_landing.png" });

// Enable Sentence stage so we cycle through all 3 stages
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const sentence = btns.find((b) => b.textContent.trim() === "Sentence");
  sentence && sentence.click();
});

await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const start = btns.find((b) => b.textContent.trim() === "Start");
  start && start.click();
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: "/tmp/gm_1_table.png" });

async function typeAndCheck(suffix) {
  await page.focus("input");
  await page.keyboard.type("en");
  // If there's a 2nd blank, tab and type
  const blanks = await page.$$("input");
  if (blanks.length > 1) {
    await page.keyboard.press("Tab");
    await page.keyboard.type("en");
  }
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const check = btns.find((b) => b.textContent.trim() === "Check");
    check && check.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `/tmp/gm_${suffix}_checked.png` });
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const next = btns.find((b) => b.textContent.trim() === "Next");
    next && next.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

await typeAndCheck("2_table");
await page.screenshot({ path: "/tmp/gm_3_phrase.png" });
await typeAndCheck("4_phrase");
await page.screenshot({ path: "/tmp/gm_5_sentence.png" });

await browser.close();
console.log("done");
