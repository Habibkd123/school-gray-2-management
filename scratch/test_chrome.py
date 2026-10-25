import os
import subprocess

html_content = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .sheet { background: #ffffff; width: 800px; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  h1 { font-size: 20px; color: #0f172a; text-align: center; }
</style>
</head>
<body>
  <div class="sheet">
    <h1>Test Sheet</h1>
  </div>
</body>
</html>"""

with open("scratch/test.html", "w", encoding="utf-8") as f:
    f.write(html_content)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_img = os.path.abspath(r"scratch\test_chrome.png")
html_url = "file:///" + os.path.abspath("scratch/test.html").replace("\\", "/")

cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    f"--window-size=900,600",
    f"--screenshot={out_img}",
    html_url
]

subprocess.run(cmd, check=True)
print("Rendered:", os.path.exists(out_img), "size:", os.path.getsize(out_img) if os.path.exists(out_img) else 0)
