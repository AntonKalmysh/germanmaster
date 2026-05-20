#!/usr/bin/env python3
"""Quick inspection of PDF column layout using pdfplumber."""
import sys
import pdfplumber

pdf_path = sys.argv[1]
page_num = int(sys.argv[2]) if len(sys.argv) > 2 else 16

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[page_num - 1]
    print(f"Page {page_num} size: {page.width} x {page.height}")
    print(f"Word count: {len(page.extract_words())}")
    words = page.extract_words()
    if words:
        xs = sorted(set(round(w["x0"], 0) for w in words))
        print(f"Distinct x0 buckets (first 40): {xs[:40]}")
        print()
        print("Sample words with positions:")
        for w in words[:30]:
            print(f"  x0={w['x0']:.1f} top={w['top']:.1f} text={w['text']!r}")
