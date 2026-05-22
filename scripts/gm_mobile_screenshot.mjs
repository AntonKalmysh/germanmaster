// Mobile-width screenshots of landing, table, phrase, sentence stages.
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:3000/";
// iPhone 14 Pro (390x844 CSS pixels at @3x device pixel ratio).
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(VIEWPORT);
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

// 1. Landing (mobile)
await page.screenshot({ path: "/tmp/gm_mobile_landing.png", fullPage: true });

// Toggle on Sentence so we cycle through all 3 stages.
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Sentence",
  );
  btn && btn.click();
});

// Start
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Start",
  );
  btn && btn.click();
});
for (let i = 0; i < 30; i++) {
  const ok = await page.evaluate(() =>
    /TABLE · 1 OF/.test(document.body.textContent),
  );
  if (ok) break;
  await new Promise((r) => setTimeout(r, 200));
}
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "/tmp/gm_mobile_table.png", fullPage: true });

// Advance to phrase: type something, check, next.
async function advance() {
  await page.focus("input");
  await page.keyboard.type("e");
  const inputs = await page.$$("input");
  if (inputs.length > 1) {
    await page.keyboard.press("Tab");
    await page.keyboard.type("e");
  }
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Check",
    );
    btn && btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Next",
    );
    btn && btn.click();
  });
  await new Promise((r) => setTimeout(r, 700));
}

await advance();
await page.screenshot({ path: "/tmp/gm_mobile_phrase.png", fullPage: true });

await advance();
await page.screenshot({ path: "/tmp/gm_mobile_sentence.png", fullPage: true });

await browser.close();
console.log("done");
