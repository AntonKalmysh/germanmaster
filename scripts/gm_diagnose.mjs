// Run the app and report any runtime errors to console.
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "shell",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type())) {
    console.log(`[${msg.type()}]`, msg.text());
  }
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("requestfailed", (req) =>
  console.log("[requestfailed]", req.url(), req.failure()?.errorText),
);

await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

// Click Start
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Start",
  );
  btn && btn.click();
});
await new Promise((r) => setTimeout(r, 1500));

// Type something
await page.focus("input");
await page.keyboard.type("e");
await new Promise((r) => setTimeout(r, 300));

// Check
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Check",
  );
  btn && btn.click();
});
await new Promise((r) => setTimeout(r, 800));

// Next
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Next",
  );
  btn && btn.click();
});
await new Promise((r) => setTimeout(r, 1500));

const visibleText = await page.evaluate(() => document.body.textContent);
console.log("---page text after Next---");
console.log(visibleText.slice(0, 400));

await browser.close();
