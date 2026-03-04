import shutil, os, sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

src = "C:\\Users\\Ferminus\\Desktop\\\u0627\u0644\u0623\u062d\u0627\u062f\u064a\u062b.doc"
dst = "C:\\TafsirKurd\\scripts\\hadiths_import.doc"

if os.path.exists(src):
    shutil.copy2(src, dst)
    print(f"Copied OK, size={os.path.getsize(dst)} bytes")
else:
    print("Source not found, searching desktop...")
    desk = "C:\\Users\\Ferminus\\Desktop"
    for f in os.listdir(desk):
        if f.endswith(('.doc', '.docx')):
            fp = os.path.join(desk, f)
            print(f"Found: {f!r} ({os.path.getsize(fp)} bytes)")
            shutil.copy2(fp, dst)
            print("Copied to hadiths_import.doc")
