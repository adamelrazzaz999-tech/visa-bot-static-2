const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let browser;
let page;

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// تشغيل البوت وجلب الكابتشا
app.post("/check", async (req, res) => {

  const { issued, record } = req.body;

  try {

    if (!browser) {
      browser = await puppeteer.launch({
        headless: "new", // خلفية
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: null
      });

      page = await browser.newPage();
    }

    await page.goto(
      "https://visa.mofa.gov.sa/enjaz/getvisainformation/person",
      { waitUntil: "networkidle2" }
    );

    // اختيار القاهرة
    await page.waitForSelector("#Embassy");

    await page.select("#Embassy", "302");

    await page.evaluate(() => {
      document
        .querySelector("#Embassy")
        .dispatchEvent(new Event("change", { bubbles: true }));
    });

    // تنظيف الحقول
    await page.evaluate(() => {
      document.querySelector('input[name="IssuedNo"]').value = "";
      document.querySelector('input[name="RecordNumber"]').value = "";
    });

    // كتابة البيانات
    await page.type('input[name="IssuedNo"]', issued, { delay: 50 });
    await page.type('input[name="RecordNumber"]', record, { delay: 50 });

    // انتظار صورة الكابتشا
    await page.waitForSelector('img[id*="captcha"]');

    const captchaImg = await page.$('img[id*="captcha"]');

    await captchaImg.screenshot({
      path: "public/captcha.png"
    });

    res.json({
      success: true,
      captcha: "/captcha.png"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
});


// إرسال الكابتشا وجلب النتيجة
app.post("/submit", async (req, res) => {

  const { code } = req.body;

  try {

    await page.evaluate(() => {
      document.querySelector('input[name="Captcha"]').value = "";
    });

    await page.type('input[name="Captcha"]', code, { delay: 50 });

    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);

    await page.screenshot({
      path: "public/result.png",
      fullPage: true
    });

    res.json({
      success: true,
      result: "/result.png"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});


// تشغيل السيرفر
const PORT = 3000;

app.listen(PORT, () => {
  console.log("✅ Server running: http://localhost:" + PORT);
});
