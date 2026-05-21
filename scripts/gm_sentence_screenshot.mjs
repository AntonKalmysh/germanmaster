// Targets the sentence stage by deselecting Table and Phrase before Start.
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

// Clear any persisted config so toggles below operate on a known baseline.
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

// Default config has stages=[table, phrase]. Toggle off both, then on Sentence.
await page.evaluate(() => {
  const click = (label) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === label,
    );
    btn && btn.click();
  };
  click("Table");
  click("Phrase");
  click("Sentence");
});

// Click Start
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Start",
  );
  btn && btn.click();
});

// Wait for sentence stage to render (h-level retry until "SENTENCE · 1 OF" appears)
for (let i = 0; i < 30; i++) {
  const ok = await page.evaluate(() =>
    document.body.textContent.includes("SENTENCE"),
  );
  if (ok) break;
  await new Promise((r) => setTimeout(r, 200));
}
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "/tmp/gm_sentence_a.png" });

// Advance to a second random sentence by typing + Check + Next
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
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Next",
  );
  btn && btn.click();
});
for (let i = 0; i < 30; i++) {
  const at = await page.evaluate(() =>
    document.body.textContent.includes("SENTENCE · 2 OF"),
  );
  if (at) break;
  await new Promise((r) => setTimeout(r, 200));
}
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "/tmp/gm_sentence_b.png" });

await browser.close();
console.log("done");
