import sys
import docx
from pypdf import PdfReader

def extract_docx(filepath):
    doc = docx.Document(filepath)
    return '\n'.join([p.text for p in doc.paragraphs])

def extract_pdf(filepath):
    reader = PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def convert(filename, ext):
    try:
        if ext == 'docx':
            text = extract_docx(filename)
        elif ext == 'pdf':
            text = extract_pdf(filename)
        out_name = filename + '.txt'
        with open(out_name, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Successfully extracted {filename}")
    except Exception as e:
        print(f"Error extracting {filename}: {e}")

convert('PRO_PLACEMENT_FOOTAGE_TRACKER_PROMPT.docx', 'docx')
convert('Footage Submission Guide.pdf', 'pdf')
convert('footage_guide2.pdf', 'pdf')
convert('future_app_guidelines.docx', 'docx')
