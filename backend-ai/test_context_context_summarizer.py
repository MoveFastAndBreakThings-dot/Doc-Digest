import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from context_summarizer import app

client = TestClient(app)

# --- /generate endpoint tests ---
def test_generate_success():
    payload = {
        "prompt": "Context: This is a test context.\nQuestion: What is this?"
    }
    with patch("context_summarizer.qa_pipeline") as mock_qa:
        mock_qa.return_value = {"answer": "A test."}
        resp = client.post("/generate", json=payload)
        assert resp.status_code == 200
        assert resp.json() == {"result": "A test."}

def test_generate_missing_prompt():
    resp = client.post("/generate", json={"prompt": ""})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Prompt cannot be empty."

def test_generate_missing_context_or_question():
    payload = {"prompt": "Context: Only context, no question."}
    resp = client.post("/generate", json=payload)
    assert resp.status_code == 400
    assert "Prompt must include" in resp.json()["detail"]

def test_generate_model_error():
    payload = {
        "prompt": "Context: This is a test context.\nQuestion: What is this?"
    }
    with patch("context_summarizer.qa_pipeline", side_effect=Exception("fail")):
        resp = client.post("/generate", json=payload)
        assert resp.status_code == 500
        assert "Model error" in resp.json()["detail"]

# --- /summarize endpoint tests ---
def test_summarize_success():
    payload = {"text": "This is a long text. It should be summarized."}
    with patch("context_summarizer.summarizer") as mock_sum:
        mock_sum.return_value = [{"summary_text": "A summary."}]
        resp = client.post("/summarize", json=payload)
        assert resp.status_code == 200
        assert "summary" in resp.json()
        assert resp.json()["summary"] == "A summary."

def test_summarize_empty_text():
    resp = client.post("/summarize", json={"text": "   "})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Text cannot be empty."

def test_summarize_model_error():
    payload = {"text": "Some text."}
    with patch("context_summarizer.summarizer", side_effect=Exception("fail")):
        resp = client.post("/summarize", json=payload)
        assert resp.status_code == 500
        assert "Summarization error" in resp.json()["detail"]

# --- /upload endpoint tests ---
def test_upload_txt_success():
    file_content = b"hello world"
    files = {"file": ("test.txt", file_content, "text/plain")}
    resp = client.post("/upload", files=files)
    assert resp.status_code == 200
    assert resp.json()["text"] == "hello world"

def test_upload_pdf_success():
    # Create a fake PDF in memory
    import PyPDF2
    from PyPDF2 import PdfWriter
    pdf_bytes = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.write(pdf_bytes)
    pdf_bytes.seek(0)
    files = {"file": ("test.pdf", pdf_bytes.read(), "application/pdf")}
    with patch("context_summarizer.PyPDF2.PdfReader") as mock_reader:
        mock_reader.return_value.pages = [type("Page", (), {"extract_text": lambda self: "pdf text"})()]
        resp = client.post("/upload", files=files)
        assert resp.status_code == 200
        assert resp.json()["text"] == "pdf text"

def test_upload_unsupported_type():
    files = {"file": ("test.jpg", b"fake", "image/jpeg")}
    resp = client.post("/upload", files=files)
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]
